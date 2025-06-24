import { PlayerData, JetskiObject } from "../types";

// Export the jetski management logic that can be used in the scene
export function createJetskiManager() {
  const jetskis = new Map<string, JetskiObject>();
  
  return {
    updateJetskis(scene: any, players: PlayerData[]) {
      // Clear existing jetskis
      jetskis.forEach(({ rectangle, text }) => {
        rectangle.destroy();
        text.destroy();
      });
      jetskis.clear();
      
      // Create new jetskis
      players.forEach(player => {
        createJetski(scene, player, jetskis);
      });
    }
  };
}

function createJetski(scene: any, player: PlayerData, jetskis: Map<string, JetskiObject>) {
  const { width, height } = scene.scale;
  const jetskiWidth = width / 40; // 1/40th of screen width
  const jetskiHeight = jetskiWidth * 0.6; // Aspect ratio for jetski
  
  // Convert normalized coordinates (0-1) to screen coordinates
  const x = player.x * width;
  const y = player.y * height;
  
  // Convert hex color string to number
  const colorNumber = parseInt(player.color.replace('#', ''), 16);
  
  // Create jetski rectangle
  const rectangle = scene.add.rectangle(x, y, jetskiWidth, jetskiHeight, colorNumber);
  rectangle.setStrokeStyle(2, 0x000000); // Black border
  
  // Create name tag above jetski
  const text = scene.add.text(x, y - jetskiHeight/2 - 20, player.name, {
    fontSize: '16px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 2,
    fontFamily: 'Arial'
  });
  text.setOrigin(0.5);
  
  // Store references
  jetskis.set(player.id, { rectangle, text });
} 