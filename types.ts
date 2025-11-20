export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  PAUSED = 'PAUSED',
  AI_INTERACTION = 'AI_INTERACTION'
}

export interface Point {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface GameObject {
  id: string;
  position: Point;
  velocity: Velocity;
  rotation: number; // radians
  radius: number;
  type: 'ship' | 'asteroid' | 'bullet' | 'particle' | 'powerup';
  destroyed?: boolean;
  color?: string;
}

export interface Asteroid extends GameObject {
  sizeClass: 1 | 2 | 3 | 4; // 4 is massive
  vertices: Point[]; // For jagged drawing
}

export interface Powerup extends GameObject {
  kind: 'life' | 'spread';
  lifeTime: number; // frames
}

export interface Particle extends GameObject {
  life: number;
  maxLife: number;
}

export interface Ship extends GameObject {
  thrusting: boolean;
  invulnerable: number; // frames
  rotationSpeed: number;
}

export interface AIResponse {
  text: string;
  sources?: { title: string; uri: string }[];
}