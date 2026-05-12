/**
 * Phone OTP Authentication
 *
 * Flow:
 *   1. POST /api/auth/request-otp { phone }
 *      → generates a 6-digit OTP stored in memory (5 min TTL)
 *      → if Twilio env vars are set, sends SMS; otherwise returns { devCode } for development
 *
 *   2. POST /api/auth/verify-otp { phone, otp }
 *      → validates OTP
 *      → if user with that phone exists: returns { token, user } (login)
 *      → if no user: returns { needsRegistration: true, verifiedToken } (short-lived JWT proving phone ownership)
 *
 *   3. POST /api/auth/register-phone { verifiedToken, name, role }
 *      → creates a new user, returns { token, user }
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../services/prisma.service';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

const signToken = (id: string, email: string, role: string): string =>
  jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);

// In-memory OTP store. In production, replace with Redis.
interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, OtpEntry>();

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore) {
    if (entry.expiresAt < now) otpStore.delete(key);
  }
}, 60_000);

export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body as { phone?: string };
  if (!phone || typeof phone !== 'string' || !/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
    res.status(400).json({ message: 'Valid phone number required' });
    return;
  }

  // Normalize phone to digits-only for consistent key storage
  const normalizedPhone = phone.replace(/[\s\-()]/g, '');

  const existing = otpStore.get(normalizedPhone);
  // Prevent flooding: reject if a code was issued less than 60 seconds ago
  // (i.e., it has more than 4 minutes left on its 5-minute TTL)
  if (existing && existing.expiresAt > Date.now() + 4 * 60 * 1000) {
    res.status(429).json({ message: 'Please wait before requesting a new code' });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(normalizedPhone, { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
    try {
      // Dynamic require so the package is only needed when Twilio is configured
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        body: `Your QueueManager verification code is: ${otp}`,
        from: TWILIO_FROM_NUMBER,
        to: normalizedPhone,
      });
      res.json({ message: 'OTP sent via SMS' });
    } catch (err) {
      console.error('[OTP] Twilio error:', err);
      res.status(500).json({ message: 'Failed to send SMS. Please try again.' });
    }
  } else {
    // Dev mode — return the code so the app can display it as an in-app notification
    res.json({ message: 'OTP sent (dev mode)', devCode: otp });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };
  if (!phone || !otp) {
    res.status(400).json({ message: 'Phone and OTP required' });
    return;
  }

  // Normalize phone to match stored key
  const normalizedPhone = phone.replace(/[\s\-()]/g, '');

  const entry = otpStore.get(normalizedPhone);
  if (!entry || entry.expiresAt < Date.now()) {
    res.status(401).json({ message: 'OTP expired. Please request a new code.' });
    return;
  }

  entry.attempts++;
  if (entry.attempts > 5) {
    otpStore.delete(normalizedPhone);
    res.status(401).json({ message: 'Too many failed attempts. Please request a new code.' });
    return;
  }

  if (entry.otp !== otp) {
    res.status(401).json({ message: 'Invalid code' });
    return;
  }

  otpStore.delete(normalizedPhone);

  const user = await prisma.user.findFirst({
    where: { phone: normalizedPhone },
    select: {
      id: true, email: true, name: true, role: true,
      phone: true, isActive: true, createdAt: true, providerProfile: true,
    },
  });

  if (user) {
    if (!user.isActive) {
      res.status(403).json({ message: 'Account is deactivated' });
      return;
    }
    const token = signToken(user.id, user.email, user.role);
    res.json({ token, user });
  } else {
    // Phone is verified but no account exists yet → registration needed
    const verifiedToken = jwt.sign(
      { phone: normalizedPhone, verified: true },
      JWT_SECRET,
      { expiresIn: '10m' } as jwt.SignOptions,
    );
    res.json({ needsRegistration: true, verifiedToken });
  }
};

export const registerPhone = async (req: Request, res: Response): Promise<void> => {
  const { verifiedToken, name, role } = req.body as {
    verifiedToken?: string;
    name?: string;
    role?: string;
  };

  let phone: string;
  try {
    const payload = jwt.verify(verifiedToken!, JWT_SECRET) as { phone: string; verified: boolean };
    if (!payload.verified || !payload.phone) throw new Error('Invalid token');
    phone = payload.phone;
  } catch {
    res.status(401).json({ message: 'Invalid or expired verified token' });
    return;
  }

  // User may have been created concurrently — check again
  const existing = await prisma.user.findFirst({ where: { phone } });
  if (existing) {
    const token = signToken(existing.id, existing.email, existing.role);
    const { password: _pw, ...safeUser } = existing as typeof existing & { password: string };
    res.json({ token, user: safeUser });
    return;
  }

  const trimmedName = (name ?? '').trim();
  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100 || !/^[\p{L}\s'-]+$/u.test(trimmedName)) {
    res.status(400).json({ message: 'Valid name required (2-100 characters, letters only)' });
    return;
  }
  if (!['SERVICE_PROVIDER', 'CLIENT'].includes(role ?? '')) {
    res.status(400).json({ message: 'Valid role required (SERVICE_PROVIDER or CLIENT)' });
    return;
  }

  // Generate a stable placeholder email so we don't violate the unique email constraint
  const digits = phone.replace(/\D/g, '');
  const placeholderEmail = `phone_${digits}@phone.auth.local`;

  // Ensure placeholder email isn't taken (edge case)
  const emailTaken = await prisma.user.findUnique({ where: { email: placeholderEmail } });
  if (emailTaken) {
    res.status(409).json({ message: 'Phone already registered' });
    return;
  }

  const randomPassword = await bcrypt.hash(`${Math.random()}-${Date.now()}`, 10);

  const user = await prisma.user.create({
    data: { email: placeholderEmail, password: randomPassword, name: trimmedName, role: role as 'CLIENT' | 'SERVICE_PROVIDER', phone },
    select: { id: true, email: true, name: true, role: true, phone: true, isActive: true, createdAt: true },
  });

  if (role === 'SERVICE_PROVIDER') {
    await prisma.providerProfile.create({
      data: {
        userId: user.id,
        businessName: trimmedName,
        defaultLanguage: 'he',
        workingHours: {
          mon: { open: '09:00', close: '18:00' },
          tue: { open: '09:00', close: '18:00' },
          wed: { open: '09:00', close: '18:00' },
          thu: { open: '09:00', close: '18:00' },
          fri: { open: '09:00', close: '18:00' },
          sat: { open: '10:00', close: '15:00' },
          sun: null,
        },
      },
    });
  }

  const token = signToken(user.id, user.email, user.role);

  const io = req.app.get('io');
  if (io && role === 'CLIENT') {
    io.emit('user:new', { id: user.id, name: user.name, email: user.email, role: user.role });
  }

  res.status(201).json({ token, user });
};
