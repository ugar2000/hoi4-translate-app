import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TranslateService } from './translate.service';
interface JoinRowPayload {
    rowId?: string;
}
interface TranslateRowPayload {
    rowId?: string;
    text?: string;
    targetLanguage?: string;
    mode?: 'translate' | 'post-process';
    context?: string;
}
export declare class TranslateGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly translateService;
    private readonly logger;
    private readonly server;
    constructor(translateService: TranslateService);
    handleConnection(socket: Socket): void;
    handleDisconnect(socket: Socket): void;
    handleJoinRow(socket: Socket, payload: JoinRowPayload): void;
    handleLeaveRow(socket: Socket, payload: JoinRowPayload): void;
    handleTranslateRow(socket: Socket, payload: TranslateRowPayload): Promise<void>;
    private emitStatus;
    private getRoomName;
}
export {};
