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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const history_service_1 = require("./history.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const create_history_dto_1 = require("./dto/create-history.dto");
let HistoryController = class HistoryController {
    historyService;
    constructor(historyService) {
        this.historyService = historyService;
    }
    async createHistory(user, dto, files) {
        const entry = await this.historyService.createHistoryEntry(user.userId, dto, files);
        return {
            id: entry.id,
            originLang: entry.originLang,
            translatedLang: entry.translatedLang,
            createdAt: entry.createdAt,
            originalFile: entry.originalFile,
            originalFileName: this.getDisplayName(entry.originalFile),
            translatedFile: entry.translatedFile,
            translatedFileName: this.getDisplayName(entry.translatedFile),
        };
    }
    async listHistory(user) {
        const entries = await this.historyService.getHistoryForUser(user.userId);
        return entries.map((entry) => ({
            id: entry.id,
            originLang: entry.originLang,
            translatedLang: entry.translatedLang,
            createdAt: entry.createdAt,
            originalFile: entry.originalFile,
            originalFileName: this.getDisplayName(entry.originalFile),
            translatedFile: entry.translatedFile,
            translatedFileName: this.getDisplayName(entry.translatedFile),
        }));
    }
    async deleteHistory(user, id) {
        await this.historyService.deleteHistoryEntry(user.userId, id);
    }
    async downloadOriginal(user, id, res) {
        const file = await this.historyService.getStoredFile(user.userId, id, 'original');
        res.setHeader('Content-Type', file.contentType ?? 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${this.getDisplayName(file.fileName)}"`);
        return new common_1.StreamableFile(file.stream);
    }
    async downloadTranslated(user, id, res) {
        const file = await this.historyService.getStoredFile(user.userId, id, 'translated');
        res.setHeader('Content-Type', file.contentType ?? 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${this.getDisplayName(file.fileName)}"`);
        return new common_1.StreamableFile(file.stream);
    }
    getDisplayName(key) {
        const base = key.split('/').pop() ?? key;
        return base.replace(/^(original|translated)-/, '');
    }
};
exports.HistoryController = HistoryController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'original', maxCount: 1 },
        { name: 'translated', maxCount: 1 },
    ], { storage: (0, multer_1.memoryStorage)() })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_history_dto_1.CreateHistoryDto, Object]),
    __metadata("design:returntype", Promise)
], HistoryController.prototype, "createHistory", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HistoryController.prototype, "listHistory", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], HistoryController.prototype, "deleteHistory", null);
__decorate([
    (0, common_1.Get)(':id/original'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], HistoryController.prototype, "downloadOriginal", null);
__decorate([
    (0, common_1.Get)(':id/translated'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], HistoryController.prototype, "downloadTranslated", null);
exports.HistoryController = HistoryController = __decorate([
    (0, common_1.Controller)('history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [history_service_1.HistoryService])
], HistoryController);
