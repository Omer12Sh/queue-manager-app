import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { getServices, createService, updateService, deleteService } from '../controllers/service.controller';

const router = Router();
router.get('/:providerId', getServices);
router.use(authenticate);
router.post('/', requireRole('SERVICE_PROVIDER', 'ADMIN'), createService);
router.put('/:id', requireRole('SERVICE_PROVIDER', 'ADMIN'), updateService);
router.delete('/:id', requireRole('SERVICE_PROVIDER', 'ADMIN'), deleteService);
export default router;
