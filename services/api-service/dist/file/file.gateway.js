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
var FileGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const file_service_1 = require("./file.service");
let FileGateway = FileGateway_1 = class FileGateway {
    fileService;
    logger = new common_1.Logger(FileGateway_1.name);
    queueListenersRegistered = false;
    server;
    constructor(fileService) {
        this.fileService = fileService;
    }
    afterInit() {
        this.registerQueueEvents();
    }
    handleConnection(socket) {
        this.logger.debug(`File socket connected ${socket.id}`);
    }
    handleDisconnect(socket) {
        this.logger.debug(`File socket disconnected ${socket.id}`);
    }
    async handleJoinJob(socket, payload) {
        if (!payload?.jobId) {
            socket.emit('file-status', {
                jobId: payload?.jobId ?? '',
                status: 'failed',
                error: 'jobId is required',
            });
            return;
        }
        const room = this.fileService.getRoom(payload.jobId);
        socket.join(room);
        socket.emit('joined-job', { jobId: payload.jobId });
        await this.emitImmediateStatus(payload.jobId);
    }
    handleLeaveJob(socket, payload) {
        if (!payload?.jobId) {
            return;
        }
        socket.leave(this.fileService.getRoom(payload.jobId));
    }
    registerQueueEvents() {
        if (this.queueListenersRegistered) {
            return;
        }
        const queue = this.fileService.getQueue();
        queue.on('waiting', (jobId) => this.emitStatus({
            jobId: String(jobId),
            status: 'waiting',
        }));
        queue.on('active', (job) => this.emitStatus({
            jobId: String(job.id),
            status: 'active',
            data: job.data,
        }));
        queue.on('progress', (job, progress) => this.emitStatus({
            jobId: String(job.id),
            status: 'progress',
            data: { progress },
        }));
        queue.on('completed', (job, result) => this.emitStatus({
            jobId: String(job.id),
            status: 'completed',
            data: result,
        }));
        queue.on('failed', (job, err) => this.emitStatus({
            jobId: String(job?.id ?? ''),
            status: 'failed',
            error: err?.message ?? job?.failedReason ?? 'Job failed',
        }));
        this.queueListenersRegistered = true;
    }
    async emitImmediateStatus(jobId) {
        const job = await this.fileService.getJob(jobId);
        if (!job) {
            return;
        }
        this.emitStatus({
            jobId,
            status: job.state ?? 'waiting',
            data: job.result ?? job.data,
            error: job.failedReason ?? undefined,
        });
    }
    emitStatus(payload) {
        const room = this.fileService.getRoom(payload.jobId);
        this.server.to(room).emit('file-status', payload);
        this.server.emit('file-status', payload);
    }
    emitFileChunk(fileId, chunkSeq, lines) {
        const room = this.fileService.getRoom(fileId);
        const payload = {
            fileId,
            chunkSeq,
            lines,
        };
        this.server.to(room).emit('chunk-ready', payload);
        this.server.emit('chunk-ready', payload);
    }
};
exports.FileGateway = FileGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], FileGateway.prototype, "server", void 0);
__decorate([
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], FileGateway.prototype, "handleConnection", null);
__decorate([
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], FileGateway.prototype, "handleDisconnect", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join-job'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], FileGateway.prototype, "handleJoinJob", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave-job'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], FileGateway.prototype, "handleLeaveJob", null);
exports.FileGateway = FileGateway = FileGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'files',
        cors: { origin: '*', credentials: true },
    }),
    __metadata("design:paramtypes", [file_service_1.FileService])
], FileGateway);
