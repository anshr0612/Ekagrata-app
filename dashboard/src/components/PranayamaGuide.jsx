import React, { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../services/soundEngine';

export default function PranayamaGuide() {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('idle'); // 'inhale', 'hold', 'exhale', 'rest'
  const [countdown, setCountdown] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);
  const timerRef = useRef(null);

  // 4-2-4-2 Rhythmic Sama Vritti cycle
  const PHASES = [
    { name: 'inhale', label: 'Inhale smoothly through nose', labelHi: 'नाक से धीरे-धीरे सांस लें', duration: 4, scale: 'scale-125', color: 'from-amber-400 to-emerald-500' },
    { name: 'hold', label: 'Hold gently without strain', labelHi: 'सांस को आराम से रोकें', duration: 2, scale: 'scale-125', color: 'from-emerald-500 to-teal-500' },
    { name: 'exhale', label: 'Exhale smoothly releasing tension', labelHi: 'तनाव छोड़ते हुए सांस बाहर निकालें', duration: 4, scale: 'scale-90', color: 'from-teal-500 to-amber-500' },
    { name: 'rest', label: 'Rest in pure stillness', labelHi: 'शांत भाव में विश्राम करें', duration: 2, scale: 'scale-90', color: 'from-amber-500 to-orange-400' },
  ];

  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('idle');
      setCountdown(4);
      setPhaseIndex(0);
      return;
    }

    const currentPhase = PHASES[phaseIndex];
    setPhase(currentPhase.name);
    setCountdown(currentPhase.duration);

    // Play chime at phase transition
    if (phaseIndex === 0) {
      soundEngine.playChime();
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Advance phase
          const nextIdx = (phaseIndex + 1) % PHASES.length;
          if (nextIdx === 0) {
            setCycleCount((c) => c + 1);
          }
          setPhaseIndex(nextIdx);
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, phaseIndex]);

  const toggleGuide = () => {
    if (isActive) {
      setIsActive(false);
    } else {
      setIsActive(true);
      setCycleCount(0);
    }
  };

  const currentPhaseConfig = PHASES[phaseIndex] || PHASES[0];

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/70 via-stone-50 to-emerald-50/40 dark:from-stone-900 dark:via-stone-900/90 dark:to-emerald-950/20 border border-amber-200/80 dark:border-stone-800 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 font-semibold block">
            Raja Yoga Mind Training
          </span>
          <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            Interactive Prāṇāyāma Breath Trainer (4-2-4-2)
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Swami Vivekananda taught: <em>"Steady the breath, and the mind is steadied."</em> Calms neural agitation in 60 seconds.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleGuide}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 ${
            isActive
              ? 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          <span>{isActive ? '⏹ Stop' : '▶ Begin Practice'}</span>
        </button>
      </div>

      {isActive ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-fade-in">
          {/* Animated Expanding/Contracting Breathing Orb */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Outer halo */}
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-tr ${currentPhaseConfig.color} opacity-20 blur-xl transition-all duration-1000 ease-in-out ${currentPhaseConfig.scale}`}
            />
            {/* Breathing core */}
            <div
              className={`relative w-36 h-36 rounded-full bg-gradient-to-tr ${currentPhaseConfig.color} opacity-85 shadow-lg flex flex-col items-center justify-center text-white transition-all duration-1000 ease-in-out ${currentPhaseConfig.scale}`}
            >
              <span className="text-4xl font-mono font-bold tracking-tight">
                {countdown}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-90 mt-0.5">
                {currentPhaseConfig.name}
              </span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
              {currentPhaseConfig.label}
            </h4>
            <p className="text-xs text-stone-500 font-mono">
              Completed cycles: <strong className="text-amber-600 dark:text-amber-400">{cycleCount}</strong> / 4 suggested
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-stone-850/60 border border-stone-200/60 dark:border-stone-800 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg shrink-0">
              🌬️
            </div>
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">
                Recommended: 3 to 4 rhythmic cycles before sitting
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Smooth 4s Inhale · 2s Gentle Pause · 4s Steady Exhale · 2s Stillness
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleGuide}
            className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-950/40 text-[11px] font-semibold transition shrink-0"
          >
            Start 1-Min Reset
          </button>
        </div>
      )}
    </div>
  );
}
