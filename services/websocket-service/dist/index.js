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
const ws_1 = __importDefault(require("ws"));
const bull_1 = __importDefault(require("bull"));
const ioredis_1 = __importDefault(require("ioredis"));
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 35000;
const TRANSLATION_SERVICE_URL = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3002';
const VARIABLE_SEPARATOR_URL = process.env.VARIABLE_SEPARATOR_URL || 'http://localhost:3003';
const MICROSOFT_TRANSLATOR_SERVICE_URL = process.env.MICROSOFT_TRANSLATOR_SERVICE_URL || 'http://localhost:3004';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new ioredis_1.default(REDIS_URL);
const subscriber = new ioredis_1.default(REDIS_URL);
const publisher = new ioredis_1.default(REDIS_URL);
const separatorQueue = new bull_1.default('separator', REDIS_URL);
const translatorQueue = new bull_1.default('translator', REDIS_URL);
const restoreQueue = new bull_1.default('restore', REDIS_URL);
const clientMap = new Map();
const wss = new ws_1.default.Server({
    port: 3001,
    perMessageDeflate: false
});
function heartbeat(ws) {
    ws.isAlive = true;
}
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        const client = ws;
        if (client.isAlive === false) {
            console.log('Client timed out, terminating connection');
            return ws.terminate();
        }
        client.isAlive = false;
        client.ping();
    });
}, HEARTBEAT_INTERVAL);
function containsOnlyHashedVariables(text, variables) {
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
        const status = JSON.parse(message);
        const client = clientMap.get(status.rowId);
        if (client && client.readyState === ws_1.default.OPEN) {
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
        const response = await axios_1.default.post(`${VARIABLE_SEPARATOR_URL}/separate`, { text: job.data.text });
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
    }
    catch (error) {
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
        const response = await axios_1.default.post(`${MICROSOFT_TRANSLATOR_SERVICE_URL}/translate`, {
            text: job.data.text,
            targetLanguage: job.data.targetLanguage
        });
        return response.data;
    }
    catch (error) {
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
        const response = await axios_1.default.post(`${VARIABLE_SEPARATOR_URL}/restore`, {
            text: job.data.text,
            variables: job.data.variables
        });
        publisher.publish('translation-status', JSON.stringify({
            type: 'status',
            rowId: job.data.rowId,
            status: 'completed',
            text: response.data.text
        }));
        return response.data;
    }
    catch (error) {
        publisher.publish('translation-status', JSON.stringify({
            type: 'status',
            rowId: job.data.rowId,
            status: 'error',
            error: 'Restoration failed'
        }));
        throw error;
    }
});
const handleTranslation = async (ws, message) => {
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
    }
    catch (error) {
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
    const typedWs = ws;
    heartbeat(typedWs);
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('Received message:', message);
            if (message.type === 'translate') {
                await handleTranslation(ws, message);
            }
            else if (message.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        }
        catch (error) {
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
    queue.on('error', (error) => {
        console.error(`Queue error in ${queue.name}:`, error);
    });
    queue.on('failed', (job, error) => {
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
