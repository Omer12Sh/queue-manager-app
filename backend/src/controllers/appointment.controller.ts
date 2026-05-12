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

  // Attach extra service objects
  const allExtraIds = [...new Set(appointments.flatMap((a: { extraServiceIds: string[] }) => a.extraServiceIds))];
  const extraServicesMap: Record<string, object> = {};
  if (allExtraIds.length > 0) {
    const extraServices = await prisma.service.findMany({ where: { id: { in: allExtraIds } } });
    extraServices.forEach((s: { id: string }) => { extraServicesMap[s.id] = s; });
  }
  const result = appointments.map((a: { extraServiceIds: string[] }) => ({
    ...a,
    extraServices: a.extraServiceIds.map((id: string) => extraServicesMap[id]).filter(Boolean),
  }));

  res.json(result);
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

const SAFETY_BUFFER_MS = 10 * 60 * 1000; // 10-minute buffer between appointments

export const createAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  // Accept either a single serviceId or an array serviceIds[]
  const { providerId, serviceId, serviceIds, startTime, notes } = req.body;
  const clientId = req.user!.role === 'CLIENT' ? req.user!.id : req.body.clientId;

  // Resolve primary and extra service IDs
  const primaryServiceId: string | undefined = serviceId || (Array.isArray(serviceIds) ? serviceIds[0] : undefined);
  const extraIds: string[] = Array.isArray(serviceIds) ? serviceIds.slice(1) : [];

  if (!primaryServiceId) {
    res.status(400).json({ message: 'serviceId or serviceIds is required' });
    return;
  }

  const primaryService = await prisma.service.findUnique({ where: { id: primaryServiceId } });
  if (!primaryService) {
    res.status(404).json({ message: 'Service not found' });
    return;
  }

  // Calculate total duration from all selected services
  let totalDuration = primaryService.durationMin;
  if (extraIds.length > 0) {
    const extraServices = await prisma.service.findMany({ where: { id: { in: extraIds } } });
    totalDuration += extraServices.reduce((s: number, svc: { durationMin: number }) => s + svc.durationMin, 0);
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + totalDuration * 60 * 1000);

  // Check for conflicts (include safety buffer)
  const bufferEnd = new Date(end.getTime() + SAFETY_BUFFER_MS);
  const conflict = await prisma.appointment.findFirst({
    where: {
      providerId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      OR: [
        { startTime: { gte: start, lt: bufferEnd } },
        { endTime: { gt: start, lte: bufferEnd } },
        { startTime: { lte: start }, endTime: { gte: end } },
      ],
    },
  });

  if (conflict) {
    res.status(409).json({ message: 'Time slot is already booked' });
    return;
  }

  const appointment = await prisma.appointment.create({
    data: {
      clientId,
      providerId,
      serviceId: primaryServiceId,
      extraServiceIds: extraIds,
      startTime: start,
      endTime: end,
      notes,
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      service: true,
    },
  });

  // Attach extra service objects to response
  let extraServiceObjects: object[] = [];
  if (extraIds.length > 0) {
    extraServiceObjects = await prisma.service.findMany({ where: { id: { in: extraIds } } });
  }
  const appointmentWithExtras = { ...appointment, extraServices: extraServiceObjects };

  // Add to Redis queue
  try {
    await enqueueAppointment(appointment.id, start.getTime());
  } catch (err) {
    console.warn('Redis queue unavailable:', err);
  }

  // Emit real-time update to provider
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${providerId}`).emit('appointment:new', appointmentWithExtras);
  }

  res.status(201).json(appointmentWithExtras);
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
    // Notify client about the status change
    io.to(`user:${appointment.clientId}`).emit('appointment:updated', appointment);
    // Notify provider too (if someone else triggered the change)
    io.to(`user:${appointment.providerId}`).emit('appointment:updated', appointment);
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
    io.to(`user:${appointment.providerId}`).emit('appointment:updated', appointment);
  }

  res.json(appointment);
};

export const deleteAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.appointment.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

export const getAvailableSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  const { providerId } = req.params;
  const { date, serviceId, serviceIds } = req.query;

  if (!date) {
    res.status(400).json({ message: 'date is required' });
    return;
  }

  // Resolve service IDs from query
  const primaryId = serviceId as string | undefined;
  const extraIdList: string[] = serviceIds
    ? (Array.isArray(serviceIds) ? serviceIds as string[] : (serviceIds as string).split(','))
    : [];
  const allServiceIds = [...(primaryId ? [primaryId] : []), ...extraIdList];

  if (allServiceIds.length === 0) {
    res.status(400).json({ message: 'serviceId or serviceIds is required' });
    return;
  }

  const services = await prisma.service.findMany({ where: { id: { in: allServiceIds } } });
  if (services.length === 0) {
    res.status(404).json({ message: 'Services not found' });
    return;
  }

  const totalDurationMin = services.reduce((s: number, svc: { durationMin: number }) => s + svc.durationMin, 0);
  const dateStr = date as string;

  // Check for per-date availability override
  const providerProfile = await prisma.providerProfile.findFirst({ where: { userId: providerId } });
  if (!providerProfile) {
    res.status(404).json({ message: 'Provider not found' });
    return;
  }

  const override = await prisma.availabilityOverride.findUnique({
    where: { providerId_date: { providerId: providerProfile.id, date: dateStr } },
  });

  // If day marked as off, return empty slots
  if (override?.isOff) {
    res.json([]);
    return;
  }

  // Determine working windows for the day
  // New format: override.slots is string[] of "HH:mm" times (specific bookable slots)
  // Legacy format: [{open, close}] windows — kept for fallback from workingHours
  let specificSlotTimes: string[] | null = null; // null = use window-based generation
  let windows: { open: string; close: string }[] = [];

  if (override && !override.isOff) {
    const rawSlots = override.slots as unknown;
    if (Array.isArray(rawSlots) && rawSlots.length > 0) {
      if (typeof rawSlots[0] === 'string') {
        // New format: specific bookable time strings
        specificSlotTimes = rawSlots as string[];
      } else {
        // Legacy {open, close} format — treat as windows
        windows = rawSlots as { open: string; close: string }[];
      }
    }
  } else if (!override) {
    // Fall back to weekly working hours
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const jsDay = new Date(dateStr + 'T12:00:00Z').getDay();
    const dayKey = dayNames[jsDay];
    const hours = (providerProfile.workingHours as Record<string, { open: string; close: string } | null>)[dayKey];
    if (hours) windows = [hours];
  }

  const dayStart = new Date(`${dateStr}T00:00:00Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59Z`);

  const booked = await prisma.appointment.findMany({
    where: {
      providerId,
      startTime: { gte: dayStart, lte: dayEnd },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { startTime: true, endTime: true },
  });

  const slotDurationMs = totalDurationMin * 60 * 1000;
  const bufferMs = SAFETY_BUFFER_MS;
  const slots: { startTime: string; endTime: string }[] = [];

  if (specificSlotTimes !== null) {
    // New mode: provider pre-selected specific start times — just validate each against existing bookings
    for (const timeStr of specificSlotTimes) {
      const cursor = new Date(`${dateStr}T${timeStr}:00Z`);
      const slotEnd = new Date(cursor.getTime() + slotDurationMs);
      const isBooked = booked.some(
        (b: { startTime: Date; endTime: Date }) =>
          b.startTime < new Date(slotEnd.getTime() + bufferMs) && b.endTime > cursor,
      );
      if (!isBooked) {
        slots.push({ startTime: cursor.toISOString(), endTime: slotEnd.toISOString() });
      }
    }
  } else {
    // Legacy mode: generate 30-min increments within working-hours windows
    if (windows.length === 0) {
      res.json([]);
      return;
    }
    for (const window of windows) {
      const winStart = new Date(`${dateStr}T${window.open}:00Z`);
      const winEnd = new Date(`${dateStr}T${window.close}:00Z`);
      let cursor = winStart;
      while (cursor.getTime() + slotDurationMs <= winEnd.getTime()) {
        const slotEnd = new Date(cursor.getTime() + slotDurationMs);
        const isBooked = booked.some(
          (b: { startTime: Date; endTime: Date }) =>
            b.startTime < new Date(slotEnd.getTime() + bufferMs) && b.endTime > cursor,
        );
        if (!isBooked) {
          slots.push({ startTime: cursor.toISOString(), endTime: slotEnd.toISOString() });
        }
        cursor = new Date(cursor.getTime() + 30 * 60 * 1000); // advance 30 min
      }
    }
  }

  res.json(slots);
};
