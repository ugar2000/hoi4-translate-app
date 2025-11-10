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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const file_storage_service_1 = require("../storage/file-storage.service");
const crypto_1 = require("crypto");
const path_1 = require("path");
let HistoryService = class HistoryService {
    prisma;
    storage;
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    async createHistoryEntry(userId, dto, files) {
        const originalFile = files.original?.[0];
        const translatedFile = files.translated?.[0];
        if (!originalFile || !translatedFile) {
            throw new common_1.BadRequestException('Both original and translated files are required');
        }
        const baseKey = `user-${userId}/${Date.now()}-${(0, crypto_1.randomUUID)()}`;
        const originalName = this.sanitizeFileName(originalFile.originalname || 'original.yml');
        const translatedName = this.sanitizeFileName(translatedFile.originalname || 'translated.yml');
        const originalKey = `${baseKey}/original-${originalName}`;
        const translatedKey = `${baseKey}/translated-${translatedName}`;
        await this.storage.upload(originalKey, originalFile.buffer, originalFile.mimetype || 'application/octet-stream', `attachment; filename="${originalName}"`);
        await this.storage.upload(translatedKey, translatedFile.buffer, translatedFile.mimetype || 'application/octet-stream', `attachment; filename="${translatedName}"`);
        return this.prisma.translate.create({
            data: {
                userId,
                originalFile: originalKey,
                translatedFile: translatedKey,
                originLang: dto.originLang,
                translatedLang: dto.translatedLang,
            },
        });
    }
    getHistoryForUser(userId) {
        return this.prisma.translate.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getStoredFile(userId, id, type) {
        const entry = await this.prisma.translate.findFirst({
            where: { id, userId },
        });
        if (!entry) {
            throw new common_1.NotFoundException('History entry not found');
        }
        const key = type === 'original' ? entry.originalFile : entry.translatedFile;
        try {
            const { stream, contentType } = await this.storage.getObject(key);
            const fileName = (0, path_1.basename)(key);
            return {
                stream,
                contentType,
                fileName,
            };
        }
        catch (error) {
            throw new common_1.NotFoundException('Stored file could not be retrieved');
        }
    }
    sanitizeFileName(name) {
        return name.replace(/[^a-zA-Z0-9._-]/g, '_');
    }
    async deleteHistoryEntry(userId, id) {
        const entry = await this.prisma.translate.findFirst({
            where: { id, userId },
        });
        if (!entry) {
            throw new common_1.NotFoundException('History entry not found');
        }
        await this.storage.deleteObject(entry.originalFile);
        await this.storage.deleteObject(entry.translatedFile);
        await this.prisma.translate.delete({
            where: { id },
        });
    }
};
exports.HistoryService = HistoryService;
exports.HistoryService = HistoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        file_storage_service_1.FileStorageService])
], HistoryService);
