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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var FileWorkflowService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWorkflowService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bull_1 = __importDefault(require("bull"));
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const file_service_1 = require("./file.service");
let FileWorkflowService = FileWorkflowService_1 = class FileWorkflowService {
    fileService;
    config;
    logger = new common_1.Logger(FileWorkflowService_1.name);
    ingestQueue;
    uploadRoot;
    inputPrefix;
    bucket;
    pendingUploads = new Map();
    queueCompletedHandler;
    queueFailedHandler;
    constructor(fileService, config) {
        this.fileService = fileService;
        this.config = config;
        const redisHost = config.get('REDIS_HOST', 'redis');
        const redisPort = Number(config.get('REDIS_PORT', '6379'));
        this.ingestQueue = new bull_1.default('ingest.split', {
            redis: {
                host: redisHost,
                port: redisPort,
            },
        });
        const sharedRoot = node_path_1.default.resolve(config.get('MINIO_SHARED_DIR', '/exports'));
        this.uploadRoot = node_path_1.default.join(sharedRoot, 'uploads');
        this.inputPrefix = config.get('INPUT_PREFIX', 'inline');
        this.bucket = config.get('MINIO_BUCKET', 'translator');
        this.queueCompletedHandler = (jobId, result) => this.handleUploadCompleted(jobId, result);
        this.queueFailedHandler = (jobId, err) => this.handleUploadFailed(jobId, err);
        const queue = this.fileService.getQueue();
        queue.on('global:completed', this.queueCompletedHandler);
        queue.on('global:failed', this.queueFailedHandler);
    }
    async onModuleInit() {
        await node_fs_1.promises.mkdir(this.uploadRoot, { recursive: true });
    }
    async onModuleDestroy() {
        const queue = this.fileService.getQueue();
        queue.removeListener('global:completed', this.queueCompletedHandler);
        queue.removeListener('global:failed', this.queueFailedHandler);
        await this.ingestQueue.close();
    }
    async startFromUpload(file, targetLanguage) {
        if (!file) {
            this.logger.warn('startFromUpload invoked without file payload');
            throw new common_1.BadRequestException('Upload file is required');
        }
        if (!targetLanguage) {
            this.logger.warn('startFromUpload invoked without target language');
            throw new common_1.BadRequestException('targetLang is required');
        }
        const fileId = `file-${(0, node_crypto_1.randomUUID)()}`;
        const originalName = this.sanitizeFileName(file.originalname || `${fileId}.yml`);
        const targetDir = node_path_1.default.join(this.uploadRoot, fileId);
        await node_fs_1.promises.mkdir(targetDir, { recursive: true });
        const localPath = node_path_1.default.join(targetDir, originalName);
        await node_fs_1.promises.writeFile(localPath, file.buffer);
        this.logger.debug(`Wrote upload temp file for ${fileId} to ${localPath} (${file.size} bytes)`);
        const uploadJob = await this.fileService.enqueueWriteJob({
            key: `${this.inputPrefix}/${fileId}.raw`,
            bucket: this.bucket,
            sourcePath: localPath,
            contentType: file.mimetype || 'application/x-yaml',
            operation: 'create',
        });
        this.pendingUploads.set(uploadJob.id, {
            fileId,
            targetLanguage,
            originalName,
            localPath,
            operation: 'create',
        });
        this.logger.log(`Queued upload job ${uploadJob.id} for ${fileId} (${originalName})`);
        return {
            fileId,
            uploadJobId: uploadJob.id,
            fileName: originalName,
        };
    }
    async handleUploadCompleted(jobId, _result) {
        const metadata = this.pendingUploads.get(String(jobId));
        if (!metadata || metadata.operation !== 'create') {
            this.logger.debug(`Skipping completion for job ${jobId} (metadata missing or not create)`);
            return;
        }
        this.logger.debug(`Upload job ${jobId} completed, triggering ingest`);
        this.pendingUploads.delete(String(jobId));
        await this.cleanupLocalFile(metadata.localPath);
        this.logger.debug(`Preparing ingest job for ${metadata.fileId} (target=${metadata.targetLanguage})`);
        try {
            await this.ingestQueue.add({
                fileId: metadata.fileId,
                targetLanguage: metadata.targetLanguage,
                originalName: metadata.originalName,
            }, {
                jobId: metadata.fileId,
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: true,
                removeOnFail: 10,
            });
            this.logger.log(`Enqueued ingest job for ${metadata.fileId} targeting ${metadata.targetLanguage}`);
        }
        catch (err) {
            this.logger.error(`Failed to enqueue ingest job for ${metadata.fileId}: ${err instanceof Error ? err.message : err}`);
        }
    }
    async handleUploadFailed(jobId, err) {
        const metadata = this.pendingUploads.get(String(jobId));
        if (!metadata) {
            return;
        }
        this.pendingUploads.delete(String(jobId));
        await this.cleanupLocalFile(metadata.localPath);
        this.logger.error(`Upload job ${jobId} for ${metadata.fileId} failed: ${err.message}`);
    }
    async cleanupLocalFile(localPath) {
        try {
            await node_fs_1.promises.rm(node_path_1.default.dirname(localPath), { recursive: true, force: true });
        }
        catch (err) {
            this.logger.warn(`Failed to clean up temp upload at ${localPath}: ${err instanceof Error ? err.message : err}`);
        }
    }
    sanitizeFileName(name) {
        return name.replace(/[^a-zA-Z0-9._-]/g, '_');
    }
};
exports.FileWorkflowService = FileWorkflowService;
exports.FileWorkflowService = FileWorkflowService = FileWorkflowService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [file_service_1.FileService,
        config_1.ConfigService])
], FileWorkflowService);
