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
var FileService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bull_1 = __importDefault(require("bull"));
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
let FileService = FileService_1 = class FileService {
    config;
    logger = new common_1.Logger(FileService_1.name);
    queue;
    sharedRoot;
    queueAddTimeoutMs;
    queueReady;
    constructor(config) {
        this.config = config;
        const redisHost = config.get('REDIS_HOST', 'redis');
        const redisPort = Number(config.get('REDIS_PORT', '6379'));
        this.logger.log(`FileService connecting to Redis at ${redisHost}:${redisPort}`);
        const queueName = config.get('MINIO_QUEUE_NAME', 'minio:jobs');
        this.sharedRoot = node_path_1.default.resolve(config.get('MINIO_SHARED_DIR', '/exports'));
        this.queueAddTimeoutMs = Number(config.get('QUEUE_ADD_TIMEOUT_MS', '5000'));
        this.queue = new bull_1.default(queueName, {
            redis: {
                host: redisHost,
                port: redisPort,
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            },
        });
        this.queueReady = this.queue
            .isReady()
            .then(() => {
            this.logger.log(`MinIO queue ready (redis ${redisHost}:${redisPort}, queue ${queueName})`);
        })
            .catch((err) => {
            this.logger.error(`Failed to connect to Redis at ${redisHost}:${redisPort}`, err instanceof Error ? err.stack : err);
            throw err;
        });
        this.queue.on('error', (err) => {
            this.logger.error(`Redis queue error: ${err instanceof Error ? err.message : String(err)}`);
        });
        this.queue.on('waiting', (jobId) => this.logger.debug(`Queue waiting job ${jobId}`));
        this.queue.on('active', (job) => this.logger.debug(`Queue active job ${job.id}`));
    }
    getQueue() {
        return this.queue;
    }
    getRoom(jobId) {
        return `file:${jobId}`;
    }
    async enqueueWriteJob(dto) {
        const operation = dto.operation ?? 'create';
        const sourcePath = await this.ensureSharedPath(dto.sourcePath, true);
        this.logger.debug(`Enqueueing ${operation} job for key ${dto.key} (source: ${sourcePath})`);
        await this.queueReady;
        const job = await this.addJobWithTimeout(this.queue.add(operation, {
            type: operation,
            key: dto.key,
            bucket: dto.bucket,
            sourcePath,
            contentType: dto.contentType,
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
            removeOnFail: 25,
        }), `add ${operation} job for ${dto.key}`);
        this.logger.debug(`Queued ${operation} job ${job.id} for ${dto.key}`);
        return this.serializeJob(job);
    }
    async enqueueReadJob(dto) {
        const destinationPath = await this.ensureSharedPath(dto.destinationPath, false);
        this.logger.debug(`Enqueueing read job for key ${dto.key} (destination: ${destinationPath})`);
        await this.queueReady;
        const job = await this.addJobWithTimeout(this.queue.add('read', {
            type: 'read',
            key: dto.key,
            bucket: dto.bucket,
            destinationPath,
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
            removeOnFail: 25,
        }), `add read job for ${dto.key}`);
        this.logger.debug(`Queued read job ${job.id} for ${dto.key}`);
        return this.serializeJob(job);
    }
    async addJobWithTimeout(promise, description) {
        let timeoutHandle;
        const guardedPromise = promise.catch((err) => {
            throw err;
        });
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error(`${description} timed out after ${this.queueAddTimeoutMs}ms`));
            }, this.queueAddTimeoutMs);
        });
        try {
            const result = (await Promise.race([
                guardedPromise,
                timeoutPromise,
            ]));
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
            return result;
        }
        catch (err) {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
            this.logger.error(`${description} failed: ${err instanceof Error ? err.message : String(err)}`);
            throw err;
        }
    }
    async getJob(jobId) {
        const job = await this.queue.getJob(jobId);
        if (!job) {
            return null;
        }
        return this.serializeJob(job);
    }
    async onModuleDestroy() {
        await this.queue.close();
    }
    async serializeJob(job) {
        const state = await job.getState();
        return {
            id: String(job.id),
            state,
            progress: job.progress(),
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason,
            data: job.data,
            result: job.returnvalue,
            timestamp: job.timestamp,
            finishedOn: job.finishedOn ?? null,
            processedOn: job.processedOn ?? null,
        };
    }
    async ensureSharedPath(input, mustExist) {
        if (!input) {
            throw new common_1.BadRequestException('Path is required');
        }
        const candidate = node_path_1.default.resolve(input.startsWith('/') ? input : node_path_1.default.join(this.sharedRoot, input));
        const relative = node_path_1.default.relative(this.sharedRoot, candidate);
        if (relative.startsWith('..') || node_path_1.default.isAbsolute(relative)) {
            throw new common_1.BadRequestException(`Path "${input}" escapes shared directory ${this.sharedRoot}`);
        }
        if (mustExist) {
            try {
                await node_fs_1.promises.access(candidate);
            }
            catch {
                throw new common_1.BadRequestException(`Path "${candidate}" does not exist`);
            }
        }
        else {
            await node_fs_1.promises.mkdir(node_path_1.default.dirname(candidate), { recursive: true });
        }
        return candidate;
    }
};
exports.FileService = FileService;
exports.FileService = FileService = FileService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FileService);
