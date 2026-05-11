import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { sendDirectMessage, broadcastMessage, getMessages, markAsRead } from '../controllers/message.controller';

const router = Router();
router.use(authenticate);
router.get('/', getMessages);
router.post('/send', requireRole('SERVICE_PROVIDER', 'ADMIN'), sendDirectMessage);
router.post('/broadcast', requireRole('SERVICE_PROVIDER', 'ADMIN'), broadcastMessage);
router.patch('/:id/read', markAsRead);
export default router;
