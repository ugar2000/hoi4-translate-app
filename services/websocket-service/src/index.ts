import WebSocket from 'ws';
import Queue from 'bull';
import Redis from 'ioredis';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface TranslationRequest {
  type: 'translate';
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  rowId: string;
}

interface TranslationStatus {
  type: 'status';
  rowId: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
}

interface TranslationResult {
  type: 'translation';
  rowId: string;
  translatedText: string;
}

interface TranslationJob {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  rowId: string;
}

interface SeparatorResponse {
  processedText: string;
  variables: Array<{ hash: string; value: string; }>;
}

const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 35000;

const TRANSLATION_SERVICE_URL = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3002';
const VARIABLE_SEPARATOR_URL = process.env.VARIABLE_SEPARATOR_URL || 'http://localhost:3003';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const wss = new WebSocket.Server({ 
  port: 3001,
  perMessageDeflate: false,
  clientTracking: true,
  handleProtocols: () => 'translator-protocol'
});

const translationQueue = new Queue<TranslationJob>('translation', process.env.REDIS_URL ?? 'redis://localhost:6379');
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const activeJobs = new Map<string, string>();
const clientHeartbeats = new Map<WebSocket, number>();

console.log('Starting WebSocket server on port 3001...');

function heartbeat(ws: WebSocket) {
  clientHeartbeats.set(ws, Date.now());
}

function noop() {}

setInterval(() => {
  const now = Date.now();
  wss.clients.forEach((ws) => {
    const lastHeartbeat = clientHeartbeats.get(ws);
    if (lastHeartbeat && now - lastHeartbeat > CLIENT_TIMEOUT) {
      console.log('Client timed out, terminating connection');
      clientHeartbeats.delete(ws);
      return ws.terminate();
    }
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping(noop);
    }
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

const handleTranslation = async (ws: WebSocket, message: TranslationRequest) => {
  try {
    const separatorResponse = await axios.post<SeparatorResponse>(`${VARIABLE_SEPARATOR_URL}/separate`, {
      text: message.text
    });

    const { processedText, variables } = separatorResponse.data;
    console.log('Separated text:', processedText);
    console.log('Variables:', variables);

    if (containsOnlyHashedVariables(processedText, variables)) {
      console.log('Text contains only variables, skipping translation');
      ws.send(JSON.stringify({
        type: 'translation',
        rowId: message.rowId,
        translatedText: message.text
      }));
      return;
    }

    const translationResponse = await axios.post(`${TRANSLATION_SERVICE_URL}/translate`, {
      text: processedText,
      targetLanguage: message.targetLanguage
    });

    const translatedText = translationResponse.data.translatedText;
    console.log('Translated text:', translatedText);

    const restoredResponse = await axios.post(`${VARIABLE_SEPARATOR_URL}/restore`, {
      text: translatedText,
      variables
    });

    const finalText = restoredResponse.data.text;
    console.log('Restored text:', finalText);

    ws.send(JSON.stringify({
      type: 'translation',
      rowId: message.rowId,
      translatedText: finalText
    }));

  } catch (error) {
    console.error('Translation error:', error);
    ws.send(JSON.stringify({
      type: 'status',
      rowId: message.rowId,
      status: 'error',
      error: 'Translation failed'
    }));
  }
};

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected. Total clients:', wss.clients.size);
  heartbeat(ws);

  ws.on('pong', () => {
    heartbeat(ws);
  });

  ws.on('message', async (message: string) => {
    try {
      console.log('Received raw message:', message);
      const data = JSON.parse(message);
      console.log('Parsed message:', data);

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (data.type !== 'translate') {
        console.warn('Invalid message type:', data.type);
        return;
      }

      console.log('Processing translation request for:', data.rowId);

      const job = await translationQueue.add({
        text: data.text,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
        rowId: data.rowId,
      });

      activeJobs.set(data.rowId, job.id.toString());
      console.log('Created job:', job.id, 'for rowId:', data.rowId);

      ws.send(JSON.stringify({
        type: 'status',
        rowId: data.rowId,
        status: 'queued'
      } as TranslationStatus));

      const jobEvents = await translationQueue.getJob(job.id);
      if (jobEvents) {
        jobEvents.progress().then((progress: number) => {
          if (progress > 0 && ws.readyState === WebSocket.OPEN) {
            console.log('Job progress:', progress, 'for rowId:', data.rowId);
            ws.send(JSON.stringify({
              type: 'status',
              rowId: data.rowId,
              status: 'processing'
            } as TranslationStatus));
          }
        });

        jobEvents.finished().then((result: TranslationResult) => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log('Job completed for rowId:', data.rowId);
            ws.send(JSON.stringify({
              type: 'status',
              rowId: data.rowId,
              status: 'completed'
            } as TranslationStatus));

            ws.send(JSON.stringify(result));
          }
          activeJobs.delete(data.rowId);
        }).catch((error) => {
          if (ws.readyState === WebSocket.OPEN) {
            console.error('Job error for rowId:', data.rowId, error);
            ws.send(JSON.stringify({
              type: 'status',
              rowId: data.rowId,
              status: 'error'
            } as TranslationStatus));
          }
          activeJobs.delete(data.rowId);
        });
      }

      ws.send(JSON.stringify({
        type: 'status',
        rowId: data.rowId,
        status: 'processing'
      }));

      await handleTranslation(ws, data);
    } catch (error) {
      console.error('Message processing error:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('Client WebSocket error:', error);
    clientHeartbeats.delete(ws);
  });

  ws.on('close', () => {
    console.log('Client disconnected. Remaining clients:', wss.clients.size);
    clientHeartbeats.delete(ws);
  });
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

wss.on('listening', () => {
  console.log('WebSocket server is listening on port 3001');
});

process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

redis.subscribe('translations', (err) => {
  if (err) {
    console.error('Failed to subscribe:', err);
    return;
  }
  console.log('Subscribed to translations channel');
});

redis.on('message', (channel, message) => {
  if (channel === 'translations') {
    try {
      const result = JSON.parse(message) as TranslationResult;
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(result));
        }
      });
    } catch (error) {
      console.error('Error processing Redis message:', error);
    }
  }
});
