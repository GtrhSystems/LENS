# LENS - Script de instalación para Windows
# Requiere Docker Desktop
# Versión: 2.0

Write-Host "🚀 LENS - Instalación para Windows" -ForegroundColor Green
Write-Host "📋 Verificando requisitos..." -ForegroundColor Yellow

# Verificar Docker Desktop
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Desktop no está instalado" -ForegroundColor Red
    Write-Host "Descarga desde: https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    Read-Host "Presiona Enter para continuar después de instalar Docker Desktop"
    exit 1
}

# Verificar Docker Compose
if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose no está disponible" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker Desktop detectado" -ForegroundColor Green

# Generar credenciales
Write-Host "🔐 Generando credenciales seguras..." -ForegroundColor Yellow

$DB_PASSWORD = "Systems-GT161623++"
$REDIS_PASSWORD = -join ((1..25) | ForEach {[char]((65..90) + (97..122) | Get-Random)})
$JWT_SECRET = -join ((1..128) | ForEach {'{0:X}' -f (Get-Random -Max 16)})
$ENCRYPTION_KEY = -join ((1..64) | ForEach {'{0:X}' -f (Get-Random -Max 16)})

# Crear archivo .env
Write-Host "⚙️ Creando archivo de configuración..." -ForegroundColor Yellow

$envContent = @"
# Configuración del Servidor
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Base de Datos PostgreSQL (Docker)
DATABASE_URL="postgresql://lens_user:${DB_PASSWORD}@localhost:5432/lens_db"

# Redis Cache (Docker)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=${REDIS_PASSWORD}
CACHE_TTL=3600

# APIs Externas
TMDB_API_KEY=70435d34ec469ca91c4b95991d16ec3f
TMDB_BASE_URL=https://api.themoviedb.org/3
OMDB_API_KEY=8057e51
OMDB_BASE_URL=http://www.omdbapi.com

# Configuración de Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configuración de Logs
LOG_LEVEL=debug
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
CONTABO_CLIENT_ID=INT-13821944
CONTABO_CLIENT_SECRET=04vsGriDWXj25tJuqv4X27YMEA2KMe0w
CONTABO_API_USER=team.systemsgt@gmail.com
CONTABO_API_PASSWORD=Systems-GT161623++
CONTABO_INSTANCE_ID=vmi2784375
CONTABO_AUTO_BACKUP=true
CONTABO_BACKUP_RETENTION=7
"@

# Escribir archivo .env
$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host "✅ Archivo .env creado" -ForegroundColor Green

# Mostrar credenciales
Write-Host ""
Write-Host "🔐 Credenciales generadas:" -ForegroundColor Cyan
Write-Host "JWT Secret: $JWT_SECRET" -ForegroundColor White
Write-Host "Encryption Key: $ENCRYPTION_KEY" -ForegroundColor White
Write-Host "Redis Password: $REDIS_PASSWORD" -ForegroundColor White
Write-Host "Database Password: $DB_PASSWORD" -ForegroundColor White

# Crear directorios necesarios
Write-Host "📁 Creando directorios..." -ForegroundColor Yellow
if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" }
if (!(Test-Path "uploads")) { New-Item -ItemType Directory -Path "uploads" }
if (!(Test-Path "backups")) { New-Item -ItemType Directory -Path "backups" }

# Iniciar servicios
Write-Host "🚀 Iniciando servicios Docker..." -ForegroundColor Green
try {
    docker-compose -f docker-compose.yml up -d --build
    Write-Host "✅ Servicios iniciados correctamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al iniciar servicios: $_" -ForegroundColor Red
    exit 1
}

# Esperar servicios
Write-Host "⏳ Esperando que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Verificar estado
Write-Host "📊 Estado de los servicios:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "✅ ¡LENS instalado correctamente en Windows!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Acceso:" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "📊 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   Ver logs: docker-compose logs -f" -ForegroundColor White
Write-Host "   Parar: docker-compose down" -ForegroundColor White
Write-Host "   Reiniciar: docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "🎉 ¡Listo para desarrollar!" -ForegroundColor Green

Read-Host "Presiona Enter para continuar"