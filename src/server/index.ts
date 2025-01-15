import TranslatorWebSocketServer from './websocket';

const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8080;
const wsServer = new TranslatorWebSocketServer(WS_PORT);
