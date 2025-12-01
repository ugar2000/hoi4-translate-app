"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseObjectRef = parseObjectRef;
exports.buildStageRef = buildStageRef;
function assertBucket(bucket) {
    if (!bucket) {
        throw new Error('Bucket is required for object references');
    }
    return bucket;
}
function parseObjectRef(ref) {
    if (!ref) {
        throw new Error('Object reference is required');
    }
    if (ref.startsWith('s3://')) {
        const url = new URL(ref);
        const key = url.pathname.replace(/^\/+/, '');
        return { bucket: assertBucket(url.hostname), key };
    }
    const normalized = ref.replace(/^\/+/, '');
    const slashIndex = normalized.indexOf('/');
    if (slashIndex === -1) {
        throw new Error(`Unable to parse object reference: ${ref}`);
    }
    return {
        bucket: assertBucket(normalized.slice(0, slashIndex)),
        key: normalized.slice(slashIndex + 1),
    };
}
function buildStageRef(stage, fileId, lineIdx, bucket) {
    const safeBucket = assertBucket(bucket);
    const key = `stages/${stage}/${fileId}/${lineIdx}.txt`;
    return `s3://${safeBucket}/${key}`;
}
//# sourceMappingURL=refs.js.map