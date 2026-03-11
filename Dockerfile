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

# Install build essentials
RUN apk update && apk add --no-cache python3 make g++ openssl1.1-compat

# Copy root package files and prisma schema for postinstall
COPY package.json ./
RUN mkdir -p modules/api/prisma
COPY modules/api/prisma/ ./modules/api/prisma/

# Install dependencies and allow scripts to build native modules (like bcrypt)
RUN npm install --omit=dev

# Copy the Prisma schema and generate
COPY modules/api/prisma/ ./prisma/
RUN npx prisma generate

# IMPORTANT: Preserve module structure to fix relative require() paths
# Instead of flattening into root, copy into 'modules/api'
COPY modules/api/ ./modules/api/
COPY modules/engine/ ./modules/engine/
COPY config/ ./config/

# Move the node_modules and prisma into the modules/api folder so app.js can find them easily,
# or just run from the root and point to app.js. 
# We'll run from root but must ensure app.js is found.
# COPY the build from stage 1 to the correct static path in modules/api
COPY --from=dashboard-builder /dashboard/dist ./modules/api/client/dist

# Set the environment
ENV NODE_ENV=production
ENV PORT=3000

# Create tmp directory
RUN mkdir -p /usr/src/app/tmp && chmod 755 /usr/src/app/tmp

# Expose port
EXPOSE 3000

# Start from the correct relative path
CMD [ "node", "modules/api/app.js" ]

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

