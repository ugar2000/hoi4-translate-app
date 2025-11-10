import Redis from 'ioredis';

export type RedisClient = Redis;

export function createRedis(connectionName: string): RedisClient {
  const host = process.env.REDIS_HOST ?? 'redis';
  const port = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);

  return new Redis({
    host,
    port,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectionName,
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function fieldsToObject(fields: Array<string | Buffer>): Record<string, string> {
  const output: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    const key = fields[i];
    const value = fields[i + 1];
    if (key === undefined || value === undefined) {
      continue;
    }
    output[key.toString()] = value.toString();
  }
  return output;
}

export function objectToArray(payload: Record<string, unknown>): string[] {
  const entries: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue;
    }
    entries.push(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  return entries;
}
