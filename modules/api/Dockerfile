# This Dockerfile is for the 'api' service
# IMPORTANT: Build context should be the PROJECT ROOT (where docker-compose.yml is)
# Run: docker build -f modules/api/Dockerfile -t alphapro-api .

FROM node:20-alpine

WORKDIR /usr/src/app

# Install build essentials required for compiling native Node.js modules.
RUN apk add --no-cache python3 make g++ postgresql-client bash

# Copy only the necessary package.json files to leverage caching
# These paths work because build context is PROJECT ROOT
COPY modules/api/package.json ./modules/api/package.json
COPY modules/api/package-lock.json* ./modules/api/

# Install API dependencies
RUN cd modules/api && npm install --only=production

# Copy the necessary source code for the API to run
COPY modules/api/ ./modules/api/
COPY modules/engine/ ./modules/engine/
COPY config/ ./config/

# Ensure backup script is executable
RUN chmod +x ./modules/api/scripts/backup.sh

# Copy app.js from correct location
COPY modules/api/app.js ./app.js

# Set the working directory to the API module where app.js is located
WORKDIR /usr/src/app

# Security: Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "app.js"]
