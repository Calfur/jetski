"use client";
import { useEffect, useRef } from "react";
import { PlayerData } from "../types";
import { createJetskiManager } from "../game/GameScene";

interface WaterGameProps {
  playerData: PlayerData[];
}

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

export function WaterGame({ playerData }: WaterGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<import("phaser").Game | null>(null);
  const sceneRef = useRef<import("phaser").Scene | null>(null);
  const jetskiManagerRef = useRef<ReturnType<typeof createJetskiManager> | null>(null);
  const playerDataRef = useRef(playerData);
  playerDataRef.current = playerData;

  useEffect(() => {
    let gameInstance: import("phaser").Game | null = null;
    let isMounted = true;
    let resizeHandler: (() => void) | null = null;
    
    (async () => {
      const phaser = await import("phaser");
      if (!gameRef.current || phaserGameRef.current || !isMounted) return;
      const { Game, AUTO, Scale } = phaser;
      const { width, height } = getMax16by9Size();
      
      // Create the jetski manager
      jetskiManagerRef.current = createJetskiManager();
      
      // Create a custom scene class dynamically
      class GameScene extends phaser.Scene {
        constructor() {
          super({ key: 'GameScene' });
        }
        
        create() {
          // Store scene reference for updates
          sceneRef.current = this;

          // Initial jetski creation
          if (jetskiManagerRef.current && playerDataRef.current.length > 0) {
            jetskiManagerRef.current.updateJetskis(this, playerDataRef.current);
          }
        }
      }
      
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
        scene: GameScene,
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
  }, []);

  // Update jetskis when player data changes
  useEffect(() => {
    if (sceneRef.current && jetskiManagerRef.current) {
      jetskiManagerRef.current.updateJetskis(sceneRef.current, playerData);
    }
  }, [playerData]);

  return (
    <div
      ref={gameRef}
      className="shadow-2xl"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    />
  );
} 