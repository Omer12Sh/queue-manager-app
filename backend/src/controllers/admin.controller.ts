import { Response } from 'express';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [totalUsers, totalAppointments, activeProviders, pendingAppointments] = await Promise.all([
    prisma.user.count(),
    prisma.appointment.count(),
    prisma.user.count({ where: { role: 'SERVICE_PROVIDER', isActive: true } }),
    prisma.appointment.count({ where: { status: 'PENDING' } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayAppointments = await prisma.appointment.count({
    where: { startTime: { gte: today } },
  });

  const revenueResult = await prisma.appointment.findMany({
    where: { status: 'COMPLETED' },
    include: { service: { select: { price: true } } },
  });
  const totalRevenue = revenueResult.reduce((sum: number, a: { service: { price: number } }) => sum + a.service.price, 0);

  res.json({ totalUsers, totalAppointments, activeProviders, pendingAppointments, todayAppointments, totalRevenue });
};

export const getAllAppointments = async (_req: AuthRequest, res: Response): Promise<void> => {
  const appointments = await prisma.appointment.findMany({
    include: {
      client: { select: { id: true, name: true, email: true } },
      provider: { select: { id: true, name: true } },
      service: { select: { name: true, price: true } },
    },
    orderBy: { startTime: 'desc' },
    take: 100,
  });
  res.json(appointments);
};

export const manageUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { isActive, role } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { ...(isActive !== undefined ? { isActive } : {}), ...(role ? { role } : {}) },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  res.json(user);
};
