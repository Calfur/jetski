import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Player type
type Player = {
  id: string;
  name: string;
  lastActive: number;
};

const players: Player[] = [];
const wss = new WebSocketServer({ port: 3001 });

function broadcastPlayerList() {
  const names = players.map((p) => p.name);
  const msg = JSON.stringify({ type: 'playerList', players: names });
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function removeInactivePlayers() {
  const now = Date.now();
  let changed = false;
  for (let i = players.length - 1; i >= 0; i--) {
    if (now - players[i].lastActive > 60_000) {
      players.splice(i, 1);
      changed = true;
    }
  }
  if (changed) broadcastPlayerList();
}

setInterval(removeInactivePlayers, 10_000);

wss.on('connection', (ws: WebSocket) => {
  let playerId: string | null = null;

  ws.on('message', (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'join') {
        const { name } = msg;
        if (
          typeof name !== 'string' ||
          !name.trim() ||
          players.some((p) => p.name.toLowerCase() === name.toLowerCase())
        ) {
          ws.send(JSON.stringify({ type: 'error', error: 'Name taken or invalid' }));
          return;
        }
        playerId = uuidv4();
        players.push({ id: playerId, name, lastActive: Date.now() });
        broadcastPlayerList();
      } else if (msg.type === 'heartbeat') {
        if (playerId) {
          const p = players.find((p) => p.id === playerId);
          if (p) p.lastActive = Date.now();
        }
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    // Only remove if playerId is set
    if (typeof playerId === 'string') {
      const idx = players.findIndex((p) => p.id === playerId);
      if (idx !== -1) {
        players.splice(idx, 1);
        broadcastPlayerList();
      }
    }
  });

  // Send initial player list
  ws.send(JSON.stringify({ type: 'playerList', players: players.map((p) => p.name) }));
});

console.log('WebSocket server running on ws://localhost:3001'); 