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

// Color palette for jetskis - 30 colors with good contrast against blue water
const JETSKI_COLORS = [
  '#8B0000', '#006400', '#B8860B', '#8B008B', '#D2691E',
  '#4B0082', '#228B22', '#B22222', '#32CD32', '#DC143C',
  '#8FBC8F', '#CD853F', '#DDA0DD', '#F4A460', '#9370DB',
  '#20B2AA', '#FF6347', '#7B68EE', '#3CB371', '#FF4500',
  '#8A2BE2', '#00CED1', '#FF8C00', '#9932CC', '#2E8B57',
  '#FF1493', '#00FA9A', '#FF69B4', '#00BFFF', '#FFD700'
];

// Physics constants
const PHYSICS = {
  maxSpeed: 0.1, // a full screen width in 10 seconds
  acceleration: 0.1, // reaches max speed in 2 seconds
  deceleration: 0.06, // constant deceleration
  dragFactor: 0.4, // slows down faster at high speed
  maxTurnSpeed: Math.PI / 2.5,
  driftFactor: 0.05, // Lower means more drift
  aspectRatio: 16 / 9, // 16:9 aspect ratio for coordinate scaling
} as const;

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
  score: number; // number of ducks collected
  
  // Velocity components
  velocityX: number;
  velocityY: number;

  // Control state
  controls: {
    left: boolean;
    right: boolean;
  };
};

// High score entry type
type HighScore = {
  name: string;
  score: number;
  timestamp: number; // when the score was achieved
  isActive: boolean; // whether this is an ongoing run
};

// Collectible type
type Collectible = {
  id: string;
  x: number; // position (0 to 1)
  y: number; // position (0 to 1)
  rotation: number; // radians
};

// WebSocket message types
type WebSocketMessage = {
  type: 'join' | 'heartbeat' | 'controls' | 'reset';
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
  score: number;
};

type CollectibleData = {
  id: string;
  x: number;
  y: number;
  rotation: number;
};

type GameStateResponse = {
  type: 'gameState';
  players: PlayerData[];
  collectibles: CollectibleData[];
};

type ScoreboardResponse = {
  type: 'scoreboard';
  highScores: HighScore[];
};

// Player management
const players: Player[] = [];
const collectibles: Collectible[] = [];
const highScores: HighScore[] = [];
const MAX_COLLECTIBLES = 5;
const MAX_HIGH_SCORES = 5;

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
      score: p.score,
    }));
    const collectibleData: CollectibleData[] = collectibles.map((c) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      rotation: c.rotation,
    }));
    const msg: GameStateResponse = { type: 'gameState', players: playerData, collectibles: collectibleData };
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  }

  function broadcastScoreboard(): void {
    const msg: ScoreboardResponse = { type: 'scoreboard', highScores };
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

  function spawnCollectible(): void {
    if (collectibles.length >= MAX_COLLECTIBLES) return;
    
    const position = generateRandomPosition();
    const collectible: Collectible = {
      id: uuidv4(),
      x: position.x,
      y: position.y,
      rotation: Math.random() * 2 * Math.PI,
    };
    collectibles.push(collectible);
    broadcastGameState();
  }

  function updateHighScores(playerName: string, score: number, isActive: boolean = false): void {
    // Only include players with a minimum score of 1
    if (score < 1) {
      // Remove player from high scores if they have 0 score
      const existingIndex = highScores.findIndex(hs => hs.name.toLowerCase() === playerName.toLowerCase());
      if (existingIndex !== -1) {
        highScores.splice(existingIndex, 1);
        broadcastScoreboard();
      }
      return;
    }
    
    // Find existing entry for this player
    const existingIndex = highScores.findIndex(hs => hs.name.toLowerCase() === playerName.toLowerCase());
    
    if (existingIndex !== -1) {
      // Update existing entry
      highScores[existingIndex].score = score;
      highScores[existingIndex].isActive = isActive;
      if (!isActive) {
        highScores[existingIndex].timestamp = Date.now();
      }
    } else {
      // Add new score entry
      const newScore: HighScore = {
        name: playerName,
        score: score,
        timestamp: isActive ? 0 : Date.now(),
        isActive: isActive
      };
      highScores.push(newScore);
    }
    
    // Sort by score (highest first), then by timestamp (earliest first for ties)
    highScores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // For active players, prioritize them in case of ties
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return a.timestamp - b.timestamp;
    });
    
    // Keep only top 5 scores
    if (highScores.length > MAX_HIGH_SCORES) {
      highScores.splice(MAX_HIGH_SCORES);
    }
    
    broadcastScoreboard();
  }

  function updateActivePlayerScore(playerName: string, score: number): void {
    updateHighScores(playerName, score, true);
  }

  function checkCollectibleCollisions(): void {
    const collisionDistance = 0.02; // 2% of screen size for collision detection
    
    for (let i = players.length - 1; i >= 0; i--) {
      const player = players[i];
      
      for (let j = collectibles.length - 1; j >= 0; j--) {
        const collectible = collectibles[j];
        
        const distance = Math.sqrt(
          Math.pow(player.x - collectible.x, 2) + 
          Math.pow(player.y - collectible.y, 2)
        );
        
        if (distance < collisionDistance) {
          // Player collected the item
          collectibles.splice(j, 1);
          player.score += 1; // Increment player's score
          console.log(`Player ${player.name} collected item ${collectible.id}. Score: ${player.score}`);
          
          // Update high scores in real-time for active players
          updateActivePlayerScore(player.name, player.score);
          
          broadcastGameState();
          break; // Only collect one item per frame
        }
      }
    }
  }

  function removeInactivePlayers(): void {
    const now = Date.now();
    let changed = false;
    for (let i = players.length - 1; i >= 0; i--) {
      if (now - players[i].lastActive > 60_000) {
        const player = players[i];
        // Update high scores when player becomes inactive (mark as inactive)
        if (player.score > 0) {
          updateHighScores(player.name, player.score, false);
        }
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
      const { controls } = player;
      
      // 1. Handle rotational acceleration
      if (controls.left && !controls.right) { // Accelerate turning left
        player.rotation -= PHYSICS.maxTurnSpeed * deltaTime;
      } else if (controls.right && !controls.left) { // Accelerate turning right
        player.rotation += PHYSICS.maxTurnSpeed * deltaTime;
      }

      // 2. Handle linear acceleration/deceleration
      if (controls.left || controls.right) { // accelerating
        player.speed = Math.min(player.speed + PHYSICS.acceleration * deltaTime, PHYSICS.maxSpeed);
      } else { // decelerating with drag
        const currentDeceleration = PHYSICS.deceleration + (player.speed * PHYSICS.dragFactor);
        player.speed = Math.max(player.speed - currentDeceleration * deltaTime, 0);
      }

      // 3. Calculate target velocity based on rotation and speed
      const movementAngle = player.rotation - Math.PI / 2; // Adjust for upward-facing SVG
      const targetVelocityX = Math.cos(movementAngle) * player.speed;
      const targetVelocityY = Math.sin(movementAngle) * player.speed * PHYSICS.aspectRatio; // Scale Y velocity for 16:9 aspect ratio

      // 4. Smoothly interpolate current velocity towards target (the drift)
      // driftFactor of 0.01 means very slow drift, 0.1 means moderate drift, 0.5 means fast drift
      const lerpFactor = PHYSICS.driftFactor * deltaTime * 60; // Simplified calculation
      player.velocityX = lerp(player.velocityX, targetVelocityX, lerpFactor);
      player.velocityY = lerp(player.velocityY, targetVelocityY, lerpFactor);

      // 5. Update position based on the new drifting velocity
      player.x += player.velocityX * deltaTime;
      player.y += player.velocityY * deltaTime;
      
      // 6. Keep players within bounds (0 to 1)
      player.x = Math.max(0, Math.min(1, player.x));
      player.y = Math.max(0, Math.min(1, player.y));
    });
    
    // Check for collectible collisions
    checkCollectibleCollisions();
    
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
          const newPlayer = { 
            id: playerId, 
            name, 
            lastActive: Date.now(), 
            x: position.x, 
            y: position.y, 
            color: JETSKI_COLORS[Math.floor(Math.random() * JETSKI_COLORS.length)],
            rotation: Math.random() * 2 * Math.PI,
            speed: 0,
            score: 0, // Initialize score to 0
            velocityX: 0,
            velocityY: 0,
            controls: { left: false, right: false },
          };
          players.push(newPlayer);
          
          // Don't add player to high scores until they have at least 1 point
          // updateActivePlayerScore(name, 0);
          
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
        } else if (msg.type === 'reset') {
          // Reset high scores
          highScores.splice(0, highScores.length);
          
          // Reset all player scores to 0
          players.forEach(player => {
            player.score = 0;
          });
          
          // Clear all collectibles
          collectibles.splice(0, collectibles.length);
          
          // Broadcast updated state
          broadcastScoreboard();
          broadcastGameState();
          
          console.log('Scoreboard and player scores reset by admin');
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
          const player = players[idx];
          // Update high scores when player disconnects (mark as inactive)
          if (player.score > 0) {
            updateHighScores(player.name, player.score, false);
          }
          players.splice(idx, 1);
          console.log(`Player left: ${player.name}`);
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
        score: p.score,
      })),
      collectibles: collectibles.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
      }))
    };
    ws.send(JSON.stringify(initialGameState));
    
    // Send initial scoreboard
    const initialScoreboard: ScoreboardResponse = {
      type: 'scoreboard',
      highScores: highScores
    };
    ws.send(JSON.stringify(initialScoreboard));
  });

  // Start inactivity cleanup
  setInterval(removeInactivePlayers, 10_000);

  // Start game physics loop
  setInterval(updateGamePhysics, 1000 / 60); // 60 FPS

  // Start collectible spawn loop
  setInterval(spawnCollectible, 1000); // Spawn 1 collectible per second

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server running on ws://${hostname}:${port}/ws`);
  });
}); 