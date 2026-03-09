# =============================================================================
# AlphaPro Production Dockerfile
# Builds: Dashboard (React) + API (Node.js) in a single container
# =============================================================================

# --- Stage 1: Build Dashboard (Frontend) ---
FROM node:20-alpine3.18 AS dashboard-builder

WORKDIR /dashboard

# Copy dashboard package files - FROM ROOT context
COPY modules/dashboard/package.json modules/dashboard/package-lock.json* ./

# Install dashboard dependencies
RUN npm install

# Copy the rest of the dashboard source code
COPY modules/dashboard/ ./

# Build the dashboard for production. The output will be in /dashboard/dist.
RUN npm run build


# --- Stage 2: Build API (Backend) & Create Final Production Image ---
FROM node:20-alpine3.18

WORKDIR /usr/src/app

# Install build essentials required for compiling native Node.js modules.
RUN apk update && apk add --no-cache python3 make g++ openssl1.1-compat

# Copy API package files from modules/api
COPY modules/api/package.json modules/api/package-lock.json* ./

# Install production dependencies for the API.
RUN npm install --omit=dev

# Copy the Prisma schema. This is needed for `prisma generate`.
COPY modules/api/prisma/ ./prisma/

# Generate Prisma client for production
RUN npx prisma generate

# Copy the rest of the API source code
COPY modules/api/ ./

# Copy engine services
COPY modules/engine/ ./modules/engine/

# Copy config directory
COPY config/ ./config/

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

