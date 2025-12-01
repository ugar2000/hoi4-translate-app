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
type EncodedMessage = Record<string, string>;
export declare function encode(message: LineMsg): EncodedMessage;
export declare function decode(fields: Record<string, string>): LineMsg;
export declare function dedupId(stage: string, fileId: string, lineIdx: number): string;
export declare function shardOf(fileId: string, shardCount: number): number;
export {};
