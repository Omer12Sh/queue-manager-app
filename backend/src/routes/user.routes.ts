import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { getUsers, getUser, updateUser, deactivateUser } from '../controllers/user.controller';

const router = Router();
router.use(authenticate);
router.get('/', requireRole('ADMIN', 'SERVICE_PROVIDER', 'CLIENT'), getUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', requireRole('ADMIN'), deactivateUser);
export default router;
