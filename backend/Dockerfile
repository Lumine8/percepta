FROM python:3.12-slim

WORKDIR /app

# Build tools so any package that lacks a prebuilt wheel (e.g. scipy) can
# compile. Python 3.12 has wheels for the pinned versions, so this is only a
# fallback — but it makes the build deterministic.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gfortran \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Persisted profile directory (ephemeral on Render unless a disk is mounted).
ENV PERCEPTA_DATA_DIR=/app/data
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
