"use client";
import { useEffect, useRef, useState } from "react";

type WebSocketMessage = {
  type: 'playerList' | 'error' | 'gameState';
  players?: string[] | PlayerData[];
  error?: string;
};

type PlayerData = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
};

function WaterGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<import("phaser").Game | null>(null);
  const sceneRef = useRef<import("phaser").Scene | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [playerData, setPlayerData] = useState<PlayerData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Calculate the largest 16:9 size that fits in the viewport
  function getMax16by9Size() {
    if (typeof window === 'undefined') return { width: 1280, height: 720 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let width = vw;
    let height = (vw * 9) / 16;
    if (height > vh) {
      height = vh;
      width = (vh * 16) / 9;
    }
    return { width, height };
  }

  useEffect(() => {
    // Connect to WebSocket server - use dynamic URL for production
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === 'playerList' && message.players) {
          setPlayers(message.players as string[]);
        } else if (message.type === 'gameState' && message.players) {
          setPlayerData(message.players as PlayerData[]);
        }
      } catch {
        console.error('Invalid message from server');
      }
    };

    ws.onerror = () => {
      console.error('WebSocket connection error');
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    let gameInstance: import("phaser").Game | null = null;
    let isMounted = true;
    let resizeHandler: (() => void) | null = null;
    (async () => {
      const phaser = await import("phaser");
      if (!gameRef.current || phaserGameRef.current || !isMounted) return;
      const { Game, AUTO, Scale } = phaser;
      const { width, height } = getMax16by9Size();
      
      // Create a custom scene class
      class GameScene extends phaser.Scene {
        private jetskis: Map<string, { rectangle: any; text: any }> = new Map();
        
        constructor() {
          super({ key: 'GameScene' });
        }
        
        create() {
          // Store scene reference for updates
          sceneRef.current = this;
          
          // Initial jetski rendering will be handled by the useEffect that watches playerData
        }
        
        updateJetskis(players: PlayerData[]) {
          // Clear existing jetskis
          this.jetskis.forEach(({ rectangle, text }) => {
            rectangle.destroy();
            text.destroy();
          });
          this.jetskis.clear();
          
          // Create new jetskis
          players.forEach(player => {
            this.createJetski(player);
          });
        }
        
        createJetski(player: PlayerData) {
          const { width, height } = this.scale;
          const jetskiWidth = width / 40; // 1/40th of screen width
          const jetskiHeight = jetskiWidth * 0.6; // Aspect ratio for jetski
          
          // Convert normalized coordinates (0-1) to screen coordinates
          const x = player.x * width;
          const y = player.y * height;
          
          // Convert hex color string to number
          const colorNumber = parseInt(player.color.replace('#', ''), 16);
          
          // Create jetski rectangle
          const rectangle = this.add.rectangle(x, y, jetskiWidth, jetskiHeight, colorNumber);
          rectangle.setStrokeStyle(2, 0x000000); // Black border
          
          // Create name tag above jetski
          const text = this.add.text(x, y - jetskiHeight/2 - 20, player.name, {
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            fontFamily: 'Arial'
          });
          text.setOrigin(0.5);
          
          // Store references
          this.jetskis.set(player.id, { rectangle, text });
        }
      }
      
      const config = {
        type: AUTO,
        width,
        height,
        parent: gameRef.current,
        scale: {
          mode: Scale.NONE,
          autoCenter: Scale.CENTER_BOTH,
        },
        backgroundColor: '#2196f3', // blue water
        scene: GameScene,
      };
      gameInstance = new Game(config);
      phaserGameRef.current = gameInstance;

      // Resize handler to keep 16:9 aspect ratio
      resizeHandler = () => {
        if (!gameInstance || !gameInstance.scale) return;
        const { width, height } = getMax16by9Size();
        gameInstance.scale.resize(width, height);
      };
      window.addEventListener('resize', resizeHandler);
    })();
    return () => {
      isMounted = false;
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
    };
  }, []);

  // Update jetskis when player data changes
  useEffect(() => {
    if (sceneRef.current && playerData.length > 0) {
      const scene = sceneRef.current as any;
      if (scene.updateJetskis) {
        scene.updateJetskis(playerData);
      }
    }
  }, [playerData]);

  // The outer container fills the viewport and centers the 16:9 game area
  return (
    <div
      ref={containerRef}
      className="w-screen h-screen flex items-center justify-center bg-black overflow-hidden"
      style={{ minHeight: 0, minWidth: 0 }}
    >
      <div
        ref={gameRef}
        className="shadow-2xl"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      />
      
      {/* Player list overlay */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Players ({players.length})</h3>
        {!isConnected && (
          <p className="text-red-400 text-sm">Disconnected from server</p>
        )}
        {players.length === 0 ? (
          <p className="text-gray-400 text-sm">No players joined</p>
        ) : (
          <ul className="space-y-1">
            {players.map((player, index) => (
              <li key={index} className="text-sm">
                {player}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function GameView() {
  return (
    <main className="w-full h-full min-h-screen min-w-0 bg-black">
      <WaterGame />
    </main>
  );
} 