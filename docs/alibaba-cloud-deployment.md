# Guía de Deployment en Alibaba Cloud VPC con Gestión SSH via Termius

## Índice
1. [Prerrequisitos](#prerrequisitos)
2. [Configuración de VPC en Alibaba Cloud](#configuración-de-vpc-en-alibaba-cloud)
3. [Configuración de ECS (Elastic Compute Service)](#configuración-de-ecs)
4. [Configuración de SSH en Termius](#configuración-de-ssh-en-termius)
5. [Preparación del Servidor](#preparación-del-servidor)
6. [Deployment de la Aplicación](#deployment-de-la-aplicación)
7. [Configuración de Base de Datos](#configuración-de-base-de-datos)
8. [Configuración de Nginx](#configuración-de-nginx)
9. [Configuración de SSL/TLS](#configuración-de-ssltls)
10. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

## Prerrequisitos

### Cuentas y Servicios Necesarios
- Cuenta activa en Alibaba Cloud
- Aplicación Termius instalada
- Dominio registrado (opcional pero recomendado)
- Certificados SSL (Let's Encrypt recomendado)

### Herramientas Locales
- Git
- Node.js 18+
- Docker (opcional)
- Terraform (para Infrastructure as Code)

## Configuración de VPC en Alibaba Cloud

### Paso 1: Crear VPC
1. Accede a la consola de Alibaba Cloud
2. Navega a **Virtual Private Cloud (VPC)**
3. Haz clic en **Create VPC**
4. Configura los siguientes parámetros:
   ```
   VPC Name: studiogen-vpc
   IPv4 CIDR Block: 10.0.0.0/16
   Region: Selecciona la región más cercana a tus usuarios
   ```

### Paso 2: Crear Subredes
1. Dentro de tu VPC, crea las siguientes subredes:
   
   **Subred Pública (Web Servers)**
   ```
   Name: studiogen-public-subnet
   IPv4 CIDR Block: 10.0.1.0/24
   Availability Zone: Zona A
   ```
   
   **Subred Privada (Database)**
   ```
   Name: studiogen-private-subnet
   IPv4 CIDR Block: 10.0.2.0/24
   Availability Zone: Zona B
   ```

### Paso 3: Configurar Internet Gateway
1. Crea un **Internet Gateway**
2. Asócialo a tu VPC
3. Configura las tablas de rutas para permitir tráfico de internet

### Paso 4: Configurar Security Groups

**Security Group para Web Server**
```
Name: studiogen-web-sg
Inbound Rules:
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- SSH (22): Tu IP pública/32
- Custom (9002): 0.0.0.0/0 (Puerto de la aplicación)

Outbound Rules:
- All Traffic: 0.0.0.0/0
```

**Security Group para Database**
```
Name: studiogen-db-sg
Inbound Rules:
- MySQL (3306): 10.0.1.0/24 (Solo desde subred web)
- SSH (22): 10.0.1.0/24

Outbound Rules:
- All Traffic: 0.0.0.0/0
```

## Configuración de ECS (Elastic Compute Service)

### Paso 1: Crear Instancia ECS para Web Server
1. Navega a **Elastic Compute Service**
2. Haz clic en **Create Instance**
3. Configura los parámetros:
   ```
   Instance Type: ecs.t6-c1m2.large (2 vCPU, 4GB RAM)
   Image: Ubuntu 22.04 LTS
   VPC: studiogen-vpc
   Subnet: studiogen-public-subnet
   Security Group: studiogen-web-sg
   Key Pair: Crea o selecciona un par de claves SSH
   ```

### Paso 2: Crear Instancia ECS para Base de Datos (Opcional)
Si prefieres gestionar tu propia base de datos en lugar de usar RDS:
```
Instance Type: ecs.t6-c2m4.large (2 vCPU, 8GB RAM)
Image: Ubuntu 22.04 LTS
VPC: studiogen-vpc
Subnet: studiogen-private-subnet
Security Group: studiogen-db-sg
```

### Paso 3: Asignar IP Elástica
1. Crea una **Elastic IP Address**
2. Asóciala a tu instancia web server
3. Anota la IP pública asignada

## Configuración de SSH en Termius

### Paso 1: Agregar Host en Termius
1. Abre Termius
2. Haz clic en **"+"** para agregar un nuevo host
3. Configura los siguientes parámetros:
   ```
   Alias: StudioGen Production
   Hostname: [IP_ELASTICA_ASIGNADA]
   Username: ubuntu
   Port: 22
   ```

### Paso 2: Configurar Autenticación por Clave
1. En la configuración del host, ve a **Keys**
2. Importa tu clave privada SSH (.pem file descargado de Alibaba Cloud)
3. O genera un nuevo par de claves desde Termius

### Paso 3: Configurar Túneles SSH (Opcional)
Para acceso seguro a servicios internos:
```
Local Port: 3306
Remote Host: 10.0.2.x (IP de tu servidor de base de datos)
Remote Port: 3306
```

### Paso 4: Probar Conexión
1. Selecciona tu host configurado
2. Haz clic en **Connect**
3. Verifica que puedes acceder al servidor

## Preparación del Servidor

### Paso 1: Actualizar Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### Paso 2: Instalar Dependencias Base
```bash
# Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginx
sudo apt install nginx -y

# PM2 para gestión de procesos
sudo npm install -g pm2

# Git
sudo apt install git -y

# Certbot para SSL
sudo apt install certbot python3-certbot-nginx -y

# MySQL Client (si usas RDS)
sudo apt install mysql-client -y
```

### Paso 3: Configurar Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 9002
sudo ufw enable
```

### Paso 4: Crear Usuario para la Aplicación
```bash
sudo adduser --system --group --home /var/www/studiogen studiogen
sudo usermod -aG sudo studiogen
```

## Deployment de la Aplicación

### Paso 1: Clonar Repositorio
```bash
sudo -u studiogen git clone https://github.com/tu-usuario/studiogen.git /var/www/studiogen/app
cd /var/www/studiogen/app
```

### Paso 2: Configurar Variables de Entorno
```bash
sudo -u studiogen cp .env.example .env.production
sudo -u studiogen nano .env.production
```

Configura las siguientes variables:
```env
NODE_ENV=production
PORT=9002
HOST=0.0.0.0

# Database
DATABASE_URL=mysql://username:password@rds-endpoint:3306/studiogen
DB_HOST=your-rds-endpoint.rds.cn-hangzhou.aliyuncs.com
DB_USER=studiogen
DB_PASSWORD=your-secure-password
DB_NAME=studiogen

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Genkit AI
GOOGLE_GENAI_API_KEY=your-genkit-api-key

# Security
JWT_SECRET=your-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://yourdomain.com
```

### Paso 3: Instalar Dependencias y Construir
```bash
sudo -u studiogen npm ci --production
sudo -u studiogen npm run build
```

### Paso 4: Configurar PM2
```bash
sudo -u studiogen pm2 start npm --name "studiogen" -- start
sudo -u studiogen pm2 save
sudo -u studiogen pm2 startup
```

### Paso 5: Configurar PM2 Ecosystem (Recomendado)
Crea `/var/www/studiogen/app/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'studiogen',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/studiogen/app',
    env: {
      NODE_ENV: 'production',
      PORT: 9002
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/studiogen/error.log',
    out_file: '/var/log/studiogen/out.log',
    log_file: '/var/log/studiogen/combined.log',
    time: true
  }]
};
```

Ejecutar con PM2:
```bash
sudo mkdir -p /var/log/studiogen
sudo chown studiogen:studiogen /var/log/studiogen
sudo -u studiogen pm2 start ecosystem.config.js
```

## Configuración de Base de Datos

### Opción A: Usar ApsaraDB RDS (Recomendado)

#### Paso 1: Crear Instancia RDS
1. En la consola de Alibaba Cloud, navega a **ApsaraDB for RDS**
2. Crea una nueva instancia:
   ```
   Engine: MySQL 8.0
   Edition: High-availability
   Instance Class: mysql.n2.medium.1 (1 vCPU, 2GB RAM)
   Storage: 20GB SSD
   VPC: studiogen-vpc
   Subnet: studiogen-private-subnet
   ```

#### Paso 2: Configurar Seguridad RDS
1. Configura whitelist para permitir acceso desde la subred web
2. Crea usuario de base de datos:
   ```sql
   CREATE USER 'studiogen'@'%' IDENTIFIED BY 'secure_password';
   CREATE DATABASE studiogen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   GRANT ALL PRIVILEGES ON studiogen.* TO 'studiogen'@'%';
   FLUSH PRIVILEGES;
   ```

#### Paso 3: Ejecutar Migraciones
```bash
cd /var/www/studiogen/app
sudo -u studiogen npm run db:migrate
```

### Opción B: MySQL en ECS

Si prefieres gestionar MySQL en tu propia instancia:

```bash
# Instalar MySQL
sudo apt install mysql-server -y

# Configurar MySQL
sudo mysql_secure_installation

# Crear base de datos y usuario
sudo mysql -u root -p
```

```sql
CREATE DATABASE studiogen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'studiogen'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON studiogen.* TO 'studiogen'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Configuración de Nginx

### Paso 1: Crear Configuración del Sitio
Crea `/etc/nginx/sites-available/studiogen`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    # Proxy to Next.js application
    location / {
        proxy_pass http://127.0.0.1:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Static files caching
    location /_next/static {
        proxy_pass http://127.0.0.1:9002;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # API routes
    location /api {
        proxy_pass http://127.0.0.1:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Paso 2: Habilitar Sitio
```bash
sudo ln -s /etc/nginx/sites-available/studiogen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Configuración de SSL/TLS

### Paso 1: Obtener Certificado SSL con Let's Encrypt
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Paso 2: Configurar Renovación Automática
```bash
sudo crontab -e
```

Agregar la siguiente línea:
```cron
0 12 * * * /usr/bin/certbot renew --quiet
```

### Paso 3: Verificar SSL
Visita https://www.ssllabs.com/ssltest/ para verificar la configuración SSL.

## Monitoreo y Mantenimiento

### Paso 1: Configurar Logs
```bash
# Crear directorio de logs
sudo mkdir -p /var/log/studiogen
sudo chown studiogen:studiogen /var/log/studiogen

# Configurar logrotate
sudo nano /etc/logrotate.d/studiogen
```

Contenido de logrotate:
```
/var/log/studiogen/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 studiogen studiogen
    postrotate
        sudo -u studiogen pm2 reload studiogen
    endscript
}
```

### Paso 2: Configurar Monitoreo con PM2
```bash
# Instalar PM2 monitoring
sudo -u studiogen pm2 install pm2-logrotate
sudo -u studiogen pm2 set pm2-logrotate:max_size 10M
sudo -u studiogen pm2 set pm2-logrotate:retain 30
```

### Paso 3: Scripts de Backup
Crea `/var/www/studiogen/scripts/backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/studiogen"
APP_DIR="/var/www/studiogen/app"

# Crear directorio de backup
mkdir -p $BACKUP_DIR

# Backup de la aplicación
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /var/www/studiogen app

# Backup de la base de datos
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# Limpiar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Paso 4: Configurar Cron para Backups
```bash
sudo crontab -e
```

Agregar:
```cron
0 2 * * * /var/www/studiogen/scripts/backup.sh >> /var/log/studiogen/backup.log 2>&1
```

## Scripts de Deployment Automatizado

### Script de Deployment
Crea `/var/www/studiogen/scripts/deploy.sh`:
```bash
#!/bin/bash
set -e

APP_DIR="/var/www/studiogen/app"
BACKUP_DIR="/var/backups/studiogen"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting deployment: $DATE"

# Crear backup antes del deployment
echo "Creating backup..."
tar -czf $BACKUP_DIR/pre_deploy_$DATE.tar.gz -C /var/www/studiogen app

# Cambiar al directorio de la aplicación
cd $APP_DIR

# Detener la aplicación
echo "Stopping application..."
sudo -u studiogen pm2 stop studiogen

# Actualizar código
echo "Updating code..."
sudo -u studiogen git pull origin main

# Instalar dependencias
echo "Installing dependencies..."
sudo -u studiogen npm ci --production

# Ejecutar migraciones
echo "Running migrations..."
sudo -u studiogen npm run db:migrate

# Construir aplicación
echo "Building application..."
sudo -u studiogen npm run build

# Reiniciar aplicación
echo "Starting application..."
sudo -u studiogen pm2 start studiogen

# Verificar que la aplicación esté funcionando
echo "Verifying deployment..."
sleep 10
if curl -f http://localhost:9002/health; then
    echo "Deployment successful!"
else
    echo "Deployment failed! Rolling back..."
    sudo -u studiogen pm2 stop studiogen
    tar -xzf $BACKUP_DIR/pre_deploy_$DATE.tar.gz -C /var/www/studiogen
    sudo -u studiogen pm2 start studiogen
    exit 1
fi

echo "Deployment completed: $DATE"
```

## Comandos Útiles para Gestión via SSH

### Gestión de la Aplicación
```bash
# Ver estado de la aplicación
sudo -u studiogen pm2 status

# Ver logs en tiempo real
sudo -u studiogen pm2 logs studiogen

# Reiniciar aplicación
sudo -u studiogen pm2 restart studiogen

# Recargar aplicación (sin downtime)
sudo -u studiogen pm2 reload studiogen

# Ver métricas
sudo -u studiogen pm2 monit
```

### Gestión del Sistema
```bash
# Ver uso de recursos
htop
df -h
free -h

# Ver logs del sistema
sudo journalctl -u nginx -f
sudo tail -f /var/log/nginx/error.log

# Verificar estado de servicios
sudo systemctl status nginx
sudo systemctl status mysql
```

### Gestión de Base de Datos
```bash
# Conectar a la base de datos
mysql -h $DB_HOST -u $DB_USER -p $DB_NAME

# Ejecutar backup manual
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > backup_$(date +%Y%m%d).sql

# Restaurar backup
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < backup_file.sql
```

## Solución de Problemas Comunes

### Aplicación no responde
```bash
# Verificar si el proceso está corriendo
sudo -u studiogen pm2 status

# Verificar logs de errores
sudo -u studiogen pm2 logs studiogen --err

# Reiniciar aplicación
sudo -u studiogen pm2 restart studiogen
```

### Problemas de Base de Datos
```bash
# Verificar conectividad
mysql -h $DB_HOST -u $DB_USER -p -e "SELECT 1"

# Verificar logs de MySQL
sudo tail -f /var/log/mysql/error.log
```

### Problemas de Nginx
```bash
# Verificar configuración
sudo nginx -t

# Verificar logs
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Problemas de SSL
```bash
# Verificar certificados
sudo certbot certificates

# Renovar certificados manualmente
sudo certbot renew --dry-run

# Verificar configuración SSL
openssl s_client -connect yourdomain.com:443
```

## Checklist de Deployment

### Pre-deployment
- [ ] VPC y subredes configuradas
- [ ] Security groups configurados
- [ ] Instancias ECS creadas
- [ ] IP elástica asignada
- [ ] DNS configurado
- [ ] SSH configurado en Termius

### Deployment
- [ ] Servidor actualizado y configurado
- [ ] Dependencias instaladas
- [ ] Base de datos configurada
- [ ] Variables de entorno configuradas
- [ ] Aplicación construida y desplegada
- [ ] PM2 configurado
- [ ] Nginx configurado
- [ ] SSL configurado

### Post-deployment
- [ ] Aplicación accesible vía HTTPS
- [ ] Todos los endpoints funcionando
- [ ] Base de datos conectada
- [ ] Logs configurados
- [ ] Backups configurados
- [ ] Monitoreo configurado

## Contacto y Soporte

Para soporte adicional o consultas específicas sobre este deployment, contacta al equipo de DevOps o consulta la documentación oficial de Alibaba Cloud.

---

**Nota**: Esta guía asume conocimientos básicos de Linux, redes y administración de servidores. Siempre realiza pruebas en un ambiente de desarrollo antes de aplicar cambios en producción.
