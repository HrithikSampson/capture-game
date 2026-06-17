import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    throw new Error("Redis not connected");
  }
  return redis;
}

export async function connectRedis(): Promise<Redis> {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
  await redis.connect();
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
