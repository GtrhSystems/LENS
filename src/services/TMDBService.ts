import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { RedisService } from './RedisService';

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  runtime?: number;
  genres?: { id: number; name: string }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: { iso_639_1: string; name: string }[];
  credits?: {
    cast: { name: string; character: string }[];
    crew: { name: string; job: string }[];
  };
}

export interface TMDBSeries {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  genres?: { id: number; name: string }[];
  created_by?: { name: string }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: { iso_639_1: string; name: string }[];
  seasons?: TMDBSeason[];
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episode_count: number;
  episodes?: TMDBEpisode[];
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number;
  vote_average: number;
  season_number: number;
}

export class TMDBService {
  private client: AxiosInstance;
  private redisService: RedisService;
  private readonly CACHE_PREFIX = 'tmdb:';
  private readonly CACHE_TTL = 86400; // 24 horas

  constructor(redisService: RedisService) {
    this.redisService = redisService;
    this.client = axios.create({
      baseURL: config.tmdb.baseUrl,
      timeout: 10000,
      params: {
        api_key: config.tmdb.apiKey
      }
    });

    this.client.interceptors.request.use((config: any) => {
      logger.debug('TMDB Request:', {
        url: config.url,
        params: config.params
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response: any) => {
        logger.debug('TMDB Response:', {
          status: response.status,
          data: response.data?.results?.length || 'N/A'
        });
        return response;
      },
      (error: any) => {
        logger.error('TMDB Error:', {
          message: error.message,
          status: error.response?.status
        });
        return Promise.reject(error);
      }
    );
  }

  async searchMovie(query: string, year?: number): Promise<TMDBMovie[]> {
    const cacheKey = `${this.CACHE_PREFIX}search:movie:${query}:${year || 'any'}`;
    
    try {
      // Verificar cache
      const cached = await this.redisService.getJson<TMDBMovie[]>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit para búsqueda de película: ${query}`);
        return cached;
      }

      const params: any = { query };
      if (year) params.year = year;

      const response = await this.client.get('/search/movie', { params });
      const results = response.data.results || [];

      // Guardar en cache
      await this.redisService.setJson(cacheKey, results, this.CACHE_TTL);
      
      logger.info(`Encontradas ${results.length} películas para: ${query}`);
      return results;
    } catch (error) {
      logger.error(`Error buscando película "${query}":`, error);
      return [];
    }
  }

  async searchSeries(query: string, year?: number): Promise<TMDBSeries[]> {
    const cacheKey = `${this.CACHE_PREFIX}search:tv:${query}:${year || 'any'}`;
    
    try {
      // Verificar cache
      const cached = await this.redisService.getJson<TMDBSeries[]>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit para búsqueda de serie: ${query}`);
        return cached;
      }

      const params: any = { query };
      if (year) params.first_air_date_year = year;

      const response = await this.client.get('/search/tv', { params });
      const results = response.data.results || [];

      // Guardar en cache
      await this.redisService.setJson(cacheKey, results, this.CACHE_TTL);
      
      logger.info(`Encontradas ${results.length} series para: ${query}`);
      return results;
    } catch (error) {
      logger.error(`Error buscando serie "${query}":`, error);
      return [];
    }
  }

  async getMovieDetails(movieId: number): Promise<TMDBMovie | null> {
    const cacheKey = `${this.CACHE_PREFIX}movie:${movieId}`;
    
    try {
      // Verificar cache
      const cached = await this.redisService.getJson<TMDBMovie>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit para película ID: ${movieId}`);
        return cached;
      }

      const response = await this.client.get(`/movie/${movieId}`, {
        params: {
          append_to_response: 'credits',
        },
      });

      const movie = response.data;
      
      // Guardar en cache
      await this.redisService.setJson(cacheKey, movie, this.CACHE_TTL);
      
      logger.info(`Detalles obtenidos para película ID: ${movieId}`);
      return movie;
    } catch (error) {
      logger.error(`Error obteniendo detalles de película ID ${movieId}:`, error);
      return null;
    }
  }

  async getSeriesDetails(seriesId: number): Promise<TMDBSeries | null> {
    const cacheKey = `${this.CACHE_PREFIX}tv:${seriesId}`;
    
    try {
      // Verificar cache
      const cached = await this.redisService.getJson<TMDBSeries>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit para serie ID: ${seriesId}`);
        return cached;
      }

      const response = await this.client.get(`/tv/${seriesId}`);
      const series = response.data;
      
      // Guardar en cache
      await this.redisService.setJson(cacheKey, series, this.CACHE_TTL);
      
      logger.info(`Detalles obtenidos para serie ID: ${seriesId}`);
      return series;
    } catch (error) {
      logger.error(`Error obteniendo detalles de serie ID ${seriesId}:`, error);
      return null;
    }
  }

  async getSeasonDetails(seriesId: number, seasonNumber: number): Promise<TMDBSeason | null> {
    const cacheKey = `${this.CACHE_PREFIX}tv:${seriesId}:season:${seasonNumber}`;
    
    try {
      // Verificar cache
      const cached = await this.redisService.getJson<TMDBSeason>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit para temporada ${seasonNumber} de serie ID: ${seriesId}`);
        return cached;
      }

      const response = await this.client.get(`/tv/${seriesId}/season/${seasonNumber}`);
      const season = response.data;
      
      // Guardar en cache
      await this.redisService.setJson(cacheKey, season, this.CACHE_TTL);
      
      logger.info(`Detalles obtenidos para temporada ${seasonNumber} de serie ID: ${seriesId}`);
      return season;
    } catch (error) {
      logger.error(`Error obteniendo temporada ${seasonNumber} de serie ID ${seriesId}:`, error);
      return null;
    }
  }

  getImageUrl(path: string | null, size: 'w300' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  async getGenres(): Promise<{ movies: any[]; tv: any[] }> {
    const cacheKey = `${this.CACHE_PREFIX}genres`;
    
    try {
      // Verificar cache
      const cached = await this.redisService.getJson<{ movies: any[]; tv: any[] }>(cacheKey);
      if (cached) {
        return cached;
      }

      const [movieGenres, tvGenres] = await Promise.all([
        this.client.get('/genre/movie/list'),
        this.client.get('/genre/tv/list'),
      ]);

      const genres = {
        movies: movieGenres.data.genres || [],
        tv: tvGenres.data.genres || [],
      };

      // Guardar en cache por 7 días
      await this.redisService.setJson(cacheKey, genres, 604800);
      
      return genres;
    } catch (error) {
      logger.error('Error obteniendo géneros:', error);
      return { movies: [], tv: [] };
    }
  }
}