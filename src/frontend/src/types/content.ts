export interface ContentItem {
  id: string;
  title: string;
  originalTitle: string;
  type: 'movie' | 'series' | 'channel';
  url: string;
  sourceId: string;
  sourceName: string;
  
  // Movie/Series specific
  tmdbId?: string;
  imdbId?: string;
  year?: number;
  genre?: string;
  director?: string;
  actors?: string;
  plot?: string;
  runtime?: number;
  rating?: number;
  
  // Series specific
  season?: number;
  episode?: number;
  
  // Channel specific
  category?: string;
  
  // Common
  quality?: string;
  language?: string;
  confidence: number;
  posterUrl?: string;
  backdropUrl?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ContentFilters {
  search: string;
  genre?: string;
  year?: string;
  quality?: string;
  language?: string;
  director?: string;
  actor?: string;
  minRating?: number;
  maxRating?: number;
  minYear?: number;
  maxYear?: number;
  page: number;
  limit: number;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  type: 'm3u' | 'xtream' | 'archivoloca';
  status: 'active' | 'inactive' | 'scanning' | 'error';
  lastScan?: string;
  totalContent: number;
  createdAt: string;
  updatedAt: string;
}