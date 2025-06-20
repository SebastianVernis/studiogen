#!/bin/bash

# Script de deployment automatizado para StudioGen en Alibaba Cloud
# Uso: ./deploy.sh [environment] [branch]

set -e

# Configuración
PROJECT_NAME="studiogen"
DEFAULT_ENVIRONMENT="prod"
DEFAULT_BRANCH="main"
APP_DIR="./src/app"
BACKUP_DIR="./backups"
LOG_DIR="$PROJECT_NAME"

# Colores para output
RED='[0;31m'
GREEN='[0;32m'
YELLOW='[1;33m'
BLUE='[0;34m'
NC='[0m' # No Color

# Funciones de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [environment] [branch]"
    echo ""
    echo "Parámetros:"
    echo "  environment  Ambiente de deployment (dev, staging, prod) [default: prod]"
    echo "  branch       Rama de Git a deployar [default: main]"
    echo ""
    echo "Ejemplos:"
    echo "  $0                    # Deploy prod desde main"
    echo "  $0 staging            # Deploy staging desde main"
    echo "  $0 prod develop       # Deploy prod desde develop"
    echo ""
    echo "Variables de entorno requeridas:"
    echo "  DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    echo "  FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL"
    echo "  GOOGLE_GENAI_API_KEY, JWT_SECRET, NEXTAUTH_SECRET"
}

# Función para verificar prerrequisitos
check_prerequisites() {
    log_info "Verificando prerrequisitos..."
    
    # Verificar que estamos ejecutando como root o con sudo
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script debe ejecutarse como root o con sudo"
        exit 1
    fi
    
    # Verificar que existe el directorio de la aplicación
    if [[ ! -d "$APP_DIR" ]]; then
        log_error "Directorio de aplicación no encontrado: $APP_DIR"
        exit 1
    fi
    
    # Verificar que PM2 está instalado
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 no está instalado"
        exit 1
    fi
    
    # Verificar que Node.js está instalado
    if ! command -v node &> /dev/null; then
        log_error "Node.js no está instalado"
        exit 1
    fi
    
    # Verificar variables de entorno críticas
    required_vars=("DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_warning "Variable de entorno $var no está definida"
        fi
    done
    
    log_success "Prerrequisitos verificados"
}

# Función para crear backup
create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/backup_${ENVIRONMENT}_${timestamp}.tar.gz"
    
    log_info "Creando backup..."
    
    # Crear directorio de backup si no existe
    mkdir -p "$BACKUP_DIR"
    
    # Crear backup de la aplicación
    tar -czf "$backup_file" -C "$(dirname $APP_DIR)" "$(basename $APP_DIR)" 2>/dev/null || {
        log_error "Error al crear backup"
        exit 1
    }
    
    # Crear backup de la base de datos si las variables están disponibles
    if [[ -n "$DB_HOST" && -n "$DB_USER" && -n "$DB_PASSWORD" && -n "$DB_NAME" ]]; then
        local db_backup_file="$BACKUP_DIR/db_backup_${ENVIRONMENT}_${timestamp}.sql"
        mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$db_backup_file" 2>/dev/null || {
            log_warning "No se pudo crear backup de la base de datos"
        }
    fi
    
    # Limpiar backups antiguos (mantener últimos 5)
    ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
    ls -t "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
    
    log_success "Backup creado: $backup_file"
    echo "$backup_file" # Return backup file path
}

# Función para detener la aplicación
stop_application() {
    log_info "Deteniendo aplicación..."
    
    sudo -u $PROJECT_NAME pm2 stop $PROJECT_NAME 2>/dev/null || {
        log_warning "La aplicación no estaba ejecutándose"
    }
    
    log_success "Aplicación detenida"
}

# Función para actualizar código
update_code() {
    log_info "Actualizando código desde rama: $BRANCH"
    
    cd "$APP_DIR"
    
    # Verificar que estamos en un repositorio git
    if [[ ! -d ".git" ]]; then
        log_error "No es un repositorio Git válido: $APP_DIR"
        exit 1
    fi
    
    # Fetch latest changes
    sudo -u $PROJECT_NAME git fetch origin || {
        log_error "Error al hacer fetch del repositorio"
        exit 1
    }
    
    # Checkout to specified branch
    sudo -u $PROJECT_NAME git checkout "$BRANCH" || {
        log_error "Error al cambiar a la rama $BRANCH"
        exit 1
    }
    
    # Pull latest changes
    sudo -u $PROJECT_NAME git pull origin "$BRANCH" || {
        log_error "Error al hacer pull de la rama $BRANCH"
        exit 1
    }
    
    log_success "Código actualizado"
}

# Función para instalar dependencias
install_dependencies() {
    log_info "Instalando dependencias..."
    
    cd "$APP_DIR"
    
    # Limpiar node_modules y package-lock.json para instalación limpia
    sudo -u $PROJECT_NAME rm -rf node_modules package-lock.json 2>/dev/null || true
    
    # Instalar dependencias
    sudo -u $PROJECT_NAME npm ci --production --silent || {
        log_error "Error al instalar dependencias"
        exit 1
    }
    
    log_success "Dependencias instaladas"
}

# Función para ejecutar migraciones
run_migrations() {
    log_info "Ejecutando migraciones de base de datos..."
    
    cd "$APP_DIR"
    
    # Verificar que el script de migración existe
    if [[ -f "database/migrate.ts" ]]; then
        sudo -u $PROJECT_NAME npm run db:migrate || {
            log_warning "Error al ejecutar migraciones"
        }
    else
        log_warning "Script de migración no encontrado"
    fi
    
    log_success "Migraciones completadas"
}

# Función para construir la aplicación
build_application() {
    log_info "Construyendo aplicación..."
    
    cd "$APP_DIR"
    
    # Configurar variables de entorno para build
    export NODE_ENV="production"
    export NEXT_TELEMETRY_DISABLED=1
    
    # Construir aplicación
    sudo -u $PROJECT_NAME npm run build || {
        log_error "Error al construir la aplicación"
        exit 1
    }
    
    log_success "Aplicación construida"
}

# Función para iniciar la aplicación
start_application() {
    log_info "Iniciando aplicación..."
    
    cd "$APP_DIR"
    
    # Verificar si existe ecosystem.config.js
    if [[ -f "ecosystem.config.js" ]]; then
        sudo -u $PROJECT_NAME pm2 start ecosystem.config.js || {
            log_error "Error al iniciar aplicación con ecosystem.config.js"
            exit 1
        }
    else
        # Iniciar con configuración básica
        sudo -u $PROJECT_NAME pm2 start npm --name "$PROJECT_NAME" -- start || {
            log_error "Error al iniciar aplicación"
            exit 1
        }
    fi
    
    # Guardar configuración PM2
    sudo -u $PROJECT_NAME pm2 save
    
    log_success "Aplicación iniciada"
}

# Función para verificar deployment
verify_deployment() {
    log_info "Verificando deployment..."
    
    # Esperar a que la aplicación se inicie
    sleep 10
    
    # Verificar que PM2 muestra la aplicación como online
    if sudo -u $PROJECT_NAME pm2 list | grep -q "online"; then
        log_success "Aplicación está ejecutándose en PM2"
    else
        log_error "Aplicación no está ejecutándose correctamente"
        return 1
    fi
    
    # Verificar health check
    local max_attempts=5
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:9002/health &>/dev/null; then
            log_success "Health check exitoso"
            return 0
        else
            log_warning "Health check falló (intento $attempt/$max_attempts)"
            sleep 5
            ((attempt++))
        fi
    done
    
    log_error "Health check falló después de $max_attempts intentos"
    return 1
}

# Función para rollback
rollback() {
    local backup_file="$1"
    
    log_warning "Iniciando rollback..."
    
    # Detener aplicación
    stop_application
    
    # Restaurar backup
    if [[ -f "$backup_file" ]]; then
        tar -xzf "$backup_file" -C "$(dirname $APP_DIR)" || {
            log_error "Error al restaurar backup"
            exit 1
        }
        log_success "Backup restaurado"
    else
        log_error "Archivo de backup no encontrado: $backup_file"
        exit 1
    fi
    
    # Reiniciar aplicación
    start_application
    
    log_success "Rollback completado"
}

# Función para actualizar configuración de Nginx
update_nginx_config() {
    log_info "Actualizando configuración de Nginx..."
    
    # Verificar configuración de Nginx
    nginx -t || {
        log_warning "Configuración de Nginx tiene errores"
        return 1
    }
    
    # Recargar Nginx
    systemctl reload nginx || {
        log_warning "Error al recargar Nginx"
        return 1
    }
    
    log_success "Nginx actualizado"
}

# Función principal
main() {
    # Parsear argumentos
    ENVIRONMENT="${1:-$DEFAULT_ENVIRONMENT}"
    BRANCH="${2:-$DEFAULT_BRANCH}"
    
    # Mostrar ayuda si se solicita
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_help
        exit 0
    fi
    
    # Validar ambiente
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Ambiente inválido: $ENVIRONMENT. Debe ser: dev, staging, o prod"
        exit 1
    fi
    
    log_info "=== Iniciando deployment de $PROJECT_NAME ==="
    log_info "Ambiente: $ENVIRONMENT"
    log_info "Rama: $BRANCH"
    log_info "Timestamp: $(date)"
    
    # Cargar variables de entorno específicas del ambiente
    if [[ -f "/var/www/$PROJECT_NAME/.env.$ENVIRONMENT" ]]; then
        source "/var/www/$PROJECT_NAME/.env.$ENVIRONMENT"
        log_info "Variables de entorno cargadas desde .env.$ENVIRONMENT"
    fi
    
    # Ejecutar pasos del deployment
    check_prerequisites
    
    local backup_file
    backup_file=$(create_backup)
    
    stop_application
    update_code
    install_dependencies
    run_migrations
    build_application
    start_application
    
    # Verificar deployment
    if verify_deployment; then
        update_nginx_config
        log_success "=== Deployment completado exitosamente ==="
        log_info "Aplicación disponible en: http://$(curl -s ifconfig.me):9002"
    else
        log_error "=== Deployment falló ==="
        log_warning "Iniciando rollback automático..."
        rollback "$backup_file"
        exit 1
    fi
}

# Ejecutar función principal con todos los argumentos
main "$@"
