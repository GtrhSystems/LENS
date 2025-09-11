import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiterMiddleware as rateLimiter } from './middleware/rateLimiter';
import { routes } from './routes';
import sourcesRoutes from './routes/sources';
import contaboRoutes from './routes/contabo';
import { DatabaseService } from './services/DatabaseService';
import { RedisService } from './services/RedisService';
import { SchedulerService } from './services/SchedulerService';

class LensServer {
  private app: express.Application;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private schedulerService: SchedulerService;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
    this.schedulerService = new SchedulerService();
  }

  private setupMiddleware(): void {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    this.app.use(cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    this.app.use(compression());
    this.app.use(rateLimiter);
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    this.app.use(rateLimiter);
    
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    this.app.use('/api', routes);
    this.app.use('/api/sources', sourcesRoutes);
    this.app.use('/api/contabo', contaboRoutes);

    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint no encontrado',
        path: req.originalUrl,
      });
    });

    this.app.use(errorHandler);
  }

  private async initializeServices(): Promise<void> {
    try {
      await this.databaseService.connect();
      logger.info('Base de datos conectada exitosamente');

      await this.redisService.connect();
      logger.info('Redis conectado exitosamente');

      this.schedulerService.start();
      logger.info('Scheduler iniciado exitosamente');
    } catch (error) {
      logger.error('Error inicializando servicios:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Recibida señal ${signal}, cerrando servidor...`);
      
      try {
        await this.databaseService.disconnect();
        await this.redisService.disconnect();
        this.schedulerService.stop();
        
        logger.info('Servidor cerrado exitosamente');
        process.exit(0);
      } catch (error) {
        logger.error('Error durante el cierre:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  public async start(): Promise<void> {
    try {
      this.setupMiddleware();
      this.setupRoutes();
      await this.initializeServices();
      this.setupGracefulShutdown();
      
      this.app.listen(config.port, () => {
        logger.info(`🚀 LENS Server iniciado en puerto ${config.port}`);
        logger.info(`🌍 Entorno: ${config.nodeEnv}`);
        logger.info(`📊 Health check: http://localhost:${config.port}/health`);
      });
    } catch (error) {
      logger.error('Error iniciando servidor:', error);
      process.exit(1);
    }
  }
}

const server = new LensServer();
server.start().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});