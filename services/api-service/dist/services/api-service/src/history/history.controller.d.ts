import { StreamableFile } from '@nestjs/common';
import { HistoryService } from './history.service';
import { RequestUser } from '../auth/request-with-user.interface';
import { CreateHistoryDto } from './dto/create-history.dto';
import { Response } from 'express';
export declare class HistoryController {
    private readonly historyService;
    constructor(historyService: HistoryService);
    createHistory(user: RequestUser, dto: CreateHistoryDto, files: {
        original?: Express.Multer.File[];
        translated?: Express.Multer.File[];
    }): Promise<{
        id: number;
        originLang: string;
        translatedLang: string;
        createdAt: Date;
        originalFile: string;
        originalFileName: string;
        translatedFile: string;
        translatedFileName: string;
    }>;
    listHistory(user: RequestUser): Promise<{
        id: number;
        originLang: string;
        translatedLang: string;
        createdAt: Date;
        originalFile: string;
        originalFileName: string;
        translatedFile: string;
        translatedFileName: string;
    }[]>;
    deleteHistory(user: RequestUser, id: number): Promise<void>;
    downloadOriginal(user: RequestUser, id: number, res: Response): Promise<StreamableFile>;
    downloadTranslated(user: RequestUser, id: number, res: Response): Promise<StreamableFile>;
    private getDisplayName;
}
