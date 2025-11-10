import path from 'node:path';
import { promisify } from 'node:util';
import * as grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const PROTO_PATH = path.resolve(
  __dirname,
  '../../../coordinator-service/proto/coordinator.proto',
);

let coordinatorCtor: grpc.ServiceClientConstructor | null = null;

try {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const coordinatorPackage = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    coordinator: {
      Coordinator: grpc.ServiceClientConstructor;
    };
  };
  coordinatorCtor = coordinatorPackage.coordinator.Coordinator;
} catch (err) {
  console.warn(
    '[api-service] coordinator proto unavailable, translate REST endpoints will be disabled',
    err instanceof Error ? err.message : err,
  );
}

export type StartJobRequest = {
  file_id: string;
  bucket?: string;
  object_prefix?: string;
  lines: string[];
  target_language?: string;
};

export type StartJobResponse = {
  trace_id: string;
  total_lines: number;
};

export type GetStatusResponse = {
  file_id: string;
  lines?: {
    processed?: number;
    total?: number;
  };
  streams?: { stage: string; pending: number }[];
  cancelled?: boolean;
};

export class CoordinatorClient {
  private readonly client: any;
  private readonly startJobAsync: (request: StartJobRequest) => Promise<StartJobResponse>;
  private readonly getStatusAsync: (request: { file_id: string }) => Promise<GetStatusResponse>;

  constructor(address: string) {
    if (!coordinatorCtor) {
      this.client = null;
      this.startJobAsync = async () => {
        throw new Error('Coordinator service is not available. Please enable coordinator-service.');
      };
      this.getStatusAsync = async (request) => ({
        file_id: request.file_id,
        lines: { processed: 0, total: 0 },
      });
      return;
    }

    this.client = new coordinatorCtor(address, grpc.credentials.createInsecure());
    this.startJobAsync = promisify(this.client.startJob.bind(this.client));
    this.getStatusAsync = promisify(this.client.getStatus.bind(this.client));
  }

  startJob(request: StartJobRequest): Promise<StartJobResponse> {
    return this.startJobAsync(request);
  }

  getStatus(fileId: string): Promise<GetStatusResponse> {
    return this.getStatusAsync({ file_id: fileId });
  }
}
