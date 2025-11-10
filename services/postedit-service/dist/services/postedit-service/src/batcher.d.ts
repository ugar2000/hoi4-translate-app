import OpenAI from 'openai';
import { HandlerResult } from '../../../packages/redisx/worker';
import { LineMsg } from '../../../packages/streams/schema';
import { MinioClient } from '../../../packages/miniox';
type BatchConfig = {
    minio: MinioClient;
    openai: OpenAI;
    maxItems: number;
    flushMs: number;
};
export declare class PosteditBatcher {
    private readonly config;
    private readonly queue;
    private timer;
    constructor(config: BatchConfig);
    enqueue(msg: LineMsg): Promise<HandlerResult>;
    private clearTimer;
    private flush;
}
export {};
