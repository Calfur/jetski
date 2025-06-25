"use client";
import { useEffect, useState } from "react";

interface ConnectionOverlayProps {
  isConnected: boolean;
  isConnecting: boolean;
  onReconnect: () => void;
}

export function ConnectionOverlay({ isConnected, isConnecting, onReconnect }: ConnectionOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!isConnected && !isConnecting) {
      // Show overlay immediately when connection is lost
      setShowOverlay(true);
      // Trigger fade in animation
      setTimeout(() => setFadeIn(true), 10);
    } else if (isConnected && showOverlay) {
      // Show success message briefly when reconnection is successful
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowOverlay(false);
        setFadeIn(false);
        setShowSuccess(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else {
      setShowOverlay(false);
      setFadeIn(false);
      setShowSuccess(false);
    }
  }, [isConnected, isConnecting, showOverlay]);

  if (!showOverlay) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 transition-opacity duration-300 ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className={`bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-lg transition-all duration-300 ${
        showSuccess ? 'bg-green-50 border-2 border-green-200' : ''
      }`}>
        <div className="mb-4">
          {showSuccess ? (
            <>
              <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-6 h-6 text-green-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-green-800 mb-1">
                Reconnected!
              </h2>
              <p className="text-green-600 text-sm">
                Connection restored successfully
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Connection Lost
              </h2>
              <p className="text-gray-600 text-sm">
                Check your connection and try again
              </p>
            </>
          )}
        </div>
        
        {!showSuccess && (
          <button
            onClick={onReconnect}
            disabled={isConnecting}
            className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-all duration-200 ${
              isConnecting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transform hover:scale-105'
            }`}
          >
            {isConnecting ? (
              <div className="flex items-center justify-center">
                <svg 
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Connecting...
              </div>
            ) : (
              'Retry'
            )}
          </button>
        )}
      </div>
    </div>
  );
} 