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
var TranslateGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslateGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const translate_service_1 = require("./translate.service");
let TranslateGateway = TranslateGateway_1 = class TranslateGateway {
    translateService;
    logger = new common_1.Logger(TranslateGateway_1.name);
    server;
    constructor(translateService) {
        this.translateService = translateService;
    }
    handleConnection(socket) {
        this.logger.debug(`Socket connected: ${socket.id}`);
    }
    handleDisconnect(socket) {
        this.logger.debug(`Socket disconnected: ${socket.id}`);
    }
    handleJoinRow(socket, payload) {
        if (!payload?.rowId) {
            socket.emit('status', {
                rowId: payload?.rowId,
                status: 'error',
                error: 'rowId is required to join a room',
            });
            return;
        }
        const room = this.getRoomName(payload.rowId);
        socket.join(room);
        socket.emit('joined-row', { rowId: payload.rowId });
        this.logger.debug(`Socket ${socket.id} joined room ${room}`);
    }
    handleLeaveRow(socket, payload) {
        if (!payload?.rowId) {
            return;
        }
        const room = this.getRoomName(payload.rowId);
        socket.leave(room);
        this.logger.debug(`Socket ${socket.id} left room ${room}`);
    }
    async handleTranslateRow(socket, payload) {
        const { rowId, text, targetLanguage, mode, context } = payload;
        if (!rowId || typeof text !== 'string' || !targetLanguage) {
            socket.emit('status', {
                rowId,
                status: 'error',
                error: 'rowId, text, and targetLanguage are required',
            });
            return;
        }
        const trimmedText = text.trim();
        const room = this.getRoomName(rowId);
        socket.join(room);
        if (!trimmedText) {
            this.emitStatus(rowId, 'completed');
            this.server.to(room).emit('translation', {
                rowId,
                translatedText: text,
            });
            return;
        }
        this.emitStatus(rowId, 'processing');
        try {
            const result = await this.translateService.translate({
                text,
                targetLanguage,
                mode,
                context,
            });
            this.server.to(room).emit('translation', {
                rowId,
                translatedText: result.translatedText ?? text,
            });
            this.emitStatus(rowId, 'completed');
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Translation failed for ${rowId}: ${err.message}`);
            this.emitStatus(rowId, 'error', 'Translation failed');
        }
    }
    emitStatus(rowId, status, error) {
        const room = this.getRoomName(rowId);
        this.server.to(room).emit('status', {
            rowId,
            status,
            ...(error ? { error } : {}),
        });
    }
    getRoomName(rowId) {
        return `row:${rowId}`;
    }
};
exports.TranslateGateway = TranslateGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TranslateGateway.prototype, "server", void 0);
__decorate([
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], TranslateGateway.prototype, "handleConnection", null);
__decorate([
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], TranslateGateway.prototype, "handleDisconnect", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join-row'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], TranslateGateway.prototype, "handleJoinRow", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave-row'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], TranslateGateway.prototype, "handleLeaveRow", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('translate-row'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], TranslateGateway.prototype, "handleTranslateRow", null);
exports.TranslateGateway = TranslateGateway = TranslateGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'translate',
        cors: { origin: '*', credentials: true },
    }),
    __metadata("design:paramtypes", [translate_service_1.TranslateService])
], TranslateGateway);
