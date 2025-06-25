'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  rotation: number;
};

export default function GameController() {
  const [playerName, setPlayerName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const controlIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError('');
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);
      } catch {
        setError('Invalid message from server');
      }
    };

    ws.onerror = () => {
      setError('Failed to connect to server');
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsJoined(false);
      // Show retry button when connection is lost
      setShowRetry(true);
    };
  }, []);

  // Function to retry connection
  const handleRetry = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setIsConnected(false);
    setIsJoined(false);
    setError('');
    setLastMessage(null);
    setPlayerData(null);
    setShowRetry(false);
    connectWebSocket();
    
    // Set up new timeout to show retry button after 3 seconds if connection fails
    retryTimeoutRef.current = setTimeout(() => {
      setShowRetry(true);
    }, 3000);
  }, [connectWebSocket]);

  // Effect for WebSocket connection - runs once
  useEffect(() => {
    connectWebSocket();

    // Set up timeout to show retry button after 3 seconds
    retryTimeoutRef.current = setTimeout(() => {
      setShowRetry(true);
    }, 3000);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  // Effect for handling incoming messages
  useEffect(() => {
    if (!lastMessage) {
      return;
    }

    if (lastMessage.type === 'error') {
      setError(lastMessage.error || 'Unknown error');
      setIsLoading(false);
    } else if (lastMessage.type === 'playerList') {
      console.log('Current players:', lastMessage.players);
      // Check if current player name is in the player list to confirm successful join
      if (lastMessage.players && Array.isArray(lastMessage.players) && 
          lastMessage.players.some(p => typeof p === 'string' && p === playerName)) {
        setIsJoined(true);
        setIsLoading(false);
        setError('');
      }
    } else if (lastMessage.type === 'gameState') {
      // Find current player in game state
      if (lastMessage.players && Array.isArray(lastMessage.players)) {
        const currentPlayer = lastMessage.players.find(p => typeof p === 'object' && p.name === playerName);
        if (currentPlayer && typeof currentPlayer === 'object') {
          setPlayerData(currentPlayer as PlayerData);
        }
      }
    }
  }, [lastMessage, playerName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value.slice(0, 20);
    setPlayerName(newName);
    // Clear error when user starts typing a new name
    if (error) {
      setError('');
    }
  };

  const handleJoin = () => {
    if (!playerName.trim()) {
      setError('Please enter a name');
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to server');
      return;
    }

    setIsLoading(true);
    setError('');
    
    wsRef.current.send(JSON.stringify({
      type: 'join',
      name: playerName.trim()
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  // Function to send control updates
  const sendControls = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'controls',
        controls: {
          leftPressed,
          rightPressed
        }
      }));
    }
  }, [leftPressed, rightPressed]);

  // Effect to send controls at 20Hz when joined
  useEffect(() => {
    if (isJoined) {
      controlIntervalRef.current = setInterval(sendControls, 50); // 20Hz = 50ms
    } else {
      if (controlIntervalRef.current) {
        clearInterval(controlIntervalRef.current);
        controlIntervalRef.current = null;
      }
    }

    return () => {
      if (controlIntervalRef.current) {
        clearInterval(controlIntervalRef.current);
        controlIntervalRef.current = null;
      }
    };
  }, [isJoined, leftPressed, rightPressed, sendControls]);

  // Control button handlers
  const handleLeftPress = () => setLeftPressed(true);
  const handleLeftRelease = () => setLeftPressed(false);
  const handleRightPress = () => setRightPressed(true);
  const handleRightRelease = () => setRightPressed(false);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Connecting to server...</p>
          {showRetry && (
            <button
              onClick={handleRetry}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Player info header */}
        <div className="bg-gray-800 p-4 text-center">
          <p className="text-white">{playerName}</p>
          {playerData && (
            <div 
              className="inline-block w-4 h-4 rounded mt-2"
              style={{ backgroundColor: playerData.color }}
            ></div>
          )}
        </div>

        {/* Control buttons */}
        <div className="flex-1 flex">
          {/* Left button */}
          <button
            className="flex-1 flex items-center justify-center text-white text-2xl font-bold transition-all duration-100 select-none"
            style={{ 
              backgroundColor: leftPressed 
                ? playerData?.color 
                  ? `${playerData.color}CC` // Add 80% opacity for pressed state
                  : '#2563EB' // Darker blue for pressed state
                : playerData?.color || '#3B82F6'
            }}
            onTouchStart={handleLeftPress}
            onTouchEnd={handleLeftRelease}
            onMouseDown={handleLeftPress}
            onMouseUp={handleLeftRelease}
            onMouseLeave={handleLeftRelease}
          >
            LEFT
          </button>

          {/* Right button */}
          <button
            className="flex-1 flex items-center justify-center text-white text-2xl font-bold transition-all duration-100 select-none"
            style={{ 
              backgroundColor: rightPressed 
                ? playerData?.color 
                  ? `${playerData.color}CC` // Add 80% opacity for pressed state
                  : '#2563EB' // Darker blue for pressed state
                : playerData?.color || '#3B82F6'
            }}
            onTouchStart={handleRightPress}
            onTouchEnd={handleRightRelease}
            onMouseDown={handleRightPress}
            onMouseUp={handleRightRelease}
            onMouseLeave={handleRightRelease}
          >
            RIGHT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Join Game</h1>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="mb-4">
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-300 mb-2">
              Enter your name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={handleNameChange}
              onKeyDown={handleKeyPress}
              placeholder="Your name"
              maxLength={20}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <div className="text-xs text-gray-400 mt-1 text-right">
              {playerName.length}/20 characters
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={isLoading || !playerName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {isLoading ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </div>
    </div>
  );
} 