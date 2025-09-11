import axios from 'axios';
import { logger } from '../utils/logger';
import { SourceType, Quality } from '@prisma/client';

export interface M3UEntry {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  country?: string;
  language?: string;
  category?: string;
  quality?: Quality;
  tvgId?: string;
  tvgName?: string;
  duration?: number;
}

export interface ParsedM3U {
  entries: M3UEntry[];
  metadata: {
    totalEntries: number;
    channels: number;
    movies: number;
    series: number;
    parseTime: number;
  };
}

export class M3UParser {
  private static readonly EXTINF_REGEX = /#EXTINF:(-?\d+(?:\.\d+)?),(.*)$/;
  private static readonly ATTRIBUTE_REGEX = /(\w+)="([^"]*)"/g;
  private static readonly QUALITY_PATTERNS = {
    UHD_4K: /4k|uhd|2160p/i,
    FHD: /fhd|1080p|full\s*hd/i,
    HD: /hd|720p/i,
    SD: /sd|480p|360p/i,
  };

  async parseFromUrl(url: string): Promise<ParsedM3U> {
    const startTime = Date.now();
    
    try {
      logger.info(`Iniciando parseo de M3U desde URL: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'LENS-Scanner/1.0',
        },
      });

      const content = response.data;
      return this.parseContent(content, startTime);
    } catch (error) {
      logger.error(`Error parseando M3U desde URL ${url}:`, error);
      throw new Error(`Error descargando M3U: ${error}`);
    }
  }

  async parseFromFile(filePath: string): Promise<ParsedM3U> {
    const startTime = Date.now();
    
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseContent(content, startTime);
    } catch (error) {
      logger.error(`Error parseando archivo M3U ${filePath}:`, error);
      throw new Error(`Error leyendo archivo M3U: ${error}`);
    }
  }

  parseFromString(content: string): ParsedM3U {
    return this.parseContent(content, Date.now());
  }

  private parseContent(content: string, startTime: number): ParsedM3U {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const entries: M3UEntry[] = [];
    let channels = 0;
    let movies = 0;
    let series = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('#EXTINF:')) {
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.startsWith('#')) {
          const entry = this.parseExtinf(line, nextLine);
          if (entry) {
            entries.push(entry);
            
            // Clasificar tipo de contenido
            const contentType = this.classifyContent(entry.name, entry.group);
            switch (contentType) {
              case 'channel':
                channels++;
                break;
              case 'movie':
                movies++;
                break;
              case 'series':
                series++;
                break;
            }
          }
          i++; // Saltar la siguiente línea ya que es la URL
        }
      }
    }

    const parseTime = Date.now() - startTime;
    
    logger.info(`M3U parseado exitosamente: ${entries.length} entradas en ${parseTime}ms`);

    return {
      entries,
      metadata: {
        totalEntries: entries.length,
        channels,
        movies,
        series,
        parseTime,
      },
    };
  }

  async parseFromString(content: string): Promise<M3UEntry[]> {
    const lines = content.split('\n').map(line => line.trim());
    const entries: M3UEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.startsWith('#EXTINF:')) {
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.startsWith('#')) {
          const entry = this.parseExtinf(line, nextLine);
          if (entry) {
            entries.push(entry);
          }
        }
      }
    }

    return entries;
  }

  private parseExtinf(extinf: string, url: string): M3UEntry | null {
    const match = extinf.match(M3UParser.EXTINF_REGEX);
    if (!match || !match[1]) return null;

    const duration = parseFloat(match[1]) || 0;
    const info = match[2];
    if (!info) return null;

    const attributes: Record<string, string> = {};
    let attributeMatch: RegExpExecArray | null;
    
    while ((attributeMatch = M3UParser.ATTRIBUTE_REGEX.exec(info)) !== null) {
      if (attributeMatch[1] && attributeMatch[2]) {
        attributes[attributeMatch[1].toLowerCase()] = attributeMatch[2];
      }
    }

    const nameMatch = info.match(/,\s*(.+)$/);
    const name = nameMatch && nameMatch[1] ? nameMatch[1].trim() : info.trim();

    const entry: M3UEntry = {
      name,
      url,
      duration,
      group: attributes['group-title'] || undefined,
      logo: attributes['tvg-logo'] || undefined,
      id: attributes['tvg-id'] || undefined
    };

    // Detectar calidad y categoría
    const quality = this.detectQuality(name);
    if (quality) {
      entry.quality = quality;
    }

    const category = this.detectCategory(name, entry.group);
    if (category) {
      entry.category = category;
    }

    return entry;
  }

  private cleanName(name: string): string {
    // Remover información de calidad y otros metadatos del nombre
    return name
      .replace(/\[.*?\]/g, '') // Remover contenido entre corchetes
      .replace(/\(.*?\)/g, '') // Remover contenido entre paréntesis
      .replace(/\b(HD|FHD|4K|UHD|SD)\b/gi, '') // Remover indicadores de calidad
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  private detectQuality(name: string): Quality | undefined {
    for (const [quality, pattern] of Object.entries(M3UParser.QUALITY_PATTERNS)) {
      if (pattern.test(name)) {
        return quality as Quality;
      }
    }
    return undefined;
  }

  private detectCategory(name: string, group?: string): string | undefined {
    const text = `${name} ${group || ''}`.toLowerCase();
    
    const categories = {
      'deportes': /sport|deporte|football|soccer|basketball|tennis/i,
      'noticias': /news|noticias|cnn|bbc|fox/i,
      'entretenimiento': /entertainment|entretenimiento|comedy|comedia/i,
      'infantil': /kids|infantil|cartoon|disney|nickelodeon/i,
      'música': /music|musica|mtv|vh1/i,
      'documentales': /documentary|documental|discovery|history/i,
      'películas': /movie|pelicula|cinema|film/i,
      'series': /series|tv\s*show|temporada|season|episode/i,
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(text)) {
        return category;
      }
    }

    return undefined;
  }

  private classifyContent(name: string, group?: string): 'channel' | 'movie' | 'series' {
    const text = `${name} ${group || ''}`.toLowerCase();
    
    // Patrones para películas
    if (/\b(movie|pelicula|film|cinema)\b/i.test(text) || 
        /\b\d{4}\b/.test(name)) { // Año en el nombre
      return 'movie';
    }
    
    // Patrones para series
    if (/\b(series|temporada|season|episode|s\d+e\d+|cap\w*\s*\d+)\b/i.test(text)) {
      return 'series';
    }
    
    // Por defecto es canal de TV
    return 'channel';
  }
}