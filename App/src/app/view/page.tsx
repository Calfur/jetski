"use client";
import { useEffect, useRef, useState } from "react";

type WebSocketMessage = {
  type: 'playerList' | 'error';
  players?: string[];
  error?: string;
};

function WaterGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<import("phaser").Game | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
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
          setPlayers(message.players);
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
        scene: {
          create() {
            // Water area only for now
          },
        },
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