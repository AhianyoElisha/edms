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
import math
import os
import time

import cv2
import numpy as np
from fastapi import FastAPI, Header, HTTPException, Request
from rapidocr import RapidOCR

TOKEN = os.environ.get("OCR_SERVICE_TOKEN", "")
MAX_BYTES = 12 * 1024 * 1024
# Phone photos arrive at up to 1920px. Text on a manifest stays readable well
# below that, and detection time grows with the pixel count.
MAX_SIDE = int(os.environ.get("OCR_MAX_SIDE", "1600"))

if not TOKEN:
    raise SystemExit("OCR_SERVICE_TOKEN is not set")

engine = RapidOCR()
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
        return []

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
        height = max(1.0, float(np.linalg.norm(np.subtract(box[3], box[0]))))
        items.append(
            {
                "x": cx * cos_t - cy * sin_t,
                "y": cx * sin_t + cy * cos_t,
                "h": height,
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

    return result


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/ocr")
async def ocr(request: Request, authorization: str = Header(default="")):
    if not hmac.compare_digest(authorization, f"Bearer {TOKEN}"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = await request.body()

    if not data:
        raise HTTPException(status_code=400, detail="Empty body")

    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image too large")

    image = decode(data)
    started = time.monotonic()

    async with lock:
        result = await asyncio.to_thread(engine, image)

    boxes = [] if result.boxes is None else result.boxes.tolist()
    texts = list(result.txts or [])
    scores = list(result.scores or [])

    return {
        "lines": group_into_lines(boxes, texts, scores),
        "ms": round((time.monotonic() - started) * 1000),
    }
