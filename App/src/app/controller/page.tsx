'use client';

import { useState, useEffect, useRef } from 'react';

type WebSocketMessage = {
  type: 'playerList' | 'error';
  players?: string[];
  error?: string;
};

export default function GameController() {
  const [playerName, setPlayerName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Effect for WebSocket connection - runs once
  useEffect(() => {
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
    };

    return () => {
      ws.close();
    };
  }, []);

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
      if (lastMessage.players && lastMessage.players.includes(playerName)) {
        setIsJoined(true);
        setIsLoading(false);
        setError('');
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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (isJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Game Controller</h1>
          <p className="text-green-400 mb-4">Joined as: {playerName}</p>
          <p className="text-gray-400">Game controls will appear here...</p>
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