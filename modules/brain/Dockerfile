# AlphaPro Brain Dockerfile
# =========================
# Python/Flask service for AI optimization

# Use a specific, slim Python version (Debian-based)
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install system dependencies (wget for healthcheck)
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Prevent python from writing pyc files to disc and buffer output
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Copy only the requirements file to leverage Docker cache
COPY modules/brain/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the brain application code
COPY modules/brain/ .

# Security: Create a non-root user for the application
RUN addgroup --system brain && adduser --system --ingroup brain brain

# Change ownership of the app directory ONLY, not the entire /usr
RUN chown -R brain:brain .

# Switch to the non-root user
USER brain

# Expose the port the app runs on, as defined in docker-compose
EXPOSE 5000

# Define the command to run the application
CMD ["python", "app.py"]