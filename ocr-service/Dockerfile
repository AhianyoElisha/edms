FROM python:3.12-slim

# opencv-headless still needs glib; onnxruntime needs OpenMP
RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# RapidOCR downloads its models on first use. Do it at build time so the
# container starts offline and the first photo is not slowed by a download.
RUN python -c "from rapidocr import RapidOCR; RapidOCR()"

COPY app.py .

RUN useradd --system --no-create-home ocr
USER ocr

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers"]
