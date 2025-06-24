"use client";
import { useWebSocket } from "./hooks/useWebSocket";
import { WaterGame } from "./components/WaterGame";
import { PlayerList } from "./components/PlayerList";

function GameView() {
  const { players, playerData, isConnected } = useWebSocket();

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black overflow-hidden">
      <WaterGame playerData={playerData} />
      <PlayerList players={players} isConnected={isConnected} />
    </div>
  );
}

export default function ViewPage() {
  return (
    <main className="w-full h-full min-h-screen min-w-0 bg-black">
      <GameView />
    </main>
  );
} 