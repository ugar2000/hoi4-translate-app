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

const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 35000;

const TRANSLATION_SERVICE_URL = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3002';
const VARIABLE_SEPARATOR_URL = process.env.VARIABLE_SEPARATOR_URL || 'http://localhost:3003';
const DEEPL_SERVICE_URL = process.env.DEEPL_SERVICE_URL || 'http://localhost:3004';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const wss = new WebSocket.Server({ 
  port: 3001,
  perMessageDeflate: false,
});

function heartbeat(ws: WebSocket) {
  const client = ws as WebSocket & { isAlive: boolean };
  client.isAlive = true;
}

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const client = ws as WebSocket & { isAlive: boolean };
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

    const deeplResponse = await axios.post(`${DEEPL_SERVICE_URL}/translate`, {
      text: processedText,
      targetLanguage: message.targetLanguage
    });

    const deeplTranslatedText = deeplResponse.data.translatedText;
    console.log('DeepL translation:', deeplTranslatedText);

    const restoredResponse = await axios.post(`${VARIABLE_SEPARATOR_URL}/restore`, {
      text: deeplTranslatedText,
      variables
    });

    const restoredText = restoredResponse.data.text;
    console.log('Restored text:', restoredText);

    // const openaiResponse = await axios.post(`${TRANSLATION_SERVICE_URL}/translate`, {
    //   text: restoredText,
    //   targetLanguage: message.targetLanguage,
    //   mode: 'post-process',
    //   context: 'This is a game translation. Review and improve the translation while keeping the meaning and style consistent with gaming terminology. Preserve all special characters and formatting.'
    // });

    // const finalText = openaiResponse.data.translatedText;
    // console.log('Final text after OpenAI post-processing:', finalText);

    ws.send(JSON.stringify({
      type: 'translation',
      rowId: message.rowId,
      translatedText: restoredText
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

wss.on('connection', (ws) => {
  console.log('Client connected');
  heartbeat(ws);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message);

      if (message.type === 'translate') {
        ws.send(JSON.stringify({
          type: 'status',
          rowId: message.rowId,
          status: 'processing'
        }));

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
  });
});

wss.on('close', () => {
  clearInterval(interval);
});

console.log('WebSocket server is running on port 3001');
