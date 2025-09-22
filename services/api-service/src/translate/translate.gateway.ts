import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TranslateService } from './translate.service';

type TranslationStatus = 'processing' | 'completed' | 'error';

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

@WebSocketGateway({
  namespace: 'translate',
  cors: { origin: '*', credentials: true },
})
export class TranslateGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(TranslateGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly translateService: TranslateService) {}

  handleConnection(@ConnectedSocket() socket: Socket) {
    this.logger.debug(`Socket connected: ${socket.id}`);
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    this.logger.debug(`Socket disconnected: ${socket.id}`);
  }

  @SubscribeMessage('join-row')
  handleJoinRow(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinRowPayload,
  ) {
    if (!payload?.rowId) {
      socket.emit('status', {
        rowId: payload?.rowId,
        status: 'error' satisfies TranslationStatus,
        error: 'rowId is required to join a room',
      });
      return;
    }

    const room = this.getRoomName(payload.rowId);
    socket.join(room);
    socket.emit('joined-row', { rowId: payload.rowId });
    this.logger.debug(`Socket ${socket.id} joined room ${room}`);
  }

  @SubscribeMessage('leave-row')
  handleLeaveRow(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinRowPayload,
  ) {
    if (!payload?.rowId) {
      return;
    }

    const room = this.getRoomName(payload.rowId);
    socket.leave(room);
    this.logger.debug(`Socket ${socket.id} left room ${room}`);
  }

  @SubscribeMessage('translate-row')
  async handleTranslateRow(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: TranslateRowPayload,
  ) {
    const { rowId, text, targetLanguage, mode, context } = payload;

    if (!rowId || typeof text !== 'string' || !targetLanguage) {
      socket.emit('status', {
        rowId,
        status: 'error' satisfies TranslationStatus,
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
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Translation failed for ${rowId}: ${err.message}`);
      this.emitStatus(rowId, 'error', 'Translation failed');
    }
  }

  private emitStatus(rowId: string, status: TranslationStatus, error?: string) {
    const room = this.getRoomName(rowId);
    this.server.to(room).emit('status', {
      rowId,
      status,
      ...(error ? { error } : {}),
    });
  }

  private getRoomName(rowId: string) {
    return `row:${rowId}`;
  }
}
