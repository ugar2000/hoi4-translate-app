import WebSocket from 'ws';
import Queue from 'bull';
import Redis from 'ioredis';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface TranslationRequest {
  type: 'translate';
  text: string;
  targetLanguage: string;
  rowId: string;
}

interface SeparatorResponse {
  processedText: string;
  variables: Array<{ hash: string; value: string; }>;
}

interface TranslationStatus {
  type: 'status';
  rowId: string;
  status: 'separating' | 'translating' | 'restoring' | 'completed' | 'error';
  text?: string;
  error?: string;
}

const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 35000;

const TRANSLATION_SERVICE_URL = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3002';
const VARIABLE_SEPARATOR_URL = process.env.VARIABLE_SEPARATOR_URL || 'http://localhost:3003';
const MICROSOFT_TRANSLATOR_SERVICE_URL = process.env.MICROSOFT_TRANSLATOR_SERVICE_URL || 'http://localhost:3004';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL);
const subscriber = new Redis(REDIS_URL);
const publisher = new Redis(REDIS_URL);

const separatorQueue = new Queue('separator', REDIS_URL);
const translatorQueue = new Queue('translator', REDIS_URL);
const restoreQueue = new Queue('restore', REDIS_URL);

const clientMap = new Map<string, WebSocket>();

const wss = new WebSocket.Server({ 
  port: 3001,
  perMessageDeflate: false
});

function heartbeat(ws: WebSocket & { isAlive?: boolean }) {
  ws.isAlive = true;
}

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const client = ws as WebSocket & { isAlive?: boolean };
    if (client.isAlive === false) {
      console.log('Client timed out, terminating connection');
      return ws.terminate();
    }
    client.isAlive = false;
    client.ping();
  });
}, HEARTBEAT_INTERVAL);

function containsOnlyHashedVariables(text: string, variables: Array<{ hash: string; value: string; }>): boolean {
  let onlyVarsText = text.trim();
  variables.forEach(({ hash }) => {
    onlyVarsText = onlyVarsText.replace(new RegExp(`{${hash}}`, 'g'), '');
  });
  onlyVarsText = onlyVarsText.replace(/\s+/g, '');
  return onlyVarsText.length === 0;
}

subscriber.subscribe('translation-status');
subscriber.on('message', (channel, message) => {
  if (channel === 'translation-status') {
    const status: TranslationStatus = JSON.parse(message);
    const client = clientMap.get(status.rowId);
    
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(status));
      
      if (status.status === 'completed' || status.status === 'error') {
        clientMap.delete(status.rowId);
      }
    }
  }
});

separatorQueue.process(async (job) => {
  try {
    publisher.publish('translation-status', JSON.stringify({
      type: 'status',
      rowId: job.data.rowId,
      status: 'separating'
    }));

    const response = await axios.post<SeparatorResponse>(
      `${VARIABLE_SEPARATOR_URL}/separate`,
      { text: job.data.text }
    );

    const { processedText, variables } = response.data;

    if (containsOnlyHashedVariables(processedText, variables)) {
      publisher.publish('translation-status', JSON.stringify({
        type: 'status',
        rowId: job.data.rowId,
        status: 'completed',
        text: job.data.text
      }));
      return { skipTranslation: true, text: job.data.text };
    }

    const textWithoutVariables = processedText.replace(/\{[^}]+\}/g, '').trim();
    if (!textWithoutVariables) {
      publisher.publish('translation-status', JSON.stringify({
        type: 'status',
        rowId: job.data.rowId,
        status: 'completed',
        text: job.data.text
      }));
      return { skipTranslation: true, text: job.data.text };
    }

    return { ...response.data, skipTranslation: false };
  } catch (error) {
    publisher.publish('translation-status', JSON.stringify({
      type: 'status',
      rowId: job.data.rowId,
      status: 'error',
      error: 'Separation failed'
    }));
    throw error;
  }
});

translatorQueue.process(async (job) => {
  try {
    publisher.publish('translation-status', JSON.stringify({
      type: 'status',
      rowId: job.data.rowId,
      status: 'translating'
    }));

    const response = await axios.post(
      `${MICROSOFT_TRANSLATOR_SERVICE_URL}/translate`,
      {
        text: job.data.text,
        targetLanguage: job.data.targetLanguage
      }
    );
    return response.data;
  } catch (error) {
    publisher.publish('translation-status', JSON.stringify({
      type: 'status',
      rowId: job.data.rowId,
      status: 'error',
      error: 'Translation failed'
    }));
    throw error;
  }
});

restoreQueue.process(async (job) => {
  try {
    publisher.publish('translation-status', JSON.stringify({
      type: 'status',
      rowId: job.data.rowId,
      status: 'restoring'
    }));

    const response = await axios.post(
      `${VARIABLE_SEPARATOR_URL}/restore`,
      {
        text: job.data.text,
        variables: job.data.variables
      }
    );

    publisher.publish('translation-status', JSON.stringify({
      type: 'status',
      rowId: job.data.rowId,
      status: 'completed',
      text: response.data.text
    }));

    return response.data;
  } catch (error) {
    publisher.publish('translation-status', JSON.stringify({
      type: 'status',
      rowId: job.data.rowId,
      status: 'error',
      error: 'Restoration failed'
    }));
    throw error;
  }
});

const handleTranslation = async (ws: WebSocket, message: TranslationRequest) => {
  try {
    clientMap.set(message.rowId, ws);

    const separatorJob = await separatorQueue.add({
      text: message.text,
      rowId: message.rowId
    });
    const separatorResult = await separatorJob.finished();

    if (separatorResult.skipTranslation) {
      return;
    }

    const translatorJob = await translatorQueue.add({
      text: separatorResult.processedText,
      targetLanguage: message.targetLanguage,
      rowId: message.rowId
    });
    const translatorResult = await translatorJob.finished();

    const restoreJob = await restoreQueue.add({
      text: translatorResult.translatedText,
      variables: separatorResult.variables,
      rowId: message.rowId
    });
    const restoreResult = await restoreJob.finished();

    ws.send(JSON.stringify({
      type: 'translation',
      rowId: message.rowId,
      translatedText: restoreResult.text
    }));

  } catch (error) {
    console.error('Translation error:', error);
    publisher.publish('translation-status', JSON.stringify({
      type: 'status',
      rowId: message.rowId,
      status: 'error',
      error: 'Translation process failed'
    }));
    clientMap.delete(message.rowId);
  }
};

wss.on('connection', (ws) => {
  console.log('Client connected');
  const typedWs = ws as WebSocket & { isAlive?: boolean };
  heartbeat(typedWs);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message);

      if (message.type === 'translate') {
        await handleTranslation(ws, message);
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    for (const [rowId, client] of clientMap.entries()) {
      if (client === ws) {
        clientMap.delete(rowId);
      }
    }
  });
});

wss.on('close', () => {
  clearInterval(interval);
  subscriber.quit();
  publisher.quit();
  redis.quit();
});

[separatorQueue, translatorQueue, restoreQueue].forEach(queue => {
  queue.on('error', (error: any) => {
    console.error(`Queue error in ${queue.name}:`, error);
  });

  queue.on('failed', (job: any, error: any) => {
    console.error(`Job failed in ${queue.name}:`, error);
    publisher.publish('translation-status', JSON.stringify({
      type: 'status',
      rowId: job.data.rowId,
      status: 'error',
      error: `${queue.name} job failed`
    }));
  });
});

console.log('WebSocket server is running on port 3001');
