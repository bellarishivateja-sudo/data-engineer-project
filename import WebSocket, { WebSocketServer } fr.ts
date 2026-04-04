import WebSocket, { WebSocketServer } from 'ws';
import Redis from 'ioredis';

// 1. Initialize WebSocket Server for dashboard clients
const wss = new WebSocketServer({ port: 8080 });

// 2. Initialize Redis subscriber to listen to the ETL pipeline output
const redisSubscriber = new Redis('redis://localhost:6379');
const LIVE_STATS_CHANNEL = 'game:live_stats';

wss.on('connection', (ws: WebSocket) => {
    console.log('New dashboard client connected.');
    
    // Send an initial connection success message
    ws.send(JSON.stringify({ 
        type: 'SYSTEM', 
        message: 'Connected to Live Gaming Analytics Feed' 
    }));

    ws.on('close', () => {
        console.log('Dashboard client disconnected.');
    });
});

// 3. Subscribe to the Redis channel where the ETL pipeline publishes data
redisSubscriber.subscribe(LIVE_STATS_CHANNEL, (err, count) => {
    if (err) {
        console.error('Failed to subscribe to Redis channel:', err);
        return;
    }
    console.log(`Subscribed to ${count} channel(s). Waiting for ETL data...`);
});

// 4. Broadcast incoming Redis messages to all connected WebSockets
redisSubscriber.on('message', (channel, message) => {
    if (channel === LIVE_STATS_CHANNEL) {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
});

console.log('WebSocket server running on ws://localhost:8080');
