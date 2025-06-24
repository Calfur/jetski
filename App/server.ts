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
  
  // Velocity components
  velocityX: number;
  velocityY: number;
  rotationalVelocity: number; // radians per second

  // Physics properties
  maxSpeed: number; // units per second
  acceleration: number; // units per second^2
  deceleration: number; // constant deceleration
  dragFactor: number; // speed-dependent deceleration
  maxTurnSpeed: number; // radians per second
  rotationalAcceleration: number; // radians per second^2
  driftFactor: number; // 0-1, how much velocity follows rotation. 1 = no drift.

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

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  function updateGamePhysics(): void {
    const deltaTime = 1 / 60; // 60 FPS physics update
    
    players.forEach((player) => {
      const { controls, rotationalAcceleration, maxTurnSpeed, acceleration, deceleration, maxSpeed, driftFactor } = player;
      
      // 1. Handle rotational acceleration
      if (controls.left && !controls.right) { // Accelerate turning right
        player.rotationalVelocity = Math.min(player.rotationalVelocity + rotationalAcceleration * deltaTime, maxTurnSpeed);
      } else if (controls.right && !controls.left) { // Accelerate turning left
        player.rotationalVelocity = Math.max(player.rotationalVelocity - rotationalAcceleration * deltaTime, -maxTurnSpeed);
      } else { // Decelerate rotation to zero
        if (player.rotationalVelocity > 0) {
          player.rotationalVelocity = Math.max(player.rotationalVelocity - rotationalAcceleration * deltaTime, 0);
        } else if (player.rotationalVelocity < 0) {
          player.rotationalVelocity = Math.min(player.rotationalVelocity + rotationalAcceleration * deltaTime, 0);
        }
      }

      // 2. Update rotation based on rotational velocity
      player.rotation += player.rotationalVelocity * deltaTime;

      // 3. Handle linear acceleration/deceleration
      if (controls.left || controls.right) { // accelerating
        player.speed = Math.min(player.speed + acceleration * deltaTime, maxSpeed);
      } else { // decelerating with drag
        const currentDeceleration = deceleration + (player.speed * player.dragFactor);
        player.speed = Math.max(player.speed - currentDeceleration * deltaTime, 0);
      }

      // 4. Calculate target velocity based on rotation and speed
      const movementAngle = player.rotation - Math.PI / 2; // Adjust for upward-facing SVG
      const targetVelocityX = Math.cos(movementAngle) * player.speed;
      const targetVelocityY = Math.sin(movementAngle) * player.speed;

      // 5. Smoothly interpolate current velocity towards target (the drift)
      const lerpFactor = 1 - Math.pow(1 - driftFactor, deltaTime * 60); // Frame-rate independent lerp
      player.velocityX = lerp(player.velocityX, targetVelocityX, lerpFactor);
      player.velocityY = lerp(player.velocityY, targetVelocityY, lerpFactor);

      // 6. Update position based on the new drifting velocity
      player.x += player.velocityX * deltaTime;
      player.y += player.velocityY * deltaTime;
      
      // 7. Keep players within bounds (0 to 1)
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
            velocityX: 0,
            velocityY: 0,
            rotationalVelocity: 0,
            maxSpeed: 0.1, // a full screen width in 10 seconds
            acceleration: 0.5, // reaches max speed in 2 seconds
            deceleration: 0.06, // constant deceleration
            dragFactor: 0.2, // slows down faster at high speed
            maxTurnSpeed: Math.PI / 3, // 60 deg/s
            rotationalAcceleration: Math.PI / 1.5, // 0.5s to reach max turn speed
            driftFactor: 0.2, // Lower means more drift
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