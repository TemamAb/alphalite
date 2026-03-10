# AlphaPro Dashboard Dockerfile
# =============================
# Multi-stage build for a production-ready React app served with Nginx.

# Stage 1: Build the React application
FROM node:18-alpine AS builder
LABEL stage=builder

WORKDIR /usr/src/app

# Copy package files and install dependencies
# Using ../.. context, so full path is needed
COPY modules/dashboard/package.json modules/dashboard/package-lock.json* ./

# Use 'npm install' instead of 'npm ci' to resolve lockfile platform mismatches
# or synchronization issues automatically during the build.
RUN npm install

# Copy the rest of the dashboard source code
COPY modules/dashboard/ ./

# Build the application for production
RUN npm run build

# Stage 2: Serve with a hardened Nginx
FROM nginx:1.25-alpine

# Remove default config and copy our hardened production config
# The base image's nginx.conf includes /etc/nginx/conf.d/*.conf.
# We copy our server configuration there to be included automatically.
COPY modules/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files from the builder stage
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Create a health check endpoint file mentioned in the audit
RUN touch /usr/share/nginx/html/health

# Set correct permissions. The 'nginx' user already exists in the base image.
# We do not need to add it again; we just ensure it owns the necessary files/dirs.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to the non-root user
USER nginx

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]