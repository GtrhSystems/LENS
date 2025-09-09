#!/bin/bash

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar paquetes esenciales
sudo apt install -y curl git wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release

# Instalar Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Iniciar y habilitar Docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Create lens user
sudo useradd -m -s /bin/bash lens || true
sudo usermod -aG sudo lens
sudo usermod -aG docker lens

# Create project directory with proper permissions
sudo mkdir -p /opt/lens
sudo chown lens:lens /opt/lens
sudo chmod 755 /opt/lens

# Generar contraseñas y claves seguras automáticamente
DB_PASSWORD="Systems-GT161623++"
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Credenciales predefinidas de APIs
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

# Clone LENS project
echo "📥 Clonando proyecto LENS..."
sudo -u lens git clone https://github.com/GtrhSystems/LENS.git /opt/lens || true
cd /opt/lens
sudo chown -R lens:lens /opt/lens
sudo chmod -R 755 /opt/lens

# Crear archivo .env completo
echo "⚙️ Configurando archivo .env..."
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

# Configuración de Seguridad (Generadas automáticamente)
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

# Configurar permisos del archivo .env
sudo chown lens:lens /opt/lens/.env
sudo chmod 600 /opt/lens/.env

# Mostrar las credenciales generadas
echo "🔐 Credenciales generadas:"
echo "Database Password: ${DB_PASSWORD}"
echo "Redis Password: ${REDIS_PASSWORD}"
echo "JWT Secret: ${JWT_SECRET}"
echo "Encryption Key: ${ENCRYPTION_KEY}"

# Build and start services
echo "🚀 Iniciando servicios Docker..."
sudo -u lens docker-compose -f docker-compose.contabo.yml up -d --build

# Wait for services to be ready
echo "⏳ Esperando que los servicios estén listos..."
sleep 30

# Run database migrations
echo "🗄️ Ejecutando migraciones de base de datos..."
sudo -u lens docker-compose -f docker-compose.contabo.yml exec -T lens-app npx prisma migrate deploy
sudo -u lens docker-compose -f docker-compose.contabo.yml exec -T lens-app npx prisma generate

# Setup firewall
echo "🔥 Configurando firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5432/tcp  # PostgreSQL
sudo ufw --force enable

# Setup log rotation
sudo tee /etc/logrotate.d/lens << EOF
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

echo "✅ Instalación completada!"
echo "🌐 Acceso: http://$(curl -s ifconfig.me):3001"
echo "📊 Estado de contenedores: docker-compose -f docker-compose.contabo.yml ps"
echo "📝 Logs: docker-compose -f docker-compose.contabo.yml logs -f"
echo ""
echo "🔐 CREDENCIALES IMPORTANTES:"
echo "Database: lens_db"
echo "DB User: lens_user"
echo "DB Password: ${DB_PASSWORD}"
echo "JWT Secret: ${JWT_SECRET}"
echo "Redis Password: ${REDIS_PASSWORD}"