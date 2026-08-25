import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

export const redisPublisher = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  lazyConnect: true,
});

export const redisSubscriber = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  lazyConnect: true,
});

export async function initRedis() {
  await Promise.all([
    redisPublisher.connect(),
    redisSubscriber.connect(),
  ]);
  console.log('Connected to Redis (Publisher & Subscriber)');
}