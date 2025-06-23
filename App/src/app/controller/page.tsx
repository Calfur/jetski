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
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const ws = new WebSocket('ws://localhost:3000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError('');
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === 'error') {
          setError(message.error || 'Unknown error');
          setIsLoading(false);
        } else if (message.type === 'playerList') {
          // Player list update - could be used for validation
          console.log('Current players:', message.players);
          // If we were loading (trying to join) and got a player list, we successfully joined
          if (isLoading) {
            setIsJoined(true);
            setIsLoading(false);
          }
        }
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
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Your name"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
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