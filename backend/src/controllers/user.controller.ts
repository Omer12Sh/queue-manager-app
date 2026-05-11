import { Response } from 'express';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, search } = req.query;

  // Clients may only list service providers regardless of the role query param
  const effectiveRole = req.user?.role === 'CLIENT'
    ? 'SERVICE_PROVIDER'
    : (role as string | undefined);

  const users = await prisma.user.findMany({
    where: {
      ...(effectiveRole ? { role: effectiveRole as 'ADMIN' | 'SERVICE_PROVIDER' | 'CLIENT' } : {}),
      ...(search ? { OR: [{ name: { contains: search as string, mode: 'insensitive' } }, { email: { contains: search as string, mode: 'insensitive' } }] } : {}),
    },
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true, providerProfile: true },
  });
  res.json(users);
};

export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true, providerProfile: true },
  });
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json(user);
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone } = req.body;
  if (req.user!.role !== 'ADMIN' && req.user!.id !== req.params.id) {
    res.status(403).json({ message: 'Forbidden' }); return;
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, phone },
    select: { id: true, name: true, email: true, role: true, phone: true },
  });
  res.json(user);
};

export const deactivateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).send();
};
