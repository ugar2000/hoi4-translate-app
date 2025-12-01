import type Redis from 'ioredis';
import { createRedis, delay, fieldsToObject, objectToArray } from '.';
import { LineMsg, encode, decode } from '../streams/schema';

export type StageName =
  | 'translate'
  | 'postedit'
  | 'special_chars'
  | 'aggregate'
  | 'upload'
  | (string & Record<never, never>);

export type HandlerContext<TResources> = {
  redis: Redis;
  shard: number;
  stream: string;
  messageId: string;
  resources: TResources;
};

export type HandlerResult = {
  next?: LineMsg | LineMsg[] | null;
};

export type WorkerConfig<TResources> = {
  stage: StageName;
  group: string;
  shards: number;
  sourceStream: (shard: number) => string;
  nextStream?: (shard: number, msg: LineMsg) => string | null;
  handler: (msg: LineMsg, ctx: HandlerContext<TResources>) => Promise<HandlerResult>;
  resourcesFactory: () => Promise<TResources>;
};

const DEFAULT_BLOCK_MS = Number.parseInt(process.env.STREAM_BLOCK_MS ?? '1000', 10);
const DEFAULT_READ_COUNT = Number.parseInt(process.env.STREAM_READ_COUNT ?? '16', 10);

export async function runWorker<TResources>(config: WorkerConfig<TResources>): Promise<void> {
  const redis = createRedis(`${config.stage}-worker`);
  const resources = await config.resourcesFactory();
  const consumer = `${config.stage}-${process.pid}-${Math.random().toString(16).slice(2)}`;

  const processShard = async (shard: number) => {
    const stream = config.sourceStream(shard);
    await ensureGroup(redis, stream, config.group);

    while (true) {
      let response: [string, [string, Array<string | Buffer>][]][] | null;
      try {
        response = (await redis.xreadgroup(
          'GROUP',
          config.group,
          consumer,
          'COUNT',
          DEFAULT_READ_COUNT,
          'BLOCK',
          DEFAULT_BLOCK_MS,
          'STREAMS',
          stream,
          '>',
        )) as [string, [string, Array<string | Buffer>][]][] | null;
      } catch (err) {
        console.error(`[${config.stage}] failed to read from stream ${stream}`, err);
        await delay(500);
        continue;
      }

      if (!response) {
        continue;
      }

      for (const [, entries] of response) {
        for (const [id, raw] of entries) {
          const fields = fieldsToObject(raw);
          let message: LineMsg;
          try {
            message = decode(fields);
          } catch (err) {
            console.error(`[${config.stage}] failed to decode message ${id}`, err);
            await redis.xack(stream, config.group, id);
            continue;
          }

          const ctx: HandlerContext<TResources> = {
            redis,
            shard,
            stream,
            messageId: id,
            resources,
          };

          try {
            const result = await config.handler(message, ctx);
            await redis.xack(stream, config.group, id);
            await enqueueNext(redis, shard, config, result?.next);
          } catch (err) {
            console.error(`[${config.stage}] handler failed for ${id}`, err);
            await delay(500);
          }
        }
      }
    }
  };

  await Promise.all(Array.from({ length: config.shards }, (_, shard) => processShard(shard)));
}

async function enqueueNext<TResources>(
  redis: Redis,
  shard: number,
  config: WorkerConfig<TResources>,
  next: LineMsg | LineMsg[] | null | undefined,
): Promise<void> {
  if (!next || !config.nextStream) {
    return;
  }

  const messages = Array.isArray(next) ? next : [next];
  for (const msg of messages) {
    const stream = config.nextStream(shard, msg);
    if (!stream) {
      continue;
    }
    await redis.xadd(stream, '*', ...objectToArray(encode(msg)));
  }
}

async function ensureGroup(redis: Redis, stream: string, group: string): Promise<void> {
  try {
    await redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
  } catch (err: any) {
    if (typeof err?.message === 'string' && err.message.includes('BUSYGROUP')) {
      return;
    }
    if (err?.code === 'BUSYGROUP') {
      return;
    }
    throw err;
  }
}
