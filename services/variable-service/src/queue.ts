import Queue from 'bull';
import { QueueItem } from './types';

export const variableQueue = new Queue<QueueItem>('variables', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

export const addToQueue = async (hash: string, variable: string): Promise<void> => {
  await variableQueue.add({ hash, variable });
};
