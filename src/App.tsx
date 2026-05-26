import { useState, useEffect } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { HUD } from "./components/HUD";
import { Instructions } from "./components/Instructions";
import { GameStatus } from "./types";
import { sound } from "./sound";
import { preloadAssets } from "./assets";
import { 
  Anchor, 
  Play, 
  Skull, 
  RefreshCw, 
  Award, 
  Coins, 
  ChevronRight, 
  Sparkles,
  Info
} from "lucide-react";

export default function App() {
  const [assetsLoaded, setAssetsLoaded] = useState<boolean>(false);
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [keysCount, setKeysCount] = useState<number>(0);
  const [panicValue, setPanicValue] = useState<number>(0);
  const [status, setStatus] = useState<GameStatus>("start");
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Active Upgrade Tracking state
  const [activeWeapon, setActiveWeapon] = useState<"Fists" | "Wooden Dagger" | "Iron Blade" | "Cursed Cutlass">("Fists");
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [visionMultiplier, setVisionMultiplier] = useState<number>(1.0);
  const [isSilenced, setIsSilenced] = useState<boolean>(false);
  const [hasClue, setHasClue] = useState<boolean>(false);

  const [notification, setNotification] = useState<string | null>(null);

  // Preload assets
  useEffect(() => {
    preloadAssets()
      .then(() => setAssetsLoaded(true))
      .catch((err) => {
        console.error(err);
        setAssetsLoaded(true); // fallback to allow play even if an image fails
      });
  }, []);

  // Load high scores locally
  useEffect(() => {
    const savedHighScore = localStorage.getItem("cursed_keel_highscore");
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  // Update high score standard callback
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("cursed_keel_highscore", score.toString());
    }
  }, [score, highScore]);

  // Handle Embark start Click
  const handleStartGame = () => {
    sound.playUpgrade();
    setLevel(1);
    setScore(0);
    setKeysCount(0);
    setPanicValue(0);
    setActiveWeapon("Fists");
    setSpeedMultiplier(1.0);
    setVisionMultiplier(1.0);
    setIsSilenced(false);
    setHasClue(false);
    setNotification(null);
    setStatus("playing");
  };

  const handleNextLevel = () => {
    sound.playUpgrade();
    setPanicValue(0);
    setHasClue(false);
    setStatus("playing");
  };

  const handleUpgradeFound = (text: string) => {
    setNotification(text);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] flex flex-col items-center p-3 sm:p-6 font-mono">
      
      {/* Dynamic Header */}
      <header className="w-full max-w-5xl flex items-center justify-between px-6 py-4 bg-[#1a120b] border-2 border-[#3e2723] mb-6 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 border border-[#5d4037] flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            <Anchor className="w-5 h-5 text-[#1a0f05] stroke-[3]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-[#a1887f]">
              Curse of the Frog God
            </span>
            <h1 className="text-lg font-bold uppercase tracking-tighter text-[#efebe9]">
              Cursed Keel
            </h1>
          </div>
        </div>

        <div className="h-10 w-px bg-[#3e2723] hidden sm:block"></div>

        {/* High Score Capsule */}
        <div className="flex flex-col text-right">
          <span className="text-[10px] uppercase tracking-widest text-[#a1887f] flex items-center justify-end gap-1"><Award className="w-3 h-3" /> Personal Record</span>
          <span className="text-xl font-bold text-amber-600">{highScore} Gold</span>
        </div>
      </header>

      {/* Floating notice container */}
      {notification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-[#000000]/60">
          <div className="flex flex-col items-center justify-center px-10 py-6 bg-[#0a0502]/95 border-4 border-[#3e2723] animate-pulse shadow-[0_0_50px_rgba(245,158,11,0.3)]">
             <span className="text-[12px] uppercase tracking-[0.3em] text-[#a1887f] mb-3">Treasure Secured</span>
             <div className="flex items-center gap-5">
               <Sparkles className="w-8 h-8 text-amber-500 animate-spin" />
               <span className="text-2xl font-black md:text-3xl uppercase tracking-widest text-[#fbbf24]">{notification}</span>
               <Sparkles className="w-8 h-8 text-amber-500 animate-spin" />
             </div>
          </div>
        </div>
      )}

      {/* Active gameplay screens */}
      {status === "start" && (
        <main className="w-full max-w-xl text-center my-auto flex flex-col items-center justify-center p-8 bg-[#1a120b]/90 border-2 border-[#3e2723] shadow-xl space-y-6">
          <div className="w-20 h-20 bg-[#0a0502] border-2 border-[#3e2723] flex items-center justify-center relative">
            <Skull className="w-10 h-10 text-cyan-400 animate-pulse" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#b71c1c] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_10px_#b71c1c]">
              ★
            </div>
          </div>

          <div className="space-y-2 border-b border-[#3e2723] pb-4">
            <h2 className="text-xl font-bold uppercase tracking-widest text-amber-500">
              Stronghold Heist Embarkment
            </h2>
            <p className="text-[11px] text-[#d4d4d4] max-w-md mx-auto leading-relaxed">
              Sneak inside the cursed fortressed, strike the mythical Giga-Frog God to drop key artifacts, unlock chests for rare custom upgrades (Sabers, Speed Boots, Spyglasses), grab the glowing chalice, and escape back to your boat.
            </p>
          </div>

          <div className="w-full p-4 bg-[#0a0502] border border-[#3e2723] text-left space-y-2">
            <h3 className="font-mono text-[10px] text-[#a1887f] uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Rogue Warnings
            </h3>
            <ul className="text-[#9e9e9e] font-mono text-[10px] list-disc list-inside space-y-1">
              <li>Cursed guards have bright-yellow vision cones.</li>
              <li>Entering vision cones raises heart panic. 100% means game over!</li>
              <li>Sacks are heavier with treasure. Carry status slows you down!</li>
            </ul>
          </div>

          {assetsLoaded ? (
            <button
              onClick={handleStartGame}
              className="w-full max-w-xs group cursor-pointer inline-flex items-center justify-center gap-2.5 px-6 py-3 border-2 border-amber-500 bg-amber-500/10 text-amber-500 font-black uppercase tracking-widest hover:bg-amber-500 hover:text-[#0a0a0a] active:scale-95 transition-all text-[11px] shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              <Play className="w-5 h-5 fill-zinc-950 text-zinc-950 group-hover:scale-110 transition-transform" />
              Embark Captain
            </button>
          ) : (
            <div className="w-full max-w-xs inline-flex items-center justify-center gap-2.5 px-6 py-3 border-2 border-[#3e2723] bg-[#0a0502] text-[#a1887f] font-black uppercase tracking-widest text-[11px]">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading Assets...
            </div>
          )}
        </main>
      )}

      {status === "playing" && (
        <main className="w-full max-w-5xl flex flex-col items-center">
          <HUD 
            level={level}
            score={score}
            keysCount={keysCount}
            panicValue={panicValue}
            activeWeapon={activeWeapon}
            speedMultiplier={speedMultiplier}
            visionMultiplier={visionMultiplier}
            isSilenced={isSilenced}
            hasClue={hasClue}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
          />

          <GameCanvas 
            level={level}
            score={score}
            keysCount={keysCount}
            panicValue={panicValue}
            setKeysCount={setKeysCount}
            setPanicValue={setPanicValue}
            setScore={setScore}
            setLevel={setLevel}
            status={status}
            setStatus={setStatus}
            onUpgradeFound={handleUpgradeFound}
            activeWeapon={activeWeapon}
            setActiveWeapon={setActiveWeapon}
            speedMultiplier={speedMultiplier}
            setSpeedMultiplier={setSpeedMultiplier}
            visionMultiplier={visionMultiplier}
            setVisionMultiplier={setVisionMultiplier}
            isSilenced={isSilenced}
            setIsSilenced={setIsSilenced}
            hasClue={hasClue}
            setHasClue={setHasClue}
          />

          <Instructions />
        </main>
      )}

      {status === "gameover" && (
        <main className="w-full max-w-md text-center my-auto flex flex-col items-center justify-center p-8 bg-[#1a120b] border-2 border-[#b71c1c] shadow-[0_0_20px_#b71c1c] space-y-6">
          <div className="w-20 h-20 bg-[#0a0502] border border-[#b71c1c] flex items-center justify-center">
            <Skull className="w-10 h-10 text-[#b71c1c]" />
          </div>

          <div className="space-y-1 border-b border-[#3e2723] pb-4">
            <h2 className="text-xl font-bold uppercase tracking-widest text-[#b71c1c]">
              Panic Overcome
            </h2>
            <p className="text-[11px] text-[#9e9e9e]">
              The cursed skeleton guards cornered you and your heart collapsed under extreme panic!
            </p>
          </div>

          <div className="w-full p-4 bg-[#0a0502] border border-[#3e2723] flex items-center justify-around">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-widest text-[#a1887f]">Stronghold Tier</span>
              <span className="text-xl font-bold text-[#efebe9] tracking-tighter">{level}</span>
            </div>
            <div className="h-8 w-px bg-[#3e2723]" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-widest text-[#a1887f]">Gold Plundered</span>
              <span className="text-xl font-bold text-yellow-500">{score}</span>
            </div>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#b71c1c] border-2 border-white text-white font-black uppercase tracking-widest hover:bg-white hover:text-[#b71c1c] active:scale-95 transition-all text-[11px] shadow-[0_0_10px_#b71c1c]"
          >
            <RefreshCw className="w-4 h-4" />
            Raid Stronghold Again
          </button>
        </main>
      )}

      {status === "level_up" && (
        <main className="w-full max-w-md text-center my-auto flex flex-col items-center justify-center p-8 bg-[#1a120b] border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] space-y-6">
          <div className="w-20 h-20 bg-[#0a0502] border border-[#22c55e] flex items-center justify-center animate-bounce">
            <Sparkles className="w-10 h-10 text-[#22c55e]" />
          </div>

          <div className="space-y-1 border-b border-[#3e2723] pb-4">
            <h2 className="text-xl font-bold uppercase tracking-widest text-[#22c55e]">
              Loot Secured!
            </h2>
            <p className="text-[11px] text-[#d4d4d4]">
              Successful extraction. Your sloop sails away with the cursed magical goblet safely locked in the captain's quarters!
            </p>
          </div>

          <div className="w-full p-4 bg-[#0a0502] border border-[#3e2723] flex items-center justify-around">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-widest text-[#a1887f]">Next Stronghold</span>
              <span className="text-xl font-bold text-green-400 tracking-tighter">Tier {level}</span>
            </div>
            <div className="h-8 w-px bg-[#3e2723]" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-widest text-[#a1887f]">Total gold</span>
              <span className="text-xl font-bold text-amber-500">{score}</span>
            </div>
          </div>

          <button
            onClick={handleNextLevel}
            className="w-full cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-green-500 bg-green-500/10 text-green-400 font-bold uppercase tracking-widest hover:bg-green-500 hover:text-black active:scale-95 transition-all text-[11px] shadow-[0_0_15px_rgba(34,197,94,0.3)]"
          >
            Sails Next Stronghold Level
            <ChevronRight className="w-4 h-4" />
          </button>
        </main>
      )}

      {/* Aesthetic Pirate Signature Credits */}
      <footer className="mt-8 bg-[#0a0502] h-10 border-t-2 border-[#3e2723] w-full max-w-5xl flex items-center px-6 justify-between text-[10px] uppercase tracking-[0.2em] text-[#a1887f]">
        <span className="hidden sm:inline">⚓ CURSED KEEL PROTOTYPE</span>
        <span>VANILLA CANVAS RENDERING</span>
        <span>PROTO-ENGINE</span>
      </footer>
    </div>
  );
}
