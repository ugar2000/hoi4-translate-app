export type FileJobOperation = 'create' | 'update';
export type FileJobStatus = 'waiting' | 'active' | 'progress' | 'completed' | 'failed' | 'delayed';
export type MinioJobBase = {
    key: string;
    bucket?: string;
};
export type MinioWriteJob = MinioJobBase & {
    type: FileJobOperation;
    sourcePath: string;
    contentType?: string;
};
export type MinioReadJob = MinioJobBase & {
    type: 'read';
    destinationPath: string;
};
export type MinioJobData = MinioWriteJob | MinioReadJob;
export type FileJobSummary = {
    id: string;
    state: string;
    progress: number | object;
    attemptsMade: number;
    failedReason?: string | null;
    data: Record<string, unknown>;
    result?: unknown;
    timestamp: number;
    finishedOn?: number | null;
    processedOn?: number | null;
};
export type FileJobEventPayload = {
    jobId: string;
    status: FileJobStatus;
    data?: unknown;
    error?: string;
};
