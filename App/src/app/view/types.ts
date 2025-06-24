export type WebSocketMessage = {
  type: 'playerList' | 'error' | 'gameState';
  players?: string[] | PlayerData[];
  error?: string;
};

export type PlayerData = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
};

export type JetskiObject = {
  image: import("phaser").GameObjects.Image;
  text: import("phaser").GameObjects.Text;
}; 