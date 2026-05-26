export const images = {
  // Player frame sprites (3x = 120x87 each, using 3x for crisp scaling)
  playerIdle: [new Image(), new Image(), new Image(), new Image()],
  playerRun: [new Image(), new Image(), new Image(), new Image(), new Image(), new Image()],
  playerAttack: [new Image(), new Image(), new Image(), new Image(), new Image()],

  // Enemy individual frame sprites (946x821 each)
  enemyIdle: [new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image()],
  enemyWalk: [
    new Image(), new Image(), new Image(), new Image(),
    new Image(), new Image(), new Image(), new Image(),
    new Image(), new Image(), new Image(), new Image(), new Image()
  ],

  frog_idle: new Image(),
  frog_key: new Image(),
  floor: new Image(),
  chestSheet: new Image(),
};

export const preloadAssets = (): Promise<void[]> => {
  const assetsToLoad: { img: HTMLImageElement; src: string }[] = [
    // Player idle frames (3x: 120x87)
    { img: images.playerIdle[0], src: "/src/Assets/player/3x/idle_0.png" },
    { img: images.playerIdle[1], src: "/src/Assets/player/3x/idle_1.png" },
    { img: images.playerIdle[2], src: "/src/Assets/player/3x/idle_2.png" },
    { img: images.playerIdle[3], src: "/src/Assets/player/3x/idle_3.png" },
    // Player run frames (3x: 120x87)
    { img: images.playerRun[0], src: "/src/Assets/player/3x/run_0.png" },
    { img: images.playerRun[1], src: "/src/Assets/player/3x/run_1.png" },
    { img: images.playerRun[2], src: "/src/Assets/player/3x/run_2.png" },
    { img: images.playerRun[3], src: "/src/Assets/player/3x/run_3.png" },
    { img: images.playerRun[4], src: "/src/Assets/player/3x/run_4.png" },
    { img: images.playerRun[5], src: "/src/Assets/player/3x/run_5.png" },
    // Player attack frames (3x: 120x87)
    { img: images.playerAttack[0], src: "/src/Assets/player/3x/attack_0.png" },
    { img: images.playerAttack[1], src: "/src/Assets/player/3x/attack_1.png" },
    { img: images.playerAttack[2], src: "/src/Assets/player/3x/attack_2.png" },
    { img: images.playerAttack[3], src: "/src/Assets/player/3x/attack_3.png" },
    { img: images.playerAttack[4], src: "/src/Assets/player/3x/attack_4.png" },
    // Enemy idle frames (7 frames, 946x821 each)
    { img: images.enemyIdle[0], src: "/src/Assets/enemies/idle/skeleton-01_idle_0.png" },
    { img: images.enemyIdle[1], src: "/src/Assets/enemies/idle/skeleton-01_idle_1.png" },
    { img: images.enemyIdle[2], src: "/src/Assets/enemies/idle/skeleton-01_idle_2.png" },
    { img: images.enemyIdle[3], src: "/src/Assets/enemies/idle/skeleton-01_idle_3.png" },
    { img: images.enemyIdle[4], src: "/src/Assets/enemies/idle/skeleton-01_idle_4.png" },
    { img: images.enemyIdle[5], src: "/src/Assets/enemies/idle/skeleton-01_idle_5.png" },
    { img: images.enemyIdle[6], src: "/src/Assets/enemies/idle/skeleton-01_idle_6.png" },
    // Enemy walk frames (13 frames, 946x821 each)
    { img: images.enemyWalk[0], src: "/src/Assets/enemies/walking/skeleton-02_walking_00.png" },
    { img: images.enemyWalk[1], src: "/src/Assets/enemies/walking/skeleton-02_walking_01.png" },
    { img: images.enemyWalk[2], src: "/src/Assets/enemies/walking/skeleton-02_walking_02.png" },
    { img: images.enemyWalk[3], src: "/src/Assets/enemies/walking/skeleton-02_walking_03.png" },
    { img: images.enemyWalk[4], src: "/src/Assets/enemies/walking/skeleton-02_walking_04.png" },
    { img: images.enemyWalk[5], src: "/src/Assets/enemies/walking/skeleton-02_walking_05.png" },
    { img: images.enemyWalk[6], src: "/src/Assets/enemies/walking/skeleton-02_walking_06.png" },
    { img: images.enemyWalk[7], src: "/src/Assets/enemies/walking/skeleton-02_walking_07.png" },
    { img: images.enemyWalk[8], src: "/src/Assets/enemies/walking/skeleton-02_walking_08.png" },
    { img: images.enemyWalk[9], src: "/src/Assets/enemies/walking/skeleton-02_walking_09.png" },
    { img: images.enemyWalk[10], src: "/src/Assets/enemies/walking/skeleton-02_walking_10.png" },
    { img: images.enemyWalk[11], src: "/src/Assets/enemies/walking/skeleton-02_walking_11.png" },
    { img: images.enemyWalk[12], src: "/src/Assets/enemies/walking/skeleton-02_walking_12.png" },
    // Other assets
    { img: images.frog_idle, src: "/src/Assets/frog/frog_idle.png" },
    { img: images.frog_key, src: "/src/Assets/frog/frog_key.png" },
    { img: images.floor, src: "/src/Assets/tiles/wood_floor.png" },
    { img: images.chestSheet, src: "/src/Assets/tiles/Animated Chests/Chests.png" },
  ];

  const promises = assetsToLoad.map((asset) => {
    return new Promise<void>((resolve, reject) => {
      asset.img.onload = () => resolve();
      asset.img.onerror = () => reject(new Error(`Failed to load image at path: ${asset.src}`));
      asset.img.src = asset.src;
    });
  });

  return Promise.all(promises);
};
