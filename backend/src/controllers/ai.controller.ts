import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { parseProviderCommand, generateScheduleSummary } from '../services/ai.service';
import prisma from '../services/prisma.service';

export const handleCommand = async (req: AuthRequest, res: Response): Promise<void> => {
  const { command } = req.body;
  if (!command) { res.status(400).json({ message: 'command is required' }); return; }

  const result = await parseProviderCommand(command, req.user!.id);

  // Execute action if recognized
  if (result.action === 'delay_appointments') {
    const { delayMinutes, appointmentIds } = result.params as { delayMinutes: number; appointmentIds: string[] };
    if (delayMinutes && appointmentIds?.length) {
      // Fetch current times then calculate new absolute DateTime values
      // (Prisma does not support increment on DateTime fields)
      const existing = await prisma.appointment.findMany({
        where: { id: { in: appointmentIds } },
        select: { id: true, startTime: true, endTime: true },
      });
      const delayMs = delayMinutes * 60 * 1000;
      await Promise.all(
        existing.map((appt: { id: string; startTime: Date; endTime: Date }) =>
          prisma.appointment.update({
            where: { id: appt.id },
            data: {
              startTime: new Date(appt.startTime.getTime() + delayMs),
              endTime: new Date(appt.endTime.getTime() + delayMs),
              status: 'RESCHEDULED',
            },
          }),
        ),
      );
    }
  }

  res.json(result);
};

export const getScheduleSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  const summary = await generateScheduleSummary(req.user!.id);
  res.json({ summary });
};
