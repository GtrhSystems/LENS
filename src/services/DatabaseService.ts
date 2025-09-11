import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class DatabaseService {
  private prisma: PrismaClient;
  private isConnected = false;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error']
    });

    // Event listeners con tipos correctos
    this.prisma.$on('query' as any, (e: any) => {
      logger.debug('Database query:', {
        query: e.query,
        params: e.params,
        duration: e.duration
      });
    });

    this.prisma.$on('error' as any, (e: any) => {
      logger.error('Database error:', e);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      logger.info('Conexión a base de datos establecida');
    } catch (error) {
      logger.error('Error conectando a base de datos:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      logger.info('Conexión a base de datos cerrada');
    } catch (error) {
      logger.error('Error desconectando base de datos:', error);
      throw error;
    }
  }

  getClient(): PrismaClient {
    if (!this.isConnected) {
      throw new Error('Base de datos no conectada');
    }
    return this.prisma;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Health check de base de datos falló:', error);
      return false;
    }
  }

  async getSources(options: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { url: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};
    
    const [sources, total] = await Promise.all([
      this.prisma.source.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.source.count({ where }),
    ]);
    
    return {
      sources,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createSource(data: any) {
    return this.prisma.source.create({ data });
  }

  async getSourceById(id: number) {
    return this.prisma.source.findUnique({ where: { id } });
  }

  async getSourceContent(sourceId: number, options: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 50, search } = options;
    const skip = (page - 1) * limit;

    const where = {
      sourceId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { title: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    };

    const [items, total] = await Promise.all([
      this.prisma.channel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.channel.count({ where })
    ]);

    return { items, total, page, limit };
  }

  async createScanLog(data: any) {
    return this.prisma.scanLog.create({ data });
  }

  async updateScanLog(id: number, data: any) {
    return this.prisma.scanLog.update({ where: { id }, data });
  }

  async createMovie(data: any) {
    return this.prisma.movie.create({ data });
  }

  async createSeries(data: any) {
    return this.prisma.series.create({ data });
  }

  async createChannel(data: any) {
    return this.prisma.channel.create({ data });
  }
}