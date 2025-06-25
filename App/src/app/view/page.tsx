"use client";
import { useWebSocket } from "./hooks/useWebSocket";
import { WaterGame } from "./components/WaterGame";

function GameView() {
  const { playerData, collectibleData } = useWebSocket();

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black overflow-hidden">
      <WaterGame playerData={playerData} collectibleData={collectibleData} />
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