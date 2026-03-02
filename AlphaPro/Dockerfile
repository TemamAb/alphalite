# Multi-stage Build for AlphaPro Unified Service
# Stage 1: Build React Frontend
FROM node:20-alpine as client-build
WORKDIR /app/client
COPY alphapro-api/client/package*.json ./
COPY alphapro-api/client/tsconfig.json ./
RUN npm install
COPY alphapro-api/client/ ./
RUN npm run build

# Stage 2: Build Node.js API - production dependencies only
FROM node:20-alpine
WORKDIR /app

# Copy package files and install dependencies
COPY alphapro-api/package*.json ./
RUN npm install --production

# Copy source files
COPY alphapro-api/src ./src
COPY alphapro-api/app.js .
COPY alphapro-api/config ./config

# Copy data sources and preflight check
COPY data_sources.json .
COPY PreFlightCheck.js .

# Copy config service for environment variable handling
COPY configService.js .

# Note: .env file is NOT copied to image - environment variables
# should be provided by Render's environment. For local development,
# create a .env file in the AlphaPro directory.

# Copy built frontend static files
COPY --from=client-build /app/client/dist ./client/dist

# Environment Configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV TRADING_MODE=LIVE

EXPOSE 3000

CMD ["node", "app.js"]
