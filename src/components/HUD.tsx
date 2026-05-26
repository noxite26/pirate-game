import React from "react";
import { sound } from "../sound";
import { 
  Skull, 
  Map, 
  Key, 
  Flame, 
  Sword, 
  Compass, 
  Volume2, 
  VolumeX, 
  Eye, 
  Zap, 
  Sailboat 
} from "lucide-react";

interface HUDProps {
  level: number;
  score: number;
  keysCount: number;
  panicValue: number;
  activeWeapon: string;
  speedMultiplier: number;
  visionMultiplier: number;
  isSilenced: boolean;
  hasClue: boolean;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
}

export const HUD: React.FC<HUDProps> = ({
  level,
  score,
  keysCount,
  panicValue,
  activeWeapon,
  speedMultiplier,
  visionMultiplier,
  isSilenced,
  hasClue,
  isMuted,
  setIsMuted,
}) => {
  const handleToggleMute = () => {
    const nextStatus = sound.toggleMute();
    setIsMuted(nextStatus);
  };

  // Determine panic alerts
  const panicColor = panicValue > 70 
    ? "bg-rose-600 animate-pulse" 
    : panicValue > 35 
      ? "bg-amber-500" 
      : "bg-emerald-500";

  return (
    <div id="hud-panel" className="w-full bg-[#1a120b] border-2 border-[#3e2723] p-4 mb-4 select-none flex flex-col md:flex-row items-center justify-between z-50">
      
      {/* Core Stats Row */}
      <div className="flex items-center space-x-6">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-[#a1887f]">Stronghold Tier</span>
          <span id="level-hud" className="text-lg font-bold text-[#efebe9] tracking-tighter">LVL {level}</span>
        </div>

        <div className="h-10 w-px bg-[#3e2723] hidden sm:block"></div>

        <div className="flex flex-col"> 
          <span className="text-[10px] uppercase tracking-widest text-[#a1887f] flex items-center gap-2">
            <Flame className={`w-3 h-3 ${panicValue > 70 ? "text-red-500 animate-pulse" : ""}`} /> Panic Level
          </span> 
          <div className="w-48 h-3 bg-[#000] border border-[#3e2723] mt-1 relative"> 
            <div className={`h-full ${panicValue > 70 ? "bg-red-700 shadow-[0_0_10px_#b71c1c]" : "bg-[#b71c1c]"} transition-all`} style={{ width: `${Math.min(100, Math.max(0, panicValue))}%` }}></div> 
            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">{Math.floor(panicValue)}% / 100%</div> 
          </div> 
        </div>

        {/* Warning messages */}
        {panicValue > 75 && (
          <div className="hidden md:flex ml-4">
             <span className="text-[10px] text-red-500 uppercase tracking-wider animate-pulse font-bold border border-red-500/50 bg-red-900/20 px-2 py-1">
               ⚠️ SPOTTED! RETREAT! ⚠️
             </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap md:flex-nowrap items-center gap-6 mt-4 md:mt-0">
        <div className="text-center"> 
          <span className="block text-[10px] text-[#a1887f] uppercase tracking-widest">Frog Keys</span> 
          <span className="text-xl font-bold text-yellow-500">{keysCount.toString().padStart(2, '0')}</span> 
        </div> 

        <div className="text-center"> 
          <span className="block text-[10px] text-[#a1887f] uppercase tracking-widest">Treasure</span> 
          <span className="text-xl font-bold text-amber-600">${score}</span> 
        </div> 

        {/* Audio controls */}
        <button
          onClick={handleToggleMute}
          className="flex items-center justify-center w-8 h-8 border border-[#3e2723] bg-[#0a0502] hover:bg-[#1f140e] cursor-pointer"
          title="Toggle Audio"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-[#a1887f]" /> : <Volume2 className="w-4 h-4 text-green-500" />}
        </button>
      </div>

      {/* Upgrades panel row (Miniaturized for this theme) */}
      <div className="w-full mt-4 pt-3 border-t border-[#3e2723] flex flex-wrap justify-between gap-4 text-[10px] uppercase tracking-widest text-[#a1887f]">
        <div className="flex items-center gap-1.5"><Sword className="w-3.5 h-3.5" /> <span className="text-[#efebe9]">{activeWeapon}</span></div>
        <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> <span className="text-[#efebe9]">+{Math.round((speedMultiplier - 1) * 100)}% SPD</span></div>
        <div className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> <span className="text-[#efebe9]">+{Math.round((visionMultiplier - 1) * 100)}% LENS</span></div>
        <div className="flex items-center gap-1.5"><Map className="w-3.5 h-3.5" /> <span className="text-[#efebe9]">{hasClue ? "DOT ON" : "LOCKED"}</span></div>
        <div className={`flex items-center gap-1.5 ${isSilenced ? "text-indigo-400" : "opacity-50 text-[#a1887f]"}`}> <span className="px-1 border border-current">❖ CLOAK: {isSilenced ? "ON" : "OFF"}</span></div>
      </div>
    </div>
  );
};
