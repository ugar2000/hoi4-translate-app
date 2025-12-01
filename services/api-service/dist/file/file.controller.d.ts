import { FileService } from './file.service';
import { CreateFileJobDto } from './dto/create-file-job.dto';
import { ReadFileJobDto } from './dto/read-file-job.dto';
import { FileWorkflowService } from './file.workflow.service';
import { StartFileProcessDto } from './dto/start-file-process.dto';
export declare class FileController {
    private readonly fileService;
    private readonly workflow;
    private readonly logger;
    constructor(fileService: FileService, workflow: FileWorkflowService);
    startPipeline(file: Express.Multer.File, dto: StartFileProcessDto): Promise<{
        fileId: string;
        uploadJobId: string;
        fileName: string;
    }>;
    createFileJob(dto: CreateFileJobDto): Promise<import("./file.types").FileJobSummary>;
    readFileJob(dto: ReadFileJobDto): Promise<import("./file.types").FileJobSummary>;
    getJob(id: string): Promise<import("./file.types").FileJobSummary>;
}
