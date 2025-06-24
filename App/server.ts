import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Player type
type Player = {
  id: string;
  name: string;
  lastActive: number;
  x: number;
  y: number;
  color: string;
};

// Color palette for jetskis - 30 colors with good contrast against blue water
const JETSKI_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
  '#F9E79F', '#A9DFBF', '#F5B7B1', '#AED6F1', '#D2B4DE',
  '#FAD7A0', '#ABEBC6', '#F1948A', '#85C1E9', '#D7BDE2',
  '#F9E79F', '#A9DFBF', '#F5B7B1', '#AED6F1', '#D2B4DE'
];

// WebSocket message types
type WebSocketMessage = {
  type: 'join' | 'heartbeat';
  name?: string;
};

type WebSocketResponse = {
  type: 'playerList' | 'error';
  players?: string[];
  error?: string;
};

type PlayerData = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
};

type GameStateResponse = {
  type: 'gameState';
  players: PlayerData[];
};

// Player management
const players: Player[] = [];

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server attached to the HTTP server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws' // Add a specific path for WebSocket connections
  });

  function broadcastPlayerList(): void {
    const names = players.map((p) => p.name);
    const msg: WebSocketResponse = { type: 'playerList', players: names };
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  }

  function broadcastGameState(): void {
    const playerData: PlayerData[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      color: p.color
    }));
    const msg: GameStateResponse = { type: 'gameState', players: playerData };
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  }

  function generateRandomPosition(): { x: number; y: number } {
    // Generate position within the 16:9 game area
    // Using a conservative range to keep jetskis away from edges
    const margin = 0.1; // 10% margin from edges
    const x = margin + Math.random() * (1 - 2 * margin);
    const y = margin + Math.random() * (1 - 2 * margin);
    return { x, y };
  }

  function removeInactivePlayers(): void {
    const now = Date.now();
    let changed = false;
    for (let i = players.length - 1; i >= 0; i--) {
      if (now - players[i].lastActive > 60_000) {
        players.splice(i, 1);
        changed = true;
      }
    }
    if (changed) {
      broadcastPlayerList();
      broadcastGameState();
    }
  }

  // Set up WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    let playerId: string | null = null;

    ws.on('message', (data: Buffer | string) => {
      try {
        const msg: WebSocketMessage = JSON.parse(data.toString());
        if (msg.type === 'join') {
          const { name } = msg;
          if (
            typeof name !== 'string' ||
            !name.trim() ||
            players.some((p) => p.name.toLowerCase() === name.toLowerCase())
          ) {
            const errorResponse: WebSocketResponse = { 
              type: 'error', 
              error: 'Name taken or invalid' 
            };
            ws.send(JSON.stringify(errorResponse));
            return;
          }
          playerId = uuidv4();
          const position = generateRandomPosition();
          players.push({ 
            id: playerId, 
            name, 
            lastActive: Date.now(), 
            x: position.x, 
            y: position.y, 
            color: JETSKI_COLORS[Math.floor(Math.random() * JETSKI_COLORS.length)] 
          });
          console.log(`Player joined: ${name}`);
          broadcastPlayerList();
          broadcastGameState();
        } else if (msg.type === 'heartbeat') {
          if (playerId) {
            const p = players.find((p) => p.id === playerId);
            if (p) p.lastActive = Date.now();
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
        const errorResponse: WebSocketResponse = { 
          type: 'error', 
          error: 'Invalid message' 
        };
        ws.send(JSON.stringify(errorResponse));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      if (typeof playerId === 'string') {
        const idx = players.findIndex((p) => p.id === playerId);
        if (idx !== -1) {
          const playerName = players[idx].name;
          players.splice(idx, 1);
          console.log(`Player left: ${playerName}`);
          broadcastPlayerList();
          broadcastGameState();
        }
      }
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });

    // Send initial player list
    const initialResponse: WebSocketResponse = { 
      type: 'playerList', 
      players: players.map((p) => p.name) 
    };
    ws.send(JSON.stringify(initialResponse));
    
    // Send initial game state
    const initialGameState: GameStateResponse = {
      type: 'gameState',
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        color: p.color
      }))
    };
    ws.send(JSON.stringify(initialGameState));
  });

  // Start inactivity cleanup
  setInterval(removeInactivePlayers, 10_000);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server running on ws://${hostname}:${port}/ws`);
  });
}); 