import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  getProfile, updateProfile, createAnnouncement,
  getAnnouncements, updateAnnouncement, deleteAnnouncement,
  getAvailabilityOverrides, upsertAvailabilityOverride, deleteAvailabilityOverride,
} from '../controllers/provider.controller';

const router = Router();
router.get('/profile/:userId', getProfile);
router.get('/:providerId/announcements', getAnnouncements);
router.get('/availability/:userId', getAvailabilityOverrides);
router.use(authenticate);
router.put('/profile', requireRole('SERVICE_PROVIDER', 'ADMIN'), updateProfile);
router.post('/announcements', requireRole('SERVICE_PROVIDER', 'ADMIN'), createAnnouncement);
router.put('/announcements/:id', requireRole('SERVICE_PROVIDER', 'ADMIN'), updateAnnouncement);
router.delete('/announcements/:id', requireRole('SERVICE_PROVIDER', 'ADMIN'), deleteAnnouncement);
router.put('/availability', requireRole('SERVICE_PROVIDER', 'ADMIN'), upsertAvailabilityOverride);
router.delete('/availability/:date', requireRole('SERVICE_PROVIDER', 'ADMIN'), deleteAvailabilityOverride);
export default router;
