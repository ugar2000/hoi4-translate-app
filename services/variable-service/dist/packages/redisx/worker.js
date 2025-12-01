"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWorker = runWorker;
const _1 = require(".");
const schema_1 = require("../streams/schema");
const DEFAULT_BLOCK_MS = Number.parseInt(process.env.STREAM_BLOCK_MS ?? '1000', 10);
const DEFAULT_READ_COUNT = Number.parseInt(process.env.STREAM_READ_COUNT ?? '16', 10);
async function runWorker(config) {
    const redis = (0, _1.createRedis)(`${config.stage}-worker`);
    const resources = await config.resourcesFactory();
    const consumer = `${config.stage}-${process.pid}-${Math.random().toString(16).slice(2)}`;
    const processShard = async (shard) => {
        const stream = config.sourceStream(shard);
        await ensureGroup(redis, stream, config.group);
        while (true) {
            let response;
            try {
                response = (await redis.xreadgroup('GROUP', config.group, consumer, 'COUNT', DEFAULT_READ_COUNT, 'BLOCK', DEFAULT_BLOCK_MS, 'STREAMS', stream, '>'));
            }
            catch (err) {
                console.error(`[${config.stage}] failed to read from stream ${stream}`, err);
                await (0, _1.delay)(500);
                continue;
            }
            if (!response) {
                continue;
            }
            for (const [, entries] of response) {
                for (const [id, raw] of entries) {
                    const fields = (0, _1.fieldsToObject)(raw);
                    let message;
                    try {
                        message = (0, schema_1.decode)(fields);
                    }
                    catch (err) {
                        console.error(`[${config.stage}] failed to decode message ${id}`, err);
                        await redis.xack(stream, config.group, id);
                        continue;
                    }
                    const ctx = {
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
                    }
                    catch (err) {
                        console.error(`[${config.stage}] handler failed for ${id}`, err);
                        await (0, _1.delay)(500);
                    }
                }
            }
        }
    };
    await Promise.all(Array.from({ length: config.shards }, (_, shard) => processShard(shard)));
}
async function enqueueNext(redis, shard, config, next) {
    if (!next || !config.nextStream) {
        return;
    }
    const messages = Array.isArray(next) ? next : [next];
    for (const msg of messages) {
        const stream = config.nextStream(shard, msg);
        if (!stream) {
            continue;
        }
        await redis.xadd(stream, '*', ...(0, _1.objectToArray)((0, schema_1.encode)(msg)));
    }
}
async function ensureGroup(redis, stream, group) {
    try {
        await redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
    }
    catch (err) {
        if (typeof err?.message === 'string' && err.message.includes('BUSYGROUP')) {
            return;
        }
        if (err?.code === 'BUSYGROUP') {
            return;
        }
        throw err;
    }
}
//# sourceMappingURL=worker.js.map