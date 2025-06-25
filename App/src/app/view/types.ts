export type WebSocketMessage = {
  type: 'playerList' | 'error' | 'gameState' | 'scoreboard';
  players?: string[] | PlayerData[];
  collectibles?: CollectibleData[];
  explosions?: ExplosionData[];
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

export type ExplosionData = {
  id: string;
  x: number;
  y: number;
  timestamp: number;
};

export type JetskiObject = {
  image: import("phaser").GameObjects.Image;
  text: import("phaser").GameObjects.Text;
};

export type CollectibleObject = {
  image: import("phaser").GameObjects.Image;
};

export type ExplosionObject = {
  circle: import("phaser").GameObjects.Graphics;
  tween: import("phaser").Tweens.Tween;
}; 