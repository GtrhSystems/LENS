import axios from 'axios';
import { ContentItem, ContentFilters } from '../types/content';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const contentService = {
  // Get content with filters
  async getContent(type: string, filters: ContentFilters) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/content/${type}?${params}`);
    return response.data;
  },
  
  // Get filter options
  async getFilterOptions(type: string) {
    const response = await api.get(`/content/${type}/filters`);
    return response.data;
  },
  
  // Get content by ID
  async getContentById(type: string, id: string) {
    const response = await api.get(`/content/${type}/${id}`);
    return response.data;
  },
  
  // Search content
  async searchContent(query: string, type?: string) {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    
    const response = await api.get(`/content/search?${params}`);
    return response.data;
  },
  
  // Get content statistics
  async getContentStats() {
    const response = await api.get('/content/stats');
    return response.data;
  }
};

export const sourceService = {
  // Get all sources
  async getSources(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/sources?${params}`);
    return response.data;
  },
  
  // Add new source
  async addSource(sourceData: any) {
    const response = await api.post('/sources', sourceData);
    return response.data;
  },
  
  // Update source
  async updateSource(id: string, sourceData: any) {
    const response = await api.put(`/sources/${id}`, sourceData);
    return response.data;
  },
  
  // Delete source
  async deleteSource(id: string) {
    const response = await api.delete(`/sources/${id}`);
    return response.data;
  },
  
  // Scan source
  async scanSource(id: string) {
    const response = await api.post(`/sources/${id}/scan`);
    return response.data;
  },
  
  // Get source content
  async getSourceContent(id: string, filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/sources/${id}/content?${params}`);
    return response.data;
  }
};