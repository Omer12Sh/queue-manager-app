import { Response } from 'express';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendMessage, sendBulkMessages } from '../services/messaging.service';

type MessageType = 'SMS' | 'WHATSAPP' | 'IN_APP';

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  const messages = await prisma.message.findMany({
    where: { OR: [{ toId: req.user!.id }, { fromId: req.user!.id }, { toId: null }] },
    include: { from: { select: { id: true, name: true } } },
    orderBy: { sentAt: 'desc' },
  });
  res.json(messages);
};

export const sendDirectMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { toId, content, type = 'IN_APP', phone } = req.body;
  const message = await prisma.message.create({
    data: { fromId: req.user!.id, toId, content, type: type as MessageType },
    include: { from: { select: { name: true } }, to: { select: { name: true, phone: true } } },
  });

  // Emit real-time
  const io = req.app.get('io');
  if (io) io.to(`user:${toId}`).emit('message:new', message);

  // Send SMS/WhatsApp if requested
  if ((type === 'SMS' || type === 'WHATSAPP') && phone) {
    await sendMessage({ to: phone, body: content, type: type.toLowerCase() as 'sms' | 'whatsapp' });
  }

  res.status(201).json(message);
};

export const broadcastMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content, type = 'IN_APP', sendExternal = false } = req.body;
  const message = await prisma.message.create({
    data: { fromId: req.user!.id, content, type: type as MessageType },
    include: { from: { select: { id: true, name: true } } },
  });

  const io = req.app.get('io');
  if (io) {
    // Emit to each client's personal room so they receive it regardless of which socket room they joined
    const clientAppointments = await prisma.appointment.findMany({
      where: { providerId: req.user!.id },
      select: { clientId: true },
      distinct: ['clientId'],
    });
    for (const c of clientAppointments) {
      io.to(`user:${c.clientId}`).emit('broadcast:message', message);
    }
  }

  if (sendExternal && (type === 'SMS' || type === 'WHATSAPP')) {
    const clients = await prisma.appointment.findMany({
      where: { providerId: req.user!.id },
      select: { client: { select: { phone: true } } },
      distinct: ['clientId'],
    });
    const phones = clients.map((c: { client: { phone: string | null } }) => c.client.phone).filter(Boolean) as string[];
    await sendBulkMessages(phones, content, type.toLowerCase() as 'sms' | 'whatsapp');
  }

  res.status(201).json(message);
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const message = await prisma.message.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json(message);
};
