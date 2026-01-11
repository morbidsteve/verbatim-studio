#!/bin/bash

set -e

echo "🚀 Starting Verbatim Studio development environment..."

# Start Docker services in background
echo "Starting Docker services..."
docker compose -f docker/basic/docker-compose.yml up -d

# Wait for services to be ready
echo "Waiting for services to be healthy..."
sleep 5

# Start the development servers
echo "Starting development servers..."
pnpm dev
