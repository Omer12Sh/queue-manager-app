import Redis from 'ioredis';

let redis: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });

    redis.on('connect', () => console.log('✅ Redis connected'));
    redis.on('error', (err) => console.error('❌ Redis error:', err.message));
  }
  return redis;
};

// Appointment queue helpers (using Redis sorted set)
export const enqueueAppointment = async (appointmentId: string, scheduledTime: number): Promise<void> => {
  const client = getRedisClient();
  await client.zadd('appointment:queue', scheduledTime, appointmentId);
};

export const dequeueNextAppointment = async (): Promise<string | null> => {
  const client = getRedisClient();
  const results = await client.zrange('appointment:queue', 0, 0);
  return results[0] || null;
};

export const removeFromQueue = async (appointmentId: string): Promise<void> => {
  const client = getRedisClient();
  await client.zrem('appointment:queue', appointmentId);
};

export const publishEvent = async (channel: string, message: object): Promise<void> => {
  const client = getRedisClient();
  await client.publish(channel, JSON.stringify(message));
};
