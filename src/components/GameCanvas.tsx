import React, { useRef, useEffect, useState } from "react";
import { sound } from "../sound";
import { images } from "../assets";
import {
  Position,
  Tile,
  TileType,
  Player,
  Enemy,
  Frog,
  KeyPickup,
  Chest,
  Artifact,
  Particle,
  FloatingText,
  GameStatus,
  ProgressionState
} from "../types";

interface GameCanvasProps {
  level: number;
  score: number;
  keysCount: number;
  panicValue: number;
  setKeysCount: React.Dispatch<React.SetStateAction<number>>;
  setPanicValue: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setLevel: React.Dispatch<React.SetStateAction<number>>;
  status: GameStatus;
  setStatus: React.Dispatch<React.SetStateAction<GameStatus>>;
  onUpgradeFound: (upgradeName: string) => void;
  activeWeapon: string;
  setActiveWeapon: React.Dispatch<React.SetStateAction<"Fists" | "Wooden Dagger" | "Iron Blade" | "Cursed Cutlass">>;
  speedMultiplier: number;
  setSpeedMultiplier: React.Dispatch<React.SetStateAction<number>>;
  visionMultiplier: number;
  setVisionMultiplier: React.Dispatch<React.SetStateAction<number>>;
  isSilenced: boolean;
  setIsSilenced: React.Dispatch<React.SetStateAction<boolean>>;
  hasClue: boolean;
  setHasClue: React.Dispatch<React.SetStateAction<boolean>>;
}

const TILE_SIZE = 40;
const MAP_COLS = 22; // width of stronghold
const MAP_ROWS = 18; // height of stronghold

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  score,
  keysCount,
  panicValue,
  setKeysCount,
  setPanicValue,
  setScore,
  setLevel,
  status,
  setStatus,
  onUpgradeFound,
  activeWeapon,
  setActiveWeapon,
  speedMultiplier,
  setSpeedMultiplier,
  visionMultiplier,
  setVisionMultiplier,
  isSilenced,
  setIsSilenced,
  hasClue,
  setHasClue,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keyboard controls state
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Sprite animation states
  const playerAnimRef = useRef({ frame: 0, timer: 0, isMoving: false });
  const frogAnimRef = useRef({ hitTimer: 0 });
  const enemiesAnimRef = useRef<Record<string, { frame: number, timer: number, isMoving: boolean }>>({});
  const chestAnimRef = useRef<Record<string, { frame: number, timer: number, openAnimPlaying: boolean, openAnimDone: boolean }>>({});

  // Progression State Machine
  const progressionRef = useRef<ProgressionState>("SEARCHING_FOR_FROG");

  // Core Game entity references for physics looping
  const playerRef = useRef<Player>({
    x: 100,
    y: 360,
    radius: 12,
    speed: 3.2,
    direction: "down",
    hasArtifact: false,
    keys: 0,
    maxKeys: 99,
    activeUpgrades: {
      weapon: "Fists",
      speed: 1.0,
      vision: 1.0,
      silence: false
    }
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const frogRef = useRef<Frog>({
    x: 480,
    y: 360,
    radius: 20,
    hitsRequired: 2,
    escapesRemaining: 3,
    magicalCharge: 0
  });

  const chestsRef = useRef<Chest[]>([]);
  const keyPickupsRef = useRef<KeyPickup[]>([]);
  const artifactRef = useRef<Artifact>({ x: 760, y: 360, collected: false, pulseTimer: 0 });

  // Tracks whether alert sound has been played this detection window (to avoid spam)
  const alertSoundPlayedRef = useRef<boolean>(false);

  // Detection grace period — gives player ~0.5s reaction window before panic builds
  // Counts up each frame the player is in vision. Panic only starts after grace threshold.
  const detectionGraceRef = useRef<number>(0);

  // Visual effect frames
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const tilesRef = useRef<Tile[]>([]);
  const boatRef = useRef<Position>({ x: 80, y: 360 });

  // Map representation grid
  const initialMapGenerated = useRef<boolean>(false);
  const strikeCooldown = useRef<number>(0);
  const flashStronghold = useRef<number>(0); // flash red alert overlay if spotted

  // Generate deterministic grid with layout inspiration
  const generateStronghold = (lvl: number) => {
    const grid: Tile[] = [];

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        let type: TileType = "floor";

        // Deep water on far left limit
        if (c <= 1) {
          type = "water";
        }
        // Landing deck and beach
        else if (c === 2) {
          type = "dock";
        }
        else if (c === 3) {
          // Shoreline
          type = "beach";
        }
        // Stronghold exterior wall structure
        else if (c === 4) {
          // Gate entrance on rows 8 to 10
          if (r >= 8 && r <= 10) {
            type = "floor"; // Gate tile
          } else {
            type = "wall";
          }
        }
        // Inner room structures
        else {
          // Room wall divisions (Bento box bobbies inspired structure)
          // Create walls at column intervals to break the area into 3 distinct vertical zones
          const inHorizontalBorder = (r === 0 || r === MAP_ROWS - 1);
          const inVerticalBorder = (c === MAP_COLS - 1);

          const inDividingWall1 = (c === 10 && !(r >= 4 && r <= 6) && !(r >= 12 && r <= 14));
          const inDividingWall2 = (c === 16 && !(r >= 2 && r <= 4) && !(r >= 13 && r <= 15));

          const inCorridorBlock1 = (r === 5 && c > 4 && c < 10 && c !== 7);
          const inCorridorBlock2 = (r === 12 && c > 10 && c < 16 && c !== 13);

          if (inHorizontalBorder || inVerticalBorder || inDividingWall1 || inDividingWall2 || inCorridorBlock1 || inCorridorBlock2) {
            type = "wall";
          } else {
            // Check barrel cluster placements for path blockages
            const isBarrelPosition = (
              (c === 7 && r === 7) ||
              (c === 8 && r === 7) ||
              (c === 13 && r === 3) ||
              (c === 14 && r === 8) ||
              (c === 18 && r === 12) ||
              (c === 20 && r === 5)
            );
            if (isBarrelPosition) {
              type = "barrel";
            } else {
              type = "floor";
            }
          }
        }

        grid.push({ x: c, y: r, type });
      }
    }

    // Set lantern points of illumination
    const lanterns = [
      { x: 5, y: 7 },
      { x: 9, y: 2 },
      { x: 9, y: 15 },
      { x: 12, y: 8 },
      { x: 15, y: 2 },
      { x: 18, y: 14 },
      { x: 20, y: 8 }
    ];

    lanterns.forEach(l => {
      const tile = grid.find(t => t.x === l.x && t.y === l.y);
      if (tile && tile.type !== "wall") {
        tile.type = "lantern";
      }
    });

    tilesRef.current = grid;
  };

  // Generate particle bursts
  const spawnParticles = (x: number, y: number, color: string, count: number = 8) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        color,
        size: Math.random() * 4 + 2,
        life: 0,
        maxLife: Math.random() * 30 + 15
      });
    }
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string = "#ffd700") => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x,
      y: y - 10,
      text,
      color,
      life: 60
    });
  };

  const resetEntitiesForLevel = (lvl: number) => {
    // Player spawn: On the docks next to the small boat
    playerRef.current.x = 90;
    playerRef.current.y = 360;
    playerRef.current.hasArtifact = false;
    playerRef.current.keys = 0;
    setKeysCount(0);
    setPanicValue(0);

    // Position of boat
    boatRef.current = { x: 80, y: 360 };

    // Spawn Frogs — TWO frogs for reliable key progression
    // Frog A: near the stronghold entrance (easy to find early)
    // Frog B: deeper inside (rewards exploration)
    const frogASpawns = [
      { x: 240, y: 320 },
      { x: 280, y: 440 },
      { x: 240, y: 200 },
    ];
    const frogBSpawns = [
      { x: 520, y: 240 },
      { x: 560, y: 440 },
      { x: 680, y: 320 },
    ];
    const pickedFrogA = frogASpawns[Math.floor(Math.random() * frogASpawns.length)];
    const pickedFrogB = frogBSpawns[Math.floor(Math.random() * frogBSpawns.length)];

    // Primary frog (tracked by frogRef)
    frogRef.current = {
      x: pickedFrogA.x,
      y: pickedFrogA.y,
      radius: 20,
      hitsRequired: 1 + Math.floor(lvl / 4),
      escapesRemaining: 3,
      magicalCharge: 0
    };

    // Bonus frog keys already on the ground — spread across the map
    // Simulates multiple frogs that already dropped their keys
    const bonusKeyPositions = [
      { x: pickedFrogB.x, y: pickedFrogB.y },       // mid-room frog
      { x: 360, y: 200 },                            // near upper corridor
      { x: 760, y: 520 },                            // deep vault area
    ];
    keyPickupsRef.current = bonusKeyPositions.map((pos, i) => ({
      id: `frog_bonus_key_${lvl}_${i}`,
      x: pos.x,
      y: pos.y,
      collected: false
    }));

    // Spawn Locked chests — one near gate for fast early progression
    chestsRef.current = [
      { id: "chest_1", x: 240, y: 360, opened: false, upgradeType: "score", upgradeName: "" },
      { id: "chest_2", x: 600, y: 120, opened: false, upgradeType: "score", upgradeName: "" },
      { id: "chest_3", x: 880, y: 640, opened: false, upgradeType: "score", upgradeName: "" },
      { id: "chest_4", x: 680, y: 600, opened: false, upgradeType: "score", upgradeName: "" },
    ];

    // Initialize chest animation states
    const chestAnims: Record<string, { frame: number, timer: number, openAnimPlaying: boolean, openAnimDone: boolean }> = {};
    chestsRef.current.forEach(c => {
      chestAnims[c.id] = { frame: 0, timer: 0, openAnimPlaying: false, openAnimDone: false };
    });
    chestAnimRef.current = chestAnims;

    // Spawn Keys: bonus frog key already placed above, frog drops more on hit
    // (keyPickupsRef already initialized above with bonus key)

    // Spawn Cursed Artifact deep inside vault
    artifactRef.current = {
      x: 840,
      y: 360,
      collected: false,
      pulseTimer: 0
    };

    // Enemies generation — starts gentle, scales with level
    const enemiesToSpawn: Enemy[] = [];
    const baseCount = 1; // Only 1 enemy at level 1!
    const maxEnemies = Math.min(6, baseCount + Math.floor(lvl / 2));

    // Dynamic paths for patrols
    const paths = [
      [{ x: 280, y: 240 }, { x: 280, y: 480 }],
      [{ x: 520, y: 160 }, { x: 520, y: 560 }],
      [{ x: 720, y: 240 }, { x: 720, y: 480 }],
      [{ x: 640, y: 480 }, { x: 880, y: 480 }],
      [{ x: 160, y: 120 }, { x: 400, y: 120 }],
      [{ x: 680, y: 160 }, { x: 880, y: 160 }]
    ];

    for (let i = 0; i < maxEnemies; i++) {
      const chosenPath = paths[i % paths.length];
      const startNode = chosenPath[0];
      // Difficulty-scaled patrol speed:
      // Level 1: ~0.5-0.7 (slow, readable patrols)
      // Level 3-5: ~0.9-1.3 (moderate pressure)
      // Level 6+: ~1.4-2.0 (intense stealth chaos)
      const baseSpeed = 0.4;
      const levelScaling = Math.min(1.6, lvl * 0.2);
      const patrolSpeed = baseSpeed + levelScaling + (Math.random() * 0.2);

      enemiesToSpawn.push({
        id: `enemy_${i}`,
        x: startNode.x,
        y: startNode.y,
        radius: 12,
        speed: patrolSpeed,
        direction: Math.random() * Math.PI * 2,
        patrolPath: chosenPath,
        pathIdx: 0,
        state: "patrol",
        alertProgress: 0,
        waitTicks: 0
      });
    }

    enemiesRef.current = enemiesToSpawn;
    const newAnims: Record<string, { frame: number, timer: number, isMoving: boolean }> = {};
    enemiesToSpawn.forEach(e => {
      newAnims[e.id] = { frame: 0, timer: 0, isMoving: false };
    });
    enemiesAnimRef.current = newAnims;
    floatingTextsRef.current = [];
    particlesRef.current = [];
    progressionRef.current = "SEARCHING_FOR_FROG";
  };

  // Setup keys listener, make sure to add canvas focus support too
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling when using arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", " "].includes(e.key)) {
        e.preventDefault();
      }
      keysPressedRef.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Level reset monitor
  useEffect(() => {
    generateStronghold(level);
    resetEntitiesForLevel(level);
    initialMapGenerated.current = true;
  }, [level]);

  // Collisions logic helper: circle with tile bounds
  const checkWallCollision = (nx: number, ny: number, r: number) => {
    // Boundary screen bounds checks
    if (nx - r < 0 || nx + r > MAP_COLS * TILE_SIZE || ny - r < 0 || ny + r > MAP_ROWS * TILE_SIZE) {
      return true;
    }

    // Grid cell overlap checks
    const leftCol = Math.floor((nx - r) / TILE_SIZE);
    const rightCol = Math.floor((nx + r) / TILE_SIZE);
    const topRow = Math.floor((ny - r) / TILE_SIZE);
    const bottomRow = Math.floor((ny + r) / TILE_SIZE);

    for (let row = topRow; row <= bottomRow; row++) {
      for (let col = leftCol; col <= rightCol; col++) {
        const tile = tilesRef.current.find(t => t.x === col && t.y === row);
        if (tile) {
          if (tile.type === "wall" || tile.type === "barrel") {
            return true;
          }
          // Water is blocked for players, unless on dock
          if (tile.type === "water") {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Perform strike / interaction attack check
  const playerAttack = () => {
    if (strikeCooldown.current > 0) return;

    // Set cooldown based on active weapon
    let strikeDist = 45;
    let weaponDmg = 1;
    let particlesColor = "#a7f3d0";

    switch (activeWeapon) {
      case "Wooden Dagger":
        strikeCooldown.current = 24;
        strikeDist = 55;
        weaponDmg = 1;
        break;
      case "Iron Blade":
        strikeCooldown.current = 20;
        strikeDist = 65;
        weaponDmg = 2;
        particlesColor = "#e0e7ff";
        break;
      case "Cursed Cutlass":
        strikeCooldown.current = 16;
        strikeDist = 75;
        weaponDmg = 3;
        particlesColor = "#06b6d4";
        break;
      default:
        strikeCooldown.current = 30; // Fists
        strikeDist = 42;
        weaponDmg = 1;
    }

    sound.playFootstep(); // play whoosh swing thud
    const p = playerRef.current;

    // Directional vector offset
    let targetX = p.x;
    let targetY = p.y;
    if (p.direction === "up") targetY -= strikeDist / 1.5;
    if (p.direction === "down") targetY += strikeDist / 1.5;
    if (p.direction === "left") targetX -= strikeDist / 1.5;
    if (p.direction === "right") targetX += strikeDist / 1.5;

    // Check hit on Frog
    const f = frogRef.current;
    const distToFrog0 = Math.hypot(p.x - f.x, p.y - f.y);
    if (distToFrog0 <= strikeDist) {
      // Frog got hit!
      f.hitsRequired -= weaponDmg;
      sound.playFrogHit();
      spawnParticles(f.x, f.y, "#22c55e", 15);
      spawnFloatingText(f.x, f.y, "-RIBBIT!-", "#4ade80");
      frogAnimRef.current.hitTimer = 30;

      if (f.hitsRequired <= 0) {
        // Frog drops key!
        const keyId = `key_${Math.random()}`;
        keyPickupsRef.current.push({
          id: keyId,
          x: f.x,
          y: f.y,
          collected: false
        });
        spawnParticles(f.x, f.y, "#eab308", 20);
        spawnFloatingText(f.x, f.y, "+1 Key Dropped", "#facc15");
        progressionRef.current = "KEY_OBTAINED";

        // Relocate frog
        const frogSpawns = [
          { x: 300, y: 160 },
          { x: 380, y: 520 },
          { x: 620, y: 200 },
          { x: 800, y: 440 },
          { x: 480, y: 360 }
        ];

        // Find a spot far from the player
        let bestSpot = frogSpawns[0];
        let maxDist = 0;
        frogSpawns.forEach(spot => {
          const d = Math.hypot(p.x - spot.x, p.y - spot.y);
          if (d > maxDist) {
            maxDist = d;
            bestSpot = spot;
          }
        });

        // Set frog characteristics for next cycle with scaling
        f.x = bestSpot.x;
        f.y = bestSpot.y;
        f.hitsRequired = 1 + Math.floor(level / 4);
        f.magicalCharge = 40; // give it a sparkly bubble effect when teleporting!
      } else {
        // Make the frog hop to a random adjacent tile corridor to escape
        const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        const randomAngle = angles[Math.floor(Math.random() * angles.length)];
        const escapeX = f.x + Math.cos(randomAngle) * 60;
        const escapeY = f.y + Math.sin(randomAngle) * 60;

        if (!checkWallCollision(escapeX, escapeY, f.radius)) {
          f.x = escapeX;
          f.y = escapeY;
        }
      }
    } else {
      // Check collision on locked chests, open them if keysCount > 0
      chestsRef.current.forEach(chest => {
        if (!chest.opened) {
          const distToChest = Math.hypot(p.x - chest.x, p.y - chest.y);
          if (distToChest <= strikeDist) {
            if (keysCount > 0 && progressionRef.current === "KEY_OBTAINED") {
              chest.opened = true;
              // Trigger chest open animation
              const cAnim = chestAnimRef.current[chest.id];
              if (cAnim) {
                cAnim.openAnimPlaying = true;
                cAnim.frame = 4; // First opening frame
                cAnim.timer = 0;
              }
              setKeysCount(prev => prev - 1);
              sound.playChestOpen();
              spawnParticles(chest.x, chest.y, "#ffd700", 30);

              // Determine random upgrade logically
              const pool: Array<{ type: any, name: string }> = [];
              if (speedMultiplier < 1.6) pool.push({ type: "speed", name: "Swashbuckler Boots (+Speed)" });
              if (visionMultiplier < 1.8) pool.push({ type: "vision", name: "Brass Spyglass (+Vision)" });
              if (!isSilenced) pool.push({ type: "silence", name: "Shadow Cloak (+Stealth)" });
              if (!hasClue) pool.push({ type: "clue", name: "Smuggler's Map (Reveals Jewel)" });
              if (activeWeapon !== "Cursed Cutlass") pool.push({ type: "weapon", name: "Blacksmith Kit (+Weapon)" });

              let randomUpgrade = { type: "score", name: "Pouch of Gold (+500)" };
              if (pool.length > 0) {
                randomUpgrade = pool[Math.floor(Math.random() * pool.length)];
              }

              chest.upgradeType = randomUpgrade.type;
              chest.upgradeName = randomUpgrade.name;

              spawnFloatingText(chest.x, chest.y - 15, "Unlocked!", "#fbbf24");

              applyChestUpgrade(chest.upgradeType, chest.upgradeName);

              progressionRef.current = "CHEST_UNLOCKED";
              progressionRef.current = "ARTIFACT_ACTIVE";
              spawnFloatingText(p.x, p.y - 40, "ARTIFACT UNLOCKED!", "#a855f7");
            } else if (keysCount > 0) {
              spawnFloatingText(chest.x, chest.y - 15, "Locked by Frog!", "#ef4444");
            } else {
              spawnFloatingText(chest.x, chest.y - 10, "Needs Key!", "#f87171");
            }
          }
        }
      });
    }

    // Spawn swing particles
    spawnParticles(targetX, targetY, particlesColor, 6);
  };

  const applyChestUpgrade = (type: string, name: string) => {
    onUpgradeFound(name);
    sound.playUpgrade();

    switch (type) {
      case "speed":
        setSpeedMultiplier(prev => prev + 0.15);
        break;
      case "vision":
        setVisionMultiplier(prev => prev + 0.25);
        break;
      case "clue":
        setHasClue(true);
        break;
      case "silence":
        setIsSilenced(true);
        break;
      case "score":
        setScore(prev => prev + 500);
        break;
      case "weapon":
        // Upgrade current weapon level
        if (activeWeapon === "Fists") {
          setActiveWeapon("Wooden Dagger");
        } else if (activeWeapon === "Wooden Dagger") {
          setActiveWeapon("Iron Blade");
        } else {
          setActiveWeapon("Cursed Cutlass");
        }
        break;
      default:
        break;
    }
  };

  // Main canvas animation and game loop setup
  useEffect(() => {
    let animFrameId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Disable image smoothing for crisp pixel-art sprites
    ctx.imageSmoothingEnabled = false;
    (ctx as any).mozImageSmoothingEnabled = false;
    (ctx as any).webkitImageSmoothingEnabled = false;
    (ctx as any).msImageSmoothingEnabled = false;

    const updateGame = () => {
      if (status !== "playing") return;

      const p = playerRef.current;
      const keys = keysPressedRef.current;

      // Update attack cooldown
      if (strikeCooldown.current > 0) {
        strikeCooldown.current--;
      }

      // Check space key for strike action
      if (keys[" "]) {
        playerAttack();
        keys[" "] = false; // ensure single trigger per heavy tap
      }

      // Determine movement vector
      let dx = 0;
      let dy = 0;

      if (keys["w"] || keys["arrowup"]) {
        dy = -1;
        p.direction = "up";
      } else if (keys["s"] || keys["arrowdown"]) {
        dy = 1;
        p.direction = "down";
      }

      if (keys["a"] || keys["arrowleft"]) {
        dx = -1;
        p.direction = "left";
      } else if (keys["d"] || keys["arrowright"]) {
        dx = 1;
        p.direction = "right";
      }

      // Apply upgrades & load
      let finalSpeed = p.speed * speedMultiplier;
      if (p.hasArtifact) {
        finalSpeed *= 0.75; // Slower when carrying the heavy glowing artifact!
      }

      // Update sprite animation
      const pAnim = playerAnimRef.current;
      if (dx !== 0 || dy !== 0) {
        pAnim.isMoving = true;
        pAnim.timer++;
        if (pAnim.timer > 6) { // 6 frames per animation step
          pAnim.frame = (pAnim.frame + 1) % 6; // 6 run frames (or wraps for 4 idle frames via renderer)
          pAnim.timer = 0;
        }
      } else {
        pAnim.isMoving = false;
        pAnim.frame = 0; // idle frame
        pAnim.timer = 0;
      }

      // Normalise speed vector
      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      // Slid-able physics movement
      const newX = p.x + dx * finalSpeed;
      const newY = p.y + dy * finalSpeed;

      if (!checkWallCollision(newX, p.y, p.radius)) {
        p.x = newX;
      }
      if (!checkWallCollision(p.x, newY, p.radius)) {
        p.y = newY;
      }

      // Step footstep audio trigger periodically if moving
      if ((dx !== 0 || dy !== 0) && Math.random() < 0.08) {
        sound.playFootstep();
      }

      // Check pick up keys dropped by frog
      keyPickupsRef.current.forEach(kp => {
        if (!kp.collected) {
          const d = Math.hypot(p.x - kp.x, p.y - kp.y);
          if (d <= p.radius + 18) {
            kp.collected = true;
            setKeysCount(prev => prev + 1);
            sound.playKeyPickup();
            spawnParticles(kp.x, kp.y, "#ffd700", 12);
            spawnFloatingText(kp.x, kp.y, "+1 Stronghold Key", "#fbbf24");
          }
        }
      });

      // Check pickup artifact goblet
      const art = artifactRef.current;
      if (!art.collected && progressionRef.current === "ARTIFACT_ACTIVE") {
        const d = Math.hypot(p.x - art.x, p.y - art.y);
        if (d <= p.radius + 20) {
          art.collected = true;
          p.hasArtifact = true;
          progressionRef.current = "ARTIFACT_STOLEN";
          progressionRef.current = "ESCAPE_ACTIVE";
          sound.playArtifactPickup();
          spawnParticles(art.x, art.y, "#9333ea", 40);
          spawnFloatingText(art.x, art.y, "CURSED ARTIFACT SEIZED!", "#a855f7");
          spawnFloatingText(art.x, art.y - 20, "ESCAPE TO THE BOAT!", "#f43f5e");
        }
      } else if (!art.collected && progressionRef.current !== "ARTIFACT_ACTIVE") {
        const d = Math.hypot(p.x - art.x, p.y - art.y);
        if (d <= p.radius + 20 && Math.random() < 0.02) {
          spawnFloatingText(art.x, art.y - 20, "Locked! Open a chest!", "#ef4444");
        }
      }

      // Check escape boat extraction
      if (p.hasArtifact && progressionRef.current === "ESCAPE_ACTIVE") {
        const dToBoat = Math.hypot(p.x - boatRef.current.x, p.y - boatRef.current.y);
        if (dToBoat <= 40) {
          // SUCCESSFULLY ESCAPED OUT! Increment score & restart round
          progressionRef.current = "ROUND_COMPLETE";
          sound.playExtractionVictory();
          setScore(prev => prev + 100 * level);
          setLevel(prev => prev + 1);
          setStatus("level_up");
        }
      }

      // Update guards patrol cycles
      let anyEnemyDetectsPlayer = false;

      enemiesRef.current.forEach(enemy => {
        // Patrol node progression
        const targetNode = enemy.patrolPath[enemy.pathIdx];
        const distToNode = Math.hypot(enemy.x - targetNode.x, enemy.y - targetNode.y);

        let isMoving = false;

        if (enemy.state === "patrol") {
          if (distToNode <= 5) {
            enemy.pathIdx = (enemy.pathIdx + 1) % enemy.patrolPath.length;
          } else {
            isMoving = true;
            // Face and walk smoothly to the target cell point
            const angle = Math.atan2(targetNode.y - enemy.y, targetNode.x - enemy.x);
            enemy.direction = angle;
            enemy.x += Math.cos(angle) * enemy.speed;
            enemy.y += Math.sin(angle) * enemy.speed;
          }
        } else if (enemy.state === "investigate") {
          // Walk cautiously toward search site — SLOWER than patrol to feel fair
          if (enemy.targetX && enemy.targetY) {
            const distToSearchSpot = Math.hypot(enemy.x - enemy.targetX, enemy.y - enemy.targetY);
            if (distToSearchSpot <= 10) {
              enemy.waitTicks++;
              enemy.direction += 0.05; // look around
              if (enemy.waitTicks > 60) {
                // Give up quickly — return to normal patrol
                enemy.state = "patrol";
                enemy.waitTicks = 0;
              }
            } else {
              isMoving = true;
              const angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
              enemy.direction = angle;
              // Investigation speed is SLOWER than patrol (cautious approach, not aggressive chase)
              enemy.x += Math.cos(angle) * (enemy.speed * 0.9);
              enemy.y += Math.sin(angle) * (enemy.speed * 0.9);
            }
          }
        }

        const eAnim = enemiesAnimRef.current[enemy.id];
        if (eAnim) {
          eAnim.isMoving = isMoving;
          if (isMoving) {
            eAnim.timer++;
            if (eAnim.timer > 6) { // 6 frames per step
              eAnim.frame = (eAnim.frame + 1) % 13; // 13 walk frames
              eAnim.timer = 0;
            }
          } else {
            eAnim.timer++;
            if (eAnim.timer > 12) { // slower idle breathing cycle
              eAnim.frame = (eAnim.frame + 1) % 7; // cycle idle frames
              eAnim.timer = 0;
            }
          }
        }

        // Sight check: does enemy sight cone spot player?
        const distToPlayer = Math.hypot(enemy.x - p.x, enemy.y - p.y);
        // Vision range: 130px base (was 170), +40 if player carries artifact
        const maxVisionRange = 130 + (playerRef.current.hasArtifact ? 40 : 0);

        if (distToPlayer <= maxVisionRange) {
          // Check angle bounds — narrower cone for fairness
          const angleToPlayer = Math.atan2(p.y - enemy.y, p.x - enemy.x);
          const angleDiff = Math.abs(Math.atan2(Math.sin(angleToPlayer - enemy.direction), Math.cos(angleToPlayer - enemy.direction)));

          const coneHaff = Math.PI / 5; // ~36 degree vision cone each side (was 45)
          if (angleDiff <= coneHaff) {
            // Player is in vision cone! Check grid obstacle blockage so we can hide behind crates
            let hasLineOfSight = true;

            // Cast ray to detect blocking dungeon blocks
            const raySteps = 15;
            for (let i = 1; i < raySteps; i++) {
              const checkX = enemy.x + (p.x - enemy.x) * (i / raySteps);
              const checkY = enemy.y + (p.y - enemy.y) * (i / raySteps);

              const gCol = Math.floor(checkX / TILE_SIZE);
              const gRow = Math.floor(checkY / TILE_SIZE);

              const solidTile = tilesRef.current.find(t => t.x === gCol && t.y === gRow);
              if (solidTile && (solidTile.type === "wall" || solidTile.type === "barrel")) {
                hasLineOfSight = false;
                break;
              }
            }

            if (hasLineOfSight) {
              anyEnemyDetectsPlayer = true;
              enemy.state = "investigate";
              enemy.targetX = p.x;
              enemy.targetY = p.y;
              enemy.waitTicks = 0;

              // Grace period: enemy needs time to "recognize" the player
              // Level 1: ~30 frames (~0.5s) of grace before panic builds
              // Level 6+: ~10 frames (~0.17s) — near-instant detection
              const graceThreshold = Math.max(10, 35 - level * 4);
              detectionGraceRef.current++;

              if (detectionGraceRef.current >= graceThreshold) {
                // Play alert sound once when grace period ends
                if (!alertSoundPlayedRef.current) {
                  sound.playAlert();
                  alertSoundPlayedRef.current = true;
                }

                if (enemy.alertProgress < 100) {
                  // Panic raise scales with level:
                  // Level 1: ~0.5 (very forgiving, brief sightings survivable)
                  // Level 3: ~1.1 (noticeable pressure)
                  // Level 6+: ~2.0-2.7 (punishing, lingering = death)
                  let raiseVel = 0.3 + Math.min(2.4, level * 0.35);
                  if (isSilenced) raiseVel *= 0.55;
                  setPanicValue(prev => Math.min(100, prev + raiseVel));
                }
              }
            }
          }
        }
      });

      // Panic decay when hidden — fast early, slow late
      // Level 1: 0.5 (quick recovery, mistakes are forgiving)
      // Level 3: 0.35 (moderate recovery)
      // Level 6+: 0.15 (panic lingers, demands precision)
      if (!anyEnemyDetectsPlayer) {
        const panicDecay = Math.max(0.1, 0.6 - level * 0.07);
        setPanicValue(prev => Math.max(0, prev - panicDecay));
        alertSoundPlayedRef.current = false;
        // Grace timer drains when hidden (but not instantly — simulates enemy suspicion fading)
        if (detectionGraceRef.current > 0) {
          detectionGraceRef.current = Math.max(0, detectionGraceRef.current - 2);
        }
      }

      // Check panic limit for Game Over state
      if (panicValue >= 100) {
        sound.playLoss();
        setStatus("gameover");
      }

      // Particle physics ticks
      particlesRef.current.forEach(part => {
        part.x += part.vx;
        part.y += part.vy;
        part.life++;
      });
      particlesRef.current = particlesRef.current.filter(part => part.life < part.maxLife);

      // Pulse effects on magical charges
      if (frogRef.current.magicalCharge > 0) {
        frogRef.current.magicalCharge--;
      }
      if (frogAnimRef.current.hitTimer > 0) {
        frogAnimRef.current.hitTimer--;
      }

      artifactRef.current.pulseTimer += 0.05;

      // Chest animation ticks
      chestsRef.current.forEach(chest => {
        const cAnim = chestAnimRef.current[chest.id];
        if (!cAnim) return;

        cAnim.timer++;
        if (cAnim.openAnimPlaying) {
          // Opening animation: frames 4-7, one-shot
          if (cAnim.timer > 8) {
            cAnim.timer = 0;
            cAnim.frame++;
            if (cAnim.frame >= 8) {
              cAnim.frame = 7; // Stay on final open frame
              cAnim.openAnimPlaying = false;
              cAnim.openAnimDone = true;
            }
          }
        } else if (!chest.opened) {
          // Idle shimmer: cycle frames 0-3
          if (cAnim.timer > 10) {
            cAnim.timer = 0;
            cAnim.frame = (cAnim.frame + 1) % 4;
          }
        }
      });

      // Floating text animations
      floatingTextsRef.current.forEach(ft => {
        ft.y -= 0.5;
        ft.life--;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.life > 0);
    };

    const renderGame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw the floor tiles layer deterministically
      let floorPattern: CanvasPattern | null = null;
      if (images.floor.complete && images.floor.naturalWidth > 0) {
        floorPattern = ctx.createPattern(images.floor, "repeat");
      }

      tilesRef.current.forEach(tile => {
        const tx = tile.x * TILE_SIZE;
        const ty = tile.y * TILE_SIZE;

        switch (tile.type) {
          case "water":
            // Animated rippled sea tile
            ctx.fillStyle = "#1e3a8a";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "#1d4ed8";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx, ty + TILE_SIZE / 2 + Math.sin(Date.now() / 150 + tx) * 4);
            ctx.lineTo(tx + TILE_SIZE, ty + TILE_SIZE / 2 + Math.sin(Date.now() / 150 + tx) * 4);
            ctx.stroke();
            break;
          case "dock":
            // Heavy brown wood boards
            ctx.fillStyle = "#451a03";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "#78350f";
            ctx.lineWidth = 2;
            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
            break;
          case "beach":
            // Sand styling
            ctx.fillStyle = "#ca8a04";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            // Little dots representing granules
            ctx.fillStyle = "#b45309";
            ctx.fillRect(tx + 8, ty + 10, 2, 2);
            ctx.fillRect(tx + 24, ty + 30, 2, 2);
            break;
          case "wall":
            // Obsidian stone stronghold bounds with highlighting lines
            ctx.fillStyle = "#1f2937";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "#111827";
            ctx.lineWidth = 3;
            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
            // Accent inner block
            ctx.fillStyle = "#374151";
            ctx.fillRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            break;
          case "barrel":
            // Solid barrier obstacles
            ctx.fillStyle = "#78350f";
            ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            // Draw barrel wraps
            ctx.fillStyle = "#4b5563";
            ctx.fillRect(tx + 2, ty + 10, TILE_SIZE - 4, 3);
            ctx.fillRect(tx + 2, ty + 26, TILE_SIZE - 4, 3);
            break;
          case "lantern":
            // Warm background deck wood
            ctx.fillStyle = "#27272a";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            break;
          default: // interior walk floor
            if (floorPattern) {
              ctx.fillStyle = floorPattern;
              ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            } else {
              ctx.fillStyle = "#18181b";
              ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
              ctx.strokeStyle = "#27272a";
              ctx.lineWidth = 1;
              ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
            }
            break;
        }
      });

      // 2. Draw Docked Escape Pirate Sloop/Boat in beach dock zone
      const bX = boatRef.current.x;
      const bY = boatRef.current.y;
      const isEscapeActive = progressionRef.current === "ESCAPE_ACTIVE" && playerRef.current.hasArtifact;

      // Glow changes when escape is active — green pulsing beacon
      if (isEscapeActive) {
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 25 + Math.sin(Date.now() / 150) * 10;
      } else {
        ctx.shadowColor = "#3b82f6";
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = "#78350f";
      // Boat Hull shape
      ctx.beginPath();
      ctx.moveTo(bX - 25, bY - 15);
      ctx.lineTo(bX + 15, bY - 15);
      ctx.lineTo(bX + 30, bY);
      ctx.lineTo(bX + 15, bY + 15);
      ctx.lineTo(bX - 25, bY + 15);
      ctx.closePath();
      ctx.fill();

      // Boat mast or sail
      ctx.fillStyle = isEscapeActive ? "#bbf7d0" : "#f3f4f6";
      ctx.beginPath();
      ctx.moveTo(bX - 5, bY - 10);
      ctx.lineTo(bX + 10, bY);
      ctx.lineTo(bX - 5, bY + 10);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0; // reset

      // Draw the Cursed Artifact pedestal in deep stronghold if not collected
      const art = artifactRef.current;
      if (!art.collected) {
        // Larger pedestal for readability
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(art.x - 18, art.y - 18, 36, 36);
        ctx.strokeStyle = "#4b5563";
        ctx.lineWidth = 2;
        ctx.strokeRect(art.x - 18, art.y - 18, 36, 36);

        // Pulsing mysterious jewel — larger core
        const pulseRatio = Math.sin(art.pulseTimer * 4) * 3;
        ctx.shadowColor = progressionRef.current === "ARTIFACT_ACTIVE" ? "#a855f7" : "#fbbf24";
        ctx.shadowBlur = 30 + pulseRatio * 3;
        ctx.fillStyle = "#c084fc"; // Purple core
        ctx.beginPath();
        ctx.arc(art.x, art.y, 10 + pulseRatio, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 3. Draw Animated Chests (spritesheet: 240x256, 8 cols x 8 rows, 30x32 per frame)
      const chestImg = images.chestSheet;
      const CHEST_COLS = 8;
      const CHEST_FRAME_W = 30; // 240 / 8
      const CHEST_FRAME_H = 32; // 256 / 8
      const CHEST_ROW = 3;      // Gold ornate chest row
      const CHEST_DEST = 48;    // Rendered size on canvas

      chestsRef.current.forEach(chest => {
        const cAnim = chestAnimRef.current[chest.id] || { frame: 0, timer: 0, openAnimPlaying: false, openAnimDone: false };

        // Warm gold glow — brighter when closed for visibility in darkness
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = chest.opened ? 6 : 14 + Math.sin(Date.now() / 200) * 4;

        if (chestImg.complete && chestImg.naturalWidth > 0) {
          // Slice the correct frame from the spritesheet
          const col = cAnim.frame % CHEST_COLS;
          const sx = col * CHEST_FRAME_W;
          const sy = CHEST_ROW * CHEST_FRAME_H;

          ctx.drawImage(
            chestImg,
            sx, sy, CHEST_FRAME_W, CHEST_FRAME_H,
            chest.x - CHEST_DEST / 2, chest.y - CHEST_DEST / 2, CHEST_DEST, CHEST_DEST
          );
        } else {
          // Fallback primitives if spritesheet failed to load
          if (!chest.opened) {
            ctx.fillStyle = "#d97706";
            ctx.fillRect(chest.x - 15, chest.y - 10, 30, 20);
            ctx.strokeStyle = "#78350f";
            ctx.lineWidth = 2;
            ctx.strokeRect(chest.x - 15, chest.y - 10, 30, 20);
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(chest.x - 4, chest.y - 2, 8, 8);
          } else {
            ctx.fillStyle = "#451a03";
            ctx.fillRect(chest.x - 15, chest.y - 10, 30, 10);
            ctx.fillStyle = "#fbbf24";
            ctx.fillRect(chest.x - 15, chest.y, 30, 10);
          }
        }

        ctx.shadowBlur = 0; // reset
      });

      // 4. Draw key pickups on ground — with glow and pulse
      keyPickupsRef.current.forEach(kp => {
        if (!kp.collected) {
          const keyPulse = Math.sin(Date.now() / 200) * 2;
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 12 + keyPulse;

          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 8 + keyPulse / 2, 0, Math.PI * 2);
          ctx.fill();
          // Draw metallic stem
          ctx.strokeStyle = "#fde68a";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(kp.x, kp.y);
          ctx.lineTo(kp.x + 10, kp.y + 5);
          ctx.stroke();
          // Key teeth
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(kp.x + 10, kp.y + 5);
          ctx.lineTo(kp.x + 10, kp.y + 9);
          ctx.moveTo(kp.x + 8, kp.y + 5);
          ctx.lineTo(kp.x + 8, kp.y + 8);
          ctx.stroke();

          ctx.shadowBlur = 0;
        }
      });

      // 5. Draw magical Giga-Frog God
      const f = frogRef.current;
      const chargePulse = Math.sin(Date.now() / 100) * 2;

      ctx.shadowColor = "#4ade80"; // Bright magical green frog glow
      ctx.shadowBlur = f.magicalCharge > 0 ? f.magicalCharge : 12; // Always glow a bit

      // Frog Green base body
      const fAnim = frogAnimRef.current;
      const bobY = Math.sin(Date.now() / 150) * 2;

      let frogImg = images.frog_idle;
      if (fAnim.hitTimer > 0 || f.magicalCharge > 0) {
        frogImg = images.frog_key;
      }

      if (frogImg.complete && frogImg.naturalWidth > 0) {
        // Single-frame sprites — scale for visibility
        const FROG_DEST = 64;
        const destSize = FROG_DEST + chargePulse;

        ctx.drawImage(
          frogImg,
          0, 0, frogImg.naturalWidth, frogImg.naturalHeight,
          f.x - destSize / 2,
          f.y - destSize / 2 + bobY,
          destSize,
          destSize
        );
      } else {
        // Fallback
        ctx.fillStyle = (fAnim.hitTimer > 0 || f.magicalCharge > 0) ? "#15803d" : "#16a34a";
        ctx.beginPath();
        ctx.arc(f.x, f.y + bobY, f.radius + chargePulse, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0; // reset

      // 6. Draw Guard vision cones & Alert Indicators
      enemiesRef.current.forEach(enemy => {
        // Draw vision cone gradient
        const vRadius = 130 + (playerRef.current.hasArtifact ? 40 : 0);
        const coneH = Math.PI / 5;

        ctx.shadowColor = enemy.state === "investigate" ? "#ef4444" : "#f59e0b";
        ctx.shadowBlur = 10;
        ctx.fillStyle = enemy.state === "investigate" ? "rgba(239, 68, 68, 0.25)" : "rgba(245, 158, 11, 0.15)";

        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.arc(
          enemy.x,
          enemy.y,
          vRadius,
          enemy.direction - coneH,
          enemy.direction + coneH
        );
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Draw animated enemy sprite — individual frame images
        const eAnim = enemiesAnimRef.current[enemy.id] || { frame: 0, isMoving: false };

        // Select frame array based on movement state
        const enemyFrames = eAnim.isMoving ? images.enemyWalk : images.enemyIdle;
        const frameIdx = eAnim.frame % enemyFrames.length;
        const enemyFrame = enemyFrames[frameIdx];

        if (enemyFrame && enemyFrame.complete && enemyFrame.naturalWidth > 0) {
          const ENEMY_DEST = 48;

          ctx.shadowColor = "#ef4444"; // Malicious red glow for readability
          ctx.shadowBlur = enemy.state === "investigate" ? 18 : 8;

          ctx.drawImage(
            enemyFrame,
            0, 0, enemyFrame.naturalWidth, enemyFrame.naturalHeight,
            enemy.x - ENEMY_DEST / 2, enemy.y - ENEMY_DEST / 2, ENEMY_DEST, ENEMY_DEST
          );

          ctx.shadowBlur = 0;
        } else {
          // Fallback primitive
          ctx.fillStyle = "#e0e7ff";
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Alert state indicator \u2014 shows ? during grace, ! during full detection
        if (enemy.state === "investigate") {
          const graceThreshold = Math.max(10, 35 - level * 4);
          if (detectionGraceRef.current < graceThreshold) {
            // Suspicion phase \u2014 yellow "?"
            ctx.fillStyle = "#fbbf24";
            ctx.font = "bold 16px monospace";
            ctx.fillText("?", enemy.x - 4, enemy.y - 16);
          } else {
            // Full detection \u2014 red "!"
            ctx.fillStyle = "#ef4444";
            ctx.font = "bold 16px monospace";
            ctx.fillText("!", enemy.x - 4, enemy.y - 16);
          }
        }
      });

      // 7. Draw Player (Pirate) — individual frame sprites (3x: 120x87 each)
      const p = playerRef.current;
      const pAnim = playerAnimRef.current;

      // Select correct frame array based on movement state
      const frameSet = pAnim.isMoving ? images.playerRun : images.playerIdle;
      const frameIdx = pAnim.frame % frameSet.length;
      const currentFrame = frameSet[frameIdx];

      if (currentFrame && currentFrame.complete && currentFrame.naturalWidth > 0) {
        // Native ratio is 40:29 — scale to ~44px wide, preserve aspect
        const PLAYER_W = 72;
        const PLAYER_H = Math.round(PLAYER_W * (currentFrame.naturalHeight / currentFrame.naturalWidth));
        const flipX = p.direction === "left"; // mirror for left-facing

        ctx.shadowColor = "#f97316"; // Warm orange lantern glow
        ctx.shadowBlur = 18;

        ctx.save();
        if (flipX) {
          ctx.translate(p.x, p.y);
          ctx.scale(-1, 1);
          ctx.drawImage(
            currentFrame,
            0, 0, currentFrame.naturalWidth, currentFrame.naturalHeight,
            -PLAYER_W / 2, -PLAYER_H / 2, PLAYER_W, PLAYER_H
          );
        } else {
          ctx.drawImage(
            currentFrame,
            0, 0, currentFrame.naturalWidth, currentFrame.naturalHeight,
            p.x - PLAYER_W / 2, p.y - PLAYER_H / 2, PLAYER_W, PLAYER_H
          );
        }
        ctx.restore();
        ctx.shadowBlur = 0; // reset

        // Draw equipped weapon indicator icon next to player
        if (activeWeapon !== "Fists") {
          let bladeColor = "#cbd5e1";
          if (activeWeapon === "Cursed Cutlass") bladeColor = "#06b6d4";
          ctx.strokeStyle = bladeColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x + 10, p.y);
          ctx.lineTo(p.x + 18, p.y + 8);
          ctx.stroke();
        }
      } else {
        // Fallback if image isn't loaded yet
        ctx.fillStyle = "#b45309";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glow artifact halo around the carry state sack
      if (p.hasArtifact) {
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#c084fc";
        ctx.beginPath();
        ctx.arc(p.x, p.y + 6, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 8. Dynamic Fog of War Lighting Overlay
      const fogBuffer = document.createElement("canvas");
      fogBuffer.width = canvas.width;
      fogBuffer.height = canvas.height;
      const bCtx = fogBuffer.getContext("2d");

      if (bCtx) {
        // Fill full dark map
        bCtx.fillStyle = "rgba(4, 5, 8, 0.95)";
        bCtx.fillRect(0, 0, canvas.width, canvas.height);

        // Set composite function to carve light channels
        bCtx.globalCompositeOperation = "destination-out";

        // Carve Player sight (Visual view field)
        const lightRad = 150 * visionMultiplier;
        const playerGlow = bCtx.createRadialGradient(
          p.x, p.y, 5,
          p.x, p.y, lightRad
        );
        playerGlow.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        playerGlow.addColorStop(0.4, "rgba(255, 255, 255, 0.7)");
        playerGlow.addColorStop(1, "rgba(255, 255, 255, 0.0)");

        bCtx.fillStyle = playerGlow;
        bCtx.beginPath();
        bCtx.arc(p.x, p.y, lightRad, 0, Math.PI * 2);
        bCtx.fill();

        // Carve wall light lanterns for glowing visibility zones
        tilesRef.current.forEach(tile => {
          if (tile.type === "lantern") {
            const lx = tile.x * TILE_SIZE + TILE_SIZE / 2;
            const ly = tile.y * TILE_SIZE + TILE_SIZE / 2;

            const latGlow = bCtx.createRadialGradient(
              lx, ly, 4,
              lx, ly, 100
            );
            latGlow.addColorStop(0, "rgba(255, 255, 255, 0.9)");
            latGlow.addColorStop(1, "rgba(255, 255, 255, 0.0)");

            bCtx.fillStyle = latGlow;
            bCtx.beginPath();
            bCtx.arc(lx, ly, 100, 0, Math.PI * 2);
            bCtx.fill();
          }
        });

        // Overlay the carved dark buffer on main gameplay sheet
        ctx.drawImage(fogBuffer, 0, 0);
      }

      // 9. Draw Warm Orange Amber hue on top of lanterns for atmospheric warmth
      tilesRef.current.forEach(tile => {
        if (tile.type === "lantern") {
          const lX = tile.x * TILE_SIZE + TILE_SIZE / 2;
          const lY = tile.y * TILE_SIZE + TILE_SIZE / 2;

          ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
          ctx.beginPath();
          ctx.arc(lX, lY, 15, 0, Math.PI * 2);
          ctx.fill();

          // Golden core
          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.arc(lX, lY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 10. Map clue clue overlay drawer line towards target
      if (hasClue && !p.hasArtifact) {
        // Draw small gold directional guides on the outer margins pointing to artifact!
        const angleToArt = Math.atan2(art.y - p.y, art.x - p.x);
        const compassX = p.x + Math.cos(angleToArt) * 45;
        const compassY = p.y + Math.sin(angleToArt) * 45;

        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(compassX, compassY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 11. Particles & effects rendering
      particlesRef.current.forEach(part => {
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 12. Floating text boxes
      floatingTextsRef.current.forEach(ft => {
        ctx.fillStyle = ft.color;
        ctx.font = "bold 13px monospace";
        ctx.fillText(ft.text, ft.x - ctx.measureText(ft.text).width / 2, ft.y);
      });

      // 13. Interaction prompts — contextual guidance drawn on top of everything
      const pp = playerRef.current;
      const PROMPT_DIST = 80;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";

      // Frog prompt
      const dToFrog = Math.hypot(pp.x - frogRef.current.x, pp.y - frogRef.current.y);
      if (dToFrog <= PROMPT_DIST && progressionRef.current === "SEARCHING_FOR_FROG") {
        ctx.fillStyle = "#4ade80";
        ctx.fillText("[ SPACE ] HIT FROG", frogRef.current.x, frogRef.current.y - 40);
      }

      // Key prompt
      keyPickupsRef.current.forEach(kp => {
        if (!kp.collected) {
          const dToKey = Math.hypot(pp.x - kp.x, pp.y - kp.y);
          if (dToKey <= PROMPT_DIST) {
            ctx.fillStyle = "#fbbf24";
            ctx.fillText("WALK OVER TO COLLECT", kp.x, kp.y - 20);
          }
        }
      });

      // Chest prompt
      chestsRef.current.forEach(chest => {
        if (!chest.opened) {
          const dToChest = Math.hypot(pp.x - chest.x, pp.y - chest.y);
          if (dToChest <= PROMPT_DIST) {
            if (keysCount > 0 && progressionRef.current === "KEY_OBTAINED") {
              ctx.fillStyle = "#fbbf24";
              ctx.fillText("[ SPACE ] OPEN CHEST", chest.x, chest.y - 32);
            } else {
              ctx.fillStyle = "#ef4444";
              ctx.fillText("\uD83D\uDD12 NEED FROG KEY", chest.x, chest.y - 32);
            }
          }
        }
      });

      // Artifact prompt
      if (!artifactRef.current.collected) {
        const dToArt = Math.hypot(pp.x - artifactRef.current.x, pp.y - artifactRef.current.y);
        if (dToArt <= PROMPT_DIST) {
          if (progressionRef.current === "ARTIFACT_ACTIVE") {
            ctx.fillStyle = "#c084fc";
            ctx.fillText("WALK OVER TO STEAL", artifactRef.current.x, artifactRef.current.y - 28);
          } else if (progressionRef.current !== "ESCAPE_ACTIVE" && progressionRef.current !== "ROUND_COMPLETE") {
            ctx.fillStyle = "#ef4444";
            ctx.fillText("\uD83D\uDD12 OPEN CHEST FIRST", artifactRef.current.x, artifactRef.current.y - 28);
          }
        }
      }

      // Boat extraction prompt
      if (isEscapeActive) {
        const dToBoat = Math.hypot(pp.x - bX, pp.y - bY);
        if (dToBoat <= 120) {
          const pulseAlpha = 0.7 + Math.sin(Date.now() / 150) * 0.3;
          ctx.fillStyle = `rgba(34, 197, 94, ${pulseAlpha})`;
          ctx.font = "bold 14px monospace";
          ctx.fillText("\u2693 EXTRACT HERE!", bX, bY - 28);
        }
      }

      ctx.textAlign = "start"; // reset
    };

    // Frame loops coupling
    const loop = () => {
      updateGame();
      renderGame();
      animFrameId = requestAnimationFrame(loop);
    };

    // Begin loop immediately if playing
    if (status === "playing") {
      loop();
    } else {
      // Just render fallback template once
      renderGame();
    }

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [status, panicValue, level, speedMultiplier, visionMultiplier, isSilenced, hasClue, activeWeapon]);

  return (
    <div className="relative flex-1 bg-[#121212] overflow-hidden w-full flex justify-center items-center p-4 border-2 border-[#1b1b1b] shadow-inner" style={{ backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      {/* Target Canvas Board */}
      <canvas
        id="cursed-keel-canvas"
        ref={canvasRef}
        width={MAP_COLS * TILE_SIZE}
        height={MAP_ROWS * TILE_SIZE}
        className="block border-[6px] border-[#2e1a0a] bg-[#0d0d0d] shadow-[0_10px_50px_rgba(0,0,0,0.9)] max-w-full h-auto cursor-crosshair"
      />
    </div>
  );
};
