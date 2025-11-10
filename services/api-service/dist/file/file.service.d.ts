import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bull from 'bull';
import { CreateFileJobDto } from './dto/create-file-job.dto';
import { ReadFileJobDto } from './dto/read-file-job.dto';
import { FileJobSummary, MinioJobData } from './file.types';
export declare class FileService implements OnModuleDestroy {
    private readonly config;
    private readonly logger;
    private readonly queue;
    private readonly sharedRoot;
    private readonly queueAddTimeoutMs;
    private readonly queueReady;
    constructor(config: ConfigService);
    getQueue(): Bull.Queue<MinioJobData>;
    getRoom(jobId: string | number): string;
    enqueueWriteJob(dto: CreateFileJobDto): Promise<FileJobSummary>;
    enqueueReadJob(dto: ReadFileJobDto): Promise<FileJobSummary>;
    private addJobWithTimeout;
    getJob(jobId: string): Promise<FileJobSummary | null>;
    onModuleDestroy(): Promise<void>;
    private serializeJob;
    private ensureSharedPath;
}
