#!/bin/bash

# Script de inicialización para instancia ECS
# Variables pasadas desde Terraform
PROJECT_NAME="${project_name}"
ENVIRONMENT="${environment}"

# Logging
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Iniciando configuración del servidor para $PROJECT_NAME-$ENVIRONMENT"

# Actualizar sistema
apt-get update
apt-get upgrade -y

# Instalar dependencias base
apt-get install -y curl wget git htop unzip software-properties-common

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Instalar Nginx
apt-get install -y nginx

# Instalar PM2
npm install -g pm2

# Instalar Certbot
apt-get install -y certbot python3-certbot-nginx

# Configurar firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 9002
ufw --force enable

# Crear usuario para la aplicación
adduser --system --group --home /var/www/$PROJECT_NAME $PROJECT_NAME
usermod -aG sudo $PROJECT_NAME

# Crear directorios necesarios
mkdir -p /var/www/$PROJECT_NAME/{app,logs,backups}
mkdir -p /var/log/$PROJECT_NAME
chown -R $PROJECT_NAME:$PROJECT_NAME /var/www/$PROJECT_NAME
chown -R $PROJECT_NAME:$PROJECT_NAME /var/log/$PROJECT_NAME

# Configurar logrotate
cat > /etc/logrotate.d/$PROJECT_NAME << EOF
/var/log/$PROJECT_NAME/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $PROJECT_NAME $PROJECT_NAME
    postrotate
        sudo -u $PROJECT_NAME pm2 reload $PROJECT_NAME || true
    endscript
}
EOF

# Configurar crontab para backups
cat > /tmp/crontab_$PROJECT_NAME << EOF
# Backup diario a las 2 AM
0 2 * * * /var/www/$PROJECT_NAME/scripts/backup.sh >> /var/log/$PROJECT_NAME/backup.log 2>&1
# Renovación SSL automática
0 12 * * * /usr/bin/certbot renew --quiet
EOF

crontab -u root /tmp/crontab_$PROJECT_NAME

# Configurar SSH para mayor seguridad
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd

# Configurar límites del sistema
cat >> /etc/security/limits.conf << EOF
$PROJECT_NAME soft nofile 65536
$PROJECT_NAME hard nofile 65536
$PROJECT_NAME soft nproc 32768
$PROJECT_NAME hard nproc 32768
EOF

# Configurar sysctl para mejor rendimiento
cat >> /etc/sysctl.conf << EOF
# Configuración para aplicaciones web
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 400000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
vm.swappiness = 10
EOF

sysctl -p

# Instalar herramientas de monitoreo
apt-get install -y htop iotop nethogs

# Configurar timezone
timedatectl set-timezone Asia/Shanghai

# Crear script de health check
cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash
# Health check script
curl -f http://localhost:9002/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "$(date): Application is healthy"
else
    echo "$(date): Application health check failed"
    # Reiniciar aplicación si falla
    sudo -u studiogen pm2 restart studiogen
fi
EOF

chmod +x /usr/local/bin/health-check.sh

# Configurar health check cada 5 minutos
echo "*/5 * * * * /usr/local/bin/health-check.sh >> /var/log/$PROJECT_NAME/health.log 2>&1" | crontab -

# Configurar fail2ban para seguridad adicional
apt-get install -y fail2ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Configurar monitoreo básico con PM2
sudo -u $PROJECT_NAME pm2 install pm2-logrotate
sudo -u $PROJECT_NAME pm2 set pm2-logrotate:max_size 10M
sudo -u $PROJECT_NAME pm2 set pm2-logrotate:retain 30

# Crear archivo de estado
echo "Server initialized at $(date)" > /var/log/server-init.log
echo "Project: $PROJECT_NAME" >> /var/log/server-init.log
echo "Environment: $ENVIRONMENT" >> /var/log/server-init.log

# Reiniciar servicios
systemctl restart nginx
systemctl enable nginx
systemctl enable docker

echo "Configuración del servidor completada exitosamente"
