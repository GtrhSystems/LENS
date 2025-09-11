import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Schema de validación para variables de entorno
const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  TMDB_API_KEY: z.string().optional(),
  OMDB_API_KEY: z.string().optional(),
});

// Validar variables de entorno
const env = envSchema.parse(process.env);

export const config = {
  // Servidor
  port: parseInt(env.PORT),
  nodeEnv: env.NODE_ENV,
  corsOrigin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  
  // Base de datos
  database: {
    url: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production',
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  },
  
  // Redis
  redis: {
    url: env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
    enableOfflineQueue: process.env.REDIS_OFFLINE_QUEUE !== 'false',
    cacheTtl: parseInt(process.env.CACHE_TTL || '3600'),
  },
  
  // APIs externas
  apis: {
    tmdb: {
      apiKey: env.TMDB_API_KEY || '',
      baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
      imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
      timeout: parseInt(process.env.TMDB_TIMEOUT || '10000'),
      rateLimit: {
        requests: parseInt(process.env.TMDB_RATE_LIMIT || '40'),
        window: parseInt(process.env.TMDB_RATE_WINDOW || '10000'),
      },
    },
    omdb: {
      apiKey: env.OMDB_API_KEY || '',
      baseUrl: process.env.OMDB_BASE_URL || 'http://www.omdbapi.com',
      timeout: parseInt(process.env.OMDB_TIMEOUT || '10000'),
      rateLimit: {
        requests: parseInt(process.env.OMDB_RATE_LIMIT || '1000'),
        window: parseInt(process.env.OMDB_RATE_WINDOW || '86400000'), // 24 horas
      },
    },
  },
  
  // Rate limiting global
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
    skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Logs mejorados
  // Logging (corregir referencia)
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/lens.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
    format: process.env.LOG_FORMAT || 'combined',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
  },
  
  // Archivos y uploads
  upload: {
    maxSize: process.env.UPLOAD_MAX_SIZE || '50MB',
    path: process.env.UPLOAD_PATH || './uploads',
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/gif,video/mp4').split(','),
    tempPath: process.env.UPLOAD_TEMP_PATH || './temp',
    cleanupInterval: parseInt(process.env.UPLOAD_CLEANUP_INTERVAL || '3600000'), // 1 hora
  },
  
  // Seguridad mejorada
  security: {
    jwt: {
      secret: process.env.JWT_SECRET || (() => {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET must be provided in production');
        }
        return 'dev-secret-key';
      })()
    },
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
    csrfProtection: process.env.CSRF_PROTECTION !== 'false',
    helmet: {
      contentSecurityPolicy: process.env.CSP_ENABLED !== 'false',
      crossOriginEmbedderPolicy: process.env.COEP_ENABLED === 'true',
    },
  },
  
  // Backup y mantenimiento
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    interval: process.env.BACKUP_INTERVAL || '24h',
    path: process.env.BACKUP_PATH || './backups',
    retention: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
    compression: process.env.BACKUP_COMPRESSION !== 'false',
    contabo: {
      clientId: process.env.CONTABO_CLIENT_ID || '',
      clientSecret: process.env.CONTABO_CLIENT_SECRET || '',
      apiUser: process.env.CONTABO_API_USER || '',
      apiPassword: process.env.CONTABO_API_PASSWORD || '',
      instanceId: parseInt(process.env.CONTABO_INSTANCE_ID || '0'),
      autoBackup: process.env.CONTABO_AUTO_BACKUP === 'true',
      backupRetention: parseInt(process.env.CONTABO_BACKUP_RETENTION || '7'),
      region: process.env.CONTABO_REGION || 'EU',
    },
  },
  
  // Monitoreo y salud
  monitoring: {
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      port: parseInt(process.env.METRICS_PORT || '9090'),
      path: process.env.METRICS_PATH || '/metrics',
    },
  },
  
  // Performance y optimización
  performance: {
    compression: {
      enabled: process.env.COMPRESSION_ENABLED !== 'false',
      level: parseInt(process.env.COMPRESSION_LEVEL || '6'),
      threshold: process.env.COMPRESSION_THRESHOLD || '1kb',
    },
    cache: {
      staticFiles: process.env.STATIC_CACHE_ENABLED !== 'false',
      maxAge: parseInt(process.env.STATIC_CACHE_MAX_AGE || '86400'), // 24 horas
    },
  },
} as const;

// Validación adicional en tiempo de ejecución
if (config.security.jwtSecret === 'your-secret-key' && config.nodeEnv === 'production') {
  throw new Error('JWT_SECRET debe ser configurado en producción');
}

if (!config.database.url && config.nodeEnv !== 'test') {
  throw new Error('DATABASE_URL es requerida');
}

// Exportar tipos para TypeScript
export type Config = typeof config;
export type NodeEnv = typeof config.nodeEnv;