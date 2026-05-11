/**
 * Messaging Service — SMS & WhatsApp via Twilio
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env
 */

interface MessageOptions {
  to: string;
  body: string;
  type?: 'sms' | 'whatsapp';
}

interface MessageResult {
  success: boolean;
  sid?: string;
  error?: string;
}

// Lazy-load Twilio to avoid crashes when credentials are not configured
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require('twilio');
  return twilio(accountSid, authToken);
};

export const sendMessage = async ({ to, body, type = 'sms' }: MessageOptions): Promise<MessageResult> => {
  try {
    const client = getTwilioClient();
    const from = type === 'whatsapp'
      ? `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
      : process.env.TWILIO_PHONE_NUMBER;
    const toFormatted = type === 'whatsapp' ? `whatsapp:${to}` : to;

    const message = await client.messages.create({ from, to: toFormatted, body });
    return { success: true, sid: message.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('Message sending failed:', error);
    return { success: false, error };
  }
};

export const sendBulkMessages = async (recipients: string[], body: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<MessageResult[]> => {
  return Promise.all(recipients.map((to) => sendMessage({ to, body, type })));
};

export const formatAppointmentReminder = (clientName: string, serviceName: string, dateTime: Date, providerName: string): string => {
  const dateStr = dateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `Hi ${clientName}! Reminder: You have a ${serviceName} appointment with ${providerName} on ${dateStr} at ${timeStr}. Reply CANCEL to cancel.`;
};
