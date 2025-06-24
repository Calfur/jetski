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
  x: number; // position (0 to 1)
  y: number; // position (0 to 1)
  color: string;
  rotation: number; // radians
  speed: number; // units per second
  
  // Physics properties
  maxSpeed: number; // units per second
  acceleration: number; // units per second^2
  deceleration: number; // units per second^2
  turnSpeed: number; // radians per second

  // Control state
  controls: {
    left: boolean;
    right: boolean;
  };
};

// Color palette for jetskis - 30 colors with good contrast against blue water
const JETSKI_COLORS = [
  '#8B0000', '#006400', '#B8860B', '#8B008B', '#D2691E',
  '#4B0082', '#228B22', '#B22222', '#32CD32', '#DC143C',
  '#8FBC8F', '#CD853F', '#DDA0DD', '#F4A460', '#9370DB',
  '#20B2AA', '#FF6347', '#7B68EE', '#3CB371', '#FF4500',
  '#8A2BE2', '#00CED1', '#FF8C00', '#9932CC', '#2E8B57',
  '#FF1493', '#00FA9A', '#FF69B4', '#00BFFF', '#FFD700'
];

// WebSocket message types
type WebSocketMessage = {
  type: 'join' | 'heartbeat' | 'controls';
  name?: string;
  controls?: {
    leftPressed: boolean;
    rightPressed: boolean;
  };
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
  rotation: number;
  speed: number;
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
      color: p.color,
      rotation: p.rotation,
      speed: p.speed,
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

  function updateGamePhysics(): void {
    const deltaTime = 1 / 60; // 60 FPS physics update
    
    players.forEach((player) => {
      const { controls, turnSpeed, acceleration, deceleration, maxSpeed } = player;
      
      // 1. Handle turning
      if (controls.left && !controls.right) { // left button -> turn right
        player.rotation += turnSpeed * deltaTime;
      } else if (controls.right && !controls.left) { // right button -> turn left
        player.rotation -= turnSpeed * deltaTime;
      }

      // 2. Handle acceleration/deceleration
      if (controls.left || controls.right) { // accelerating
        player.speed = Math.min(player.speed + acceleration * deltaTime, maxSpeed);
      } else { // decelerating
        player.speed = Math.max(player.speed - deceleration * deltaTime, 0);
      }

      // 3. Update position based on new rotation and speed
      // Offset angle by -90 degrees (PI/2 radians) because the jetski SVG faces upwards
      const movementAngle = player.rotation - Math.PI / 2;
      const distance = player.speed * deltaTime;
      player.x += Math.cos(movementAngle) * distance;
      player.y += Math.sin(movementAngle) * distance;
      
      // 4. Keep players within bounds (0 to 1)
      player.x = Math.max(0, Math.min(1, player.x));
      player.y = Math.max(0, Math.min(1, player.y));
    });
    
    broadcastGameState();
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
            color: JETSKI_COLORS[Math.floor(Math.random() * JETSKI_COLORS.length)],
            rotation: Math.random() * 2 * Math.PI,
            speed: 0,
            maxSpeed: 0.2, // a full screen width in 5 seconds
            acceleration: 0.1, // reaches max speed in 2 seconds
            deceleration: 0.05, // stops from max speed in 4 seconds
            turnSpeed: Math.PI / 2, // 180 degrees per second
            controls: { left: false, right: false },
          });
          console.log(`Player joined: ${name}`);
          broadcastPlayerList();
          broadcastGameState();
        } else if (msg.type === 'heartbeat') {
          if (playerId) {
            const p = players.find((p) => p.id === playerId);
            if (p) p.lastActive = Date.now();
          }
        } else if (msg.type === 'controls') {
          if (playerId) {
            const p = players.find((p) => p.id === playerId);
            if (p && msg.controls) {
              p.lastActive = Date.now();
              p.controls.left = msg.controls.leftPressed;
              p.controls.right = msg.controls.rightPressed;
            }
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
        color: p.color,
        rotation: p.rotation,
        speed: p.speed,
      }))
    };
    ws.send(JSON.stringify(initialGameState));
  });

  // Start inactivity cleanup
  setInterval(removeInactivePlayers, 10_000);

  // Start game physics loop
  setInterval(updateGamePhysics, 1000 / 60); // 60 FPS

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server running on ws://${hostname}:${port}/ws`);
  });
}); 