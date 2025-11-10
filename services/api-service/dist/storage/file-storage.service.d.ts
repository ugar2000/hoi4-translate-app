import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
interface GetObjectResult {
    stream: Readable;
    contentType?: string;
}
export declare class FileStorageService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private readonly bucket;
    private readonly client;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    upload(key: string, body: Buffer, contentType: string, contentDisposition?: string): Promise<void>;
    getObject(key: string): Promise<GetObjectResult>;
    deleteObject(key: string): Promise<void>;
}
export {};
