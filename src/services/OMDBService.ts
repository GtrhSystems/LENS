import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { RedisService } from './RedisService';

export interface OMDBMovie {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: {
    Source: string;
    Value: string;
  }[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: 'movie' | 'series' | 'episode';
  DVD?: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  Response: string;
  totalSeasons?: string;
}

export interface OMDBSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: 'movie' | 'series' | 'episode';
  Poster: string;
}

export class OMDBService {
  private client: AxiosInstance;
  private redisService: RedisService;
  private readonly CACHE_PREFIX = 'omdb:';
  private readonly CACHE_TTL = 86400; // 24 horas

  constructor(redisService: RedisService) {
    this.redisService = redisService;
    this.client = axios.create({
      baseURL: config.omdb.baseUrl,
      timeout: 10000,
      params: {
        apikey: config.omdb.apiKey,
      },
    });

    // Interceptor para logging
    this.client.interceptors.request.use((config) => {
      logger.debug('OMDB Request:', {
        url: config.url,
        params: { ...config.params, apikey: '[HIDDEN]' },
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('OMDB Response:', {
          url: response.config.url,
          status: response.status,
        });
        return response;
      },
      (error) => {
        logger.error('OMDB Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  async searchByTitle(title: string, year?: number, type?: 'movie' | 'series'): Promise<OMDBSearchResult[]> {
    const cacheKey = `${this.CACHE_PREFIX}search:${title}:${year || 'any'}:${type || 'any'}`;
    
    try {
      // Verificar cache
      const cached = await this.redisService.getJson<OMDBSearchResult[]>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit para búsqueda OMDB: ${title}`);
        return cached;
      }

      const params: any = { s: title };
      if (year) params.y = year;
      if (type) params.type = type;

      const response = await this.client.get('/', { params });
      
      if (response.data.Response === 'False') {
        logger.warn(`No se encontraron resultados en OMDB para: ${title}`);
        return [];
      }

      const results = response.data.Search || [];
      
      // Guardar en cache
      await this.redisService.setJson(cacheKey, results, this.CACHE_TTL);
      
      logger.info(`Encontrados ${results.length} resultados en OMDB para: ${title}`);
      return results;
    } catch (error) {
      logger.error(`Error buscando en OMDB "${title}":`, error);
      return [];
    }
  }

  async getByImdbId(imdbId: string): Promise<OMDBMovie | null> {
    const cacheKey = `${this.CACHE_PREFIX}imdb:${imdbId}`;
    
    try {
      // Verificar cache
      const cached = await this.redisService.getJson<OMDBMovie>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit para IMDB ID: ${imdbId}`);
        return cached;
      }

      const response = await this.client.get('/', {
        params: {
          i: imdbId,
          plot: 'full',
        },
      });

      if (response.data.Response === 'False') {
        logger.warn(`No se encontró contenido en OMDB para IMDB ID: ${imdbId}`);
        return null;
      }

      const movie = response.data;
      
      // Guardar en cache
      await this.redisService.setJson(cacheKey, movie, this.CACHE_TTL);
      
      logger.info(`Detalles obtenidos de OMDB para IMDB ID: ${imdbId}`);
      return movie;
    } catch (error) {
      logger.error(`Error obteniendo de OMDB IMDB ID ${imdbId}:`, error);
      return null;
    }
  }

  async getByTitle(title: string, year?: number, type?: 'movie' | 'series'): Promise<OMDBMovie | null> {
    const cacheKey = `${this.CACHE_PREFIX}title:${title}:${year || 'any'}:${type || 'any'}`;
    
    try {
      // Verificar cache
      const cached = await this.redisService.getJson<OMDBMovie>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit para título OMDB: ${title}`);
        return cached;
      }

      const params: any = { t: title, plot: 'full' };
      if (year) params.y = year;
      if (type) params.type = type;

      const response = await this.client.get('/', { params });
      
      if (response.data.Response === 'False') {
        logger.warn(`No se encontró en OMDB: ${title}`);
        return null;
      }

      const movie = response.data;
      
      // Guardar en cache
      await this.redisService.setJson(cacheKey, movie, this.CACHE_TTL);
      
      logger.info(`Detalles obtenidos de OMDB para: ${title}`);
      return movie;
    } catch (error) {
      logger.error(`Error obteniendo de OMDB "${title}":`, error);
      return null;
    }
  }

  parseRating(rating: string): number | null {
    if (!rating || rating === 'N/A') return null;
    
    // Convertir rating de formato "8.5/10" a número
    const match = rating.match(/^([\d.]+)/);
    return match ? parseFloat(match[1]) : null;
  }

  parseRuntime(runtime: string): number | null {
    if (!runtime || runtime === 'N/A') return null;
    
    // Convertir "120 min" a número
    const match = runtime.match(/^(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  parseGenres(genre: string): string[] {
    if (!genre || genre === 'N/A') return [];
    
    return genre.split(',').map(g => g.trim());
  }

  parseCast(actors: string): string[] {
    if (!actors || actors === 'N/A') return [];
    
    return actors.split(',').map(actor => actor.trim());
  }
}