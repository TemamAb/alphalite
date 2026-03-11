# Stage 1: Build the React Dashboard
FROM node:18-alpine AS dashboard-builder
WORKDIR /app/dashboard

# Copy only package files first to leverage Docker cache
COPY modules/dashboard/package.json modules/dashboard/package-lock.json* ./
RUN npm install

# Copy the rest of the dashboard source and build
COPY modules/dashboard ./
RUN npm run build

# Stage 2: Build the Node.js Backend
FROM node:18-alpine AS backend-builder
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./

# Copy module package files to install all dependencies at once
COPY modules/api/package.json ./modules/api/
COPY modules/engine/package.json ./modules/engine/

# Install all production dependencies
RUN npm install --production

# Copy all backend source code
COPY . .

# Final Stage: Create the production image
FROM node:18-alpine
WORKDIR /app

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependencies from the backend-builder stage
COPY --from=backend-builder /app/node_modules ./node_modules

# Copy all backend source code from the backend-builder stage
COPY --from=backend-builder /app .

# Copy the built dashboard from the dashboard-builder stage
COPY --from=dashboard-builder /app/dashboard/dist ./public

# Ensure correct ownership of app files
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 3000

# Healthcheck to verify the API is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Command to run the application
# We assume a root-level app.js or server.js is the entry point
CMD ["node", "modules/api/app.js"]