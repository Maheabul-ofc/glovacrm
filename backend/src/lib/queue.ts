import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redisConnection.on('error', (err) => {
  // Gracefully log instead of crashing process
  console.warn('[Redis] Connection warning (queue running in degraded mode):', err.message);
});

// Define Queues
export const leadIngestionQueue = new Queue('lead-ingestion', { connection: redisConnection });
export const notificationQueue = new Queue('notifications', { connection: redisConnection });
export const campaignQueue = new Queue('campaigns', { connection: redisConnection });
export const followUpQueue = new Queue('follow-ups', { connection: redisConnection });

export { redisConnection };
