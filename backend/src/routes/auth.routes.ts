import { Router } from 'express';
import { body } from 'express-validator';
import { login, register, getMe, refreshToken } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post(
  '/register',
  [
    // Name: letters (Latin, Hebrew, other scripts) and spaces only; strip leading/trailing whitespace
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase and a digit'),
    body('name')
      .trim()
      .notEmpty()
      .matches(/^[\p{L}\s'-]+$/u)
      .withMessage('Name must contain only letters and spaces'),
    body('phone')
      .optional({ values: 'falsy' })
      .matches(/^\+?[\d\s\-()]{7,20}$/)
      .withMessage('Phone must contain only digits, spaces, +, - and ()'),
    body('role').isIn(['ADMIN', 'SERVICE_PROVIDER', 'CLIENT']),
  ],
  register,
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().isLength({ min: 1, max: 128 }),
  ],
  login,
);

router.get('/me', authenticate, getMe);
router.post('/refresh', authenticate, refreshToken);

export default router;
