import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/lens',
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
      secret: process.env.JWT_SECRET || 'your-secret-key'
    },
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
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

if (config.security.jwt.secret === 'your-secret-key' && config.nodeEnv === 'production') {
  console.warn('⚠️  WARNING: Using default JWT secret in production!');
}

if (!config.database.url && config.nodeEnv !== 'test') {
  throw new Error('DATABASE_URL es requerida');
}

// Exportar tipos para TypeScript
export type Config = typeof config;
export type NodeEnv = typeof config.nodeEnv;