# Use Python 3.9 Slim
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Run the application
CMD gunicorn --bind 0.0.0.0:$PORT app:app