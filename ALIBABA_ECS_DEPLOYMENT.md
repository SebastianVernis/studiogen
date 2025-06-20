# Alibaba Cloud ECS Deployment Guide for StudioGen

## Prerequisites

- Alibaba Cloud ECS instance (CentOS/RHEL based)
- SSH access as root user
- No EIP required (internal access via SSH)

## Step-by-Step Installation Commands

### 1. Connect to your ECS instance via SSH

```bash
ssh root@your-ecs-internal-ip
```

### 2. Download and execute the deployment script

```bash
# Download the deployment script
curl -O https://raw.githubusercontent.com/SebastianVernis/studiogen/minimal-deploy/deploy.sh

# Make it executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

### 3. Manual Installation Commands (Alternative)

If you prefer to run commands manually instead of using the script:

```bash
# Update system
yum update -y

# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install PM2
npm install -g pm2

# Install Git
yum install -y git

# Clone the repository
git clone -b minimal-deploy https://github.com/SebastianVernis/studiogen.git ./studiogen
cd ./studiogen

# Install dependencies
npm install

# Build the application
npm run build

# Create .env file (copy from ENV_DOCUMENTATION.md)
nano .env

# Start with PM2
pm2 start npm --name "studiogen" -- start
pm2 save
pm2 startup
```

### 4. Required Commands to Verify Installation

```bash
# Check Node.js version
node -v

# Check npm version
npm -v

# Check PM2 version (corrected command)
pm2 -V

# Check PM2 status
pm2 status

# Check application logs
pm2 logs studiogen

# Check if port 9002 is listening
netstat -tlnp | grep 9002

# Test application locally
curl -I http://localhost:9002
```

### 5. Nginx Configuration (Optional)

```bash
# Install nginx
yum install -y nginx

# Start and enable nginx
systemctl start nginx
systemctl enable nginx

# Check nginx status
systemctl status nginx
```

### 6. Firewall Configuration

```bash
# Configure firewall for HTTP/HTTPS
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=9002/tcp
firewall-cmd --reload

# Check firewall status
firewall-cmd --list-all
```

## Environment Variables Setup

1. Copy the .env template from `ENV_DOCUMENTATION.md`
2. Edit the .env file:
   ```bash
   nano .env
   ```
3. Add your Google AI API key
4. Restart the application:
   ```bash
   pm2 restart studiogen
   ```

## Useful PM2 Commands

```bash
# Start application
pm2 start studiogen

# Stop application
pm2 stop studiogen

# Restart application
pm2 restart studiogen

# Delete application from PM2
pm2 delete studiogen

# View logs
pm2 logs studiogen

# View real-time logs
pm2 logs studiogen --lines 50

# Monitor resources
pm2 monit

# List all processes
pm2 list

# Save current PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs studiogen

# Check if port is in use
netstat -tlnp | grep 9002

# Restart PM2
pm2 restart all
```

### Build fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Try building again
npm run build
```

### Permission issues
```bash
# Fix ownership
chown -R root:root ./studiogen

# Fix permissions
chmod -R 755 ./studiogen
```

## Security Considerations

1. **Firewall**: Only open necessary ports
2. **Updates**: Keep system and packages updated
3. **API Keys**: Never commit API keys to version control
4. **Access**: Limit SSH access to trusted IPs
5. **Monitoring**: Set up log monitoring and alerts

## Performance Optimization

1. **PM2 Cluster Mode**: For high traffic
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

2. **Nginx Caching**: Configure nginx for static assets
3. **Memory Limits**: Set appropriate memory limits in PM2
4. **Log Rotation**: Configure log rotation to prevent disk space issues

## Monitoring and Maintenance

```bash
# Check system resources
htop
df -h
free -m

# Check application health
curl -I http://localhost:9002

# Update application
cd ./studiogen
git pull origin minimal-deploy
npm install
npm run build
pm2 restart studiogen
```

## Support

If you encounter issues:
1. Check the logs: `pm2 logs studiogen`
2. Verify environment variables in `.env`
3. Ensure Google AI API key is valid
4. Check system resources and disk space
