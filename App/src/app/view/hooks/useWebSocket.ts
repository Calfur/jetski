import { useEffect, useRef, useState, useCallback } from "react";
import { WebSocketMessage, PlayerData, CollectibleData, ExplosionData, HighScore } from "../types";

export function useWebSocket() {
  const [players, setPlayers] = useState<string[]>([]);
  const [playerData, setPlayerData] = useState<PlayerData[]>([]);
  const [collectibleData, setCollectibleData] = useState<CollectibleData[]>([]);
  const [explosionData, setExplosionData] = useState<ExplosionData[]>([]);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const wasConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    setIsConnecting(true);
    
    // Connect to WebSocket server - use dynamic URL for production
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      isConnectingRef.current = false;
      console.log('WebSocket connected');
      
      // If this is a reconnection, request current game state
      if (wasConnectedRef.current) {
        console.log('Requesting current game state after reconnection');
        ws.send(JSON.stringify({ type: 'getGameState' }));
      }
      wasConnectedRef.current = true;
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === 'playerList' && message.players) {
          setPlayers(message.players as string[]);
        } else if (message.type === 'gameState' && message.players) {
          setPlayerData(message.players as PlayerData[]);
          if (message.collectibles) {
            setCollectibleData(message.collectibles);
          }
          if (message.explosions) {
            setExplosionData(message.explosions);
          }
        } else if (message.type === 'scoreboard' && message.highScores) {
          setHighScores(message.highScores);
        }
      } catch {
        console.error('Invalid message from server');
      }
    };

    ws.onerror = () => {
      console.error('WebSocket connection error');
      setIsConnected(false);
      setIsConnecting(false);
      isConnectingRef.current = false;
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setIsConnecting(false);
      isConnectingRef.current = false;
      
      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Attempt to reconnect immediately
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    players,
    playerData,
    collectibleData,
    explosionData,
    highScores,
    isConnected,
    isConnecting,
    reconnect,
    wsRef
  };
} 