# This Dockerfile is for the 'api' service
# Build context is the PROJECT ROOT

FROM node:20-alpine

WORKDIR /usr/src/app

# Install build essentials and dependencies needed for Prisma and other native modules
RUN apk add --no-cache python3 make g++ postgresql-client bash openssl

# Copy package files first to leverage Docker cache
COPY modules/api/package*.json ./

# Install API dependencies
RUN npm install --only=production

# Copy Prisma schema for generation
COPY modules/api/prisma/ ./prisma/
RUN npx prisma generate

# Copy the rest of the source code
# Note: The API seems to depend on 'engine' and 'config' modules
COPY modules/api/ ./
COPY modules/engine/ ./modules/engine/
COPY config/ ./config/

# Ensure backup script is executable
# The script is now at /usr/src/app/scripts/backup.sh
RUN chmod +x ./scripts/backup.sh

# Security: Run as non-root user
# The 'node' user is created by the base image
USER node

EXPOSE 3000

# The entrypoint is app.js at the root of WORKDIR
CMD ["node", "app.js"]
