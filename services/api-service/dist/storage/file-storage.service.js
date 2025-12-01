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
var FileStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const miniox_1 = require("../../../../packages/miniox");
let FileStorageService = FileStorageService_1 = class FileStorageService {
    configService;
    logger = new common_1.Logger(FileStorageService_1.name);
    bucket;
    client;
    constructor(configService) {
        this.configService = configService;
        this.bucket = this.configService.get('MINIO_BUCKET', 'translations');
        this.client = (0, miniox_1.createMinio)('api-service');
    }
    async onModuleInit() {
        try {
            await (0, miniox_1.ensureBucket)(this.client, this.bucket);
            this.logger.log(`MinIO bucket ready: ${this.bucket}`);
        }
        catch (error) {
            this.logger.error(`Failed to initialize bucket ${this.bucket}`, error instanceof Error ? error.stack : `${error}`);
            throw error;
        }
    }
    async upload(key, body, contentType, contentDisposition) {
        const metadata = {
            'Content-Type': contentType,
        };
        if (contentDisposition) {
            metadata['Content-Disposition'] = contentDisposition;
        }
        try {
            await this.client.putObject(this.bucket, key, body, undefined, metadata);
            this.logger.debug(`Uploaded object ${key} (${body.length} bytes)`);
        }
        catch (error) {
            this.logger.error(`Failed to upload object ${key}`, error instanceof Error ? error.stack : `${error}`);
            throw error;
        }
    }
    async getObject(key) {
        try {
            const stream = (await this.client.getObject(this.bucket, key));
            let contentType;
            try {
                const stat = await this.client.statObject(this.bucket, key);
                const meta = stat.metaData ?? {};
                contentType =
                    meta['content-type'] ??
                        meta['Content-Type'] ??
                        meta['content_type'] ??
                        undefined;
            }
            catch (statError) {
                this.logger.warn(`Could not read metadata for ${key}: ${statError instanceof Error ? statError.message : statError}`);
            }
            return {
                stream,
                contentType,
            };
        }
        catch (error) {
            this.logger.error(`Failed to read object ${key}`, error instanceof Error ? error.stack : `${error}`);
            throw error;
        }
    }
    async deleteObject(key) {
        try {
            await this.client.removeObject(this.bucket, key);
            this.logger.debug(`Deleted object ${key}`);
        }
        catch (error) {
            if (error?.code === 'NoSuchKey') {
                this.logger.warn(`Object ${key} not found while deleting`);
                return;
            }
            this.logger.error(`Failed to delete object ${key}`, error instanceof Error ? error.stack : `${error}`);
            throw error;
        }
    }
};
exports.FileStorageService = FileStorageService;
exports.FileStorageService = FileStorageService = FileStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FileStorageService);
