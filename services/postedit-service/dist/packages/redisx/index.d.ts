import Redis from 'ioredis';
export type RedisClient = Redis;
export declare function createRedis(connectionName: string): RedisClient;
export declare function delay(ms: number): Promise<void>;
export declare function fieldsToObject(fields: Array<string | Buffer>): Record<string, string>;
export declare function objectToArray(payload: Record<string, unknown>): string[];
