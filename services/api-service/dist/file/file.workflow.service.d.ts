import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileService } from './file.service';
type UploadResult = {
    fileId: string;
    uploadJobId: string;
    fileName: string;
};
export declare class FileWorkflowService implements OnModuleInit, OnModuleDestroy {
    private readonly fileService;
    private readonly config;
    private readonly logger;
    private readonly ingestQueue;
    private readonly uploadRoot;
    private readonly inputPrefix;
    private readonly bucket;
    private readonly pendingUploads;
    private readonly queueCompletedHandler;
    private readonly queueFailedHandler;
    constructor(fileService: FileService, config: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    startFromUpload(file: Express.Multer.File | undefined, targetLanguage: string): Promise<UploadResult>;
    private handleUploadCompleted;
    private handleUploadFailed;
    private cleanupLocalFile;
    private sanitizeFileName;
}
export {};
