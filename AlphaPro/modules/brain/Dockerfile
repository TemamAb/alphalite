# ============================================================
# Python AI Oracle (Brain) - Production Dockerfile
# ============================================================
FROM python:3.11-slim

WORKDIR /app

# Install OS deps for scientific libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc build-essential wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:${PORT}/status || exit 1

# Use gunicorn for production; fallback to flask for dev
CMD gunicorn --bind 0.0.0.0:${PORT} --workers 2 --timeout 120 app:app