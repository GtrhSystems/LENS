import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config/config';

interface ContaboCredentials {
  clientId: string;
  clientSecret: string;
  apiUser: string;
  apiPassword: string;
}

interface ContaboInstance {
  instanceId: number;
  displayName: string;
  name: string;
  dataCenter: string;
  region: string;
  productId: string;
  imageId: string;
  ipConfig: {
    v4: {
      ip: string;
      gateway: string;
      netmaskCidr: number;
    };
    v6: {
      ip: string;
      gateway: string;
      netmaskCidr: number;
    };
  };
  macAddress: string;
  ramMb: number;
  cpuCores: number;
  diskMb: number;
  osType: string;
  status: string;
  addDate: string;
  productType: string;
  productName: string;
  defaultUser: string;
}

interface ContaboSnapshot {
  snapshotId: string;
  name: string;
  description: string;
  instanceId: number;
  createdDate: string;
  autoDeleteDate: string;
}

class ContaboService {
  private apiClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private credentials: ContaboCredentials;

  constructor() {
    this.credentials = {
      clientId: config.contabo.clientId,
      clientSecret: config.contabo.clientSecret,
      apiUser: config.contabo.apiUser,
      apiPassword: config.contabo.apiPassword
    };

    this.apiClient = axios.create({
      baseURL: 'https://api.contabo.com/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': this.generateRequestId()
      }
    });

    // Request interceptor para agregar token
    this.apiClient.interceptors.request.use(
      async (config) => {
        await this.ensureValidToken();
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        config.headers['x-request-id'] = this.generateRequestId();
        return config;
      },
      (error) => {
        logger.error('CONTABO API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor para logging
    this.apiClient.interceptors.response.use(
      (response) => {
        logger.info(`CONTABO API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error(`CONTABO API Error: ${error.response?.status} ${error.response?.statusText}`, {
          url: error.config?.url,
          method: error.config?.method,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  private generateRequestId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).toUpperCase();
  }

  private async authenticate(): Promise<string> {
    try {
      const response = await axios.post(
        'https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token',
        new URLSearchParams({
          grant_type: 'password',
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          username: this.credentials.apiUser,
          password: this.credentials.apiPassword
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, expires_in } = response.data;
      this.accessToken = access_token;
      this.tokenExpiry = new Date(Date.now() + (expires_in * 1000) - 60000); // 1 min buffer

      logger.info('CONTABO: Authentication successful');
      return access_token;
    } catch (error) {
      logger.error('CONTABO: Authentication failed', error);
      throw new Error('Failed to authenticate with CONTABO API');
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  // Gestión de Instancias
  async getInstances(): Promise<ContaboInstance[]> {
    try {
      const response = await this.apiClient.get('/compute/instances');
      return response.data.data || [];
    } catch (error) {
      logger.error('Error getting CONTABO instances:', error);
      throw error;
    }
  }

  async getInstance(instanceId: number): Promise<ContaboInstance> {
    try {
      const response = await this.apiClient.get(`/compute/instances/${instanceId}`);
      return response.data.data[0];
    } catch (error) {
      logger.error(`Error getting CONTABO instance ${instanceId}:`, error);
      throw error;
    }
  }

  async startInstance(instanceId: number): Promise<void> {
    try {
      await this.apiClient.post(`/compute/instances/${instanceId}/start`);
      logger.info(`CONTABO instance ${instanceId} started`);
    } catch (error) {
      logger.error(`Error starting CONTABO instance ${instanceId}:`, error);
      throw error;
    }
  }

  async stopInstance(instanceId: number): Promise<void> {
    try {
      await this.apiClient.post(`/compute/instances/${instanceId}/stop`);
      logger.info(`CONTABO instance ${instanceId} stopped`);
    } catch (error) {
      logger.error(`Error stopping CONTABO instance ${instanceId}:`, error);
      throw error;
    }
  }

  async restartInstance(instanceId: number): Promise<void> {
    try {
      await this.apiClient.post(`/compute/instances/${instanceId}/restart`);
      logger.info(`CONTABO instance ${instanceId} restarted`);
    } catch (error) {
      logger.error(`Error restarting CONTABO instance ${instanceId}:`, error);
      throw error;
    }
  }

  // Gestión de Snapshots
  async getSnapshots(instanceId?: number): Promise<ContaboSnapshot[]> {
    try {
      const url = instanceId 
        ? `/compute/instances/${instanceId}/snapshots`
        : '/compute/snapshots';
      const response = await this.apiClient.get(url);
      return response.data.data || [];
    } catch (error) {
      logger.error('Error getting CONTABO snapshots:', error);
      throw error;
    }
  }

  async createSnapshot(instanceId: number, name: string, description?: string): Promise<ContaboSnapshot> {
    try {
      const response = await this.apiClient.post(`/compute/instances/${instanceId}/snapshots`, {
        name,
        description: description || `LENS backup - ${new Date().toISOString()}`
      });
      logger.info(`CONTABO snapshot created for instance ${instanceId}: ${name}`);
      return response.data.data[0];
    } catch (error) {
      logger.error(`Error creating CONTABO snapshot for instance ${instanceId}:`, error);
      throw error;
    }
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/compute/snapshots/${snapshotId}`);
      logger.info(`CONTABO snapshot ${snapshotId} deleted`);
    } catch (error) {
      logger.error(`Error deleting CONTABO snapshot ${snapshotId}:`, error);
      throw error;
    }
  }

  // Monitoreo y Estadísticas
  async getInstanceStats(instanceId: number, period: '1h' | '1d' | '7d' | '30d' = '1h'): Promise<any> {
    try {
      const response = await this.apiClient.get(`/compute/instances/${instanceId}/stats`, {
        params: { period }
      });
      return response.data.data;
    } catch (error) {
      logger.error(`Error getting stats for CONTABO instance ${instanceId}:`, error);
      throw error;
    }
  }

  // Utilidades
  async getDataCenters(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/compute/data-centers');
      return response.data.data || [];
    } catch (error) {
      logger.error('Error getting CONTABO data centers:', error);
      throw error;
    }
  }

  async getImages(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/compute/images');
      return response.data.data || [];
    } catch (error) {
      logger.error('Error getting CONTABO images:', error);
      throw error;
    }
  }
}

export const contaboService = new ContaboService();
export { ContaboInstance, ContaboSnapshot };