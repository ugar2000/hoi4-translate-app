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
exports.TranslateService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
// import { getTextObject } from '../../../../packages/miniox';
// import type { MinioClient } from '../../../../packages/miniox';
// import { delay } from '../../../../packages/redisx';
const coordinator_client_1 = require("./coordinator.client");
let TranslateService = class TranslateService {
    coordinator;
    config;
    bucket;
    inputPrefix;
    outputPrefix;
    timeoutMs;
    constructor(coordinator, 
    // @Inject(MINIO_TOKEN) private readonly minio: MinioClient,
    config) {
        this.coordinator = coordinator;
        this.config = config;
        this.bucket = this.config.get('MINIO_BUCKET', 'translator');
        this.inputPrefix = this.config.get('INPUT_PREFIX', 'inline');
        this.outputPrefix = this.config.get('OUTPUT_PREFIX', 'out');
        this.timeoutMs = Number(this.config.get('TRANSLATION_TIMEOUT_MS', '45000'));
    }
    async translate(payload) {
        try {
            const fileId = this.createJobId();
            const lines = this.prepareLines(payload.text);
            const { total_lines: totalLines } = await this.coordinator.startJob({
                file_id: fileId,
                bucket: this.bucket,
                object_prefix: this.inputPrefix,
                lines,
                target_language: payload.targetLanguage,
            });
            await this.waitForCompletion(fileId, totalLines);
            // const finalKey = `${this.outputPrefix}/${fileId}/final.txt`;
            // const translated = await getTextObject(this.minio, this.bucket, finalKey);
            // TODO: MinIO functionality temporarily disabled
            return { translatedText: 'MinIO functionality temporarily disabled' };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Translation failed');
        }
    }
    prepareLines(text) {
        return text.split(/\r?\n/);
    }
    createJobId() {
        return `api-${(0, node_crypto_1.randomUUID)()}`;
    }
    async waitForCompletion(fileId, totalLines) {
        const deadline = Date.now() + this.timeoutMs;
        while (Date.now() < deadline) {
            const status = await this.coordinator.getStatus(fileId);
            const processed = status.lines?.processed ?? 0;
            if (processed >= totalLines) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        throw new Error('Pipeline timeout');
    }
};
exports.TranslateService = TranslateService;
exports.TranslateService = TranslateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [coordinator_client_1.CoordinatorClient,
        config_1.ConfigService])
], TranslateService);
