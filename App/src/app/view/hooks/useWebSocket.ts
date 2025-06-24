import { useEffect, useRef, useState } from "react";
import { WebSocketMessage, PlayerData } from "../types";

export function useWebSocket() {
  const [players, setPlayers] = useState<string[]>([]);
  const [playerData, setPlayerData] = useState<PlayerData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

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

  return {
    players,
    playerData,
    isConnected,
    wsRef
  };
} 