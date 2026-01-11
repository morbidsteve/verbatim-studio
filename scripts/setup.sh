#!/bin/bash

set -e

echo "🎙️ Setting up Verbatim Studio..."

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is required but not installed."
        exit 1
    fi
    echo "✅ $1 found"
}

echo ""
echo "Checking prerequisites..."
check_command node
check_command pnpm
check_command docker
check_command python3

# Node version check
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ is required (found v$NODE_VERSION)"
    exit 1
fi

# Install Node dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
pnpm install

# Set up Python environment for server
echo ""
echo "🐍 Setting up Python environment..."
cd apps/server
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -e ".[dev]"
cd ../..

# Copy example env files
echo ""
echo "📝 Setting up environment files..."
if [ ! -f "apps/server/.env" ]; then
    cp apps/server/.env.example apps/server/.env
    echo "Created apps/server/.env - please update with your settings"
fi

if [ ! -f "docker/enterprise/.env" ]; then
    cp docker/enterprise/.env.example docker/enterprise/.env
    echo "Created docker/enterprise/.env - please update with your settings"
fi

# Build packages
echo ""
echo "🔨 Building packages..."
pnpm build

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update environment files with your settings"
echo "  2. Start development: pnpm dev"
echo "  3. Or start Docker services: pnpm docker:up"
echo ""
