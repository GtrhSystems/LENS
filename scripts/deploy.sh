#!/bin/bash

# LENS Docker Deployment Script

set -e

echo "🚀 Iniciando deployment de LENS con Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instalando..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker instalado. Por favor, reinicia la sesión y ejecuta el script nuevamente."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Instalando..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create necessary directories
mkdir -p logs/nginx backups uploads ssl

# Generate environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cp .env.example .env
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
    
    # Update .env file
    sed -i "s/your_db_password_here/$DB_PASSWORD/g" .env
    sed -i "s/your_redis_password_here/$REDIS_PASSWORD/g" .env
    sed -i "s/your_jwt_secret_here/$JWT_SECRET/g" .env
    
    echo "✅ Archivo .env creado con contraseñas seguras"
    echo "⚠️  IMPORTANTE: Configura TMDB_API_KEY y OMDB_API_KEY en el archivo .env"
fi

# Build and start services
echo "🔨 Construyendo imágenes Docker..."
docker-compose build --no-cache

echo "🚀 Iniciando servicios..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Esperando que los servicios estén listos..."
sleep 30

# Run database migrations
echo "📊 Ejecutando migraciones de base de datos..."
docker-compose exec lens-app npx prisma migrate deploy

# Check service health
echo "🔍 Verificando estado de los servicios..."
docker-compose ps

echo "✅ Deployment completado!"
echo "🌐 Aplicación disponible en: http://localhost"
echo "📊 Monitoreo: docker-compose logs -f"
echo "🛑 Detener: docker-compose down"