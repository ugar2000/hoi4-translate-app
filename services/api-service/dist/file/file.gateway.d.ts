import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { FileService } from './file.service';
type JoinJobPayload = {
    jobId?: string;
};
export declare class FileGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly fileService;
    private readonly logger;
    private queueListenersRegistered;
    private server;
    constructor(fileService: FileService);
    afterInit(): void;
    handleConnection(socket: Socket): void;
    handleDisconnect(socket: Socket): void;
    handleJoinJob(socket: Socket, payload: JoinJobPayload): Promise<void>;
    handleLeaveJob(socket: Socket, payload: JoinJobPayload): void;
    private registerQueueEvents;
    private emitImmediateStatus;
    private emitStatus;
    emitFileChunk(fileId: string, chunkSeq: number, lines: {
        line_no: number;
        text: string;
    }[]): void;
}
export {};
