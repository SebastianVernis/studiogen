# Alibaba Cloud ECS Deployment Guide for StudioGen

## Metodología de Deployment Offline

StudioGen ahora soporta deployment completamente offline, eliminando la necesidad de descargar Node.js y dependencias durante la instalación en el servidor.

## Prerequisites

**En el servidor de deployment:**
- Alibaba Cloud ECS instance (CentOS/RHEL based)
- SSH access as root user
- **Node.js 16.x o superior** (pre-instalado)
- **PM2** (pre-instalado globalmente)
- **Git** (para clonar repositorio, opcional)
- No EIP required (internal access via SSH)

**En el sistema de desarrollo:**
- Node.js 16.x o superior
- npm y PM2 instalados
- Acceso a internet para preparar archivos offline

---

## Opción 1: Deployment Offline (Recomendado)

### Paso 1: Preparación en Sistema de Desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/SebastianVernis/studiogen.git
cd studiogen

# Preparar para deployment offline
npm run prepare-offline
```

Este comando creará:
- `node_modules.tar.gz` - Dependencias empaquetadas
- `offline_cache/` - Caché de npm
- `.next/` - Aplicación construida

### Paso 2: Transferir Archivos al Servidor

Transferir al servidor ECS:
```bash
# Comprimir proyecto completo
tar -czf studiogen-offline.tar.gz .

# Transferir via SCP
scp studiogen-offline.tar.gz root@your-ecs-ip:/root/

# O usar rsync
rsync -avz --progress ./ root@your-ecs-ip:/root/studiogen/
```

### Paso 3: Deployment en Servidor ECS

```bash
# Conectar al servidor
ssh root@your-ecs-internal-ip

# Extraer archivos (si se usó tar)
tar -xzf studiogen-offline.tar.gz
cd studiogen

# Ejecutar deployment offline
chmod +x deploy.sh
./deploy.sh
```

---

## Opción 2: Instalación Manual Paso a Paso

### 1. Verificar Prerequisitos en el Servidor

```bash
# Verificar Node.js (debe estar pre-instalado)
node -v  # Debe mostrar v16.x o superior
npm -v

# Verificar PM2 (debe estar pre-instalado)
pm2 -V

# Si no están instalados, instalar primero:
# curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
# yum install -y nodejs
# npm install -g pm2
```

### 2. Preparar Directorio de Aplicación

```bash
# Actualizar sistema
yum update -y

# Instalar Git si no está presente
yum install -y git

# Clonar repositorio
git clone -b minimal-deploy https://github.com/SebastianVernis/studiogen.git ./studiogen
cd ./studiogen
```

### 3. Instalación de Dependencias

**Si tienes archivos offline:**
```bash
# Extraer dependencias pre-empaquetadas
tar -xzf node_modules.tar.gz

# O instalar desde caché offline
npm run install-from-cache
```

**Si necesitas instalar desde internet:**
```bash
npm install
```

### 4. Configuración y Build

```bash
# Crear archivo .env
cat > .env << EOF
# Google Generative AI API Key (Requerido)
GOOGLE_GENERATIVE_AI_API_KEY=tu_clave_api_aqui

# Configuración Next.js
NEXT_PUBLIC_APP_URL=http://localhost:9002
NODE_ENV=production

# Configuración del Servidor
PORT=9002
HOST=0.0.0.0
EOF

# Construir aplicación (si no se hizo offline)
npm run build
```

### 5. Configurar PM2

```bash
# Crear archivo de configuración PM2
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

# Iniciar aplicación
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
```

---

## Configuración de Nginx (Opcional)

```bash
# Instalar nginx
yum install -y nginx

# Configurar proxy
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

# Iniciar nginx
systemctl start nginx
systemctl enable nginx
```

---

## Configuración de Firewall

```bash
# Configurar firewall
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=9002/tcp
firewall-cmd --reload

# Verificar configuración
firewall-cmd --list-all
```

---

## Comandos de Verificación

```bash
# Verificar instalación de Node.js
node -v
npm -v

# Verificar PM2
pm2 -V
pm2 status

# Verificar aplicación
pm2 logs studiogen
netstat -tlnp | grep 9002
curl -I http://localhost:9002

# Verificar nginx (si está instalado)
systemctl status nginx
```

---

## Gestión de la Aplicación

### Comandos PM2 Útiles

```bash
# Gestión básica
pm2 start studiogen     # Iniciar
pm2 stop studiogen      # Detener
pm2 restart studiogen   # Reiniciar
pm2 delete studiogen    # Eliminar

# Monitoreo
pm2 logs studiogen      # Ver logs
pm2 logs studiogen --lines 50  # Últimas 50 líneas
pm2 monit               # Monitor en tiempo real
pm2 list                # Listar procesos

# Configuración
pm2 save                # Guardar configuración
pm2 startup             # Configurar inicio automático
```

### Actualización de la Aplicación

```bash
# Método offline (recomendado)
# 1. Preparar nueva versión en sistema de desarrollo
# 2. Transferir archivos actualizados
# 3. Extraer y reiniciar

# Método online
cd ./studiogen
git pull origin minimal-deploy
npm install  # Solo si hay nuevas dependencias
npm run build
pm2 restart studiogen
```

---

## Solución de Problemas

### Prerequisitos No Cumplidos

```bash
# Si Node.js no está instalado
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Si PM2 no está instalado
npm install -g pm2
```

### Problemas de Dependencias

```bash
# Limpiar e reinstalar
rm -rf node_modules
npm cache clean --force
npm install

# Usar caché offline si está disponible
npm run install-from-cache
```

### Problemas de Build

```bash
# Verificar espacio en disco
df -h

# Verificar memoria
free -m

# Reconstruir
npm run build
```

### Problemas de Permisos

```bash
# Corregir permisos
chown -R root:root ./studiogen
chmod -R 755 ./studiogen
chmod +x deploy.sh
```

### Problemas de Red

```bash
# Verificar puertos
netstat -tlnp | grep 9002
ss -tlnp | grep 9002

# Verificar firewall
firewall-cmd --list-all
iptables -L
```

---

## Monitoreo y Mantenimiento

### Verificación de Salud del Sistema

```bash
# Recursos del sistema
htop
df -h
free -m
iostat

# Estado de la aplicación
curl -I http://localhost:9002
pm2 logs studiogen --lines 20
```

### Logs y Debugging

```bash
# Logs de PM2
pm2 logs studiogen

# Logs del sistema
journalctl -u nginx
tail -f /var/log/messages

# Logs de aplicación
tail -f ~/.pm2/logs/studiogen-out.log
tail -f ~/.pm2/logs/studiogen-error.log
```

### Backup y Restauración

```bash
# Backup de configuración
tar -czf studiogen-backup-$(date +%Y%m%d).tar.gz ./studiogen .env

# Backup de PM2
pm2 save
cp ~/.pm2/dump.pm2 ~/pm2-backup-$(date +%Y%m%d).json
```

---

## Optimización de Performance

### Configuración PM2 para Alta Carga

```bash
# Modo cluster (usar todos los cores)
pm2 start ecosystem.config.js --env production -i max

# Configuración de memoria
pm2 start ecosystem.config.js --max-memory-restart 1G
```

### Configuración Nginx para Performance

```bash
# Añadir a /etc/nginx/conf.d/studiogen.conf
# Dentro del bloque server:

# Compresión
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Cache de archivos estáticos
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Seguridad

### Configuraciones Recomendadas

```bash
# Actualizar sistema regularmente
yum update -y

# Configurar fail2ban (opcional)
yum install -y epel-release
yum install -y fail2ban

# Limitar acceso SSH
# Editar /etc/ssh/sshd_config
# PermitRootLogin no
# AllowUsers your-user
```

### Variables de Entorno Seguras

```bash
# Nunca commitear .env al repositorio
echo ".env" >> .gitignore

# Usar permisos restrictivos
chmod 600 .env
chown root:root .env
```

---

## Soporte y Recursos Adicionales

### Documentación Relacionada
- `README.md` - Guía general de instalación
- `ENV_DOCUMENTATION.md` - Variables de entorno

### Contacto y Soporte
Si encuentras problemas:
1. Verifica los logs: `pm2 logs studiogen`
2. Revisa las variables de entorno en `.env`
3. Confirma que la API key de Google AI sea válida
4. Verifica recursos del sistema (CPU, memoria, disco)
5. Consulta la documentación de troubleshooting

### Recursos Útiles
- [Node.js Documentation](https://nodejs.org/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Nginx Configuration](https://nginx.org/en/docs/)
