# Use Node.js LTS Alpine for a small footprint
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy the entire application source
COPY . .

# Build the frontend
RUN npm run build

# Production Stage
FROM node:18-alpine

WORKDIR /app

COPY --from=build /app .

# Set environment variables for Production Mode
ENV NODE_ENV=production
ENV TRADING_MODE=LIVE

# Start the engine (app.js should listen on process.env.PORT)
CMD ["node", "modules/api/app.js"]