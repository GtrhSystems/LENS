#!/bin/bash

# LENS VPS Installation Script
# Ubuntu 24.04 LTS - Actualizado 2024

set -e

echo "🚀 Iniciando instalación limpia de LENS en Ubuntu 24.04..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common ca-certificates gnupg lsb-release

# Install Docker (Método oficial 2024)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Docker Compose standalone (backup)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js 20 LTS (Actualizado)
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

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64)

# Clone LENS project
sudo -u lens git clone https://github.com/GtrhSystems/LENS.git /opt/lens || true
cd /opt/lens
sudo chown -R lens:lens /opt/lens
sudo chmod -R 755 /opt/lens

# Setup environment
sudo -u lens cp .env.example .env
sudo -u lens sed -i "s/your_jwt_secret_here/$JWT_SECRET/g" .env
sudo -u lens sed -i "s/your_database_password_here/$DB_PASSWORD/g" .env
sudo -u lens sed -i "s/your_redis_password_here/$REDIS_PASSWORD/g" .env

# Export environment variables for Docker
echo "DB_PASSWORD=$DB_PASSWORD" | sudo -u lens tee -a .env
echo "REDIS_PASSWORD=$REDIS_PASSWORD" | sudo -u lens tee -a .env
echo "JWT_SECRET=$JWT_SECRET" | sudo -u lens tee -a .env

# Build and start services
sudo -u lens docker-compose -f docker-compose.contabo.yml up -d --build

# Wait for services to be ready
echo "⏳ Esperando que los servicios estén listos..."
sleep 30

# Run database migrations
sudo -u lens docker-compose -f docker-compose.contabo.yml exec -T lens-app npx prisma migrate deploy
sudo -u lens docker-compose -f docker-compose.contabo.yml exec -T lens-app npx prisma generate

# Setup firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Setup log rotation
sudo tee /etc/logrotate.d/lens << EOF
/opt/lens/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0644 lens lens
    postrotate
        cd /opt/lens && sudo -u lens docker-compose -f docker-compose.contabo.yml restart lens-app
    endscript
}
EOF

echo "✅ ¡Instalación completada exitosamente!"
echo "🔒 Password de PostgreSQL: $DB_PASSWORD"
echo "🔒 Password de Redis: $REDIS_PASSWORD"
echo "🔑 JWT Secret generado automáticamente"
echo "⚠️  IMPORTANTE: Guarda estas contraseñas en un lugar seguro"
echo "🌐 Accede a tu aplicación en: http://$(curl -s ifconfig.me)"
echo "📊 Estado de contenedores: sudo -u lens docker-compose -f docker-compose.contabo.yml ps"
echo "📝 Logs: sudo -u lens docker-compose -f docker-compose.contabo.yml logs -f"
echo ""
echo "🚀 LENS está ejecutándose en Ubuntu 24.04 con Docker!"