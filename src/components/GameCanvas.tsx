import React, { useRef, useEffect, useState } from "react";
import { sound } from "../sound";
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
  GameStatus
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
    radius: 14,
    hitsRequired: 2,
    escapesRemaining: 3,
    magicalCharge: 0
  });

  const chestsRef = useRef<Chest[]>([]);
  const keyPickupsRef = useRef<KeyPickup[]>([]);
  const artifactRef = useRef<Artifact>({ x: 760, y: 360, collected: false, pulseTimer: 0 });
  
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

    // Spawn Frog in intermediate room 1 or 2 randomly
    const frogSpawnRooms = [
      { x: 320, y: 160 },
      { x: 360, y: 520 },
      { x: 520, y: 240 },
      { x: 560, y: 440 }
    ];
    const pickedFrog = frogSpawnRooms[Math.floor(Math.random() * frogSpawnRooms.length)];
    frogRef.current = {
      x: pickedFrog.x,
      y: pickedFrog.y,
      radius: 14,
      hitsRequired: 2 + Math.floor(lvl / 3),
      escapesRemaining: 3,
      magicalCharge: 0
    };

    // Spawn Locked chests (Upgrades - contents randomized on open)
    chestsRef.current = [
      { id: "chest_1", x: 280, y: 120, opened: false, upgradeType: "score", upgradeName: "" },
      { id: "chest_2", x: 600, y: 120, opened: false, upgradeType: "score", upgradeName: "" },
      { id: "chest_3", x: 880, y: 640, opened: false, upgradeType: "score", upgradeName: "" },
      { id: "chest_4", x: 680, y: 600, opened: false, upgradeType: "score", upgradeName: "" },
    ];

    // Spawn Keys: originally empty, dropped by frog
    keyPickupsRef.current = [];

    // Spawn Cursed Artifact deep inside vault
    artifactRef.current = {
      x: 840,
      y: 360,
      collected: false,
      pulseTimer: 0
    };

    // Enemies generation with scaling patrol vectors
    const enemiesToSpawn: Enemy[] = [];
    const baseCount = 2;
    const maxEnemies = Math.min(6, baseCount + Math.floor(lvl / 2));

    // Dynamic paths for patrols
    const paths = [
      [ { x: 280, y: 240 }, { x: 280, y: 480 } ],
      [ { x: 520, y: 160 }, { x: 520, y: 560 } ],
      [ { x: 720, y: 240 }, { x: 720, y: 480 } ],
      [ { x: 640, y: 480 }, { x: 880, y: 480 } ],
      [ { x: 160, y: 120 }, { x: 400, y: 120 } ],
      [ { x: 680, y: 160 }, { x: 880, y: 160 } ]
    ];

    for (let i = 0; i < maxEnemies; i++) {
      const chosenPath = paths[i % paths.length];
      const startNode = chosenPath[0];
      const patrolSpeed = 1.0 + Math.min(1.5, lvl * 0.15) + (Math.random() * 0.3);

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
    floatingTextsRef.current = [];
    particlesRef.current = [];
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

    switch(activeWeapon) {
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
        f.hitsRequired = 2 + Math.floor(level / 3);
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
            if (keysCount > 0) {
              chest.opened = true;
              setKeysCount(prev => prev - 1);
              sound.playChestOpen();
              spawnParticles(chest.x, chest.y, "#ffd700", 30);
              
              // Determine random upgrade logically
              const pool: Array<{type: any, name: string}> = [];
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
          if (d <= p.radius + 10) {
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
      if (!art.collected) {
        const d = Math.hypot(p.x - art.x, p.y - art.y);
        if (d <= p.radius + 12) {
          art.collected = true;
          p.hasArtifact = true;
          sound.playArtifactPickup();
          spawnParticles(art.x, art.y, "#9333ea", 40);
          spawnFloatingText(art.x, art.y, "CURSED ARTIFAC SEIZED!", "#a855f7");
          spawnFloatingText(art.x, art.y - 20, "ESCAPE TO THE BOAT!", "#f43f5e");
        }
      }

      // Check escape boat extraction
      if (p.hasArtifact) {
        const dToBoat = Math.hypot(p.x - boatRef.current.x, p.y - boatRef.current.y);
        if (dToBoat <= 35) {
          // SUCCESSFULLY ESCAPED OUT! Increment score & restart round
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

        if (enemy.state === "patrol") {
          if (distToNode <= 5) {
            enemy.pathIdx = (enemy.pathIdx + 1) % enemy.patrolPath.length;
          } else {
            // Face and walk smoothly to the target cell point
            const angle = Math.atan2(targetNode.y - enemy.y, targetNode.x - enemy.x);
            enemy.direction = angle;
            enemy.x += Math.cos(angle) * enemy.speed;
            enemy.y += Math.sin(angle) * enemy.speed;
          }
        } else if (enemy.state === "investigate") {
          // Walk carefully to search site targetX / targetY
          if (enemy.targetX && enemy.targetY) {
            const distToSearchSpot = Math.hypot(enemy.x - enemy.targetX, enemy.y - enemy.targetY);
            if (distToSearchSpot <= 10) {
              enemy.waitTicks++;
              enemy.direction += 0.05; // look around
              if (enemy.waitTicks > 120) {
                // Return to normal patrol
                enemy.state = "patrol";
                enemy.waitTicks = 0;
              }
            } else {
              const angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
              enemy.direction = angle;
              enemy.x += Math.cos(angle) * (enemy.speed * 1.2);
              enemy.y += Math.sin(angle) * (enemy.speed * 1.2);
            }
          }
        }

        // Sight check: does enemy sight cone spot player?
        const distToPlayer = Math.hypot(enemy.x - p.x, enemy.y - p.y);
        const maxVisionRange = 170 + (playerRef.current.hasArtifact ? 40 : 0); // higher detection range if carrying artifact!

        if (distToPlayer <= maxVisionRange) {
          // Check angle bounds
          const angleToPlayer = Math.atan2(p.y - enemy.y, p.x - enemy.x);
          const angleDiff = Math.abs(Math.atan2(Math.sin(angleToPlayer - enemy.direction), Math.cos(angleToPlayer - enemy.direction)));
          
          const coneHaff = Math.PI / 4; // 45 degree vision cone on each side
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
              
              if (enemy.alertProgress < 100) {
                // Raise speed of panic bar
                let raiseVel = 1.4;
                if (isSilenced) raiseVel *= 0.65; // quieter boots slow panic
                setPanicValue(prev => Math.min(100, prev + raiseVel));
              }
            }
          }
        }
      });

      // Slowly lower panic value if player is hidden
      if (!anyEnemyDetectsPlayer) {
        setPanicValue(prev => Math.max(0, prev - 0.2));
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
      
      artifactRef.current.pulseTimer += 0.05;

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
            ctx.fillStyle = "#18181b";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "#27272a";
            ctx.lineWidth = 1;
            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
            break;
        }
      });

      // 2. Draw Docked Escape Pirate Sloop/Boat in beach dock zone
      const bX = boatRef.current.x;
      const bY = boatRef.current.y;
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
      ctx.fillStyle = "#f3f4f6";
      ctx.beginPath();
      ctx.moveTo(bX - 5, bY - 10);
      ctx.lineTo(bX + 10, bY);
      ctx.lineTo(bX - 5, bY + 10);
      ctx.closePath();
      ctx.fill();

      // Draw the Cursed Artifact pedestal in deep stronghold if not collected
      const art = artifactRef.current;
      if (!art.collected) {
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(art.x - 14, art.y - 14, 28, 28);
        ctx.strokeStyle = "#4b5563";
        ctx.strokeRect(art.x - 14, art.y - 14, 28, 28);

        // Pulsing mysterious jewel
        const pulseRatio = Math.sin(art.pulseTimer * 4) * 3;
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 15;
        ctx.fillStyle = "#c084fc";
        ctx.beginPath();
        ctx.arc(art.x, art.y, 7 + pulseRatio, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 3. Draw Locked Upgrade Chests
      chestsRef.current.forEach(chest => {
        if (!chest.opened) {
          // Closed Brown treasure box chest
          ctx.fillStyle = "#d97706";
          ctx.fillRect(chest.x - 15, chest.y - 10, 30, 20);
          ctx.strokeStyle = "#78350f";
          ctx.lineWidth = 2;
          ctx.strokeRect(chest.x - 15, chest.y - 10, 30, 20);

          // Iron lock highlight
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(chest.x - 4, chest.y - 2, 8, 8);
        } else {
          // Opened gold leaking state
          ctx.fillStyle = "#451a03";
          ctx.fillRect(chest.x - 15, chest.y - 10, 30, 10);
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(chest.x - 15, chest.y, 30, 10);
        }
      });

      // 4. Draw key pickups on ground
      keyPickupsRef.current.forEach(kp => {
        if (!kp.collected) {
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
          ctx.fill();
          // Draw metallic stem
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(kp.x, kp.y);
          ctx.lineTo(kp.x + 8, kp.y + 4);
          ctx.stroke();
        }
      });

      // 5. Draw magical Giga-Frog God
      const f = frogRef.current;
      const chargePulse = Math.sin(Date.now() / 100) * 2;
      
      if (f.magicalCharge > 0) {
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = f.magicalCharge / 2;
      }
      
      // Frog Green base body
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius + chargePulse, 0, Math.PI * 2);
      ctx.fill();

      // Giant yellow vocal sac chins
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(f.x, f.y + 6, f.radius - 4, 0, Math.PI);
      ctx.fill();

      // Shiny big goofy eyes
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(f.x - 6, f.y - 7, 4, 0, Math.PI * 2);
      ctx.arc(f.x + 6, f.y - 7, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(f.x - 6, f.y - 7, 2, 0, Math.PI * 2);
      ctx.arc(f.x + 6, f.y - 7, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0; // reset

      // 6. Draw Guard vision cones & Alert Indicators
      enemiesRef.current.forEach(enemy => {
        // Draw vision cone gradient
        const vRadius = 150 + (playerRef.current.hasArtifact ? 40 : 0);
        const coneH = Math.PI / 4;

        ctx.fillStyle = "rgba(245, 158, 11, 0.12)";
        if (enemy.state === "investigate") {
          ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        }

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

        // Draw Cursed Ghostly Skeleton Guards representation
        ctx.fillStyle = "#e0e7ff"; // ghostly white bony body
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();

        // Bandana hat
        ctx.fillStyle = "#a855f7"; // Cursed Purple bandits bandana
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 5, enemy.radius - 2, Math.PI, 0);
        ctx.fill();

        // Glowing malicious red eye pixels
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(enemy.x - 4, enemy.y - 2, 2, 2);
        ctx.fillRect(enemy.x + 2, enemy.y - 2, 2, 2);

        // Saber handle weapon decoration
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(enemy.x + 8, enemy.y);
        ctx.lineTo(enemy.x + 16, enemy.y - 8);
        ctx.stroke();

        // Exclamation alert state notice
        if (enemy.state === "investigate") {
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 16px monospace";
          ctx.fillText("!", enemy.x - 4, enemy.y - 16);
        }
      });

      // 7. Draw Player (Pirate)
      const p = playerRef.current;
      ctx.fillStyle = "#b45309"; // tanned coat
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Red Tricorn Hat
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.moveTo(p.x - 14, p.y - 4);
      ctx.lineTo(p.x + 14, p.y - 4);
      ctx.lineTo(p.x, p.y - 15);
      ctx.closePath();
      ctx.fill();

      // Yellow core accent belt
      ctx.fillStyle = "#eab308";
      ctx.fillRect(p.x - p.radius + 3, p.y + 4, p.radius * 2 - 6, 3);

      // Eye Patch
      ctx.fillStyle = "#000000";
      ctx.fillRect(p.x - 5, p.y - 3, 4, 3);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x - p.radius, p.y - 6);
      ctx.lineTo(p.x + 4, p.y + 1);
      ctx.stroke();

      // Weapon sprite according to active weapon tier
      if (activeWeapon !== "Fists") {
        let bladeColor = "#cbd5e1";
        if (activeWeapon === "Cursed Cutlass") bladeColor = "#06b6d4";
        ctx.strokeStyle = bladeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + 8, p.y + 4);
        ctx.lineTo(p.x + 15, p.y + 11);
        ctx.stroke();
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
