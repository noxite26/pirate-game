/**
 * Core Type Definitions for Cursed Keel Game Engine
 */

export interface Position {
  x: number;
  y: number;
}

export type GameStatus = "start" | "playing" | "gameover" | "victory" | "level_up";

export type ProgressionState =
  | "SEARCHING_FOR_FROG"
  | "KEY_OBTAINED"
  | "CHEST_UNLOCKED"
  | "ARTIFACT_ACTIVE"
  | "ARTIFACT_STOLEN"
  | "ESCAPE_ACTIVE"
  | "ROUND_COMPLETE";

export type TileType =
  | "water"     // Outside ocean border
  | "dock"      // Outside walk-on dock
  | "beach"     // Sand outside stronghold
  | "wall"      // Solid wooden / stone stronghold walls
  | "floor"     // Indoor stronghold wooden deck
  | "barrel"    // Decorative & solid barrel obstacle
  | "lantern"   // Light source
  | "table"     // Decorative dining table
  | "treasure_spot"; // The main artifact vault

export interface Tile {
  x: number;
  y: number;
  type: TileType;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  speed: number;
  direction: "up" | "down" | "left" | "right";
  hasArtifact: boolean;
  keys: number;
  maxKeys: number;
  activeUpgrades: {
    weapon: "Fists" | "Wooden Dagger" | "Iron Blade" | "Cursed Cutlass";
    speed: number; // multiplier
    vision: number; // circle radius multiplier
    silence: boolean;
  };
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  radius: number;
  speed: number;
  direction: number; // current looking angle in radians
  patrolPath: Position[];
  pathIdx: number;
  state: "patrol" | "investigate" | "alert";
  alertProgress: number; // 0 to 100
  targetX?: number; // point of investigation
  targetY?: number;
  waitTicks: number;
}

export interface Frog {
  x: number;
  y: number;
  radius: number;
  hitsRequired: number;
  escapesRemaining: number;
  magicalCharge: number; // pulse animation timer
}

export interface KeyPickup {
  id: string;
  x: number;
  y: number;
  collected: boolean;
}

export interface Chest {
  id: string;
  x: number;
  y: number;
  opened: boolean;
  upgradeType: "weapon" | "speed" | "vision" | "clue" | "silence" | "score";
  upgradeName: string;
  isTreasure?: boolean;
}

export interface Artifact {
  x: number;
  y: number;
  collected: boolean;
  pulseTimer: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}
