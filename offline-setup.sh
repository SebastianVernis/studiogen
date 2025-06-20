#!/bin/bash

# StudioGen Offline Setup Script
# This script prepares the application for offline deployment

set -e

echo "🔧 Preparing StudioGen for offline deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18.x or higher."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

# Install dependencies first
print_status "Installing dependencies..."
npm install

# Create offline cache directory
print_status "Creating offline cache..."
mkdir -p offline_cache

# Cache all dependencies
print_status "Caching dependencies for offline use..."
npm pack --pack-destination ./offline_cache

# Create bundled node_modules
print_status "Creating bundled node_modules archive..."
if [ -d "node_modules" ]; then
    tar -czf node_modules.tar.gz node_modules/
    print_status "node_modules.tar.gz created successfully"
else
    print_error "node_modules directory not found"
    exit 1
fi

# Build the application
print_status "Building application..."
npm run build

print_status "✅ Offline setup completed!"
print_status "Files created:"
print_status "  - node_modules.tar.gz (bundled dependencies)"
print_status "  - offline_cache/ (npm cache directory)"
print_status "  - .next/ (built application)"

print_warning "📦 Transfer these files to your deployment server:"
print_warning "  - All project files"
print_warning "  - node_modules.tar.gz"
print_warning "  - offline_cache/ directory"

echo "🎉 Ready for offline deployment!"
