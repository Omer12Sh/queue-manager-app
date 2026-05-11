import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

const signToken = (id: string, email: string, role: string): string =>
  jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);

export const register = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password, name, role, phone } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, role, phone },
    select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true },
  });

  // Create provider profile automatically
  if (role === 'SERVICE_PROVIDER') {
    await prisma.providerProfile.create({
      data: {
        userId: user.id,
        businessName: name,
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
  res.status(201).json({ token, user });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ message: 'Account is deactivated' });
    return;
  }

  const token = signToken(user.id, user.email, user.role);
  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, name: true, role: true, phone: true, isActive: true,
      createdAt: true, providerProfile: true,
    },
  });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
};

export const refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
  const token = signToken(req.user!.id, req.user!.email, req.user!.role);
  res.json({ token });
};
