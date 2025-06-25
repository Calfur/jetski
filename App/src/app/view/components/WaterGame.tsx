"use client";
import { useEffect, useRef } from "react";
import { PlayerData, CollectibleData, ExplosionData } from "../types";
import { createJetskiManager, createCollectibleManager, createExplosionManager } from "../game/GameScene";

interface WaterGameProps {
  playerData: PlayerData[];
  collectibleData: CollectibleData[];
  explosionData: ExplosionData[];
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

export function WaterGame({ playerData, collectibleData, explosionData }: WaterGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<import("phaser").Game | null>(null);
  const sceneRef = useRef<import("phaser").Scene | null>(null);
  const jetskiManagerRef = useRef<ReturnType<typeof createJetskiManager> | null>(null);
  const collectibleManagerRef = useRef<ReturnType<typeof createCollectibleManager> | null>(null);
  const explosionManagerRef = useRef<ReturnType<typeof createExplosionManager> | null>(null);
  const playerDataRef = useRef(playerData);
  const collectibleDataRef = useRef(collectibleData);
  const explosionDataRef = useRef(explosionData);
  playerDataRef.current = playerData;
  collectibleDataRef.current = collectibleData;
  explosionDataRef.current = explosionData;

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
      
      // Create the collectible manager
      collectibleManagerRef.current = createCollectibleManager();
      
      // Create the explosion manager
      explosionManagerRef.current = createExplosionManager();
      
      // Create a custom scene class dynamically
      class GameScene extends phaser.Scene {
        constructor() {
          super({ key: 'GameScene' });
        }
        
        preload() {
          this.load.svg('jetski', 'assets/jetski.svg');
          this.load.svg('rubberduck', 'assets/rubberduck.svg');
        }

        create() {
          // Store scene reference for updates
          sceneRef.current = this;

          // Initial jetski creation
          if (jetskiManagerRef.current && playerDataRef.current.length > 0) {
            jetskiManagerRef.current.updateJetskis(this, playerDataRef.current);
          }

          // Initial collectible creation
          if (collectibleManagerRef.current && collectibleDataRef.current.length > 0) {
            collectibleManagerRef.current.updateCollectibles(this, collectibleDataRef.current);
          }

          // Initial explosion creation
          if (explosionManagerRef.current && explosionDataRef.current.length > 0) {
            explosionManagerRef.current.updateExplosions(this, explosionDataRef.current);
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

      // Resize handler to keep 16:9 aspect ratio and update jetskis
      resizeHandler = () => {
        if (!gameInstance || !gameInstance.scale) return;
        const { width, height } = getMax16by9Size();
        gameInstance.scale.resize(width, height);
        
        // Update jetskis after resize to maintain proper positioning and sizing
        if (sceneRef.current && jetskiManagerRef.current) {
          jetskiManagerRef.current.updateJetskis(sceneRef.current, playerDataRef.current);
        }

        // Update collectibles after resize
        if (sceneRef.current && collectibleManagerRef.current) {
          collectibleManagerRef.current.updateCollectibles(sceneRef.current, collectibleDataRef.current);
        }

        // Update explosions after resize
        if (sceneRef.current && explosionManagerRef.current) {
          explosionManagerRef.current.updateExplosions(sceneRef.current, explosionDataRef.current);
        }
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

  // Update collectibles when collectible data changes
  useEffect(() => {
    if (sceneRef.current && collectibleManagerRef.current) {
      collectibleManagerRef.current.updateCollectibles(sceneRef.current, collectibleData);
    }
  }, [collectibleData]);

  // Update explosions when explosion data changes
  useEffect(() => {
    if (sceneRef.current && explosionManagerRef.current) {
      explosionManagerRef.current.updateExplosions(sceneRef.current, explosionData);
    }
  }, [explosionData]);

  return (
    <div
      ref={gameRef}
      className="shadow-2xl"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    />
  );
} 