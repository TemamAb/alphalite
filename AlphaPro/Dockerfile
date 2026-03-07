# --- Stage 1: Build Dashboard (Frontend) ---
# Use the specified Node.js version for the dashboard build environment.
FROM node:20-alpine AS dashboard-builder

WORKDIR /app

# Copy dashboard package files from the dashboard module directory.
# The context for this Dockerfile is the project root.
COPY modules/dashboard/package.json modules/dashboard/package-lock.json* ./

# Install dashboard dependencies
RUN npm install

# Copy the rest of the dashboard source code
COPY modules/dashboard/ ./

# Build the dashboard for production. The output will be in /app/dist.
RUN npm run build


# --- Stage 2: Build API (Backend) & Create Final Production Image ---
# Use the specified Node.js version for the API runtime environment.
FROM node:18-alpine

WORKDIR /usr/src/app

# Install build essentials required for compiling native Node.js modules.
RUN apk add --no-cache python3 make g++

# Copy API package files from the API module directory.
COPY modules/api/package.json modules/api/package-lock.json* ./

# Install production dependencies for the API.
RUN npm install --omit=dev

# Copy the rest of the API source code.
COPY modules/api/ ./

# Copy the built dashboard from the builder stage into the API's expected client directory.
COPY --from=dashboard-builder /app/dist ./client/dist

# Set the environment to production to enable serving of static files in app.js.
ENV NODE_ENV=production

# Expose the port the API server will run on.
EXPOSE 3000

# Define the command to start the application.
CMD [ "node", "app.js" ]