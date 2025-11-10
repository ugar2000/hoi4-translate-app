import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../storage/file-storage.service';
import { CreateHistoryDto } from './dto/create-history.dto';
import { Readable } from 'stream';
interface UploadFiles {
    original?: Express.Multer.File[];
    translated?: Express.Multer.File[];
}
interface StoredFile {
    stream: Readable;
    fileName: string;
    contentType?: string;
}
export declare class HistoryService {
    private readonly prisma;
    private readonly storage;
    constructor(prisma: PrismaService, storage: FileStorageService);
    createHistoryEntry(userId: number, dto: CreateHistoryDto, files: UploadFiles): Promise<{
        id: number;
        createdAt: Date;
        userId: number;
        originLang: string;
        translatedLang: string;
        originalFile: string;
        translatedFile: string;
    }>;
    getHistoryForUser(userId: number): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        createdAt: Date;
        userId: number;
        originLang: string;
        translatedLang: string;
        originalFile: string;
        translatedFile: string;
    }[]>;
    getStoredFile(userId: number, id: number, type: 'original' | 'translated'): Promise<StoredFile>;
    private sanitizeFileName;
    deleteHistoryEntry(userId: number, id: number): Promise<void>;
}
export {};
