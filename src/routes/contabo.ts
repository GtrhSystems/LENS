import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(rateLimitMiddleware);

router.get('/status', (req, res) => {
  res.json({ status: 'Contabo integration ready' });
});

router.post('/backup', (req, res) => {
  // Implementar lógica de backup
  res.json({ message: 'Backup initiated' });
});

export default router;