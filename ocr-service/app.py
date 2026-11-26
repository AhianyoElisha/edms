"""
Manifest OCR service.

A small HTTP wrapper around RapidOCR (the ONNX build of PaddleOCR's PP-OCR models,
Apache-2.0). It runs on the VPS beside Appwrite, on CPU only.

It knows nothing about Appwrite or manifests: the Next.js route /api/manifest-ocr
checks the request, fetches the photo with its own key and posts the bytes here.
This service only turns an image into lines of text, so the one secret it holds
is the shared token that proves the caller is that route.
"""

import asyncio
import hmac
import json
import math
import os
import time

import cv2
import numpy as np
from fastapi import FastAPI, Header, HTTPException, Request
from rapidocr import RapidOCR

TOKEN = os.environ.get("OCR_SERVICE_TOKEN", "")
MAX_BYTES = 12 * 1024 * 1024
# Photos are stored at up to 1920px. Keep that: on the transport manifests the
# table rows are only a few pixels apart, and shrinking further ran rows together
# (tested on the stored photos - 1600px lost about a fifth of the readings).
MAX_SIDE = int(os.environ.get("OCR_MAX_SIDE", "1920"))

if not TOKEN:
    raise SystemExit("OCR_SERVICE_TOKEN is not set")

# Threads per photo. Left unset, ONNX Runtime takes one per core, which fights
# Appwrite for the CPU; the container's CPU limit should match this.
THREADS = int(os.environ.get("OCR_THREADS", "0"))

engine = RapidOCR(
    params={"EngineConfig.onnxruntime.intra_op_num_threads": THREADS} if THREADS > 0 else None
)
app = FastAPI(title="manifest-ocr", docs_url=None, redoc_url=None)

# The VPS has two cores and Appwrite runs on them too, so one photo at a time.
lock = asyncio.Lock()


def decode(data: bytes) -> np.ndarray:
    image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=415, detail="Not an image")

    height, width = image.shape[:2]
    scale = MAX_SIDE / max(height, width)

    if scale < 1:
        image = cv2.resize(image, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA)

    return image


def box_size(box):
    """Length along the text, and height across it."""
    return (
        float(np.linalg.norm(np.subtract(box[1], box[0]))),
        float(np.linalg.norm(np.subtract(box[3], box[0]))),
    )


def is_sideways(boxes):
    """Most text runs standing on end: the photo was taken with the page turned 90 degrees."""
    if not boxes:
        return False

    tall = sum(1 for box in boxes if box_size(box)[1] > 1.5 * box_size(box)[0])

    return tall > 0.5 * len(boxes)


def run(image):
    # The flags are passed every time: RapidOCR keeps whatever the last call set,
    # and is_upside_down() calls it with detection and recognition switched off.
    result = engine(image, use_det=True, use_cls=True, use_rec=True)
    boxes = [] if result.boxes is None else result.boxes.tolist()

    return boxes, list(result.txts or []), [float(score) for score in (result.scores or [])]


def is_upside_down(image, boxes, sample=12):
    """
    Ask the text-direction classifier about the widest runs of text. Each line is
    read correctly either way, but an upside-down page puts the table's last row
    first and its right-hand column on the left.
    """
    widest = sorted(boxes, key=lambda box: -box_size(box)[0])[:sample]
    votes = []

    for box in widest:
        xs = [point[0] for point in box]
        ys = [point[1] for point in box]
        crop = image[int(max(0, min(ys))) : int(max(ys)), int(max(0, min(xs))) : int(max(xs))]

        if crop.size == 0:
            continue

        result = engine(crop, use_det=False, use_cls=True, use_rec=False)

        if result.cls_res:
            votes.append(result.cls_res[0][0] == "180")

    return len(votes) >= 3 and sum(votes) > 0.6 * len(votes)


def read_page(image):
    """
    OCR the page the right way up.

    The recogniser copes with a sideways or upside-down line on its own, but the
    page layout (which words share a row, which figure sits in which column) only
    makes sense upright. A page on its side is turned a quarter, and then a half
    turn more if its text reads upside down. Upright photos are read once.

    Returns the reading and how many quarter turns (np.rot90) the photo was given,
    so a later request for a few cells can turn it the same way.
    """
    reading = run(image)
    turns = 0

    if is_sideways(reading[0]):
        image = np.ascontiguousarray(np.rot90(image, 1))
        reading = run(image)
        turns = 1

    if is_upside_down(image, reading[0]):
        reading = run(np.ascontiguousarray(np.rot90(image, 2)))
        turns += 2

    return reading, turns


def group_into_lines(boxes, texts, scores):
    """
    RapidOCR returns one box per run of text, so a table row comes back as
    several pieces ("12", "WB483932", "Customer 12", "1"). Put the pieces that
    share a row back together, left to right, so a label and its value end up on
    the same line.

    Photos are rarely square to the page, and over the width of a sheet a small
    tilt moves a row by more than a line's height. The tilt is taken from the
    boxes themselves and undone before the rows are matched up.
    """
    if not texts:
        return [], [], 0.0

    angles = []

    for box in boxes:
        (x0, y0), (x1, y1) = box[0], box[1]

        if x1 - x0 > 20:
            angles.append(math.atan2(y1 - y0, x1 - x0))

    tilt = float(np.median(angles)) if angles else 0.0
    cos_t, sin_t = math.cos(-tilt), math.sin(-tilt)

    items = []

    for box, text, score in zip(boxes, texts, scores):
        cx = float(np.mean([p[0] for p in box]))
        cy = float(np.mean([p[1] for p in box]))
        width, height = box_size(box)
        items.append(
            {
                "x": cx * cos_t - cy * sin_t,
                "y": cx * sin_t + cy * cos_t,
                "w": max(1.0, width),
                "h": max(1.0, height),
                "text": text,
                "score": float(score),
            }
        )

    items.sort(key=lambda item: item["y"])
    lines = []

    for item in items:
        line = lines[-1] if lines else None

        if line and abs(item["y"] - line["y"]) < 0.5 * max(item["h"], line["h"]):
            count = len(line["items"])
            line["y"] = (line["y"] * count + item["y"]) / (count + 1)
            line["h"] = max(line["h"], item["h"])
            line["items"].append(item)
        else:
            lines.append({"y": item["y"], "h": item["h"], "items": [item]})

    result = []

    for line in lines:
        parts = sorted(line["items"], key=lambda item: item["x"])
        result.append(
            {
                "text": " ".join(part["text"] for part in parts),
                "score": round(min(part["score"] for part in parts), 3),
            }
        )

    # Each run of text with its place on the (straightened) page, for reading a
    # figure by the column it sits in rather than the line it shares.
    words = [
        {
            "text": item["text"],
            "score": round(item["score"], 3),
            "x": round(item["x"], 1),
            "y": round(item["y"], 1),
            "w": round(item["w"], 1),
            "h": round(item["h"], 1),
        }
        for item in items
    ]

    return result, words, tilt


def straighten(image, turns, tilt):
    """
    The photo in the frame the words' x and y are given in: turned as read_page
    turned it, then rotated by -tilt about the top-left corner (as group_into_lines
    does to the box centres). Returns the image and the offset to add to a word's
    x and y to find it in that image.
    """
    if turns % 4:
        image = np.ascontiguousarray(np.rot90(image, turns % 4))

    height, width = image.shape[:2]
    cos_t, sin_t = math.cos(-tilt), math.sin(-tilt)
    corners = [(0, 0), (width, 0), (0, height), (width, height)]
    xs = [x * cos_t - y * sin_t for x, y in corners]
    ys = [x * sin_t + y * cos_t for x, y in corners]
    dx, dy = -min(xs), -min(ys)
    matrix = np.float32([[cos_t, -sin_t, dx], [sin_t, cos_t, dy]])
    size = (int(math.ceil(max(xs) + dx)), int(math.ceil(max(ys) + dy)))

    return cv2.warpAffine(image, matrix, size, borderValue=(255, 255, 255)), dx, dy


def strip_coloured_ink(crop):
    """
    Paint out blue and violet ballpoint - the ticks and notes checkers put over
    the printed figures - in the paper's own colour.

    Measured on the stored photos: printed figures come out grey with a faint cast
    (saturation mostly under 50), pen ink strongly coloured (90 and up), and the
    values between are the soft edges of both. So the strongly coloured strokes go,
    with only the soft edge touching them; the print is left whole. The paper and
    floor are warm (orange to brown), so only cool hues are touched.
    """
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    cool = (hsv[..., 0] > 95) & (hsv[..., 0] < 150)
    core = cool & (hsv[..., 1] > 90)
    edge = cool & (hsv[..., 1] > 45)
    ink = core | (cv2.dilate(core.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & edge)

    if not ink.any():
        return crop

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    paper = ~ink & (gray > np.percentile(gray, 60))
    colour = np.median(crop[paper], axis=0) if paper.any() else np.array([255, 255, 255])

    cleaned = crop.copy()
    cleaned[ink] = colour.astype(np.uint8)

    return cleaned


MAX_CELLS = 60


def read_cells(image, turns, tilt, cells):
    """
    Read a few small areas of the page again, one at a time: where a figure should
    be but none was found. On its own, the text detector boxes a printed figure
    together with the tick or the handwritten note touching it, and the box then
    reads as nonsense or not at all. A tight crop, with the coloured ink gone and
    enlarged, reads the figure alone.
    """
    page, dx, dy = straighten(image, turns, tilt)
    height, width = page.shape[:2]
    results = []

    for cell in cells[:MAX_CELLS]:
        x0 = int(max(0, cell["x"] - cell["w"] / 2 + dx))
        x1 = int(min(width, cell["x"] + cell["w"] / 2 + dx))
        y0 = int(max(0, cell["y"] - cell["h"] / 2 + dy))
        y1 = int(min(height, cell["y"] + cell["h"] / 2 + dy))

        if x1 - x0 < 4 or y1 - y0 < 4:
            results.append({"text": "", "score": 0.0})
            continue

        crop = strip_coloured_ink(page[y0:y1, x0:x1])
        crop = cv2.resize(crop, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
        crop = cv2.copyMakeBorder(crop, 12, 12, 12, 12, cv2.BORDER_CONSTANT, value=(255, 255, 255))
        result = engine(crop, use_det=False, use_cls=False, use_rec=True)
        texts = list(result.txts or [])
        scores = [float(score) for score in (result.scores or [])]
        results.append({"text": texts[0] if texts else "", "score": round(scores[0], 3) if scores else 0.0})

    return results


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/ocr")
async def ocr(request: Request, authorization: str = Header(default="")):
    image = await authorised_image(request, authorization)
    started = time.monotonic()

    async with lock:
        (boxes, texts, scores), turns = await asyncio.to_thread(read_page, image)

    lines, words, tilt = group_into_lines(boxes, texts, scores)

    return {
        "lines": lines,
        "words": words,
        # How the page was turned and straightened, for /cells
        "frame": {"turns": turns, "tilt": tilt},
        "ms": round((time.monotonic() - started) * 1000),
    }


async def authorised_image(request: Request, authorization: str) -> np.ndarray:
    if not hmac.compare_digest(authorization, f"Bearer {TOKEN}"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = await request.body()

    if not data:
        raise HTTPException(status_code=400, detail="Empty body")

    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image too large")

    return decode(data)


@app.post("/cells")
async def cells(request: Request, authorization: str = Header(default=""), x_cells: str = Header(default="")):
    """
    Re-read small areas of a page /ocr has already read. The photo is the body
    again; the X-Cells header is {"frame": <from /ocr>, "cells": [{x, y, w, h}]},
    in the coordinates /ocr gave its words. Returns one {text, score} per cell.
    """
    image = await authorised_image(request, authorization)

    try:
        spec = json.loads(x_cells)
        turns = int(spec["frame"]["turns"])
        tilt = float(spec["frame"]["tilt"])
        wanted = [{key: float(cell[key]) for key in ("x", "y", "w", "h")} for cell in spec["cells"]]
    except (ValueError, KeyError, TypeError):
        raise HTTPException(status_code=400, detail="X-Cells must be {frame: {turns, tilt}, cells: [{x, y, w, h}]}")

    started = time.monotonic()

    async with lock:
        results = await asyncio.to_thread(read_cells, image, turns, tilt, wanted)

    return {"cells": results, "ms": round((time.monotonic() - started) * 1000)}
