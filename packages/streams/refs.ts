export type ObjectRef = {
  bucket: string;
  key: string;
};

function assertBucket(bucket?: string): string {
  if (!bucket) {
    throw new Error('Bucket is required for object references');
  }
  return bucket;
}

export function parseObjectRef(ref: string): ObjectRef {
  if (!ref) {
    throw new Error('Object reference is required');
  }

  if (ref.startsWith('s3://')) {
    const url = new URL(ref);
    const key = url.pathname.replace(/^\/+/, '');
    return { bucket: assertBucket(url.hostname), key };
  }

  const normalized = ref.replace(/^\/+/, '');
  const slashIndex = normalized.indexOf('/');
  if (slashIndex === -1) {
    throw new Error(`Unable to parse object reference: ${ref}`);
  }
  return {
    bucket: assertBucket(normalized.slice(0, slashIndex)),
    key: normalized.slice(slashIndex + 1),
  };
}

export function buildStageRef(
  stage: string,
  fileId: string,
  lineIdx: number,
  bucket: string,
): string {
  const safeBucket = assertBucket(bucket);
  const key = `stages/${stage}/${fileId}/${lineIdx}.txt`;
  return `s3://${safeBucket}/${key}`;
}
