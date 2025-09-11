#!/bin/bash

# Auto-update script for LENS
set -e

echo "🔄 Actualizando LENS..."

# Backup antes de actualizar
echo "📦 Creando backup..."
./scripts/backup.sh

# Detener servicios
echo "⏹️ Deteniendo servicios..."
docker-compose -f docker-compose.contabo.yml down

# Actualizar código
echo "📥 Actualizando código..."
git pull origin main

# Actualizar dependencias
echo "📦 Actualizando dependencias..."
npm install
cd src/frontend && npm install && cd ../..

# Reconstruir imágenes
echo "🔨 Reconstruyendo imágenes..."
docker-compose -f docker-compose.contabo.yml build --no-cache

# Ejecutar migraciones
echo "🗄️ Ejecutando migraciones..."
docker-compose -f docker-compose.contabo.yml run --rm lens npx prisma migrate deploy

# Cambiar líneas 11, 25, 35, 43 de:
docker-compose -f docker-compose.contabo.yml
# Por:
docker-compose
docker-compose down
docker-compose build --no-cache
docker-compose run --rm lens-app npx prisma migrate deploy
docker-compose up -d
docker-compose ps

# Reiniciar servicios
echo "▶️ Reiniciando servicios..."
docker-compose -f docker-compose.contabo.yml up -d

# Verificar estado
echo "✅ Verificando estado de servicios..."
sleep 10
docker-compose -f docker-compose.contabo.yml ps

echo "🎉 Actualización completada!"