# Dockerfile for the Python Brain
FROM python:3.9-slim

WORKDIR /usr/src/app

# Copy requirements file
# Ensure you have a requirements.txt in the modules/brain/ directory
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port the app runs on (from README)
EXPOSE 5000

CMD ["python", "app.py"]