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
  const { businessName, description, address, workingHours, avatarUrl, defaultLanguage } = req.body;
  const updateData: Record<string, unknown> = {};
  if (businessName !== undefined) updateData.businessName = businessName;
  if (description !== undefined) updateData.description = description;
  if (address !== undefined) updateData.address = address;
  if (workingHours !== undefined) updateData.workingHours = workingHours;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
  if (defaultLanguage !== undefined) updateData.defaultLanguage = defaultLanguage;

  const profile = await prisma.providerProfile.upsert({
    where: { userId: req.user!.id },
    update: updateData,
    create: {
      userId: req.user!.id,
      businessName: businessName || '',
      description,
      address,
      workingHours: workingHours || {},
      avatarUrl,
      defaultLanguage: defaultLanguage || 'en',
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

// ---- Availability overrides ----

export const getAvailabilityOverrides = async (req: Request, res: Response): Promise<void> => {
  const profile = await prisma.providerProfile.findFirst({ where: { userId: req.params.userId } });
  if (!profile) { res.status(404).json({ message: 'Provider not found' }); return; }
  const overrides = await prisma.availabilityOverride.findMany({
    where: { providerId: profile.id },
    orderBy: { date: 'asc' },
  });
  res.json(overrides);
};

export const upsertAvailabilityOverride = async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, isOff, slots } = req.body;
  if (!date) { res.status(400).json({ message: 'date is required' }); return; }

  const profile = await prisma.providerProfile.findFirst({ where: { userId: req.user!.id } });
  if (!profile) { res.status(404).json({ message: 'Provider profile not found' }); return; }

  const override = await prisma.availabilityOverride.upsert({
    where: { providerId_date: { providerId: profile.id, date } },
    update: { isOff: isOff ?? false, slots: slots ?? [] },
    create: { providerId: profile.id, date, isOff: isOff ?? false, slots: slots ?? [] },
  });
  res.json(override);
};

export const deleteAvailabilityOverride = async (req: AuthRequest, res: Response): Promise<void> => {
  const { date } = req.params;
  const profile = await prisma.providerProfile.findFirst({ where: { userId: req.user!.id } });
  if (!profile) { res.status(404).json({ message: 'Provider profile not found' }); return; }

  try {
    await prisma.availabilityOverride.delete({
      where: { providerId_date: { providerId: profile.id, date } },
    });
  } catch { /* ignore not-found */ }
  res.status(204).send();
};
