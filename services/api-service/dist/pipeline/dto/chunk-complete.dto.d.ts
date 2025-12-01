declare class ChunkLineDto {
    line_no: number;
    text: string;
    original?: string;
}
export declare class ChunkCompleteDto {
    fileId: string;
    chunkSeq: number;
    lines: ChunkLineDto[];
}
export {};
