#!/bin/bash
# This script builds all the necessary Docker images required by runnerService.js
# Run this once on your AWS server before starting the backend.

set -e

echo "================================================="
echo " Building Async-LMS Workspace Docker Images"
echo "================================================="

# Check if docker is installed
if ! command -v docker &> /dev/null
then
    echo "ERROR: docker could not be found. Please install Docker first."
    exit 1
fi

cd backend/docker || { echo "ERROR: Could not find backend/docker directory."; exit 1; }

# Loop through all workspace directories and build them
for dir in workspace-*/; do
    # Remove trailing slash
    image_name=${dir%/}
    
    echo ""
    echo "-> Building image: $image_name"
    docker build -t "$image_name" "$image_name"
done

echo ""
echo "================================================="
echo " All workspaces built successfully!"
echo " You can now run: docker-compose up -d --build"
echo "================================================="
