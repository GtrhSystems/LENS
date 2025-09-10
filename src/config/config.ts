import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Servidor
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Base de datos
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cacheTtl: parseInt(process.env.CACHE_TTL || '3600'),
  
  // APIs externas
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
    baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
  },
  omdb: {
    apiKey: process.env.OMDB_API_KEY || '',
    baseUrl: process.env.OMDB_BASE_URL || 'http://www.omdbapi.com',
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  
  // Logs
  log: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/lens.log',
  },
  
  // Archivos
  upload: {
    maxSize: process.env.UPLOAD_MAX_SIZE || '50MB',
    path: process.env.UPLOAD_PATH || './uploads',
  },
  
  // Seguridad
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key',
  
  // Backup
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    interval: process.env.BACKUP_INTERVAL || '24h',
    path: process.env.BACKUP_PATH || './backups',
    contabo: {
      clientId: process.env.CONTABO_CLIENT_ID || '',
      clientSecret: process.env.CONTABO_CLIENT_SECRET || '',
      apiUser: process.env.CONTABO_API_USER || '',
      apiPassword: process.env.CONTABO_API_PASSWORD || '',
      instanceId: parseInt(process.env.CONTABO_INSTANCE_ID || '0'),
      autoBackup: process.env.CONTABO_AUTO_BACKUP === 'true',
      backupRetention: parseInt(process.env.CONTABO_BACKUP_RETENTION || '7')
    },
  },
};