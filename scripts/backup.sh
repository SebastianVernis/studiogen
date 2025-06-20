#!/bin/bash

# Script de backup automatizado para StudioGen
# Ejecuta backups de la aplicación y base de datos

set -e

# Configuración
PROJECT_NAME="studiogen"
BACKUP_DIR="/var/www/$PROJECT_NAME/backups"
APP_DIR="/var/www/$PROJECT_NAME/app"
LOG_FILE="/var/log/$PROJECT_NAME/backup.log"
RETENTION_DAYS=7
MAX_BACKUPS=10

# Colores para output
RED='[0;31m'
GREEN='[0;32m'
YELLOW='[1;33m'
BLUE='[0;34m'
NC='[0m'

# Funciones de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  -h, --help          Mostrar esta ayuda"
    echo "  -a, --app-only      Backup solo de la aplicación"
    echo "  -d, --db-only       Backup solo de la base de datos"
    echo "  -c, --cleanup       Solo limpiar backups antiguos"
    echo "  -r, --retention N   Días de retención (default: $RETENTION_DAYS)"
    echo ""
    echo "Ejemplos:"
    echo "  $0                  # Backup completo"
    echo "  $0 --app-only       # Solo backup de aplicación"
    echo "  $0 --db-only        # Solo backup de base de datos"
    echo "  $0 --cleanup        # Solo limpiar backups antiguos"
}

# Función para verificar prerrequisitos
check_prerequisites() {
    log_info "Verificando prerrequisitos..."
    
    # Crear directorio de backup si no existe
    mkdir -p "$BACKUP_DIR"
    
    # Verificar que existe el directorio de la aplicación
    if [[ ! -d "$APP_DIR" ]]; then
        log_error "Directorio de aplicación no encontrado: $APP_DIR"
        exit 1
    fi
    
    # Verificar espacio en disco
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB en KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_warning "Espacio en disco bajo. Disponible: ${available_space}KB, Requerido: ${required_space}KB"
    fi
    
    log_success "Prerrequisitos verificados"
}

# Función para cargar variables de entorno
load_env_vars() {
    if [[ -f "/var/www/$PROJECT_NAME/.env.production" ]]; then
        source "/var/www/$PROJECT_NAME/.env.production"
        log_info "Variables de entorno cargadas"
    else
        log_warning "Archivo .env.production no encontrado"
    fi
}

# Función para backup de la aplicación
backup_application() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/app_backup_${timestamp}.tar.gz"
    
    log_info "Iniciando backup de la aplicación..."
    
    # Crear backup excluyendo archivos innecesarios
    tar -czf "$backup_file"         --exclude="node_modules"         --exclude=".next"         --exclude="*.log"         --exclude=".git"         --exclude="coverage"         --exclude="dist"         -C "$(dirname $APP_DIR)"         "$(basename $APP_DIR)" 2>/dev/null || {
        log_error "Error al crear backup de la aplicación"
        return 1
    }
    
    # Verificar integridad del backup
    if tar -tzf "$backup_file" >/dev/null 2>&1; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        log_success "Backup de aplicación creado: $backup_file ($file_size)"
        
        # Crear checksum
        sha256sum "$backup_file" > "${backup_file}.sha256"
        log_info "Checksum creado: ${backup_file}.sha256"
    else
        log_error "Backup de aplicación corrupto: $backup_file"
        rm -f "$backup_file"
        return 1
    fi
    
    return 0
}

# Función para backup de la base de datos
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/db_backup_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    
    log_info "Iniciando backup de la base de datos..."
    
    # Verificar variables de entorno
    if [[ -z "$DB_HOST" || -z "$DB_USER" || -z "$DB_PASSWORD" || -z "$DB_NAME" ]]; then
        log_error "Variables de base de datos no configuradas"
        return 1
    fi
    
    # Crear backup de la base de datos
    mysqldump         --host="$DB_HOST"         --user="$DB_USER"         --password="$DB_PASSWORD"         --single-transaction         --routines         --triggers         --events         --add-drop-database         --databases "$DB_NAME" > "$backup_file" 2>/dev/null || {
        log_error "Error al crear backup de la base de datos"
        rm -f "$backup_file"
        return 1
    }
    
    # Comprimir backup
    gzip "$backup_file" || {
        log_error "Error al comprimir backup de la base de datos"
        rm -f "$backup_file"
        return 1
    }
    
    # Verificar que el backup no está vacío
    if [[ -s "$compressed_file" ]]; then
        local file_size=$(du -h "$compressed_file" | cut -f1)
        log_success "Backup de base de datos creado: $compressed_file ($file_size)"
        
        # Crear checksum
        sha256sum "$compressed_file" > "${compressed_file}.sha256"
        log_info "Checksum creado: ${compressed_file}.sha256"
    else
        log_error "Backup de base de datos vacío: $compressed_file"
        rm -f "$compressed_file"
        return 1
    fi
    
    return 0
}

# Función para limpiar backups antiguos
cleanup_old_backups() {
    log_info "Limpiando backups antiguos (retención: $RETENTION_DAYS días)..."
    
    local deleted_count=0
    
    # Limpiar por fecha
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -type f | while read -r file; do
        rm -f "$file" "${file}.sha256" 2>/dev/null
        log_info "Eliminado backup antiguo: $(basename "$file")"
        ((deleted_count++))
    done
    
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -type f | while read -r file; do
        rm -f "$file" "${file}.sha256" 2>/dev/null
        log_info "Eliminado backup antiguo: $(basename "$file")"
        ((deleted_count++))
    done
    
    # Mantener solo los últimos N backups
    ls -t "$BACKUP_DIR"/app_backup_*.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | while read -r file; do
        rm -f "$file" "${file}.sha256" 2>/dev/null
        log_info "Eliminado backup excedente: $(basename "$file")"
        ((deleted_count++))
    done
    
    ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | while read -r file; do
        rm -f "$file" "${file}.sha256" 2>/dev/null
        log_info "Eliminado backup excedente: $(basename "$file")"
        ((deleted_count++))
    done
    
    # Limpiar checksums huérfanos
    find "$BACKUP_DIR" -name "*.sha256" -type f | while read -r checksum_file; do
        local original_file="${checksum_file%.sha256}"
        if [[ ! -f "$original_file" ]]; then
            rm -f "$checksum_file"
            log_info "Eliminado checksum huérfano: $(basename "$checksum_file")"
        fi
    done
    
    log_success "Limpieza de backups completada"
}

# Función para verificar integridad de backups
verify_backups() {
    log_info "Verificando integridad de backups..."
    
    local verified_count=0
    local failed_count=0
    
    # Verificar backups de aplicación
    find "$BACKUP_DIR" -name "app_backup_*.tar.gz" -type f | while read -r backup_file; do
        local checksum_file="${backup_file}.sha256"
        if [[ -f "$checksum_file" ]]; then
            if sha256sum -c "$checksum_file" >/dev/null 2>&1; then
                log_info "✓ Backup verificado: $(basename "$backup_file")"
                ((verified_count++))
            else
                log_error "✗ Backup corrupto: $(basename "$backup_file")"
                ((failed_count++))
            fi
        else
            log_warning "Checksum no encontrado para: $(basename "$backup_file")"
        fi
    done
    
    # Verificar backups de base de datos
    find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -type f | while read -r backup_file; do
        local checksum_file="${backup_file}.sha256"
        if [[ -f "$checksum_file" ]]; then
            if sha256sum -c "$checksum_file" >/dev/null 2>&1; then
                log_info "✓ Backup verificado: $(basename "$backup_file")"
                ((verified_count++))
            else
                log_error "✗ Backup corrupto: $(basename "$backup_file")"
                ((failed_count++))
            fi
        else
            log_warning "Checksum no encontrado para: $(basename "$backup_file")"
        fi
    done
    
    log_success "Verificación completada. Verificados: $verified_count, Fallidos: $failed_count"
}

# Función para generar reporte de backups
generate_report() {
    log_info "Generando reporte de backups..."
    
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d).txt"
    
    {
        echo "=== REPORTE DE BACKUPS - $(date) ==="
        echo ""
        echo "Directorio de backups: $BACKUP_DIR"
        echo "Retención configurada: $RETENTION_DAYS días"
        echo "Máximo de backups: $MAX_BACKUPS"
        echo ""
        
        echo "=== BACKUPS DE APLICACIÓN ==="
        find "$BACKUP_DIR" -name "app_backup_*.tar.gz" -type f -exec ls -lh {} \; | sort -k9
        echo ""
        
        echo "=== BACKUPS DE BASE DE DATOS ==="
        find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -type f -exec ls -lh {} \; | sort -k9
        echo ""
        
        echo "=== ESPACIO EN DISCO ==="
        df -h "$BACKUP_DIR"
        echo ""
        
        echo "=== TAMAÑO TOTAL DE BACKUPS ==="
        du -sh "$BACKUP_DIR"
        
    } > "$report_file"
    
    log_success "Reporte generado: $report_file"
}

# Función principal
main() {
    local app_only=false
    local db_only=false
    local cleanup_only=false
    
    # Parsear argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -a|--app-only)
                app_only=true
                shift
                ;;
            -d|--db-only)
                db_only=true
                shift
                ;;
            -c|--cleanup)
                cleanup_only=true
                shift
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            *)
                log_error "Opción desconocida: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Validar argumentos mutuamente excluyentes
    if [[ "$app_only" == true && "$db_only" == true ]]; then
        log_error "Las opciones --app-only y --db-only son mutuamente excluyentes"
        exit 1
    fi
    
    log_info "=== Iniciando proceso de backup ==="
    log_info "Proyecto: $PROJECT_NAME"
    log_info "Timestamp: $(date)"
    
    # Ejecutar prerrequisitos
    check_prerequisites
    load_env_vars
    
    # Ejecutar solo limpieza si se solicita
    if [[ "$cleanup_only" == true ]]; then
        cleanup_old_backups
        generate_report
        log_success "=== Limpieza de backups completada ==="
        exit 0
    fi
    
    local success=true
    
    # Ejecutar backups según las opciones
    if [[ "$db_only" != true ]]; then
        if ! backup_application; then
            success=false
        fi
    fi
    
    if [[ "$app_only" != true ]]; then
        if ! backup_database; then
            success=false
        fi
    fi
    
    # Limpiar backups antiguos
    cleanup_old_backups
    
    # Verificar integridad
    verify_backups
    
    # Generar reporte
    generate_report
    
    if [[ "$success" == true ]]; then
        log_success "=== Proceso de backup completado exitosamente ==="
    else
        log_error "=== Proceso de backup completado con errores ==="
        exit 1
    fi
}

# Ejecutar función principal con todos los argumentos
main "$@"
