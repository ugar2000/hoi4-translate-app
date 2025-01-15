import { WebSocket, WebSocketServer } from 'ws';

interface TextRow {
    code: string;
    text: string;
    translatedText?: string;
}

class TranslatorWebSocketServer {
    private wss: WebSocketServer;
    private clients: Set<WebSocket>;

    constructor(port: number = 8080) {
        this.wss = new WebSocketServer({ port });
        this.clients = new Set();
        this.initialize();
    }

    private initialize() {
        this.wss.on('connection', (ws: WebSocket) => {
            console.log('New client connected');
            this.clients.add(ws);

            ws.on('message', (message: string) => {
                try {
                    const data: TextRow[] = JSON.parse(message.toString());
                    this.handleIncomingData(data);
                } catch (error) {
                    console.error('Error processing message:', error);
                    ws.send(JSON.stringify({ error: 'Invalid message format' }));
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });

        console.log(`WebSocket server is running on port ${this.wss.options.port}`);
    }

    private handleIncomingData(rows: TextRow[]) {
        console.log('Received rows:', rows);
        // Here you can implement your logic for processing the received rows
        // For example, sending them for translation, storing in a database, etc.
    }

    public broadcast(message: any) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }
}

export default TranslatorWebSocketServer;
