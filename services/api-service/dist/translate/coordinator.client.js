"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoordinatorClient = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_util_1 = require("node:util");
const grpc = __importStar(require("@grpc/grpc-js"));
const proto_loader_1 = __importDefault(require("@grpc/proto-loader"));
const PROTO_PATH = node_path_1.default.resolve(__dirname, '../../../coordinator-service/proto/coordinator.proto');
let coordinatorCtor = null;
try {
    const packageDefinition = proto_loader_1.default.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });
    const coordinatorPackage = grpc.loadPackageDefinition(packageDefinition);
    coordinatorCtor = coordinatorPackage.coordinator.Coordinator;
}
catch (err) {
    console.warn('[api-service] coordinator proto unavailable, translate REST endpoints will be disabled', err instanceof Error ? err.message : err);
}
class CoordinatorClient {
    client;
    startJobAsync;
    getStatusAsync;
    constructor(address) {
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
        this.startJobAsync = (0, node_util_1.promisify)(this.client.startJob.bind(this.client));
        this.getStatusAsync = (0, node_util_1.promisify)(this.client.getStatus.bind(this.client));
    }
    startJob(request) {
        return this.startJobAsync(request);
    }
    getStatus(fileId) {
        return this.getStatusAsync({ file_id: fileId });
    }
}
exports.CoordinatorClient = CoordinatorClient;
