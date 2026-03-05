# AlphaPro API Dockerfile
# Build: docker build -t alphapro-api .
# Run: docker run -p 3001:3000 -e TRADING_MODE=LIVE alphapro-api

FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "app.js"]
