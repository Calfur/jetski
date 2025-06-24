import { PlayerData, JetskiObject } from "../types";

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

function createJetski(scene: import("phaser").Scene, player: PlayerData, jetskis: Map<string, JetskiObject>) {
  const { width, height } = scene.scale;
  const jetskiWidth = width / 90; // Reduced from 1/60th of screen width
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
  const fontSize = Math.max(12, Math.min(24, width / 80)); // Scale between 12px and 24px based on screen width
  
  // Use font size for spacing between text and jetski
  const textSpacing = fontSize * 2;
  
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