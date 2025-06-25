export type WebSocketMessage = {
  type: 'playerList' | 'error' | 'gameState' | 'scoreboard';
  players?: string[] | PlayerData[];
  collectibles?: CollectibleData[];
  highScores?: HighScore[];
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
  score: number;
};

export type CollectibleData = {
  id: string;
  x: number;
  y: number;
  rotation: number;
};

export type HighScore = {
  name: string;
  score: number;
  timestamp: number;
  isActive: boolean;
};

export type JetskiObject = {
  image: import("phaser").GameObjects.Image;
  text: import("phaser").GameObjects.Text;
};

export type CollectibleObject = {
  image: import("phaser").GameObjects.Image;
}; 