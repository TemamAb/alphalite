#!/bin/bash

# Set script to exit on first error

# Display a helpful message at the start
echo "Starting AlphaPro setup..." | tee -a start.log
set -e

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Error: docker is not installed."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null
then
 echo "Error: docker-compose is not installed." | tee -a start.log
 exit 1
# Define the .env file path
ENV_FILE="AlphaPro/.env"
TRADING_MODE="LIVE"
# Check if the .env file exists
if [ ! -f "$ENV_FILE" ]; then
 echo "Error: .env file not found in $ENV_FILE" | tee -a start.log
 echo "Please ensure AlphaPro/.env exists." | tee -a start.log
 exit 1
fi

## Load environment variables, handling errors
#if ! source "$ENV_FILE"; then
#    echo "Error: Failed to load environment variables from $ENV_FILE"
#    exit 1
#fi

## Set all exported variables
set -o allexport
source "$ENV_FILE"
set +o allexport

echo "✅ .env file found."

# Give user feedback before long-running tasks
echo "🚀 Starting AlphaPro in Docker for Paper Trading Simulation..."

# Build and start containers in detached mode
if ! docker-compose up --build -d; then
 echo "Error: Failed to start Docker Compose. Check the output above for details." | tee -a start.log
 exit 1
fi

# Provide clear instructions to the user
echo "✅ AlphaPro services are starting in the background." | tee -a start.log

echo "Use 'docker-compose logs -f' to view the logs." | tee -a start.log
echo "Use 'docker-compose down' to stop the services." | tee -a start.log
fi