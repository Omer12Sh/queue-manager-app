import { Router } from 'express';
import { body } from 'express-validator';
import { login, register, getMe, refreshToken } from '../controllers/auth.controller';
import { requestOtp, verifyOtp, registerPhone } from '../controllers/otp.controller';
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
    // Login is intentionally lenient on password complexity so that legacy accounts
    // (created before complexity rules were enforced) can still sign in.
    body('password').notEmpty().isLength({ min: 1, max: 128 }),
  ],
  login,
);

// Phone OTP authentication
router.post('/request-otp', [body('phone').notEmpty()], requestOtp);
router.post('/verify-otp', [body('phone').notEmpty(), body('otp').notEmpty()], verifyOtp);
router.post(
  '/register-phone',
  [
    body('verifiedToken').notEmpty(),
    body('name').trim().notEmpty(),
    body('role').isIn(['SERVICE_PROVIDER', 'CLIENT']),
  ],
  registerPhone,
);

router.get('/me', authenticate, getMe);
router.post('/refresh', authenticate, refreshToken);

export default router;
