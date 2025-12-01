import { Client as MinioClient } from 'minio';
export { MinioClient };
export declare function createMinio(clientName?: string): MinioClient;
export declare function ensureBucket(client: MinioClient, bucket: string): Promise<void>;
export declare function putTextObject(client: MinioClient, bucket: string, key: string, contents: string): Promise<void>;
export declare function getTextObject(client: MinioClient, bucket: string, key: string): Promise<string>;
