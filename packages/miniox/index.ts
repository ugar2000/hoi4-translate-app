import { Client as MinioClient } from 'minio';

export { MinioClient };

function resolveEndpoint(rawEndpoint: string) {
  const endpoint = rawEndpoint.includes('://') ? rawEndpoint : `http://${rawEndpoint}`;
  const url = new URL(endpoint);
  const useSSL = url.protocol === 'https:';
  const port = url.port ? Number.parseInt(url.port, 10) : useSSL ? 443 : 80;
  return { endPoint: url.hostname, port, useSSL };
}

export function createMinio(clientName = 'default'): MinioClient {
  const endpoint = process.env.MINIO_ENDPOINT ?? 'http://minio:9000';
  const accessKey = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
  const { endPoint, port, useSSL } = resolveEndpoint(endpoint);

  return new MinioClient({
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    region: process.env.MINIO_REGION,
  });
}

export async function ensureBucket(client: MinioClient, bucket: string): Promise<void> {
  const name = bucket || process.env.MINIO_BUCKET || 'translator';
  const exists = await client.bucketExists(name).catch((err: Error & { code?: string }) => {
    if (err.code === 'NoSuchBucket') {
      return false;
    }
    throw err;
  });

  if (!exists) {
    await client.makeBucket(name, '');
  }
}

export async function putTextObject(
  client: MinioClient,
  bucket: string,
  key: string,
  contents: string,
): Promise<void> {
  await client.putObject(bucket, key, contents, undefined, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
}

export async function getTextObject(
  client: MinioClient,
  bucket: string,
  key: string,
): Promise<string> {
  const stream = await client.getObject(bucket, key);
  const chunks: Buffer[] = [];

  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: Error) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}
