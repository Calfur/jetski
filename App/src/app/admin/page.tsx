"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function AdminPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Admin WebSocket connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Admin WebSocket disconnected');
    };

    ws.onerror = () => {
      setIsConnected(false);
      console.error('Admin WebSocket connection error');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleReset = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('Not connected to server');
      return;
    }

    if (confirm('Are you sure you want to reset the scoreboard and all player scores? This action cannot be undone.')) {
      setIsResetting(true);
      
      try {
        wsRef.current.send(JSON.stringify({ type: 'reset' }));
        alert('Scoreboard and player scores have been reset successfully!');
      } catch (error) {
        console.error('Failed to send reset message:', error);
        alert('Failed to reset. Please try again.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🛠️ Admin Panel
          </h1>
          
          <div className="mb-6">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                ⚠️ Reset Game Data
              </h2>
              <p className="text-sm text-red-700 mb-4">
                This will reset the scoreboard and set all player collectible counts to 0.
              </p>
              <button
                onClick={handleReset}
                disabled={!isConnected || isResetting}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isConnected && !isResetting
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isResetting ? 'Resetting...' : 'Reset Scoreboard & Player Scores'}
              </button>
            </div>
            
            <div className="text-xs text-gray-500">
              Access this page directly at /admin
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 