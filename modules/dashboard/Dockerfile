# Dockerfile for the React Dashboard
# IMPORTANT: Build context should be PROJECT ROOT (where package.json is)
# Run: docker build -f modules/dashboard/Dockerfile -t alphapro-dashboard .

# Stage 1: Build the React app
FROM node:18-alpine as builder

WORKDIR /usr/src/app

# Copy package files - paths work because build context is PROJECT ROOT
COPY modules/dashboard/package.json modules/dashboard/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the dashboard source code
COPY modules/dashboard/ ./

# Make the API URL available at build time from the docker-compose args
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Increase memory for the build process to prevent out-of-memory errors
ENV NODE_OPTIONS=--max-old-space-size=4096

# Build the app for production
RUN npm run build

# Stage 2: Serve the static files with a lightweight Nginx server
FROM nginx:1.23-alpine

# Security: Run as non-root user
RUN adduser -D -u 1000 nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Copy the build output from the builder stage
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Copy the Nginx configuration to handle SPA routing
COPY modules/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 80

# Health check for production deployment
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Graceful shutdown
STOPSIGNAL SIGTERM

CMD ["nginx", "-g", "daemon off;"]
