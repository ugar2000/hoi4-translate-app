export type LineMsg = {
  file_id: string;
  line_idx: number;
  total_lines: number;
  content_ref: string;
  out_ref?: string;
  trace_id: string;
  attempt: number;
  dedup_id: string;
  target_language?: string;
  metadata?: Record<string, unknown>;
};

const PAYLOAD_FIELD = 'payload';

type EncodedMessage = Record<string, string>;

export function encode(message: LineMsg): EncodedMessage {
  return {
    [PAYLOAD_FIELD]: JSON.stringify(message),
  };
}

export function decode(fields: Record<string, string>): LineMsg {
  const payload = fields[PAYLOAD_FIELD];
  if (!payload) {
    throw new Error('Stream payload missing for line message');
  }
  return JSON.parse(payload) as LineMsg;
}

export function dedupId(stage: string, fileId: string, lineIdx: number): string {
  return `${stage}:${fileId}:${lineIdx}`;
}

export function shardOf(fileId: string, shardCount: number): number {
  if (!Number.isFinite(shardCount) || shardCount <= 0) {
    throw new Error('Shard count must be a positive number');
  }
  let hash = 0;
  for (let i = 0; i < fileId.length; i += 1) {
    hash = (hash * 31 + fileId.charCodeAt(i)) >>> 0;
  }
  return hash % shardCount;
}
