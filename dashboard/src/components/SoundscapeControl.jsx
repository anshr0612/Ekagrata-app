import React, { useState, useEffect } from 'react';
import { soundEngine, AMBIENT_SOUNDS } from '../services/soundEngine';

export default function SoundscapeControl({ compact = false }) {
  const [activeTrack, setActiveTrack] = useState(soundEngine.currentTrack);
  const [volume, setVolume] = useState(0.35);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setActiveTrack(soundEngine.currentTrack);
    setIsPlaying(Boolean(soundEngine.currentTrack));
  }, []);

  const handleSelect = (id) => {
    if (activeTrack === id && isPlaying) {
      soundEngine.stop();
      setIsPlaying(false);
      setActiveTrack(null);
    } else {
      if (id === 'alpha') soundEngine.playAlphaWaves();
      else if (id === 'rain') soundEngine.playRain();
      else if (id === 'bowl') soundEngine.playBowlDrone();

      soundEngine.setVolume(volume);
      setActiveTrack(id);
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundEngine.setVolume(val);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      soundEngine.stop();
      setIsPlaying(false);
    } else {
      const track = activeTrack || 'alpha';
      handleSelect(track);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/80 dark:bg-stone-850/80 border border-stone-200/80 dark:border-stone-800 text-xs backdrop-blur">
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
            isPlaying
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title={isPlaying ? 'Pause soundscape' : 'Play ambient focus soundscape'}
        >
          {isPlaying ? '⏸' : '🎵'}
        </button>

        <div className="flex items-center gap-1">
          {AMBIENT_SOUNDS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s.id)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition ${
                activeTrack === s.id && isPlaying
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-semibold border border-amber-300 dark:border-amber-800'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
              title={s.desc}
            >
              <span>{s.icon}</span> <span className="hidden sm:inline">{s.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-3xl bg-amber-50/50 dark:bg-stone-900/60 border border-amber-200/70 dark:border-stone-800 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🎧</span>
          <div>
            <h4 className="text-xs font-serif font-bold text-stone-900 dark:text-stone-100">
              Focus Soundscape (Offline Web Audio)
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Procedurally generated acoustic backdrop for deep concentration
            </p>
          </div>
        </div>

        {isPlaying && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Playing
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {AMBIENT_SOUNDS.map((sound) => {
          const isCurrent = activeTrack === sound.id && isPlaying;
          return (
            <button
              key={sound.id}
              type="button"
              onClick={() => handleSelect(sound.id)}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                isCurrent
                  ? 'border-amber-500 bg-white dark:bg-stone-850 shadow-xs ring-1 ring-amber-500/30'
                  : 'border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/40 hover:bg-white dark:hover:bg-stone-850'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-lg">{sound.icon}</span>
                <span className="text-[10px] font-mono text-stone-400">
                  {isCurrent ? 'Active' : 'Tap to play'}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 block">
                  {sound.name}
                </span>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {sound.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {isPlaying && (
        <div className="flex items-center gap-3 pt-1 border-t border-amber-200/50 dark:border-stone-800/60 text-xs">
          <span className="text-stone-500 text-[11px] shrink-0">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full accent-amber-600 cursor-pointer h-1 bg-stone-200 dark:bg-stone-700 rounded-lg"
          />
          <button
            type="button"
            onClick={() => soundEngine.playChime()}
            className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline shrink-0 font-medium"
            title="Play mindful Tibetan chime"
          >
            🔔 Chime
          </button>
        </div>
      )}
    </div>
  );
}
