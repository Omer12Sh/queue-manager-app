import { Request, Response } from 'express';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: req.params.userId },
    include: { services: { where: { isActive: true } } },
  });
  if (!profile) { res.status(404).json({ message: 'Provider not found' }); return; }
  res.json(profile);
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { businessName, description, address, workingHours, avatarUrl } = req.body;
  const profile = await prisma.providerProfile.upsert({
    where: { userId: req.user!.id },
    update: { businessName, description, address, workingHours, avatarUrl },
    create: {
      userId: req.user!.id,
      businessName,
      description,
      address,
      workingHours: workingHours || {},
      avatarUrl,
    },
  });
  res.json(profile);
};

export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, content } = req.body;
  const announcement = await prisma.announcement.create({
    data: { providerId: req.user!.id, title, content },
  });
  res.status(201).json(announcement);
};

export const getAnnouncements = async (req: Request, res: Response): Promise<void> => {
  const announcements = await prisma.announcement.findMany({
    where: { providerId: req.params.providerId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(announcements);
};

export const updateAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, content, isActive } = req.body;
  const announcement = await prisma.announcement.update({
    where: { id: req.params.id },
    data: { title, content, isActive },
  });
  res.json(announcement);
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.status(204).send();
};
