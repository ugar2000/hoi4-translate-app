"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encode = encode;
exports.decode = decode;
exports.dedupId = dedupId;
exports.shardOf = shardOf;
const PAYLOAD_FIELD = 'payload';
function encode(message) {
    return {
        [PAYLOAD_FIELD]: JSON.stringify(message),
    };
}
function decode(fields) {
    const payload = fields[PAYLOAD_FIELD];
    if (!payload) {
        throw new Error('Stream payload missing for line message');
    }
    return JSON.parse(payload);
}
function dedupId(stage, fileId, lineIdx) {
    return `${stage}:${fileId}:${lineIdx}`;
}
function shardOf(fileId, shardCount) {
    if (!Number.isFinite(shardCount) || shardCount <= 0) {
        throw new Error('Shard count must be a positive number');
    }
    let hash = 0;
    for (let i = 0; i < fileId.length; i += 1) {
        hash = (hash * 31 + fileId.charCodeAt(i)) >>> 0;
    }
    return hash % shardCount;
}
//# sourceMappingURL=schema.js.map