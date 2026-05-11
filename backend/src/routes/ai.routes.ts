import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { handleCommand, getScheduleSummary } from '../controllers/ai.controller';

const router = Router();
router.use(authenticate, requireRole('SERVICE_PROVIDER', 'ADMIN'));
router.post('/command', handleCommand);
router.get('/summary', getScheduleSummary);
export default router;
