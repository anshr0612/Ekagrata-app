import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function DistractionNotification() {
  const [showProtocol, setShowProtocol] = useState(false);
  const {
    distractionAlert,
    dismissDistractionAlert,
    handleReturnToWork,
    handleContinueAnyway,
    focusMode
  } = useApp();

  useEffect(() => {
    if (!distractionAlert) return;
    const timer = setTimeout(() => {
      dismissDistractionAlert();
    }, 10000);
    return () => clearTimeout(timer);
  }, [distractionAlert, dismissDistractionAlert]);

  if (!distractionAlert) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-full animate-fade-in">
      <div className="bg-amber-50/95 dark:bg-stone-900/95 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl text-stone-900 dark:text-stone-100 flex items-start gap-3.5 backdrop-blur-md animate-glow-border">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0 font-bold animate-pulse-subtle">
          ⏳
        </div>

        <div className="flex-1 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <span>Focus Mode</span>
              {focusMode && <span className="text-[9px] bg-amber-200 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-1 py-0.2 rounded font-mono">Digital Wellbeing</span>}
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              {distractionAlert.time}
            </span>
          </div>

          <p className="font-medium text-stone-800 dark:text-stone-200">
            Wandering detected on <span className="font-mono text-amber-700 dark:text-amber-300 underline font-semibold">{distractionAlert.domain}</span>
          </p>

          <p className="text-[11px] text-stone-600 dark:text-stone-400">
            You are getting distracted from your task. Do you want to continue?
          </p>

          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleReturnToWork(distractionAlert.domain)}
              title={focusMode ? `Turns off ${distractionAlert.domain} until your session finishes` : 'Return to focus'}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-[11px] shadow-sm transition flex items-center gap-1"
            >
              <span>Return to work</span>
              {focusMode && <span className="text-[9px] opacity-90">(turns off site)</span>}
            </button>
            <button
              onClick={handleContinueAnyway}
              className="px-2.5 py-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-[11px] transition"
            >
              Continue anyway
            </button>
            <button
              type="button"
              onClick={() => setShowProtocol(!showProtocol)}
              className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 ml-auto"
            >
              <span>🧘</span>
              <span>{showProtocol ? 'Hide Reset' : '60s Recovery Tip'}</span>
            </button>
          </div>

          {showProtocol && (
            <div className="mt-2.5 p-3 rounded-xl bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800/80 space-y-1 text-[11px] animate-fade-in text-stone-800 dark:text-stone-200">
              <span className="font-semibold text-amber-900 dark:text-amber-300 block">
                💨 The Double-Exhale Recovery:
              </span>
              <p className="leading-relaxed text-[10px] text-stone-700 dark:text-stone-300">
                1. Take two quick inhales through your nose.<br />
                2. Release a long, slow sigh through your mouth.<br />
                3. Acknowledge: "The mind wanted to play." Then return gently.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={dismissDistractionAlert}
          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
