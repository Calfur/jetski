"use client";
import { useEffect, useRef } from "react";

function WaterGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<any>(null);

  // Calculate the largest 16:9 size that fits in the viewport
  function getMax16by9Size() {
    if (typeof window === 'undefined') return { width: 1280, height: 720 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let width = vw;
    let height = (vw * 9) / 16;
    if (height > vh) {
      height = vh;
      width = (vh * 16) / 9;
    }
    return { width, height };
  }

  useEffect(() => {
    let gameInstance: any = null;
    let isMounted = true;
    let resizeHandler: (() => void) | null = null;
    (async () => {
      const phaser = await import("phaser");
      if (!gameRef.current || phaserGameRef.current || !isMounted) return;
      const { Game, AUTO, Scale } = phaser;
      const { width, height } = getMax16by9Size();
      const config = {
        type: AUTO,
        width,
        height,
        parent: gameRef.current,
        scale: {
          mode: Scale.NONE,
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

      // Resize handler to keep 16:9 aspect ratio
      resizeHandler = () => {
        if (!gameInstance || !gameInstance.scale) return;
        const { width, height } = getMax16by9Size();
        gameInstance.scale.resize(width, height);
      };
      window.addEventListener('resize', resizeHandler);
    })();
    return () => {
      isMounted = false;
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
    };
    // eslint-disable-next-line
  }, []);

  // The outer container fills the viewport and centers the 16:9 game area
  return (
    <div
      ref={containerRef}
      className="w-screen h-screen flex items-center justify-center bg-black overflow-hidden"
      style={{ minHeight: 0, minWidth: 0 }}
    >
      <div
        ref={gameRef}
        className="shadow-2xl"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      />
    </div>
  );
}

export default function GameView() {
  return (
    <main className="w-full h-full min-h-screen min-w-0 bg-black">
      <WaterGame />
    </main>
  );
} 