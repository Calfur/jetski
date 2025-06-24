export type WebSocketMessage = {
  type: 'playerList' | 'error' | 'gameState';
  players?: string[] | PlayerData[];
  error?: string;
};

export type PlayerData = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
};

export type JetskiObject = {
  rectangle: import('phaser').GameObjects.Rectangle;
  text: import('phaser').GameObjects.Text;
}; 