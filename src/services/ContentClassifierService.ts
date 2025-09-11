import { TMDBService, TMDBMovie, TMDBSeries } from './TMDBService';
import { OMDBService, OMDBMovie } from './OMDBService';
import { RedisService } from './RedisService';
import { logger } from '../utils/logger';
import { Quality } from '@prisma/client';

export interface ClassificationResult {
  type: 'movie' | 'series' | 'channel';
  confidence: number;
  metadata: {
    title: string;
    originalTitle?: string;
    year?: number;
    overview?: string;
    poster?: string;
    backdrop?: string;
    genres?: string[];
    rating?: number;
    duration?: number;
    quality?: Quality;
    language?: string;
    category?: string;
    season?: number;
    episode?: number;
    group?: string;
  };
  sources?: {
    tmdb?: TMDBMovie | TMDBSeries;
    omdb?: OMDBMovie;
  };
}

export class ContentClassifierService {
  private tmdbService: TMDBService;
  private omdbService: OMDBService;
  private redisService: RedisService;
  private readonly CACHE_PREFIX = 'classifier:';
  private readonly CACHE_TTL = 3600; // 1 hora

  constructor(
    tmdbService: TMDBService,
    omdbService: OMDBService,
    redisService: RedisService
  ) {
    this.tmdbService = tmdbService;
    this.omdbService = omdbService;
    this.redisService = redisService;
  }

  async classifyContent(name: string, url: string, group?: string): Promise<ClassificationResult> {
    const cleanTitle = this.cleanTitle(name);
    const contentType = this.detectContentType(name, group);
    
    let result: ClassificationResult = {
      type: contentType.type,
      confidence: 0.8,
      metadata: {
        title: cleanTitle,
        year: contentType.year || undefined,
        season: contentType.season || undefined,
        episode: contentType.episode || undefined
      }
    };

    // Detectar calidad y idioma
    const quality = this.detectQuality(name);
    if (quality) {
      result.metadata.quality = quality;
    }
    
    const language = this.detectLanguage(name, group);
    if (language) {
      result.metadata.language = language;
    }

    return result;
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/\[.*?\]/g, '') // Remover contenido entre corchetes
      .replace(/\(.*?\)/g, '') // Remover contenido entre paréntesis
      .replace(/\b(HD|FHD|4K|UHD|SD|720p|1080p|2160p)\b/gi, '') // Remover calidad
      .replace(/\b(ES|EN|FR|DE|IT|PT)\b/gi, '') // Remover idiomas
      .replace(/\b(CAM|TS|TC|SCR|DVDRip|BRRip|WEBRip)\b/gi, '') // Remover fuentes
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  private async enrichWithTMDB(title: string, year?: number, type: 'movie' | 'series' = 'movie'): Promise<ClassificationResult> {
    try {
      if (type === 'movie') {
        const [tmdbDetails, omdbMovie] = await Promise.all([
          this.tmdbService.searchMovie(title, year),
          this.omdbService.getMovieByTitle(title, year)
        ]);

        return {
          type: 'movie',
          confidence: tmdbDetails ? 0.9 : 0.6,
          metadata: {
            title,
            originalTitle: tmdbDetails?.original_title,
            year: year || undefined,
            overview: tmdbDetails?.overview,
            poster: tmdbDetails?.poster_path ? this.tmdbService.getImageUrl(tmdbDetails.poster_path) : (omdbMovie?.Poster !== 'N/A' ? omdbMovie?.Poster : undefined),
            backdrop: tmdbDetails?.backdrop_path ? this.tmdbService.getImageUrl(tmdbDetails.backdrop_path) : undefined,
            genres: tmdbDetails?.genres?.map(g => g.name),
            rating: tmdbDetails?.vote_average || (omdbMovie?.imdbRating ? this.omdbService.parseRating(omdbMovie.imdbRating) : undefined),
            duration: tmdbDetails?.runtime || (omdbMovie?.Runtime ? this.omdbService.parseRuntime(omdbMovie.Runtime) : undefined)
          },
          sources: {
            tmdb: tmdbDetails || undefined,
            omdb: omdbMovie || undefined
          }
        };
      } else {
        // Series logic
        const [tmdbDetails, omdbSeries] = await Promise.all([
          this.tmdbService.searchSeries(title, year),
          this.omdbService.getSeriesByTitle(title, year)
        ]);

        return {
          type: 'series',
          confidence: tmdbDetails ? 0.9 : 0.6,
          metadata: { title, year: year || undefined },
          sources: {
            tmdb: tmdbDetails || undefined,
            omdb: omdbSeries || undefined
          }
        };
      }
    } catch (error) {
      logger.error('Error enriching with TMDB:', error);
      return {
        type,
        confidence: 0.5,
        metadata: { title, year: year || undefined }
      };
    }
  }

  private async enrichChannel(title: string, group?: string): Promise<ClassificationResult> {
    const category = this.detectCategory(title, group);
    return {
      type: 'channel',
      confidence: 0.7,
      metadata: {
        title,
        category: category || undefined,
        group: group || undefined
      }
    };
  }

  private async classifyMovie(title: string, year?: number): Promise<ClassificationResult> {
    try {
      // Buscar en TMDB
      const tmdbResults = await this.tmdbService.searchMovie(title, year);
      const tmdbMovie = tmdbResults[0];
      
      // Buscar en OMDB
      const omdbResults = await this.omdbService.searchByTitle(title, year, 'movie');
      const omdbMovie = omdbResults[0] ? await this.omdbService.getByImdbId(omdbResults[0].imdbID) : null;
      
      if (!tmdbMovie && !omdbMovie) {
        return {
          type: 'movie',
          confidence: 30,
          metadata: {
            title,
            year,
          },
          sources: {},
        };
      }
      
      // Obtener detalles completos de TMDB si existe
      const tmdbDetails = tmdbMovie ? await this.tmdbService.getMovieDetails(tmdbMovie.id) : null;
      
      const confidence = this.calculateConfidence(title, tmdbMovie?.title || omdbMovie?.Title, year, tmdbMovie?.release_date || omdbMovie?.Year);
      
      return {
        type: 'movie',
        confidence,
        metadata: {
          title: tmdbDetails?.title || omdbMovie?.Title || title,
          originalTitle: tmdbDetails?.original_title,
          year: year || (tmdbDetails?.release_date ? new Date(tmdbDetails.release_date).getFullYear() : undefined),
          overview: tmdbDetails?.overview || omdbMovie?.Plot,
          poster: tmdbDetails?.poster_path ? this.tmdbService.getImageUrl(tmdbDetails.poster_path) : omdbMovie?.Poster,
          backdrop: tmdbDetails?.backdrop_path ? this.tmdbService.getImageUrl(tmdbDetails.backdrop_path) : undefined,
          genres: tmdbDetails?.genres?.map(g => g.name) || this.omdbService.parseGenres(omdbMovie?.Genre || ''),
          rating: tmdbDetails?.vote_average || this.omdbService.parseRating(omdbMovie?.imdbRating || ''),
          duration: tmdbDetails?.runtime || this.omdbService.parseRuntime(omdbMovie?.Runtime || ''),
          language: tmdbDetails?.spoken_languages?.[0]?.name,
          country: tmdbDetails?.production_countries?.[0]?.name || omdbMovie?.Country,
          director: tmdbDetails?.credits?.crew?.find(c => c.job === 'Director')?.name || omdbMovie?.Director,
          cast: tmdbDetails?.credits?.cast?.slice(0, 5).map(c => c.name) || this.omdbService.parseCast(omdbMovie?.Actors || ''),
          tmdbId: tmdbDetails?.id,
          imdbId: omdbMovie?.imdbID,
        },
        sources: {
          tmdb: tmdbDetails || undefined,
          omdb: omdbMovie || undefined,
        },
      };
    } catch (error) {
      logger.error(`Error clasificando película "${title}":`, error);
      return {
        type: 'movie',
        confidence: 20,
        metadata: { title, year },
        sources: {},
      };
    }
  }

  private async classifySeries(title: string, year?: number): Promise<ClassificationResult> {
    try {
      // Buscar en TMDB
      const tmdbResults = await this.tmdbService.searchSeries(title, year);
      const tmdbSeries = tmdbResults[0];
      
      // Buscar en OMDB
      const omdbResults = await this.omdbService.searchByTitle(title, year, 'series');
      const omdbSeries = omdbResults[0] ? await this.omdbService.getByImdbId(omdbResults[0].imdbID) : null;
      
      if (!tmdbSeries && !omdbSeries) {
        return {
          type: 'series',
          confidence: 30,
          metadata: {
            title,
            year,
          },
          sources: {},
        };
      }
      
      // Obtener detalles completos de TMDB si existe
      const tmdbDetails = tmdbSeries ? await this.tmdbService.getSeriesDetails(tmdbSeries.id) : null;
      
      const confidence = this.calculateConfidence(title, tmdbSeries?.name || omdbSeries?.Title, year, tmdbSeries?.first_air_date || omdbSeries?.Year);
      
      return {
        type: 'series',
        confidence,
        metadata: {
          title: tmdbDetails?.name || omdbSeries?.Title || title,
          originalTitle: tmdbDetails?.original_name,
          year: year || (tmdbDetails?.first_air_date ? new Date(tmdbDetails.first_air_date).getFullYear() : undefined),
          overview: tmdbDetails?.overview || omdbSeries?.Plot,
          poster: tmdbDetails?.poster_path ? this.tmdbService.getImageUrl(tmdbDetails.poster_path) : omdbSeries?.Poster,
          backdrop: tmdbDetails?.backdrop_path ? this.tmdbService.getImageUrl(tmdbDetails.backdrop_path) : undefined,
          genres: tmdbDetails?.genres?.map(g => g.name) || this.omdbService.parseGenres(omdbSeries?.Genre || ''),
          rating: tmdbDetails?.vote_average || this.omdbService.parseRating(omdbSeries?.imdbRating || ''),
          language: tmdbDetails?.spoken_languages?.[0]?.name,
          country: tmdbDetails?.production_countries?.[0]?.name || omdbSeries?.Country,
          cast: tmdbDetails?.created_by?.map(c => c.name) || this.omdbService.parseCast(omdbSeries?.Actors || ''),
          seasons: tmdbDetails?.number_of_seasons || (omdbSeries?.totalSeasons ? parseInt(omdbSeries.totalSeasons) : undefined),
          episodes: tmdbDetails?.number_of_episodes,
          status: tmdbDetails?.status,
          tmdbId: tmdbDetails?.id,
          imdbId: omdbSeries?.imdbID,
        },
        sources: {
          tmdb: tmdbDetails || undefined,
          omdb: omdbSeries || undefined,
        },
      };
    } catch (error) {
      logger.error(`Error clasificando serie "${title}":`, error);
      return {
        type: 'series',
        confidence: 20,
        metadata: { title, year },
        sources: {},
      };
    }
  }

  private classifyChannel(title: string, group?: string): ClassificationResult {
    const category = this.detectCategory(title, group);
    
    return {
      type: 'channel',
      confidence: 90,
      metadata: {
        title,
        category,
        group,
      },
      sources: {},
    };
  }

  private calculateConfidence(originalTitle: string, foundTitle?: string, originalYear?: number, foundYear?: string): number {
    let confidence = 50;
    
    if (foundTitle) {
      // Calcular similitud de títulos
      const similarity = this.calculateStringSimilarity(originalTitle.toLowerCase(), foundTitle.toLowerCase());
      confidence += similarity * 40;
    }
    
    if (originalYear && foundYear) {
      const yearDiff = Math.abs(originalYear - (new Date(foundYear).getFullYear() || parseInt(foundYear)));
      if (yearDiff === 0) confidence += 10;
      else if (yearDiff <= 1) confidence += 5;
    }
    
    return Math.min(Math.round(confidence), 100);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: (number | undefined)[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [];
      if (matrix[i]) {
        matrix[i][0] = i;
      }
    }

    for (let j = 0; j <= str1.length; j++) {
      if (matrix[0]) {
        matrix[0][j] = j;
      }
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str1[j - 1] === str2[i - 1]) {
          if (matrix[i] && matrix[i - 1] && matrix[i - 1][j - 1] !== undefined) {
            matrix[i][j] = matrix[i - 1][j - 1];
          }
        } else {
          const substitution = matrix[i - 1]?.[j - 1] ?? 0;
          const insertion = matrix[i]?.[j - 1] ?? 0;
          const deletion = matrix[i - 1]?.[j] ?? 0;
          
          if (matrix[i]) {
            matrix[i][j] = Math.min(
              substitution + 1,
              insertion + 1,
              deletion + 1
            );
          }
        }
      }
    }

    return matrix[str2.length]?.[str1.length] ?? 0;
  }

  private detectQuality(name: string): Quality | undefined {
    const qualityPatterns = {
      UHD_4K: /4k|uhd|2160p/i,
      FHD: /fhd|1080p|full\s*hd/i,
      HD: /hd|720p/i,
      SD: /sd|480p|360p/i,
    };

    for (const [quality, pattern] of Object.entries(qualityPatterns)) {
      if (pattern.test(name)) {
        return quality as Quality;
      }
    }
    return undefined;
  }

  private detectLanguage(name: string, group?: string): string | undefined {
    const text = `${name} ${group || ''}`.toLowerCase();
    
    const languages = {
      'español': /\b(es|esp|spanish|español|castellano)\b/i,
      'inglés': /\b(en|eng|english|inglés)\b/i,
      'francés': /\b(fr|fra|french|francés)\b/i,
      'alemán': /\b(de|ger|german|alemán)\b/i,
      'italiano': /\b(it|ita|italian|italiano)\b/i,
      'portugués': /\b(pt|por|portuguese|portugués)\b/i,
    };

    for (const [language, pattern] of Object.entries(languages)) {
      if (pattern.test(text)) {
        return language;
      }
    }

    return undefined;
  }

  private detectCategory(name: string, group?: string): string | undefined {
    const text = `${name} ${group || ''}`.toLowerCase();
    
    const categories = {
      'deportes': /sport|deporte|football|soccer|basketball|tennis|espn|fox\s*sports/i,
      'noticias': /news|noticias|cnn|bbc|fox\s*news|telemundo|univision/i,
      'entretenimiento': /entertainment|entretenimiento|comedy|comedia|variety/i,
      'infantil': /kids|infantil|cartoon|disney|nickelodeon|cartoon\s*network/i,
      'música': /music|musica|mtv|vh1|music\s*tv/i,
      'documentales': /documentary|documental|discovery|history|national\s*geographic/i,
      'películas': /movie|pelicula|cinema|film|cine/i,
      'series': /series|tv\s*show|drama/i,
      'religioso': /religious|religioso|church|iglesia|catholic|cristiano/i,
      'adultos': /adult|adulto|xxx|porn/i,
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(text)) {
        return category;
      }
    }

    return 'general';
  }
}