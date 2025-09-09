import { createClient, RedisClientType } from 'redis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class RedisService {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: config.redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Máximo número de reintentos de Redis alcanzado');
            return new Error('Máximo número de reintentos alcanzado');
          }
          return Math.min(retries * 50, 1000);
        },
      },
    });

    this.client.on('error', (error) => {
      logger.error('Error en Redis:', error);
    });

    this.client.on('connect', () => {
      logger.info('Conectando a Redis...');
    });

    this.client.on('ready', () => {
      logger.info('Redis listo para usar');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      logger.info('Conexión a Redis cerrada');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Error conectando a Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      logger.error('Error desconectando Redis:', error);
      throw error;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Error guardando en Redis (${key}):`, error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error obteniendo de Redis (${key}):`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Error eliminando de Redis (${key}):`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error verificando existencia en Redis (${key}):`, error);
      throw error;
    }
  }

  async setJson(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}