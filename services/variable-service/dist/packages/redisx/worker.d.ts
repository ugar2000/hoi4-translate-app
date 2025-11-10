import type Redis from 'ioredis';
import { LineMsg } from '../streams/schema';
export type StageName = 'translate' | 'postedit' | 'special_chars' | 'aggregate' | 'upload' | (string & Record<never, never>);
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
export declare function runWorker<TResources>(config: WorkerConfig<TResources>): Promise<void>;
