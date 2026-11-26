# Manifest OCR service

Reads the package total off a photographed manifest so the office does not have
to type it. Runs on the VPS beside Appwrite, CPU only.

- **Model:** [RapidOCR](https://github.com/RapidAI/RapidOCR) 3.x — the ONNX build of
  PaddleOCR's PP-OCR detection and recognition models (Apache-2.0). About 32 MB of
  weights, baked into the image at build time.
- **API:** `POST /ocr` with the raw image as the body and
  `Authorization: Bearer $OCR_SERVICE_TOKEN`. Returns the page as lines of text:
  `{ "lines": [{ "text": "Total Packages: 14", "score": 0.99 }], "ms": 2100 }`.
  `GET /health` for checks.
- **`POST /cells`:** reads a few small areas of a page `/ocr` has already read,
  where a figure should be but none was found. Same photo as the body, plus an
  `X-Cells` header: `{"frame": <the "frame" /ocr returned>, "cells": [{x, y, w, h}]}`
  in the coordinates of `/ocr`'s words. Each cell is cropped from the straightened
  page, the blue/violet pen ink is whited out, and the crop is enlarged and read on
  its own. Returns `{ "cells": [{ "text": "34", "score": 0.98 }] }`.
- **What it does not do:** it holds no Appwrite key and knows nothing about
  manifests. The app's `/api/manifest-ocr` route decides which photos may be read,
  fetches them, and finds the total in the text (`src/libs/ocr/manifestText.ts`).

## Flow

1. Driver logs a delivery; the photo is uploaded to Appwrite storage.
2. The dialog calls `/api/manifest-ocr` with the new file id. The route checks it
   is a fresh image in the manifest bucket, fetches it, and posts it here.
3. The total found becomes the manifest's `packageCount`, and (less any shortage the
   driver entered) its `deliveredCount`. The manifest still lands in the review queue.
   If the reading is not sure because some rows came back without a figure
   (usually a tick or a handwritten note across it), the route asks `/cells` to
   read those rows' cells again and reads the page once more with them.
4. The admin checks the figure against the photo, adds any shortage written on the
   manifest, and saves. "Read from photo" in the queue re-runs this on demand.

If the service is down or finds nothing, the delivery is saved exactly as before
and the office enters the figures by hand.

## Deploy (VPS)

```sh
rsync -a ocr-service/ opc@VPS:~/manifest-ocr/
ssh opc@VPS
cd ~/manifest-ocr
umask 077; echo "OCR_SERVICE_TOKEN=$(openssl rand -hex 32)" > .env
docker compose up -d --build
curl -s https://api.edsghana.com/ocr/health     # {"ok":true}
```

Then on Vercel (Production), set:

- `OCR_SERVICE_URL` = `https://api.edsghana.com/ocr`
- `OCR_SERVICE_TOKEN` = the token from `.env` above

## Local run

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
OCR_SERVICE_TOKEN=dev .venv/bin/uvicorn app:app --port 8000
curl -X POST localhost:8000/ocr -H "Authorization: Bearer dev" --data-binary @photo.jpg
```
