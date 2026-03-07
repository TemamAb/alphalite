# Dockerfile for the React Dashboard
# Stage 1: Build the React app
FROM node:18-alpine as builder

WORKDIR /usr/src/app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the app's source code
COPY . .

# Make the API URL available at build time from the docker-compose args
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
# Increase memory for the build process to prevent out-of-memory errors,
# which can cause the cryptic 'file already closed' error.
ENV NODE_OPTIONS=--max-old-space-size=4096

# Build the app for production
RUN npm run build

# Stage 2: Serve the static files with a lightweight Nginx server
FROM nginx:1.23-alpine

# Copy the build output from the builder stage
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Copy the Nginx configuration to handle SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf