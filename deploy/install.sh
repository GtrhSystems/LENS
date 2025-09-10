#!/bin/bash

# LENS - Sistema de Gestión de Contenido Multimedia
# Script de instalación automática para Ubuntu 24.04 LTS
# Versión: 2.0
# Autor: GtrhSystems

set -e  # Salir si hay errores

echo "🚀 Iniciando instalación de LENS v2.0..."
echo "📋 Sistema objetivo: Ubuntu 24.04 LTS"
echo "🏢 Optimizado para Contabo VPS"
echo ""

# Verificar que se ejecuta como root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Este script debe ejecutarse como root (sudo)" 
   exit 1
fi

# Actualizar sistema
echo "📦 Actualizando sistema..."
apt update && apt upgrade -y

# Instalar paquetes esenciales
echo "🔧 Instalando paquetes esenciales..."
apt install -y curl git wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release ufw

# Instalar Docker
echo "🐳 Instalando Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Instalar Docker Compose
echo "🔗 Instalando Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Iniciar y habilitar Docker
systemctl start docker
systemctl enable docker
usermod -aG docker $USER

# Instalar PostgreSQL
echo "🗄️ Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Instalar Node.js 20 LTS
echo "📦 Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Crear usuario lens
echo "👤 Creando usuario lens..."
useradd -m -s /bin/bash lens || true
usermod -aG sudo lens
usermod -aG docker lens

# Crear directorio del proyecto
echo "📁 Configurando directorio del proyecto..."
mkdir -p /opt/lens
chown lens:lens /opt/lens
chmod 755 /opt/lens

# Generar credenciales seguras
echo "🔐 Generando credenciales seguras..."
DB_PASSWORD="Systems-GT161623++"
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Credenciales predefinidas
TMDB_API_KEY="70435d34ec469ca91c4b95991d16ec3f"
OMDB_API_KEY="8057e51"
CONTABO_CLIENT_ID="INT-13821944"
CONTABO_CLIENT_SECRET="04vsGriDWXj25tJuqv4X27YMEA2KMe0w"
CONTABO_API_USER="team.systemsgt@gmail.com"
CONTABO_API_PASSWORD="Systems-GT161623++"
CONTABO_INSTANCE_ID="vmi2784375"

# Configurar PostgreSQL
echo "🔧 Configurando PostgreSQL..."
sudo -u postgres psql << EOF
CREATE USER lens_user WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE lens_db OWNER lens_user;
GRANT ALL PRIVILEGES ON DATABASE lens_db TO lens_user;
ALTER USER lens_user CREATEDB;
\q
EOF

# Clonar proyecto LENS
echo "📥 Clonando proyecto LENS..."
sudo -u lens git clone https://github.com/GtrhSystems/LENS.git /opt/lens || true
cd /opt/lens
chown -R lens:lens /opt/lens
chmod -R 755 /opt/lens

# Crear archivo .env completo
echo "⚙️ Configurando variables de entorno..."
sudo -u lens tee /opt/lens/.env > /dev/null << EOF
# Configuración del Servidor
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000

# Base de Datos PostgreSQL
DATABASE_URL="postgresql://lens_user:${DB_PASSWORD}@localhost:5432/lens_db"

# Redis Cache
REDIS_URL=redis://localhost:6379
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
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Configuración de Backup
BACKUP_ENABLED=true
BACKUP_INTERVAL=24h
BACKUP_PATH=./backups

# CONTABO API Configuration
CONTABO_CLIENT_ID=${CONTABO_CLIENT_ID}
CONTABO_CLIENT_SECRET=${CONTABO_CLIENT_SECRET}
CONTABO_API_USER=${CONTABO_API_USER}
CONTABO_API_PASSWORD=${CONTABO_API_PASSWORD}
CONTABO_INSTANCE_ID=${CONTABO_INSTANCE_ID}
CONTABO_AUTO_BACKUP=true
CONTABO_BACKUP_RETENTION=7
EOF

# Configurar permisos del .env
chown lens:lens /opt/lens/.env
chmod 600 /opt/lens/.env

# Instalar dependencias
echo "📦 Instalando dependencias..."
sudo -u lens npm install

# Ejecutar migraciones de Prisma
echo "🗄️ Configurando base de datos..."
sudo -u lens npx prisma generate
sudo -u lens npx prisma migrate deploy

# Construir y iniciar servicios
echo "🚀 Iniciando servicios Docker..."
sudo -u lens docker-compose -f docker-compose.contabo.yml up -d --build

# Esperar a que los servicios estén listos
echo "⏳ Esperando servicios..."
sleep 30

# Configurar firewall
echo "🔥 Configurando firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3001/tcp
ufw allow 5432/tcp
ufw --force enable

# Configurar rotación de logs
echo "📝 Configurando rotación de logs..."
tee /etc/logrotate.d/lens << EOF
/opt/lens/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 lens lens
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF

# Crear servicio systemd
echo "🔧 Creando servicio systemd..."
tee /etc/systemd/system/lens.service << EOF
[Unit]
Description=LENS Media Management System
After=network.target postgresql.service docker.service
Requires=postgresql.service docker.service

[Service]
Type=forking
User=lens
Group=lens
WorkingDirectory=/opt/lens
ExecStart=/usr/local/bin/docker-compose -f docker-compose.contabo.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.contabo.yml down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable lens
systemctl start lens

echo ""
echo "✅ ¡Instalación de LENS completada exitosamente!"
echo ""
echo "🌐 Información de acceso:"
echo "   URL: http://$(curl -s ifconfig.me):3001"
echo "   URL Local: http://localhost:3001"
echo ""
echo "🔐 Credenciales generadas:"
echo "   Database: lens_db"
echo "   DB User: lens_user"
echo "   DB Password: ${DB_PASSWORD}"
echo "   JWT Secret: ${JWT_SECRET}"
echo "   Redis Password: ${REDIS_PASSWORD}"
echo ""
echo "📊 Comandos útiles:"
echo "   Estado: systemctl status lens"
echo "   Logs: docker-compose -f /opt/lens/docker-compose.contabo.yml logs -f"
echo "   Reiniciar: systemctl restart lens"
echo "   Parar: systemctl stop lens"
echo ""
echo "🎉 LENS está listo para usar!"