import { createClient } from "redis";

const DEFAULT_CACHE_TTL_SECONDS = 60;
const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";

type PlatformCacheClient = {
  get: (key: string) => Promise<string | null>;
  set: (
    key: string,
    value: string,
    options?: { EX?: number },
  ) => Promise<string | null>;
  quit: () => Promise<string>;
};

let cacheClientPromise: Promise<PlatformCacheClient> | undefined;

export function getRedisUrl() {
  return process.env.REDIS_URL ?? DEFAULT_REDIS_URL;
}

async function createCacheClient(): Promise<PlatformCacheClient> {
  const client = createClient({
    url: getRedisUrl(),
  });

  client.on("error", (error) => {
    console.error("Redis client error", error);
  });

  await client.connect();

  return client;
}

export async function getCacheClient(): Promise<PlatformCacheClient> {
  if (!cacheClientPromise) {
    cacheClientPromise = createCacheClient();
  }

  return await cacheClientPromise;
}

export async function closeCacheClient() {
  if (!cacheClientPromise) {
    return;
  }

  const client = await cacheClientPromise;
  await client.quit();
  cacheClientPromise = undefined;
}

export async function getJsonCache<T>(key: string) {
  const client = await getCacheClient();
  const cached = await client.get(key);

  if (!cached) {
    return null;
  }

  return JSON.parse(cached) as T;
}

export async function setJsonCache(
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_CACHE_TTL_SECONDS,
) {
  const client = await getCacheClient();

  await client.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  });

  return value;
}

export async function getOrSetJsonCache<T>(
  key: string,
  resolver: () => Promise<T>,
  ttlSeconds = DEFAULT_CACHE_TTL_SECONDS,
) {
  const cached = await getJsonCache<T>(key);

  if (cached) {
    return cached;
  }

  const value = await resolver();
  await setJsonCache(key, value, ttlSeconds);

  return value;
}
