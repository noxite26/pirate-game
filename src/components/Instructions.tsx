import React from "react";
import { Move, Shield, Zap, Sparkles, BookOpen, Anchor } from "lucide-react";

export const Instructions: React.FC = () => {
  return (
    <div id="instructions-container" className="bg-[#1a120b]/90 border-2 border-[#3e2723] p-4 text-[11px] leading-relaxed mt-4 w-full select-none text-[#d4d4d4] font-mono">
      <h3 className="text-amber-500 font-bold mb-3 uppercase tracking-widest border-b border-[#3e2723] pb-1 flex items-center gap-2">
        <Anchor className="w-4 h-4" /> Mission Log
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Direct Controls */}
        <div className="space-y-3">
          <p className="opacity-70 uppercase tracking-widest text-[#a1887f] border-b border-[#3e2723] pb-1 mb-1">Controls</p>
          <ul className="space-y-1 opacity-80">
            <li className="flex items-center gap-2 text-amber-500">
              <span>[ W A S D ] / [ ARROWS ]</span>
              <span className="text-[#d4d4d4]">— Navigate Sector</span>
            </li>
            <li className="flex items-center gap-2 text-amber-500">
              <span>[ SPACEBAR ]</span>
              <span className="text-[#d4d4d4]">— Interact / Plunder / Attack</span>
            </li>
          </ul>

          <p className="opacity-70 uppercase tracking-widest text-[#a1887f] border-b border-[#3e2723] pb-1 mt-4 mb-1">Objectives</p>
          <ol className="space-y-1">
            <li>[01] Locate the <span className="text-green-400 font-bold">Magic Frog</span></li>
            <li>[02] Retrieve Vault Key (Hit Frog)</li>
            <li>[03] Unlock Cursed Chests</li>
            <li>[04] Seize the Artifact</li>
            <li>[05] Extract to the <span className="text-blue-400 font-bold">Docks</span></li>
          </ol>
        </div>

        {/* Right Column: Code & Assets guide for teammate */}
        <div className="p-3 bg-[#0a0502] border border-[#3e2723] space-y-2">
          <p className="opacity-70 uppercase tracking-widest text-amber-500 border-b border-[#3e2723] pb-1 mb-1 flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> Tech Stack
          </p>

          <p className="opacity-80 leading-relaxed">
            Full <code className="text-amber-500 bg-[#1a0f05] px-1 border border-[#3e2723]">HTML5 Canvas</code> Render Engine. Featuring Detuned Audio Synthesis & Realtime 2D Fog-of-War raycasting.
          </p>

          <div className="space-y-1 border-t border-[#3e2723] pt-2 mt-2">
            <p className="text-[#a1887f] uppercase tracking-widest">Adding visual sprites:</p>
            <p className="opacity-70 text-[10px]">
              1. Add sheet.png assets to `public/`
            </p>
            <p className="opacity-70 text-[10px]">
              2. Load via <code className="text-cyan-400">new Image().src</code>
            </p>
            <p className="opacity-70 text-[10px]">
              3. Replace primitives like <code className="text-pink-400">ctx.arc()</code> with <code className="text-cyan-400">ctx.drawImage(...)</code> inside GameCanvas.tsx.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
