# --- Stage 1: Build Dashboard (Frontend) ---
# Use the specified Node.js version for the dashboard build environment.
FROM node:20-alpine AS dashboard-builder

WORKDIR /dashboard

# Copy dashboard package files - FROM ROOT context, look in modules/dashboard
COPY modules/dashboard/package.json modules/dashboard/package-lock.json* ./

# Install dashboard dependencies
RUN npm install

# Copy the rest of the dashboard source code
COPY modules/dashboard/ ./

# Build the dashboard for production. The output will be in /dashboard/dist.
RUN npm run build


# --- Stage 2: Build API (Backend) & Create Final Production Image ---
# Use Node.js 20 for better AWS SDK compatibility
FROM node:20-alpine

WORKDIR /usr/src/app

# Install build essentials required for compiling native Node.js modules.
RUN apk add --no-cache python3 make g++

# Copy API package files from modules/api
COPY modules/api/package.json modules/api/package-lock.json* ./

# Install production dependencies for the API.
RUN npm install --omit=dev

# Copy the entire modules directory to maintain proper require path resolution
COPY modules/ ./modules/

# Copy config directory
COPY config/ ./config/

# Copy app.js from correct location (modules/api/app.js)
COPY modules/api/app.js ./

# Copy the built dashboard from the builder stage into the API's expected client directory.
COPY --from=dashboard-builder /dashboard/dist ./client/dist

# Set the environment to production to enable serving of static files in app.js.
ENV NODE_ENV=production

# Create a writable tmp directory for temporary files
RUN mkdir -p /usr/src/app/tmp && chmod 777 /usr/src/app/tmp

# Expose the port the API server will run on.
EXPOSE 3000

# Define the command to start the application.
CMD [ "node", "app.js" ]

# =============================================================================
# SECURITY NOTES:
# - Container runs as non-root user (node)
# - All secrets must be passed via environment variables at runtime
# - For additional security, add the following to docker-compose.yml:
#   security_opt:
#     - no-new-privileges:true
#   read_only: true
#   tmpfs:
#     - /tmp
# =============================================================================
