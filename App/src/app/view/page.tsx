"use client";
import { useEffect, useRef } from "react";

function WaterGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<any>(null);

  useEffect(() => {
    let gameInstance: any = null;
    let isMounted = true;
    (async () => {
      const phaser = await import("phaser");
      if (!gameRef.current || phaserGameRef.current || !isMounted) return;
      const { Game, AUTO, Scale } = phaser;
      const config = {
        type: AUTO,
        width: '100%',
        height: '100%',
        parent: gameRef.current,
        scale: {
          mode: Scale.RESIZE,
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
    })();
    return () => {
      isMounted = false;
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={gameRef}
      style={{ width: '100vw', height: '100vh', minHeight: 0, minWidth: 0 }}
      className="bg-black flex items-center justify-center overflow-hidden"
    />
  );
}

export default function GameView() {
  return (
    <main className="w-full h-full min-h-screen min-w-0 bg-black">
      <WaterGame />
    </main>
  );
} 