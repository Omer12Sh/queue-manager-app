import { Router } from 'express';
import { body } from 'express-validator';
import { login, register, getMe, refreshToken } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('role').isIn(['ADMIN', 'SERVICE_PROVIDER', 'CLIENT']),
  ],
  register,
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  login,
);

router.get('/me', authenticate, getMe);
router.post('/refresh', authenticate, refreshToken);

export default router;
