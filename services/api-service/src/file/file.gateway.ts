import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FileService } from './file.service';
import {
  FileJobEventPayload,
  FileJobStatus,
  MinioJobData,
} from './file.types';

type BullJob<T> = import('bull').Job<T>;

type JoinJobPayload = {
  jobId?: string;
};

@WebSocketGateway({
  namespace: 'files',
  cors: { origin: '*', credentials: true },
})
export class FileGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(FileGateway.name);
  private queueListenersRegistered = false;

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly fileService: FileService) {}

  afterInit() {
    this.registerQueueEvents();
  }

  handleConnection(@ConnectedSocket() socket: Socket) {
    this.logger.debug(`File socket connected ${socket.id}`);
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    this.logger.debug(`File socket disconnected ${socket.id}`);
  }

  @SubscribeMessage('join-job')
  async handleJoinJob(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinJobPayload,
  ) {
    if (!payload?.jobId) {
      socket.emit('file-status', {
        jobId: payload?.jobId ?? '',
        status: 'failed' satisfies FileJobStatus,
        error: 'jobId is required',
      });
      return;
    }

    const room = this.fileService.getRoom(payload.jobId);
    socket.join(room);
    socket.emit('joined-job', { jobId: payload.jobId });
    await this.emitImmediateStatus(payload.jobId);
  }

  @SubscribeMessage('leave-job')
  handleLeaveJob(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinJobPayload,
  ) {
    if (!payload?.jobId) {
      return;
    }
    socket.leave(this.fileService.getRoom(payload.jobId));
  }

  private registerQueueEvents() {
    if (this.queueListenersRegistered) {
      return;
    }

    const queue = this.fileService.getQueue();

    queue.on('waiting', (jobId: string | number) =>
      this.emitStatus({
        jobId: String(jobId),
        status: 'waiting',
      }),
    );

    queue.on('active', (job: BullJob<MinioJobData>) =>
      this.emitStatus({
        jobId: String(job.id),
        status: 'active',
        data: job.data,
      }),
    );

    queue.on('progress', (job: BullJob<MinioJobData>, progress: number) =>
      this.emitStatus({
        jobId: String(job.id),
        status: 'progress',
        data: { progress },
      }),
    );

    queue.on('completed', (job: BullJob<MinioJobData>, result: unknown) =>
      this.emitStatus({
        jobId: String(job.id),
        status: 'completed',
        data: result,
      }),
    );

    queue.on(
      'failed',
      (job: BullJob<MinioJobData> | null, err: Error | null) =>
        this.emitStatus({
          jobId: String(job?.id ?? ''),
          status: 'failed',
          error: err?.message ?? job?.failedReason ?? 'Job failed',
        }),
    );

    this.queueListenersRegistered = true;
  }

  private async emitImmediateStatus(jobId: string) {
    const job = await this.fileService.getJob(jobId);
    if (!job) {
      return;
    }
    this.emitStatus({
      jobId,
      status: (job.state as FileJobStatus) ?? 'waiting',
      data: job.result ?? job.data,
      error: job.failedReason ?? undefined,
    });
  }

  private emitStatus(payload: FileJobEventPayload) {
    const room = this.fileService.getRoom(payload.jobId);
    this.server.to(room).emit('file-status', payload);
    this.server.emit('file-status', payload);
  }

  emitFileChunk(
    fileId: string,
    chunkSeq: number,
    lines: { line_no: number; text: string }[],
  ) {
    const room = this.fileService.getRoom(fileId);
    const payload = {
      fileId,
      chunkSeq,
      lines,
    };
    this.server.to(room).emit('chunk-ready', payload);
    this.server.emit('chunk-ready', payload);
  }
}
