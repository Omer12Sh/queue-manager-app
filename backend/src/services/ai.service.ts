/**
 * AI Assistant Service — OpenAI powered helper for service providers.
 * Set OPENAI_API_KEY in .env to enable.
 * Capabilities:
 *   - Parse natural language commands like "delay today's appointments by 30 min"
 *   - Summarize appointment schedules
 *   - Draft client messages
 */

import prisma from './prisma.service';

interface AICommand {
  action: 'delay_appointments' | 'cancel_appointments' | 'send_message' | 'summary' | 'unknown';
  params: Record<string, unknown>;
  message: string;
}

const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in .env');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { OpenAI } = require('openai');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

export const parseProviderCommand = async (command: string, providerId: string): Promise<AICommand> => {
  try {
    const openai = getOpenAI();

    const today = new Date().toISOString().split('T')[0];
    const appointments = await prisma.appointment.findMany({
      where: {
        providerId,
        startTime: {
          gte: new Date(`${today}T00:00:00Z`),
          lte: new Date(`${today}T23:59:59Z`),
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { client: true, service: true },
    });

    const scheduleContext = appointments.map((a: { id: string; client: { name: string }; service: { name: string }; startTime: Date }) => ({
      id: a.id,
      client: a.client.name,
      service: a.service.name,
      time: a.startTime.toISOString(),
    }));

    const systemPrompt = `You are a scheduling assistant for a service provider. 
Today's appointments: ${JSON.stringify(scheduleContext)}.
Parse the provider's command and return a JSON object with:
- action: one of "delay_appointments", "cancel_appointments", "send_message", "summary", "unknown"
- params: relevant parameters (e.g., { delayMinutes: 30, appointmentIds: [...] })
- message: a human-friendly response describing what you will do`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: command },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as AICommand;
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('AI command parsing failed:', error);
    return { action: 'unknown', params: {}, message: `Could not process command: ${error}` };
  }
};

export const generateScheduleSummary = async (providerId: string): Promise<string> => {
  const today = new Date().toISOString().split('T')[0];
  const appointments = await prisma.appointment.findMany({
    where: {
      providerId,
      startTime: {
        gte: new Date(`${today}T00:00:00Z`),
        lte: new Date(`${today}T23:59:59Z`),
      },
    },
    include: { client: true, service: true },
    orderBy: { startTime: 'asc' },
  });

  if (appointments.length === 0) return 'No appointments scheduled for today.';

  const lines = appointments.map((a: { startTime: Date; client: { name: string }; service: { name: string }; status: string }) => {
    const time = a.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `• ${time} — ${a.client.name} (${a.service.name}) — ${a.status}`;
  });

  return `Today's schedule (${appointments.length} appointments):\n${lines.join('\n')}`;
};
