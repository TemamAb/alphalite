# --- Stage 1: Build Environment ---
# Use a Node.js image to build the frontend application.
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application for production
RUN npm run build

# --- Stage 2: Production Environment ---
# Use a lightweight Nginx image to serve the static files.
FROM nginx:1.25-alpine

# Copy the built static files from the build stage to the Nginx public directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the web server
EXPOSE 80

# Command to run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]