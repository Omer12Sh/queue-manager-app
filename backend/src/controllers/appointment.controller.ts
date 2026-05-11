import { Response } from 'express';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { enqueueAppointment, removeFromQueue } from '../services/redis.service';

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'RESCHEDULED';

export const getAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, id: userId } = req.user!;
  const { status, from, to } = req.query;

  const where: Record<string, unknown> = {};
  if (role === 'CLIENT') where.clientId = userId;
  else if (role === 'SERVICE_PROVIDER') where.providerId = userId;

  if (status) where.status = status as AppointmentStatus;
  if (from || to) {
    where.startTime = {};
    if (from) (where.startTime as Record<string, unknown>).gte = new Date(from as string);
    if (to) (where.startTime as Record<string, unknown>).lte = new Date(to as string);
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      provider: { select: { id: true, name: true, providerProfile: { select: { businessName: true } } } },
      service: true,
    },
    orderBy: { startTime: 'asc' },
  });

  res.json(appointments);
};

export const getAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      provider: { select: { id: true, name: true, providerProfile: true } },
      service: true,
    },
  });

  if (!appointment) {
    res.status(404).json({ message: 'Appointment not found' });
    return;
  }
  res.json(appointment);
};

export const createAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { providerId, serviceId, startTime, notes } = req.body;
  const clientId = req.user!.role === 'CLIENT' ? req.user!.id : req.body.clientId;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    res.status(404).json({ message: 'Service not found' });
    return;
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + service.durationMin * 60 * 1000);

  // Check for conflicts
  const conflict = await prisma.appointment.findFirst({
    where: {
      providerId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      OR: [
        { startTime: { gte: start, lt: end } },
        { endTime: { gt: start, lte: end } },
        { startTime: { lte: start }, endTime: { gte: end } },
      ],
    },
  });

  if (conflict) {
    res.status(409).json({ message: 'Time slot is already booked' });
    return;
  }

  const appointment = await prisma.appointment.create({
    data: { clientId, providerId, serviceId, startTime: start, endTime: end, notes },
    include: {
      client: { select: { id: true, name: true, email: true } },
      service: true,
    },
  });

  // Add to Redis queue
  try {
    await enqueueAppointment(appointment.id, start.getTime());
  } catch (err) {
    console.warn('Redis queue unavailable:', err);
  }

  // Emit real-time update
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${providerId}`).emit('appointment:new', appointment);
  }

  res.status(201).json(appointment);
};

export const updateAppointmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status },
    include: { client: { select: { id: true, name: true } }, service: true },
  });

  if (status === 'CANCELLED' || status === 'COMPLETED') {
    try {
      await removeFromQueue(appointment.id);
    } catch { /* Redis may not be running */ }
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${appointment.clientId}`).emit('appointment:updated', appointment);
  }

  res.json(appointment);
};

export const rescheduleAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { startTime } = req.body;
  const existing = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { service: true },
  });

  if (!existing) {
    res.status(404).json({ message: 'Appointment not found' });
    return;
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + existing.service.durationMin * 60 * 1000);

  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { startTime: start, endTime: end, status: 'RESCHEDULED' },
    include: { client: { select: { id: true, name: true } }, service: true },
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${appointment.clientId}`).emit('appointment:rescheduled', appointment);
  }

  res.json(appointment);
};

export const deleteAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.appointment.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

export const getAvailableSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  const { providerId } = req.params;
  const { date, serviceId } = req.query;

  if (!date || !serviceId) {
    res.status(400).json({ message: 'date and serviceId are required' });
    return;
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId as string } });
  if (!service) {
    res.status(404).json({ message: 'Service not found' });
    return;
  }

  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  const booked = await prisma.appointment.findMany({
    where: {
      providerId,
      startTime: { gte: dayStart, lte: dayEnd },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { startTime: true, endTime: true },
  });

  // Generate 30-min slots from 09:00 to 18:00
  const slots = [];
  const slotDuration = service.durationMin * 60 * 1000;
  let cursor = new Date(`${date}T09:00:00Z`);
  const endOfDay = new Date(`${date}T18:00:00Z`);

  while (cursor.getTime() + slotDuration <= endOfDay.getTime()) {
    const slotEnd = new Date(cursor.getTime() + slotDuration);
    const isBooked = booked.some(
      (b: { startTime: Date; endTime: Date }) => b.startTime < slotEnd && b.endTime > cursor,
    );
    if (!isBooked) {
      slots.push({ startTime: cursor.toISOString(), endTime: slotEnd.toISOString() });
    }
    cursor = new Date(cursor.getTime() + 30 * 60 * 1000); // advance 30 min
  }

  res.json(slots);
};
