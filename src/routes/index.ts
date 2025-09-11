import { Router } from 'express';
import sourcesRoutes from './sources';
// import contaboRoutes from './contabo'; // Crear si es necesario

const router = Router();

// Rutas principales
router.use('/sources', sourcesRoutes);
// router.use('/contabo', contaboRoutes);

// Ruta de información de la API
router.get('/', (req, res) => {
  res.json({
    name: 'LENS API',
    version: '1.0.0',
    description: 'Live Entertainment Network Scanner API',
    endpoints: {
      sources: '/api/sources',
      health: '/health',
    },
  });
});

export { router as routes };