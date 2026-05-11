import { Request, Response } from 'express';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getServices = async (req: Request, res: Response): Promise<void> => {
  const services = await prisma.service.findMany({
    where: { provider: { userId: req.params.providerId }, isActive: true },
  });
  res.json(services);
};

export const createService = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, durationMin, price } = req.body;
  const profile = await prisma.providerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!profile) { res.status(404).json({ message: 'Provider profile not found' }); return; }
  const service = await prisma.service.create({ data: { providerId: profile.id, name, description, durationMin, price } });
  res.status(201).json(service);
};

export const updateService = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, durationMin, price, isActive } = req.body;
  const service = await prisma.service.update({
    where: { id: req.params.id },
    data: { name, description, durationMin, price, isActive },
  });
  res.json(service);
};

export const deleteService = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.service.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).send();
};
