export type WebSocketMessage = {
  type: 'playerList' | 'error' | 'gameState';
  players?: string[] | PlayerData[];
  collectibles?: CollectibleData[];
  error?: string;
};

export type PlayerData = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
  speed: number;
};

export type CollectibleData = {
  id: string;
  x: number;
  y: number;
  rotation: number;
};

export type JetskiObject = {
  image: import("phaser").GameObjects.Image;
  text: import("phaser").GameObjects.Text;
};

export type CollectibleObject = {
  image: import("phaser").GameObjects.Image;
}; 