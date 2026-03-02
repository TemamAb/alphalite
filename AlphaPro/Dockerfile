# Multi-stage Build for AlphaPro Unified Service
# Stage 1: Build React Frontend
FROM node:20-alpine as client-build
RUN apk add --no-cache python3 make g++
WORKDIR /app/client
COPY AlphaPro/alphapro-api/client/package*.json ./
RUN npm install
COPY AlphaPro/alphapro-api/client/ ./
RUN npm run build

# Stage 2: Build Node.js API - production dependencies only
FROM node:20-alpine
WORKDIR /app

# Copy package files and install dependencies
COPY AlphaPro/alphapro-api/package*.json ./
RUN npm install --production && npm install dotenv

# Copy source files
COPY AlphaPro/alphapro-api/src ./src
COPY AlphaPro/alphapro-api/app.js .
COPY AlphaPro/alphapro-api/config ./config

# Copy data sources and preflight check
COPY AlphaPro/data_sources.json .
COPY AlphaPro/PreFlightCheck.js .

# Copy config service for environment variable handling
COPY AlphaPro/configService.js .

# Copy built frontend static files
COPY --from=client-build /app/client/dist ./client/dist

# Environment Configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV TRADING_MODE=LIVE

EXPOSE 3000

CMD ["node", "app.js"]
