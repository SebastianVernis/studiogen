# StudioGen - Guía de Deployment en Alibaba Cloud

Esta guía completa te ayudará a desplegar StudioGen en Alibaba Cloud usando VPC, ECS, RDS y otras herramientas de la nube.

## 📋 Índice

- [Arquitectura](#arquitectura)
- [Prerrequisitos](#prerrequisitos)
- [Configuración Rápida](#configuración-rápida)
- [Deployment Manual](#deployment-manual)
- [Deployment con Docker](#deployment-con-docker)
- [Deployment con Terraform](#deployment-con-terraform)
- [CI/CD con GitHub Actions](#cicd-con-github-actions)
- [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)
- [Solución de Problemas](#solución-de-problemas)

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Alibaba Cloud VPC                        │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Public Subnet     │    │      Private Subnet         │ │
│  │  (10.0.1.0/24)      │    │     (10.0.2.0/24)          │ │
│  │                     │    │                             │ │
│  │  ┌───────────────┐  │    │  ┌─────────────────────┐    │ │
│  │  │   ECS Web     │  │    │  │    RDS MySQL        │    │ │
│  │  │   Server      │  │    │  │    Database         │    │ │
│  │  │   + Nginx     │  │    │  │                     │    │ │
│  │  │   + PM2       │  │    │  │                     │    │ │
│  │  └───────────────┘  │    │  └─────────────────────┘    │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│           │                                                 │
│  ┌─────────────────────┐                                    │
│  │   Load Balancer     │                                    │
│  │   (SLB)             │                                    │
│  └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
           │
    ┌─────────────┐
    │  Internet   │
    │  Gateway    │
    └─────────────┘
```

## 📋 Prerrequisitos

### Cuentas y Servicios
- ✅ Cuenta activa en Alibaba Cloud
- ✅ Aplicación Termius instalada (para SSH)
- ✅ Dominio registrado (opcional)
- ✅ Certificados SSL

### Herramientas Locales
- ✅ Git
- ✅ Node.js 18+
- ✅ Docker (opcional)
- ✅ Terraform (opcional)

## 🚀 Configuración Rápida

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/studiogen.git
cd studiogen
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env.production
# Editar .env.production con tus valores
```

### 3. Deployment con Script Automatizado
```bash
# Hacer ejecutable el script
chmod +x scripts/deploy.sh

# Ejecutar deployment
sudo ./scripts/deploy.sh prod main
```

## 🔧 Deployment Manual

### Paso 1: Configurar VPC en Alibaba Cloud

1. **Crear VPC**
   ```
   Nombre: studiogen-vpc
   CIDR: 10.0.0.0/16
   Región: cn-hangzhou (o la más cercana)
   ```

2. **Crear Subredes**
   - **Pública**: 10.0.1.0/24 (Web servers)
   - **Privada**: 10.0.2.0/24 (Database)

3. **Configurar Security Groups**
   - **Web SG**: Puertos 22, 80, 443, 9002
   - **DB SG**: Puerto 3306 (solo desde web subnet)

### Paso 2: Crear Instancias ECS

1. **Instancia Web Server**
   ```
   Tipo: ecs.t6-c1m2.large (2 vCPU, 4GB RAM)
   Imagen: Ubuntu 22.04 LTS
   Almacenamiento: 40GB SSD
   ```

2. **Configurar IP Elástica**
   - Crear y asignar EIP a la instancia web

### Paso 3: Configurar Base de Datos RDS

1. **Crear Instancia RDS**
   ```
   Motor: MySQL 8.0
   Tipo: mysql.n2.medium.1
   Almacenamiento: 20GB
   ```

2. **Configurar Acceso**
   - Crear base de datos: `studiogen`
   - Crear usuario: `studiogen`
   - Configurar permisos

### Paso 4: Configurar Servidor

1. **Conectar via SSH**
   ```bash
   ssh -i tu-clave.pem ubuntu@tu-ip-publica
   ```

2. **Ejecutar Script de Configuración**
   ```bash
   # El script user_data.sh se ejecuta automáticamente
   # O ejecutar manualmente:
   sudo bash /path/to/user_data.sh
   ```

3. **Clonar y Configurar Aplicación**
   ```bash
   sudo -u studiogen git clone https://github.com/tu-usuario/studiogen.git /var/www/studiogen/app
   cd /var/www/studiogen/app
   sudo -u studiogen npm install
   sudo -u studiogen npm run build
   ```

4. **Configurar Variables de Entorno**
   ```bash
   sudo cp .env.example /var/www/studiogen/.env.production
   sudo nano /var/www/studiogen/.env.production
   ```

5. **Iniciar Aplicación**
   ```bash
   sudo -u studiogen pm2 start ecosystem.config.js --env production
   sudo -u studiogen pm2 save
   sudo -u studiogen pm2 startup
   ```

### Paso 5: Configurar Nginx

1. **Copiar Configuración**
   ```bash
   sudo cp nginx/nginx.conf /etc/nginx/nginx.conf
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. **Configurar SSL**
   ```bash
   sudo certbot --nginx -d tu-dominio.com
   ```

## 🐳 Deployment con Docker

### 1. Construir Imagen
```bash
docker build -f docker/Dockerfile -t studiogen:latest .
```

### 2. Ejecutar con Docker Compose
```bash
cd docker
docker-compose up -d
```

### 3. Verificar Deployment
```bash
docker-compose ps
curl http://localhost:9002/health
```

## 🏗️ Deployment con Terraform

### 1. Configurar Terraform
```bash
cd terraform
terraform init
```

### 2. Configurar Variables
```bash
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars
```

### 3. Planificar y Aplicar
```bash
terraform plan
terraform apply
```

### 4. Obtener Outputs
```bash
terraform output web_public_ip
terraform output ssh_command
```

## 🔄 CI/CD con GitHub Actions

### 1. Configurar Secrets en GitHub
```
SSH_PRIVATE_KEY: Tu clave privada SSH
STAGING_HOST: IP del servidor de staging
PRODUCTION_HOST: IP del servidor de producción
STAGING_DOMAIN: Dominio de staging
PRODUCTION_DOMAIN: Dominio de producción
```

### 2. Workflow Automático
- **Push a `develop`**: Deploy automático a staging
- **Push a `main`**: Deploy automático a producción
- **Manual**: Deploy manual con selección de ambiente

### 3. Verificación Automática
- Tests unitarios
- Verificación de tipos
- Linting
- Security scan
- Performance tests

## 📊 Monitoreo y Mantenimiento

### Comandos Útiles

#### Gestión de la Aplicación
```bash
# Ver estado
sudo -u studiogen pm2 status

# Ver logs
sudo -u studiogen pm2 logs studiogen

# Reiniciar
sudo -u studiogen pm2 restart studiogen

# Métricas
sudo -u studiogen pm2 monit
```

#### Gestión del Sistema
```bash
# Recursos del sistema
htop
df -h
free -h

# Logs del sistema
sudo journalctl -u nginx -f
sudo tail -f /var/log/nginx/error.log
```

#### Backups
```bash
# Backup manual
sudo /var/www/studiogen/scripts/backup.sh

# Solo aplicación
sudo /var/www/studiogen/scripts/backup.sh --app-only

# Solo base de datos
sudo /var/www/studiogen/scripts/backup.sh --db-only

# Limpiar backups antiguos
sudo /var/www/studiogen/scripts/backup.sh --cleanup
```

### Configuración de Alertas

1. **Configurar Monitoreo de Alibaba Cloud**
   - CloudMonitor para métricas de ECS y RDS
   - Alertas por email/SMS

2. **Configurar Health Checks**
   - Endpoint `/health` para verificación
   - Monitoreo cada 5 minutos

## 🔧 Solución de Problemas

### Aplicación no Responde
```bash
# Verificar proceso
sudo -u studiogen pm2 status

# Ver logs de errores
sudo -u studiogen pm2 logs studiogen --err

# Reiniciar aplicación
sudo -u studiogen pm2 restart studiogen
```

### Problemas de Base de Datos
```bash
# Verificar conectividad
mysql -h $DB_HOST -u $DB_USER -p -e "SELECT 1"

# Ver logs de MySQL
sudo tail -f /var/log/mysql/error.log
```

### Problemas de Nginx
```bash
# Verificar configuración
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Problemas de SSL
```bash
# Verificar certificados
sudo certbot certificates

# Renovar certificados
sudo certbot renew --dry-run

# Verificar configuración SSL
openssl s_client -connect tu-dominio.com:443
```

## 📁 Estructura del Proyecto

```
studiogen/
├── docs/                          # Documentación
│   └── alibaba-cloud-deployment.md
├── docker/                        # Configuración Docker
│   ├── Dockerfile
│   └── docker-compose.yml
├── nginx/                         # Configuración Nginx
│   └── nginx.conf
├── scripts/                       # Scripts de deployment
│   ├── deploy.sh
│   └── backup.sh
├── terraform/                     # Infrastructure as Code
│   ├── main.tf
│   └── user_data.sh
├── .github/workflows/             # CI/CD
│   └── deploy.yml
├── .env.example                   # Variables de entorno
├── ecosystem.config.js            # Configuración PM2
└── README.md                      # Esta guía
```

## 🔐 Seguridad

### Mejores Prácticas
- ✅ Usar claves SSH en lugar de contraseñas
- ✅ Configurar fail2ban para protección contra ataques
- ✅ Mantener el sistema actualizado
- ✅ Usar HTTPS con certificados válidos
- ✅ Configurar firewall (UFW)
- ✅ Backups regulares y automáticos

### Security Groups
- **Web Server**: Solo puertos necesarios (22, 80, 443, 9002)
- **Database**: Solo acceso desde web subnet
- **Load Balancer**: Acceso público solo a puertos web

## 📈 Escalabilidad

### Opciones de Escalamiento
1. **Vertical**: Aumentar recursos de instancias existentes
2. **Horizontal**: Agregar más instancias ECS
3. **Auto Scaling**: Configurar escalamiento automático
4. **CDN**: Usar Alibaba Cloud CDN para contenido estático

### Load Balancing
- Configurar SLB para distribuir carga
- Health checks automáticos
- Failover automático

## 📞 Soporte

Para soporte adicional:
- 📧 Email: soporte@studiogen.com
- 📚 Documentación: [docs.studiogen.com](https://docs.studiogen.com)
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/studiogen/issues)

---

**Nota**: Esta guía asume conocimientos básicos de Linux, redes y administración de servidores. Siempre realiza pruebas en un ambiente de desarrollo antes de aplicar cambios en producción.
