import { PlayerData, JetskiObject, CollectibleData, CollectibleObject, ExplosionData, ExplosionObject } from "../types";

// Export the jetski management logic that can be used in the scene
export function createJetskiManager() {
  const jetskis = new Map<string, JetskiObject>();
  
  return {
    updateJetskis(scene: import("phaser").Scene, players: PlayerData[]) {
      const currentPlayerIds = new Set(players.map(p => p.id));

      // Remove jetskis for players who are no longer present
      for (const [id, jetski] of jetskis.entries()) {
        if (!currentPlayerIds.has(id)) {
          jetski.image.destroy();
          jetski.text.destroy();
          jetskis.delete(id);
        }
      }

      // Add or update jetskis for current players
      for (const player of players) {
        // Always recreate jetskis to ensure proper scaling of all properties
        if (jetskis.has(player.id)) {
          // Destroy existing jetski before recreating
          const existingJetski = jetskis.get(player.id)!;
          existingJetski.image.destroy();
          existingJetski.text.destroy();
          jetskis.delete(player.id);
        }
        
        // Create new jetski with current dimensions
        createJetski(scene, player, jetskis);
      }
    }
  };
}

// Export the collectible management logic
export function createCollectibleManager() {
  const collectibles = new Map<string, CollectibleObject>();
  
  return {
    updateCollectibles(scene: import("phaser").Scene, collectibleData: CollectibleData[]) {
      const currentCollectibleIds = new Set(collectibleData.map(c => c.id));

      // Remove collectibles that are no longer present
      for (const [id, collectible] of collectibles.entries()) {
        if (!currentCollectibleIds.has(id)) {
          collectible.image.destroy();
          collectibles.delete(id);
        }
      }

      // Add or update collectibles
      for (const collectible of collectibleData) {
        // Always recreate collectibles to ensure proper scaling of all properties
        if (collectibles.has(collectible.id)) {
          // Destroy existing collectible before recreating
          const existingCollectible = collectibles.get(collectible.id)!;
          existingCollectible.image.destroy();
          collectibles.delete(collectible.id);
        }
        
        // Create new collectible with current dimensions
        createCollectible(scene, collectible, collectibles);
      }
    }
  };
}

// Export the explosion management logic
export function createExplosionManager() {
  const explosions = new Map<string, ExplosionObject>();
  
  return {
    updateExplosions(scene: import("phaser").Scene, explosionData: ExplosionData[]) {
      const currentExplosionIds = new Set(explosionData.map(e => e.id));

      // Remove explosions that are no longer present
      for (const [id, explosion] of explosions.entries()) {
        if (!currentExplosionIds.has(id)) {
          explosion.circle.destroy();
          explosion.tween.stop();
          explosions.delete(id);
        }
      }

      // Add new explosions
      for (const explosion of explosionData) {
        if (!explosions.has(explosion.id)) {
          createExplosion(scene, explosion, explosions);
        }
      }
    }
  };
}

function createJetski(scene: import("phaser").Scene, player: PlayerData, jetskis: Map<string, JetskiObject>) {
  const { width, height } = scene.scale;
  const jetskiWidth = width / 120;
  const jetskiHeight = jetskiWidth * 0.6; // Aspect ratio for jetski
  
  // Convert normalized coordinates (0-1) to screen coordinates
  const x = player.x * width;
  const y = player.y * height;
  
  // Convert hex color string to number
  const colorNumber = parseInt(player.color.replace('#', ''), 16);
  
  // Create jetski image
  const image = scene.add.image(x, y, 'jetski');
  image.setScale(jetskiWidth / image.width);
  image.setTint(colorNumber);
  image.setRotation(player.rotation); // Use server-provided rotation
  image.setOrigin(0.5, 0.5); // Center the origin
  
  // Calculate dynamic font size based on view size
  const fontSize = Math.max(8, Math.min(20, width / 80)); // Scale between 12px and 24px based on screen width
  
  // Use font size for spacing between text and jetski
  const textSpacing = fontSize * 1.5;
  
  // Create name tag above jetski
  const text = scene.add.text(x, y - jetskiHeight/2 - textSpacing, player.name, {
    fontSize: `${fontSize}px`,
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 2,
    fontFamily: 'Arial'
  });
  text.setOrigin(0.5);
  
  // Store references
  jetskis.set(player.id, { image, text });
}

function createCollectible(scene: import("phaser").Scene, collectible: CollectibleData, collectibles: Map<string, CollectibleObject>) {
  const { width, height } = scene.scale;
  const collectibleSize = width / 150; // 1/120th of screen width for collectibles
  
  // Convert normalized coordinates (0-1) to screen coordinates
  const x = collectible.x * width;
  const y = collectible.y * height;
  
  // Create collectible image (rubberduck)
  const image = scene.add.image(x, y, 'rubberduck');
  image.setScale(collectibleSize / image.width);
  image.setRotation(collectible.rotation); // Apply random rotation
  image.setOrigin(0.5, 0.5); // Center the origin
  
  // Store reference
  collectibles.set(collectible.id, { image });
}

function createExplosion(scene: import("phaser").Scene, explosion: ExplosionData, explosions: Map<string, ExplosionObject>) {
  const { width, height } = scene.scale;
  
  // Convert normalized coordinates (0-1) to screen coordinates
  const x = explosion.x * width;
  const y = explosion.y * height;
  
  // Create explosion graphics
  const circle = scene.add.graphics();
  circle.setPosition(x, y);
  
  // Calculate jetski size for reference
  const jetskiWidth = width / 120;
  
  // Initial explosion size - about 2x jetski width
  const initialSize = jetskiWidth * 2;
  // Final explosion size - about 4x jetski width
  const maxSize = jetskiWidth * 4;
  
  // Draw initial explosion circle
  circle.fillStyle(0xff0000, 1); // Red
  circle.fillCircle(0, 0, initialSize);
  
  // Add orange ring
  circle.lineStyle(width / 400, 0xff8c00, 1); // Orange
  circle.strokeCircle(0, 0, initialSize);
  
  // Create explosion animation
  const tween = scene.tweens.add({
    targets: circle,
    scaleX: maxSize / initialSize,
    scaleY: maxSize / initialSize,
    alpha: 0,
    duration: 2000, // 2 seconds
    ease: 'Power2',
    onUpdate: function() {
      // Update the circle drawing during animation
      circle.clear();
      const currentSize = initialSize * (circle.scaleX || 1);
      const alpha = circle.alpha || 1;
      
      // Red center
      circle.fillStyle(0xff0000, alpha);
      circle.fillCircle(0, 0, currentSize);
      
      // Orange ring
      circle.lineStyle(width / 400, 0xff8c00, alpha);
      circle.strokeCircle(0, 0, currentSize);
      
      // Add some inner orange glow
      circle.fillStyle(0xff8c00, alpha * 0.3);
      circle.fillCircle(0, 0, currentSize * 0.7);
    },
    onComplete: function() {
      circle.destroy();
    }
  });
  
  // Store references
  explosions.set(explosion.id, { circle, tween });
} 