import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { getDashboardStats, getAllAppointments, manageUser } from '../controllers/admin.controller';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));
router.get('/stats', getDashboardStats);
router.get('/appointments', getAllAppointments);
router.patch('/users/:id', manageUser);
export default router;
