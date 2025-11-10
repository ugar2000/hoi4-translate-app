"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PipelineController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const upsert_file_dto_1 = require("./dto/upsert-file.dto");
const mark_file_error_dto_1 = require("./dto/mark-file-error.dto");
const chunk_complete_dto_1 = require("./dto/chunk-complete.dto");
const file_gateway_1 = require("../file/file.gateway");
let PipelineController = PipelineController_1 = class PipelineController {
    prisma;
    fileGateway;
    constructor(prisma, fileGateway) {
        this.prisma = prisma;
        this.fileGateway = fileGateway;
    }
    logger = new common_1.Logger(PipelineController_1.name);
    async upsertFile(dto) {
        this.logger.log(`Upserting file metadata ${dto.fileId} (lines=${dto.totalLines}, chunks=${dto.totalChunks}, origin=${dto.originLang}, target=${dto.targetLang})`);
        await this.prisma.pipelineFile.upsert({
            where: { fileId: dto.fileId },
            create: {
                fileId: dto.fileId,
                status: 'split',
                totalLines: dto.totalLines,
                totalChunks: dto.totalChunks,
                originLang: dto.originLang,
                targetLang: dto.targetLang,
                progress: {
                    create: {
                        processedLines: 0,
                        processedChunks: 0,
                    },
                },
            },
            update: {
                status: 'split',
                totalLines: dto.totalLines,
                totalChunks: dto.totalChunks,
                originLang: dto.originLang,
                targetLang: dto.targetLang,
                error: null,
                progress: {
                    update: {
                        processedLines: 0,
                        processedChunks: 0,
                        updatedAt: new Date(),
                    },
                },
            },
        });
    }
    async markError(dto) {
        this.logger.error(`Marking file error for ${dto.fileId}`, dto.error);
        await this.prisma.pipelineFile.upsert({
            where: { fileId: dto.fileId },
            create: {
                fileId: dto.fileId,
                status: 'error',
                error: dto.error,
                totalLines: 0,
                totalChunks: 0,
                progress: {
                    create: {},
                },
            },
            update: {
                status: 'error',
                error: dto.error,
            },
        });
    }
    async handleChunkComplete(dto) {
        this.logger.log(`Chunk complete for ${dto.fileId}#${dto.chunkSeq} with ${dto.lines.length} lines`);
        this.logger.debug(`Chunk payload ${dto.fileId}#${dto.chunkSeq}: ${JSON.stringify(dto.lines)}`);
        const totalLines = dto.lines.length;
        await this.prisma.pipelineProgress.upsert({
            where: { fileId: dto.fileId },
            create: {
                fileId: dto.fileId,
                processedLines: totalLines,
                processedChunks: 1,
            },
            update: {
                processedLines: { increment: totalLines },
                processedChunks: { increment: 1 },
                updatedAt: new Date(),
            },
        });
        const file = await this.prisma.pipelineFile.findUnique({
            where: { fileId: dto.fileId },
            select: { totalChunks: true },
        });
        const progress = await this.prisma.pipelineProgress.findUnique({
            where: { fileId: dto.fileId },
            select: { processedChunks: true },
        });
        if (file &&
            progress &&
            progress.processedChunks >= file.totalChunks &&
            file.totalChunks > 0) {
            this.logger.log(`File ${dto.fileId} marked as completed`);
            this.logger.log(`Final result for ${dto.fileId}: chunks=${file.totalChunks}, processedChunks=${progress.processedChunks}`);
            await this.prisma.pipelineFile.update({
                where: { fileId: dto.fileId },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                },
            });
        }
        this.fileGateway.emitFileChunk(dto.fileId, dto.chunkSeq, dto.lines);
    }
};
exports.PipelineController = PipelineController;
__decorate([
    (0, common_1.Post)('upsert'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upsert_file_dto_1.UpsertFileDto]),
    __metadata("design:returntype", Promise)
], PipelineController.prototype, "upsertFile", null);
__decorate([
    (0, common_1.Post)('error'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [mark_file_error_dto_1.MarkFileErrorDto]),
    __metadata("design:returntype", Promise)
], PipelineController.prototype, "markError", null);
__decorate([
    (0, common_1.Post)('chunk'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chunk_complete_dto_1.ChunkCompleteDto]),
    __metadata("design:returntype", Promise)
], PipelineController.prototype, "handleChunkComplete", null);
exports.PipelineController = PipelineController = PipelineController_1 = __decorate([
    (0, common_1.Controller)('pipeline/files'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        file_gateway_1.FileGateway])
], PipelineController);
