import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  getAppointments, getAppointment, createAppointment,
  updateAppointmentStatus, rescheduleAppointment, deleteAppointment, getAvailableSlots,
} from '../controllers/appointment.controller';

const router = Router();

router.use(authenticate);

router.get('/', getAppointments);
router.get('/slots/:providerId', getAvailableSlots);
router.get('/:id', getAppointment);
router.post('/', requireRole('CLIENT', 'SERVICE_PROVIDER', 'ADMIN'), createAppointment);
router.patch('/:id/status', updateAppointmentStatus);
router.patch('/:id/reschedule', rescheduleAppointment);
router.delete('/:id', requireRole('ADMIN', 'SERVICE_PROVIDER'), deleteAppointment);

export default router;
