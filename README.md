# StudioGen - Generador de Imágenes con IA

StudioGen es una aplicación para generar arte con IA, utilizando prompts personalizados, análisis avanzado de texto y subida de imágenes a Google Drive.

---

## Metodología de Instalación Offline

StudioGen ahora soporta instalación completamente offline para entornos sin acceso a internet durante el deployment.

### Requisitos Previos

**En el sistema de desarrollo (con internet):**
1. **Node.js**: Versión 16.x o superior ([Descargar Node.js](https://nodejs.org/))
2. **npm**: Incluido con Node.js
3. **PM2**: Instalar globalmente con `npm install -g pm2`
4. **Git**: Para clonar el repositorio

**En el servidor de deployment:**
1. **Node.js**: Versión 16.x o superior (pre-instalado)
2. **PM2**: Pre-instalado globalmente
3. **Git**: Para clonar el repositorio (opcional si se transfieren archivos manualmente)

---

## Instalación y Deployment

### Opción 1: Preparación Offline (Recomendada)

**Paso 1: Preparar en sistema con internet**
```bash
# Clonar el repositorio
git clone https://github.com/SebastianVernis/studiogen.git
cd studiogen

# Preparar para instalación offline
npm run prepare-offline
```

**Paso 2: Transferir archivos al servidor**
Transferir los siguientes archivos/directorios al servidor:
- Todo el código fuente del proyecto
- `node_modules.tar.gz` (dependencias empaquetadas)
- `offline_cache/` (caché de npm)
- `.next/` (aplicación construida)

**Paso 3: Deployment en servidor**
```bash
# En el servidor (como root)
chmod +x deploy.sh
./deploy.sh
```

### Opción 2: Instalación Tradicional (Requiere Internet)

```bash
# Descargar y ejecutar script de deployment
curl -O https://raw.githubusercontent.com/SebastianVernis/studiogen/minimal-deploy/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

---

## Scripts Disponibles

### Scripts de Desarrollo
- `npm run dev` - Ejecutar en modo desarrollo
- `npm run build` - Construir para producción
- `npm run start` - Ejecutar en modo producción
- `npm run lint` - Verificar código
- `npm run typecheck` - Verificar tipos TypeScript

### Scripts de Deployment Offline
- `npm run prepare-offline` - Preparar aplicación para deployment offline
- `npm run install-offline` - Instalar dependencias en modo offline
- `npm run install-from-cache` - Instalar desde caché local

---

## Configuración de Variables de Entorno

1. **Crear archivo .env** (se crea automáticamente durante deployment):
```bash
# Google Generative AI API Key (Requerido)
GOOGLE_GENERATIVE_AI_API_KEY=tu_clave_api_aqui

# Configuración Next.js
NEXT_PUBLIC_APP_URL=http://localhost:9002
NODE_ENV=production

# Configuración del Servidor
PORT=9002
HOST=0.0.0.0
```

2. **Obtener API Key de Google AI**:
   - Visita [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Crea una nueva API key
   - Copia la clave al archivo .env

3. **Reiniciar aplicación**:
```bash
pm2 restart studiogen
```

---

## Verificación de Instalación

```bash
# Verificar estado de la aplicación
pm2 status

# Ver logs
pm2 logs studiogen

# Verificar que el puerto esté activo
netstat -tlnp | grep 9002

# Probar la aplicación
curl -I http://localhost:9002
```

---

## Comandos Útiles de PM2

```bash
# Gestión de procesos
pm2 start studiogen     # Iniciar aplicación
pm2 stop studiogen      # Detener aplicación
pm2 restart studiogen   # Reiniciar aplicación
pm2 delete studiogen    # Eliminar de PM2

# Monitoreo
pm2 logs studiogen      # Ver logs
pm2 monit               # Monitor en tiempo real
pm2 list                # Listar procesos
```

---

## Solución de Problemas

### La aplicación no inicia
```bash
# Verificar logs
pm2 logs studiogen

# Verificar variables de entorno
cat .env

# Reiniciar PM2
pm2 restart all
```

### Problemas de construcción
```bash
# Limpiar caché
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules
npm install

# Reconstruir
npm run build
```

### Problemas de permisos
```bash
# Corregir permisos (como root)
chown -R root:root ./studiogen
chmod -R 755 ./studiogen
```

---

## Acceso a la Aplicación

Una vez desplegada, la aplicación estará disponible en:
- **Acceso directo**: `http://tu-servidor-ip:9002`
- **Via nginx**: `http://tu-servidor-ip` (puerto 80)

---

## Soporte

Para más información detallada sobre deployment, consulta:
- `ALIBABA_ECS_DEPLOYMENT.md` - Guía completa de deployment
- `ENV_DOCUMENTATION.md` - Documentación de variables de entorno

Si encuentras problemas:
1. Revisa los logs: `pm2 logs studiogen`
2. Verifica las variables de entorno en `.env`
3. Asegúrate de que la API key de Google AI sea válida
4. Verifica recursos del sistema y espacio en disco
