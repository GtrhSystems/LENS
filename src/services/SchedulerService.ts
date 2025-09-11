import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import { DatabaseService } from './DatabaseService';

export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  start(): void {
    logger.info('Iniciando scheduler de tareas...');
    
    // Backup automático cada día a las 2:00 AM
    const backupTask = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Ejecutando backup automático...');
        // Lógica de backup aquí
      } catch (error) {
        logger.error('Error en backup automático:', error);
      }
    }, {
      scheduled: false,
    });
    
    this.tasks.set('backup', backupTask);
    backupTask.start();
    
    // Limpieza de logs cada semana
    const cleanupTask = cron.schedule('0 3 * * 0', async () => {
      try {
        logger.info('Ejecutando limpieza de logs...');
        // Lógica de limpieza aquí
      } catch (error) {
        logger.error('Error en limpieza:', error);
      }
    }, {
      scheduled: false,
    });
    
    this.tasks.set('cleanup', cleanupTask);
    cleanupTask.start();
    
    logger.info(`Scheduler iniciado con ${this.tasks.size} tareas`);
  }

  stop(): void {
    logger.info('Deteniendo scheduler...');
    this.tasks.forEach((task, name) => {
      task.stop();
      logger.info(`Tarea '${name}' detenida`);
    });
    this.tasks.clear();
  }

  addTask(name: string, schedule: string, callback: () => void): void {
    if (this.tasks.has(name)) {
      logger.warn(`Tarea '${name}' ya existe, reemplazando...`);
      this.tasks.get(name)?.stop();
    }
    
    const task = cron.schedule(schedule, callback, { scheduled: false });
    this.tasks.set(name, task);
    task.start();
    
    logger.info(`Tarea '${name}' agregada con schedule: ${schedule}`);
  }

  removeTask(name: string): boolean {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      logger.info(`Tarea '${name}' eliminada`);
      return true;
    }
    return false;
  }
}