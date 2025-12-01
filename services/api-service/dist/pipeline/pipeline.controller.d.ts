import { PrismaService } from '../prisma/prisma.service';
import { UpsertFileDto } from './dto/upsert-file.dto';
import { MarkFileErrorDto } from './dto/mark-file-error.dto';
import { ChunkCompleteDto } from './dto/chunk-complete.dto';
import { FileGateway } from '../file/file.gateway';
export declare class PipelineController {
    private readonly prisma;
    private readonly fileGateway;
    constructor(prisma: PrismaService, fileGateway: FileGateway);
    private readonly logger;
    upsertFile(dto: UpsertFileDto): Promise<void>;
    markError(dto: MarkFileErrorDto): Promise<void>;
    handleChunkComplete(dto: ChunkCompleteDto): Promise<void>;
}
