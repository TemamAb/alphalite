# AlphaPro Sovereign Unified Dockerfile
# Chief Architect's Premium Production Optimization
# Optimized for Fly.io Cloud Deployment

# --- STAGE 1: Build Dashboard ---
FROM node:18-alpine AS dashboard-builder
WORKDIR /usr/src/app

# Copy manifests for Node workspaces
COPY package.json package-lock.json* ./
COPY modules/dashboard/package.json ./modules/dashboard/
COPY modules/api/package.json ./modules/api/

# Install ALL dependencies (including devDeps for Vite build)
# Using --ignore-scripts to prevent premature Prisma generation
RUN npm install --ignore-scripts

# Copy dashboard source and build
COPY modules/dashboard/ ./modules/dashboard/
RUN npm run build --workspace=modules/dashboard

# --- STAGE 2: Prepare Backend & Engine ---
FROM node:18-alpine AS backend-builder
WORKDIR /usr/src/app

# Copy manifests for production install
COPY package.json package-lock.json* ./
COPY modules/api/package.json ./modules/api/
COPY modules/dashboard/package.json ./modules/dashboard/

# Install production dependencies only
# We skip scripts because prisma generate needs the schema which isn't here yet
RUN npm install --only=production --ignore-scripts

# Copy all modules needed for runtime
COPY modules/ ./modules/
COPY config/ ./config/

# Generate Prisma Client (CRITICAL: Needs the schema copied first)
# We run this manually in the API folder
WORKDIR /usr/src/app/modules/api
RUN npx prisma generate

# --- STAGE 3: Final Optimized Runtime ---
FROM node:18-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules (hoisted to root) from backend-builder
COPY --from=backend-builder /usr/src/app/node_modules ./node_modules
# Copy source code
COPY --from=backend-builder /usr/src/app/modules ./modules
COPY --from=backend-builder /usr/src/app/config ./config
# Copy built dashboard to the API's client/dist folder for unified serving
COPY --from=dashboard-builder /usr/src/app/modules/dashboard/dist ./modules/api/client/dist

EXPOSE 3000

# Healthcheck to ensure the container is ready for traffic
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the unified application
CMD ["node", "modules/api/app.js"]