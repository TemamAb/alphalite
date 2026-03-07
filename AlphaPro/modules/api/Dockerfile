# --- API Service Dockerfile ---

# Use a lightweight Node.js image consistent with the project's environment
FROM node:18-alpine

# Install build essentials required for compiling native Node.js modules
RUN apk add --no-cache python3 make g++

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and the lock file to leverage Docker's layer caching.
# This step is only re-run when these files change.
COPY package.json ./
COPY package-lock.json* ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application source code into the container
COPY . .

# The API server will run on port 3000 inside the container
EXPOSE 3000

# Define the command to start the application
CMD [ "node", "app.js" ]