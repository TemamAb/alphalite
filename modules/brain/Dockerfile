# Dockerfile for the Python Brain
# IMPORTANT: Build context should be PROJECT ROOT
# Run: docker build -f modules/brain/Dockerfile -t alphapro-brain .

FROM python:3.9-slim

WORKDIR /usr/src/app

# Copy requirements file - path works from project root
COPY modules/brain/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the brain application from modules/brain
COPY modules/brain/ ./

# Security: Create and use non-root user
RUN useradd -m -s /bin/bash brain && \
    chown -R brain:brain /usr/src/app

USER brain

# Expose the port the app runs on
EXPOSE 5000

CMD ["python", "app.py"]
