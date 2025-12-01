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
var FileController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const file_service_1 = require("./file.service");
const create_file_job_dto_1 = require("./dto/create-file-job.dto");
const read_file_job_dto_1 = require("./dto/read-file-job.dto");
const file_workflow_service_1 = require("./file.workflow.service");
const start_file_process_dto_1 = require("./dto/start-file-process.dto");
let FileController = FileController_1 = class FileController {
    fileService;
    workflow;
    logger = new common_1.Logger(FileController_1.name);
    constructor(fileService, workflow) {
        this.fileService = fileService;
        this.workflow = workflow;
    }
    startPipeline(file, dto) {
        this.logger.log(`Received file pipeline request (target=${dto.targetLang ?? 'missing'}, size=${file?.size ?? 'n/a'}, mimetype=${file?.mimetype ?? 'n/a'})`);
        const startTime = Date.now();
        return this.workflow
            .startFromUpload(file, dto.targetLang)
            .then((result) => {
            this.logger.log(`File pipeline queued (fileId=${result.fileId}, uploadJob=${result.uploadJobId}, duration=${Date.now() - startTime}ms)`);
            return result;
        })
            .catch((err) => {
            this.logger.error(`Failed to start file pipeline: ${err instanceof Error ? err.message : err}`);
            throw err;
        });
    }
    createFileJob(dto) {
        return this.fileService.enqueueWriteJob(dto);
    }
    readFileJob(dto) {
        return this.fileService.enqueueReadJob(dto);
    }
    async getJob(id) {
        const job = await this.fileService.getJob(id);
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        return job;
    }
};
exports.FileController = FileController;
__decorate([
    (0, common_1.Post)('process'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, start_file_process_dto_1.StartFileProcessDto]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "startPipeline", null);
__decorate([
    (0, common_1.Post)('upload'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_file_job_dto_1.CreateFileJobDto]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "createFileJob", null);
__decorate([
    (0, common_1.Post)('download'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [read_file_job_dto_1.ReadFileJobDto]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "readFileJob", null);
__decorate([
    (0, common_1.Get)('jobs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FileController.prototype, "getJob", null);
exports.FileController = FileController = FileController_1 = __decorate([
    (0, common_1.Controller)('files'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [file_service_1.FileService,
        file_workflow_service_1.FileWorkflowService])
], FileController);
