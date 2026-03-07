# This Dockerfile is for the 'engine' service and expects the build context
# to be the root of the AlphaPro project.
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy only the necessary package.json files to leverage caching
# This assumes the api module has its own package management.
COPY ./modules/api/package.json ./modules/api/package.json
COPY ./modules/api/package-lock.json* ./modules/api/

# Install API dependencies
RUN cd modules/api && npm install --only=production

# Copy the necessary source code for the engine to run
COPY ./modules/api/ ./modules/api/
COPY ./modules/engine/ ./modules/engine/
COPY ./config/ ./config/

# Set the working directory to the API module where app.js is located
WORKDIR /usr/src/app/modules/api

EXPOSE 3000
CMD ["node", "app.js"]