export type StartJobRequest = {
    file_id: string;
    bucket?: string;
    object_prefix?: string;
    lines: string[];
    target_language?: string;
};
export type StartJobResponse = {
    trace_id: string;
    total_lines: number;
};
export type GetStatusResponse = {
    file_id: string;
    lines?: {
        processed?: number;
        total?: number;
    };
    streams?: {
        stage: string;
        pending: number;
    }[];
    cancelled?: boolean;
};
export declare class CoordinatorClient {
    private readonly client;
    private readonly startJobAsync;
    private readonly getStatusAsync;
    constructor(address: string);
    startJob(request: StartJobRequest): Promise<StartJobResponse>;
    getStatus(fileId: string): Promise<GetStatusResponse>;
}
