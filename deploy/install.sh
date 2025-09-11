#!/bin/bash

# LENS - Sistema de Gestión de Contenido Multimedia
# Script de instalación automática para Ubuntu 24.04 LTS
# Versión: 4.0 - CORREGIDO Y MEJORADO
# Autor: GtrhSystems

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Variables globales
PROJECT_DIR="/opt/lens"
CURRENT_DIR="$(pwd)"
INSTALL_LOG="/tmp/lens_install.log"

log_info "🚀 Iniciando instalación de LENS v4.0..."
log_info "📋 Sistema objetivo: Ubuntu 24.04 LTS"
log_info "🏢 Optimizado para Contabo VPS"
echo ""

# Función para logging con timestamp
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$INSTALL_LOG"
}

# Verificar que se ejecuta como root
if [[ $EUID -ne 0 ]]; then
   log_error "Este script debe ejecutarse como root (sudo)"
   exit 1
fi

# Verificar Ubuntu 24.04
if ! grep -q "Ubuntu 24.04" /etc/os-release; then
    log_warning "Este script está optimizado para Ubuntu 24.04 LTS"
    read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para generar contraseñas seguras
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Función para verificar servicios
verify_service() {
    local service_name="$1"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if systemctl is-active --quiet "$service_name"; then
            log_success "Servicio $service_name está activo"
            return 0
        fi
        log_info "Esperando servicio $service_name... (intento $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log_error "Servicio $service_name no se pudo iniciar después de $max_attempts intentos"
    return 1
}

# Crear directorio de logs
mkdir -p "$(dirname "$INSTALL_LOG")"
log_with_timestamp "Iniciando instalación de LENS"

# Actualizar sistema
log_info "Actualizando sistema..."
apt update && apt upgrade -y

# Instalar paquetes esenciales
log_info "Instalando paquetes esenciales..."
apt install -y curl git wget gnupg2 software-properties-common \
    apt-transport-https ca-certificates lsb-release ufw \
    build-essential python3-pip jq unzip postgresql-client \
    openssl certbot nginx

# Instalar Docker usando el método oficial actualizado
log_info "Instalando Docker..."
if ! command_exists docker; then
    # Remover versiones antiguas
    apt remove -y docker docker-engine docker.io containerd runc || true
    
    # Agregar repositorio oficial de Docker
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Iniciar y habilitar Docker
    systemctl start docker
    systemctl enable docker
    
    # Verificar instalación
    if verify_service docker; then
        log_success "Docker instalado y configurado correctamente"
    else
        log_error "Error al instalar Docker"
        exit 1
    fi
else
    log_info "Docker ya está instalado"
fi

# Instalar Node.js 22 LTS
log_info "Instalando Node.js 22 LTS..."
if ! command_exists node || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
    
    # Verificar instalación
    if command_exists node && command_exists npm; then
        node_version=$(node -v)
        npm_version=$(npm -v)
        log_success "Node.js $node_version y npm $npm_version instalados"
    else
        log_error "Error al instalar Node.js"
        exit 1
    fi
else
    log_info "Node.js ya está instalado y actualizado"
fi

# Crear usuario lens
log_info "Configurando usuario lens..."
if ! id "lens" &>/dev/null; then
    useradd -m -s /bin/bash lens
    usermod -aG sudo lens
    usermod -aG docker lens
    log_success "Usuario lens creado"
else
    log_info "Usuario lens ya existe"
    # Asegurar que esté en los grupos correctos
    usermod -aG sudo lens
    usermod -aG docker lens
fi

# Crear directorio del proyecto
log_info "Configurando directorio del proyecto..."
mkdir -p "$PROJECT_DIR"
chown lens:lens "$PROJECT_DIR"
chmod 755 "$PROJECT_DIR"

# Copiar archivos del proyecto
log_info "Copiando archivos del proyecto..."
if [ "$CURRENT_DIR" != "$PROJECT_DIR" ]; then
    # Copiar todos los archivos del directorio actual al directorio del proyecto
    cp -r "$CURRENT_DIR"/* "$PROJECT_DIR"/ 2>/dev/null || true
    cp -r "$CURRENT_DIR"/.[^.]* "$PROJECT_DIR"/ 2>/dev/null || true
    
    # Cambiar al directorio del proyecto
    cd "$PROJECT_DIR"
fi

# Verificar archivos críticos
log_info "Verificando estructura del proyecto..."
required_files=(
    "package.json"
    "docker-compose.yml"
    "Dockerfile"
    "src/server.ts"
    "src/config/config.ts"
    "prisma/schema.prisma"
    ".env.example"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Archivo crítico faltante: $file"
        exit 1
    fi
done

log_success "Estructura del proyecto verificada"

# Generar credenciales seguras
log_info "Generando credenciales seguras..."
DB_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)
JWT_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Solicitar API keys
echo ""
log_warning "Se requieren las siguientes API keys:"
echo "Puedes obtenerlas en:"
echo "- TMDB: https://www.themoviedb.org/settings/api"
echo "- OMDB: http://www.omdbapi.com/apikey.aspx"
echo ""
read -p "TMDB API Key: " TMDB_API_KEY
read -p "OMDB API Key: " OMDB_API_KEY

if [ -z "$TMDB_API_KEY" ] || [ -z "$OMDB_API_KEY" ]; then
    log_error "Las API keys son obligatorias para el funcionamiento del sistema"
    exit 1
fi

# Crear archivo .env con manejo de errores mejorado
log_info "Configurando variables de entorno..."

# Función para crear .env de forma segura
create_env_file() {
    local env_file="$PROJECT_DIR/.env"
    
    # Asegurar permisos del directorio
    chown -R lens:lens "$PROJECT_DIR"
    chmod -R 755 "$PROJECT_DIR"
    
    # Crear archivo temporal
    local temp_env="/tmp/lens_env_$$"
    
    cat > "$temp_env" << EOF
# Configuración del Servidor
PORT=3001
NODE_ENV=production
CORS_ORIGIN=*

# Base de Datos PostgreSQL
DATABASE_URL="postgresql://lens_user:${DB_PASSWORD}@postgres:5432/lens_db"

# Redis Cache
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}
CACHE_TTL=3600

# APIs Externas
TMDB_API_KEY=${TMDB_API_KEY}
TMDB_BASE_URL=https://api.themoviedb.org/3
OMDB_API_KEY=${OMDB_API_KEY}
OMDB_BASE_URL=http://www.omdbapi.com

# Configuración de Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configuración de Logs
LOG_LEVEL=info
LOG_FILE_PATH=./logs/lens.log

# Configuración de Archivos
UPLOAD_MAX_SIZE=50MB
UPLOAD_PATH=./uploads

# Configuración de Seguridad
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Configuración de Backup
BACKUP_ENABLED=true
BACKUP_INTERVAL=24h
BACKUP_PATH=./backups

# Variables para Docker Compose
DB_PASSWORD=${DB_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
EOF
    
    # Mover archivo temporal al destino final
    mv "$temp_env" "$env_file"
    
    # Configurar permisos
    chown lens:lens "$env_file"
    chmod 600 "$env_file"
    
    # Verificar
    if [ -f "$env_file" ] && [ -r "$env_file" ]; then
        log_success "Archivo .env creado correctamente"
        return 0
    else
        log_error "Error al crear el archivo .env"
        return 1
    fi
}

# Llamar a la función
if ! create_env_file; then
    exit 1
fi

log_success "Archivo .env creado correctamente"

# Crear directorios necesarios
log_info "Creando directorios necesarios..."
sudo -u lens mkdir -p "$PROJECT_DIR"/{logs,uploads,backups,ssl}

# Instalar dependencias de Node.js
log_info "Instalando dependencias de Node.js..."
sudo -u lens bash << 'EOF'
cd /opt/lens

# Instalar dependencias faltantes críticas
npm install joi helmet compression cors
npm install --save-dev @types/joi @types/cors nodemon eslint prettier

# Instalar todas las dependencias del proyecto
npm install

# Generar Prisma Client
npx prisma generate
EOF

if [ $? -eq 0 ]; then
    log_success "Dependencias de Node.js instaladas correctamente"
else
    log_error "Error al instalar dependencias de Node.js"
    exit 1
fi

# Compilar aplicación
log_info "Compilando aplicación TypeScript..."
sudo -u lens bash << 'EOF'
cd /opt/lens
npm run build
EOF

if [ $? -eq 0 ]; then
    log_success "Aplicación compilada correctamente"
else
    log_error "Error al compilar la aplicación"
    exit 1
fi

# Configurar PostgreSQL (solo para crear usuario y base de datos)
log_info "Configurando PostgreSQL..."
apt install -y postgresql-16 postgresql-contrib-16
systemctl start postgresql
systemctl enable postgresql

# Esperar a que PostgreSQL esté listo
sleep 5

sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS lens_db;
DROP USER IF EXISTS lens_user;
CREATE USER lens_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE lens_db OWNER lens_user;
GRANT ALL PRIVILEGES ON DATABASE lens_db TO lens_user;
ALTER USER lens_user CREATEDB;
\q
EOF

log_success "Base de datos PostgreSQL configurada"

# Iniciar servicios Docker
log_info "Iniciando servicios Docker..."
sudo -u lens bash << 'EOF'
cd /opt/lens
docker compose up -d --build
EOF

# Esperar a que los servicios estén listos
log_info "Esperando servicios Docker..."
sleep 30

# Ejecutar migraciones de Prisma
log_info "Ejecutando migraciones de base de datos..."
sudo -u lens bash << 'EOF'
cd /opt/lens
# Esperar a que la base de datos esté lista
for i in {1..30}; do
    if npx prisma migrate deploy 2>/dev/null; then
        echo "Migraciones ejecutadas correctamente"
        break
    fi
    echo "Esperando base de datos... (intento $i/30)"
    sleep 2
done
EOF

# Configurar firewall
log_info "Configurando firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw --force enable

# Crear servicio systemd
log_info "Creando servicio systemd..."
tee /etc/systemd/system/lens.service << EOF
[Unit]
Description=LENS Media Management System
After=network-online.target docker.service postgresql.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=lens
Group=lens
WorkingDirectory=/opt/lens
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose restart
TimeoutStartSec=300
TimeoutStopSec=120
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable lens
systemctl start lens

# Verificar servicios
log_info "Verificando servicios..."
sleep 15

if systemctl is-active --quiet lens; then
    log_success "Servicio LENS activo"
else
    log_warning "Servicio LENS no está completamente activo, verificando contenedores..."
fi

# Verificar contenedores Docker
sudo -u lens bash << 'EOF'
cd /opt/lens
if docker compose ps | grep -q "Up"; then
    echo "✅ Contenedores Docker ejecutándose correctamente"
else
    echo "⚠️  Algunos contenedores pueden no estar ejecutándose"
    docker compose ps
fi
EOF

# Verificar conectividad de la aplicación
log_info "Verificando conectividad de la aplicación..."
sleep 10

for i in {1..10}; do
    if curl -s http://localhost:3001/health >/dev/null 2>&1; then
        log_success "Aplicación respondiendo correctamente en puerto 3001"
        break
    fi
    log_info "Esperando aplicación... (intento $i/10)"
    sleep 3
done

# Guardar credenciales
log_info "Guardando credenciales..."
tee "$PROJECT_DIR/CREDENTIALS.txt" << EOF
# LENS - Credenciales de Instalación
# Generado: $(date)
# MANTENER ESTE ARCHIVO SEGURO

Database: lens_db
DB User: lens_user
DB Password: ${DB_PASSWORD}
JWT Secret: ${JWT_SECRET}
Redis Password: ${REDIS_PASSWORD}
Encryption Key: ${ENCRYPTION_KEY}
TMDB API Key: ${TMDB_API_KEY}
OMDB API Key: ${OMDB_API_KEY}

# URLs de Acceso
URL Local: http://localhost:3001
Health Check: http://localhost:3001/health
API Base: http://localhost:3001/api

# Comandos Útiles
Estado del servicio: systemctl status lens
Logs de la aplicación: docker compose logs -f lens-app
Reiniciar servicios: systemctl restart lens
Parar servicios: systemctl stop lens
EOF

chown lens:lens "$PROJECT_DIR/CREDENTIALS.txt"
chmod 600 "$PROJECT_DIR/CREDENTIALS.txt"

# Configurar logrotate para logs
log_info "Configurando rotación de logs..."
tee /etc/logrotate.d/lens << EOF
/opt/lens/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su lens lens
}
EOF

# Mostrar información final
echo ""
log_success "¡Instalación de LENS completada exitosamente!"
echo ""
log_info "🌐 Información de acceso:"
echo "   URL Externa: http://$(curl -s ifconfig.me 2>/dev/null || echo 'IP-EXTERNA'):3001"
echo "   URL Local: http://localhost:3001"
echo "   Health Check: http://localhost:3001/health"
echo "   API Documentation: http://localhost:3001/api"
echo ""
log_info "🔐 Credenciales guardadas en: $PROJECT_DIR/CREDENTIALS.txt"
echo ""
log_info "📊 Comandos útiles:"
echo "   Estado: systemctl status lens"
echo "   Logs: docker compose logs -f"
echo "   Reiniciar: systemctl restart lens"
echo "   Parar: systemctl stop lens"
echo "   Gestión: $PROJECT_DIR/scripts/manage.sh"
echo ""
log_info "📋 Próximos pasos:"
echo "   1. Verificar que la aplicación responde: curl http://localhost:3001/health"
echo "   2. Configurar SSL/TLS si es necesario"
echo "   3. Configurar backup automático"
echo "   4. Revisar logs: docker compose logs -f lens-app"
echo ""
log_success "🎉 LENS está listo para usar!"

# Log final
log_with_timestamp "Instalación completada exitosamente"