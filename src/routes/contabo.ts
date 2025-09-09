import { Router } from 'express';
import { contaboService } from '../services/ContaboService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// Obtener información de instancias
router.get('/instances', async (req, res) => {
  try {
    const instances = await contaboService.getInstances();
    res.json({
      success: true,
      data: instances
    });
  } catch (error) {
    logger.error('Error getting CONTABO instances:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get instances'
    });
  }
});

// Obtener información de instancia específica
router.get('/instances/:id', async (req, res) => {
  try {
    const instanceId = parseInt(req.params.id);
    const instance = await contaboService.getInstance(instanceId);
    res.json({
      success: true,
      data: instance
    });
  } catch (error) {
    logger.error('Error getting CONTABO instance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get instance'
    });
  }
});

// Controlar instancia (start/stop/restart)
router.post('/instances/:id/:action', async (req, res) => {
  try {
    const instanceId = parseInt(req.params.id);
    const action = req.params.action;

    switch (action) {
      case 'start':
        await contaboService.startInstance(instanceId);
        break;
      case 'stop':
        await contaboService.stopInstance(instanceId);
        break;
      case 'restart':
        await contaboService.restartInstance(instanceId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use: start, stop, or restart'
        });
    }

    res.json({
      success: true,
      message: `Instance ${action} command sent successfully`
    });
  } catch (error) {
    logger.error(`Error ${req.params.action} CONTABO instance:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to ${req.params.action} instance`
    });
  }
});

// Obtener snapshots
router.get('/snapshots', async (req, res) => {
  try {
    const instanceId = req.query.instanceId ? parseInt(req.query.instanceId as string) : undefined;
    const snapshots = await contaboService.getSnapshots(instanceId);
    res.json({
      success: true,
      data: snapshots
    });
  } catch (error) {
    logger.error('Error getting CONTABO snapshots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get snapshots'
    });
  }
});

// Crear snapshot
router.post('/instances/:id/snapshots', async (req, res) => {
  try {
    const instanceId = parseInt(req.params.id);
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Snapshot name is required'
      });
    }

    const snapshot = await contaboService.createSnapshot(instanceId, name, description);
    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    logger.error('Error creating CONTABO snapshot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create snapshot'
    });
  }
});

// Eliminar snapshot
router.delete('/snapshots/:id', async (req, res) => {
  try {
    const snapshotId = req.params.id;
    await contaboService.deleteSnapshot(snapshotId);
    res.json({
      success: true,
      message: 'Snapshot deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting CONTABO snapshot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete snapshot'
    });
  }
});

// Obtener estadísticas de instancia
router.get('/instances/:id/stats', async (req, res) => {
  try {
    const instanceId = parseInt(req.params.id);
    const period = (req.query.period as '1h' | '1d' | '7d' | '30d') || '1h';
    const stats = await contaboService.getInstanceStats(instanceId, period);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting CONTABO instance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get instance stats'
    });
  }
});

// Obtener centros de datos disponibles
router.get('/data-centers', async (req, res) => {
  try {
    const dataCenters = await contaboService.getDataCenters();
    res.json({
      success: true,
      data: dataCenters
    });
  } catch (error) {
    logger.error('Error getting CONTABO data centers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get data centers'
    });
  }
});

export default router;