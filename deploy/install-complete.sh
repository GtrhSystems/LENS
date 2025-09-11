#!/bin/bash

# LENS - Instalador Completo para Ubuntu 24.04
# Este script instala y configura todo automáticamente

set -e

echo "🚀 Iniciando instalación de LENS en Ubuntu 24.04..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar que se ejecuta como root
if [[ $EUID -ne 0 ]]; then
   error "Este script debe ejecutarse como root (sudo)"
fi

# Actualizar sistema
log "Actualizando sistema..."
apt update && apt upgrade -y

# Instalar dependencias del sistema
log "Instalando dependencias del sistema..."
apt install -y curl wget git nginx postgresql postgresql-contrib redis-server \
    software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Instalar Node.js 20.x
log "Instalando Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar versiones
log "Verificando versiones instaladas..."
node --version
npm --version
psql --version
redis-server --version

# Crear usuario para la aplicación
log "Creando usuario lens..."
if ! id "lens" &>/dev/null; then
    useradd -m -s /bin/bash lens
    usermod -aG www-data lens
fi

# Crear directorios
log "Creando estructura de directorios..."
mkdir -p /opt/lens
mkdir -p /var/log/lens
mkdir -p /etc/lens

# Copiar archivos del proyecto
log "Copiando archivos del proyecto..."
cp -r . /opt/lens/
chown -R lens:lens /opt/lens
chown -R lens:lens /var/log/lens

# Cambiar al directorio de la aplicación
cd /opt/lens

# Aplicar correcciones automáticamente
log "Aplicando correcciones de código..."

# 1. Actualizar package.json con todas las dependencias
cat > package.json << 'EOF'
{
  "name": "lens-scanner",
  "version": "1.0.0",
  "description": "IPTV Content Scanner and Manager",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node src/server.ts",
    "test": "jest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy"
  },
  "dependencies": {
    "@prisma/client": "^6.16.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "rate-limiter-flexible": "^2.4.2",
    "redis": "^4.6.8",
    "multer": "^1.4.5-lts.1",
    "compression": "^1.7.4",
    "dotenv": "^16.3.1",
    "axios": "^1.5.0",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "@types/node": "^20.5.0",
    "@types/express": "^4.17.17",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/bcryptjs": "^2.4.2",
    "@types/cors": "^2.8.13",
    "@types/multer": "^1.4.7",
    "@types/compression": "^1.7.2",
    "typescript": "^5.1.6",
    "ts-node": "^10.9.1",
    "prisma": "^6.16.1",
    "jest": "^29.6.2",
    "@types/jest": "^29.5.3"
  }
}
EOF

# 2. Corregir src/config/config.ts
cat > src/config/config.ts << 'EOF'
import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://lens:lens123@localhost:5432/lens',
    ssl: process.env.NODE_ENV === 'production',
    connectionTimeout: 30000,
    maxConnections: 10,
    idleTimeout: 60000
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },
  
  security: {
    jwt: {
      secret: process.env.JWT_SECRET || 'lens-jwt-secret-key-2024'
    },
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    encryptionKey: process.env.ENCRYPTION_KEY || 'lens-encryption-key-2024',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    sessionSecret: process.env.SESSION_SECRET || 'lens-session-secret-2024',
    csrfProtection: process.env.CSRF_PROTECTION === 'true',
    helmet: {
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false
    }
  },
  
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
    baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
    imageBaseUrl: process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w500'
  },
  
  omdb: {
    apiKey: process.env.OMDB_API_KEY || '',
    baseUrl: process.env.OMDB_BASE_URL || 'http://www.omdbapi.com'
  },
  
  performance: {
    enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100')
  }
} as const;

if (config.security.jwt.secret === 'lens-jwt-secret-key-2024' && config.nodeEnv === 'production') {
  console.warn('⚠️  WARNING: Using default JWT secret in production!');
}

export default config;
EOF

# 3. Corregir src/middleware/rateLimiter.ts
cat > src/middleware/rateLimiter.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisService } from '../services/RedisService';
import config from '../config/config';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisService.client,
  keyPrefix: 'rl',
  points: config.performance.rateLimitMax,
  duration: Math.floor(config.performance.rateLimitWindowMs / 1000)
});

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    await rateLimiter.consume(clientIp);
    next();
  } catch (rejRes: any) {
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 1
    });
  }
};

export default rateLimitMiddleware;
EOF

# 4. Corregir src/services/RedisService.ts
cat > src/services/RedisService.ts << 'EOF'
import { createClient, RedisClientType } from 'redis';
import config from '../config/config';
import { logger } from '../utils/logger';

class RedisService {
  public client: RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.client = createClient({
      url: config.redis.url,
      password: config.redis.password,
      database: config.redis.db
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
      this.connected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis Client Disconnected');
      this.connected = false;
    });
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const redisService = new RedisService();
export default RedisService;
EOF

# 5. Crear archivo .env de producción
cat > .env << 'EOF'
# Configuración de Producción LENS
NODE_ENV=production
PORT=3000

# Base de datos PostgreSQL
DATABASE_URL="postgresql://lens:lens123@localhost:5432/lens"

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_DB=0

# Seguridad
JWT_SECRET="lens-jwt-secret-production-2024-change-this"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
ENCRYPTION_KEY="lens-encryption-production-2024-change-this"
BCRYPT_ROUNDS=12
SESSION_SECRET="lens-session-production-2024-change-this"

# APIs externas (configurar después)
TMDB_API_KEY=""
OMDB_API_KEY=""

# CORS
CORS_ORIGIN="http://localhost:3000,https://tu-dominio.com"

# Performance
ENABLE_COMPRESSION=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
EOF

# Instalar dependencias de Node.js
log "Instalando dependencias de Node.js..."
sudo -u lens npm install

# Actualizar Prisma
log "Actualizando Prisma..."
sudo -u lens npm install prisma@latest @prisma/client@latest

# Configurar PostgreSQL
log "Configurando PostgreSQL..."
sudo -u postgres psql << 'EOSQL'
CREATE USER lens WITH PASSWORD 'lens123';
CREATE DATABASE lens OWNER lens;
GRANT ALL PRIVILEGES ON DATABASE lens TO lens;
\q
EOSQL

# Generar cliente Prisma
log "Generando cliente Prisma..."
sudo -u lens npx prisma generate

# Ejecutar migraciones
log "Ejecutando migraciones de base de datos..."
sudo -u lens npx prisma migrate deploy

# Compilar TypeScript
log "Compilando aplicación TypeScript..."
sudo -u lens npm run build

# Crear servicio systemd
log "Creando servicio systemd..."
cat > /etc/systemd/system/lens.service << 'EOF'
[Unit]
Description=LENS IPTV Scanner
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=lens
Group=lens
WorkingDirectory=/opt/lens
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=lens

[Install]
WantedBy=multi-user.target
EOF

# Configurar Nginx
log "Configurando Nginx..."
cat > /etc/nginx/sites-available/lens << 'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Habilitar sitio de Nginx
ln -sf /etc/nginx/sites-available/lens /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Configurar logs
log "Configurando logs..."
mkdir -p /var/log/lens
chown lens:lens /var/log/lens

# Configurar logrotate
cat > /etc/logrotate.d/lens << 'EOF'
/var/log/lens/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 lens lens
    postrotate
        systemctl reload lens
    endscript
}
EOF

# Habilitar servicios
log "Habilitando servicios..."
systemctl enable postgresql
systemctl enable redis-server
systemctl enable nginx
systemctl enable lens

# Iniciar servicios
log "Iniciando servicios..."
systemctl start postgresql
systemctl start redis-server
systemctl restart nginx
systemctl start lens

# Verificar estado de servicios
log "Verificando estado de servicios..."
systemctl status postgresql --no-pager -l
systemctl status redis-server --no-pager -l
systemctl status nginx --no-pager -l
systemctl status lens --no-pager -l

# Configurar firewall básico
log "Configurando firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Mostrar información final
log "\n🎉 ¡Instalación completada exitosamente!"
echo -e "\n${GREEN}=== INFORMACIÓN DEL SISTEMA ===${NC}"
echo -e "${YELLOW}URL de la aplicación:${NC} http://$(curl -s ifconfig.me)"
echo -e "${YELLOW}Logs de la aplicación:${NC} /var/log/lens/"
echo -e "${YELLOW}Configuración:${NC} /opt/lens/.env"
echo -e "${YELLOW}Directorio de la app:${NC} /opt/lens"

echo -e "\n${GREEN}=== COMANDOS ÚTILES ===${NC}"
echo -e "${YELLOW}Ver logs:${NC} sudo journalctl -u lens -f"
echo -e "${YELLOW}Reiniciar servicio:${NC} sudo systemctl restart lens"
echo -e "${YELLOW}Estado del servicio:${NC} sudo systemctl status lens"
echo -e "${YELLOW}Recompilar:${NC} cd /opt/lens && sudo -u lens npm run build && sudo systemctl restart lens"

echo -e "\n${GREEN}=== PRÓXIMOS PASOS ===${NC}"
echo -e "1. Configura las API keys en /opt/lens/.env (TMDB_API_KEY, OMDB_API_KEY)"
echo -e "2. Cambia las claves de seguridad por defecto en /opt/lens/.env"
echo -e "3. Configura tu dominio en CORS_ORIGIN"
echo -e "4. Opcional: Configura SSL con Let's Encrypt"

log "\n✅ LENS está listo para usar!"
EOF

# Hacer el script ejecutable
chmod +x /opt/lens/deploy/install-complete.sh