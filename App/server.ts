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

// Explosion type
type ExplosionData = {
  id: string;
  x: number;
  y: number;
  timestamp: number;
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
  explosions: ExplosionData[];
};

type ScoreboardResponse = {
  type: 'scoreboard';
  highScores: HighScore[];
};

// Player management
const players: Player[] = [];
const collectibles: Collectible[] = [];
const explosions: ExplosionData[] = [];
const highScores: HighScore[] = [];
const playerConnections = new Map<string, WebSocket>(); // Track connections by player name
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
    const msg: GameStateResponse = { 
      type: 'gameState', 
      players: playerData, 
      collectibles: collectibleData,
      explosions: explosions
    };
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
    
    // Find existing ACTIVE entry for this player (only update active entries)
    const existingActiveIndex = highScores.findIndex(hs => 
      hs.name.toLowerCase() === playerName.toLowerCase() && hs.isActive
    );
    
    if (existingActiveIndex !== -1) {
      // Update existing active entry
      highScores[existingActiveIndex].score = score;
      if (!isActive) {
        highScores[existingActiveIndex].isActive = false;
        highScores[existingActiveIndex].timestamp = Date.now();
      }
    } else {
      // Add new score entry (either active or inactive)
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

  function checkPlayerCollisions(): void {
    const collisionDistance = 0.015; // 1.5% of screen size for player collision detection (reduced from 3%)
    
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const player1 = players[i];
        const player2 = players[j];
        
        const distance = Math.sqrt(
          Math.pow(player1.x - player2.x, 2) + 
          Math.pow(player1.y - player2.y, 2)
        );
        
        if (distance < collisionDistance) {
          // Create explosion at collision point
          const explosionX = (player1.x + player2.x) / 2;
          const explosionY = (player1.y + player2.y) / 2;
          const explosionId = uuidv4();
          
          explosions.push({
            id: explosionId,
            x: explosionX,
            y: explosionY,
            timestamp: Date.now()
          });
          
          // Remove explosion after 2 seconds
          setTimeout(() => {
            const index = explosions.findIndex(e => e.id === explosionId);
            if (index !== -1) {
              explosions.splice(index, 1);
              broadcastGameState();
            }
          }, 2000);
          
          // Update high scores for both players before removing them
          if (player1.score > 0) {
            updateHighScores(player1.name, player1.score, false);
          }
          if (player2.score > 0) {
            updateHighScores(player2.name, player2.score, false);
          }
          
          // Send collision notification to both players
          const collisionData = {
            player1: player1.name,
            player2: player2.name,
            player1Score: player1.score,
            player2Score: player2.score
          };
          
          const collisionMessage = {
            type: 'collision',
            collisionData
          };
          
          // Send to player1
          const player1Ws = playerConnections.get(player1.name);
          if (player1Ws && player1Ws.readyState === WebSocket.OPEN) {
            player1Ws.send(JSON.stringify(collisionMessage));
          }
          
          // Send to player2
          const player2Ws = playerConnections.get(player2.name);
          if (player2Ws && player2Ws.readyState === WebSocket.OPEN) {
            player2Ws.send(JSON.stringify(collisionMessage));
          }
          
          // Remove both players from the game
          players.splice(j, 1); // Remove player2 first (higher index)
          players.splice(i, 1); // Then remove player1
          
          // Remove from connections map
          playerConnections.delete(player1.name);
          playerConnections.delete(player2.name);
          
          console.log(`Players ${player1.name} and ${player2.name} collided and exploded!`);
          
          broadcastGameState();
          broadcastScoreboard();
          return; // Exit the function since we modified the array
        }
      }
    }
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
    
    // Check for player collisions
    checkPlayerCollisions();
    
    broadcastGameState();
  }

  // Set up WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    let playerId: string | null = null;
    let playerName: string | null = null;

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
          playerName = name;
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
          
          // Track the connection by player name
          playerConnections.set(name, ws);
          
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
          
          // Remove from connections map
          if (playerName) {
            playerConnections.delete(playerName);
          }
          
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
      })),
      explosions: explosions
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