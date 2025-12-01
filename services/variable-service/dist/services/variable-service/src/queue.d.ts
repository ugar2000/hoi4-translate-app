import Queue from 'bull';
import { QueueItem } from './types';
export declare const variableQueue: Queue.Queue<QueueItem>;
export declare const addToQueue: (hash: string, variable: string) => Promise<void>;
