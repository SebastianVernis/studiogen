#!/bin/bash

# StudioGen Deployment Script for Alibaba Cloud ECS
# This script is designed for deployment on ECS without EIP, accessed via SSH as root

set -e  # Exit on any error

echo "🚀 Starting StudioGen deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root"
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
yum update -y

# Check for Node.js installation (must be pre-installed)
print_status "Checking for Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18.x or higher before running this script."
    print_error "Installation guide: https://nodejs.org/en/download/package-manager/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm before running this script."
    exit 1
fi

# Verify Node.js version
node_version=$(node -v)
npm_version=$(npm -v)
print_status "Node.js version: $node_version"
print_status "npm version: $npm_version"

# Check Node.js version compatibility (minimum v16)
node_major_version=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$node_major_version" -lt 16 ]; then
    print_error "Node.js version $node_version is not supported. Please install Node.js 16.x or higher."
    exit 1
fi

# Check for PM2 installation (must be pre-installed)
print_status "Checking for PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed. Please install PM2 globally before running this script."
    print_error "Install with: npm install -g pm2"
    exit 1
fi

# Verify PM2 installation
pm2_version=$(pm2 -V)
print_status "PM2 version: $pm2_version"

# Install Git if not present
print_status "Installing Git..."
yum install -y git

# Create application directory (using relative path)
print_status "Setting up application directory..."
APP_DIR="./studiogen"

# Clone or update repository
if [ -d "$APP_DIR" ]; then
    print_status "Updating existing repository..."
    cd $APP_DIR
    git fetch origin
    git checkout minimal-deploy
    git pull origin minimal-deploy
else
    print_status "Cloning repository..."
    git clone -b minimal-deploy https://github.com/SebastianVernis/studiogen.git $APP_DIR
    cd $APP_DIR
fi

# Install dependencies
print_status "Installing application dependencies..."
if [ -f "node_modules.tar.gz" ]; then
    print_status "Found pre-bundled dependencies, extracting..."
    tar -xzf node_modules.tar.gz
    print_status "Dependencies extracted from cache"
elif [ -d "offline_cache" ]; then
    print_status "Installing from offline cache..."
    npm install --cache ./offline_cache --prefer-offline
else
    print_warning "No offline cache found, installing from registry..."
    print_warning "This requires internet connection and may download packages from npm registry"
    npm install
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << EOF
# Google Generative AI API Key (Required)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:9002
NODE_ENV=production

# Server Configuration
PORT=9002
HOST=0.0.0.0
EOF
    print_warning "Please edit .env file and add your Google AI API key!"
    print_warning "You can find the API key instructions in ENV_DOCUMENTATION.md"
fi

# Build the application
print_status "Building the application..."
npm run build

# Create PM2 ecosystem file
print_status "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'studiogen',
    script: 'npm',
    args: 'start',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 9002,
      HOST: '0.0.0.0'
    }
  }]
};
EOF

# Stop existing PM2 processes
print_status "Stopping existing PM2 processes..."
pm2 stop studiogen || true
pm2 delete studiogen || true

# Start the application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
print_status "Setting up PM2 startup script..."
pm2 startup systemd -u root --hp /root

# Install and configure nginx (optional)
print_status "Installing nginx..."
yum install -y nginx

# Create nginx configuration
print_status "Configuring nginx..."
cat > /etc/nginx/conf.d/studiogen.conf << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Start and enable nginx
print_status "Starting nginx..."
systemctl start nginx
systemctl enable nginx

# Configure firewall
print_status "Configuring firewall..."
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=9002/tcp
firewall-cmd --reload || true

# Display status
print_status "Deployment completed successfully!"
print_status "Application status:"
pm2 status

print_status "Application is running on:"
print_status "- Direct access: http://your-server-ip:9002"
print_status "- Via nginx: http://your-server-ip"

print_warning "Don't forget to:"
print_warning "1. Edit .env file with your Google AI API key"
print_warning "2. Restart the application: pm2 restart studiogen"
print_warning "3. Check logs: pm2 logs studiogen"

echo "🎉 StudioGen deployment completed!"
