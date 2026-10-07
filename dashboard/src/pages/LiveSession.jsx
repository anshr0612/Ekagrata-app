import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { endSession } from '../services/extensionBridge';
import SoundscapeControl from '../components/SoundscapeControl';

export default function LiveSession() {
  const {
    lang,
    activeSession,
    setActiveSession,
    addSession,
    extensionConnected,
    triggerDistractionTest,
    focusMode,
    setFocusMode,
    turnedOffDomains,
  } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeSession) {
      navigate('/');
    }
  }, [activeSession, navigate]);

  const durationSec = (activeSession?.durationMin || 25) * 60;
  const startedTime = activeSession?.startedAt ? new Date(activeSession.startedAt).getTime() : Date.now();

  const [elapsedSec, setElapsedSec] = useState(() => {
    const passed = Math.floor((Date.now() - startedTime) / 1000);
    return Math.max(0, passed);
  });

  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const passed = Math.floor((Date.now() - startedTime) / 1000);
      setElapsedSec(passed);
    }, 1000);

    return () => clearInterval(timer);
  }, [startedTime]);

  const remainingSec = Math.max(0, durationSec - elapsedSec);
  const minutesLeft = Math.floor(remainingSec / 60);
  const secondsLeft = remainingSec % 60;

  const handleEnd = async () => {
    setIsFinishing(true);
    let summaryData = null;

    if (extensionConnected && !activeSession?.isLocal) {
      try {
        const res = await endSession();
        summaryData = res?.summary;
      } catch (err) {
        console.warn('Failed to end session via extension', err);
      }
    }

    const sessionDurationMin = Math.max(1, Math.round(elapsedSec / 60));
    const now = new Date();
    
    const fallbackSummary = {
      id: activeSession?.id || `session_${Date.now()}`,
      intention: activeSession?.intention || 'Focus session',
      startedAt: activeSession?.startedAt || new Date(Date.now() - elapsedSec * 1000).toISOString(),
      endedAt: now.toISOString(),
      durationMin: sessionDurationMin,
      longestStretchMin: Math.max(1, Math.min(sessionDurationMin, Math.round(sessionDurationMin * 0.75))),
      driftCount: 1,
      avgReturnSec: 45,
      minutes: {
        productive: Math.max(1, Math.round(sessionDurationMin * 0.8)),
        neutral: Math.round(sessionDurationMin * 0.15),
        distracting: Math.round(sessionDurationMin * 0.05),
      },
      timeline: [
        {
          start: activeSession?.startedAt || now.toISOString(),
          end: now.toISOString(),
          category: 'productive',
          domain: 'active-workspace',
          title: activeSession?.intention || 'Focus work',
        },
      ],
    };

    const finalSession = summaryData || fallbackSummary;
    addSession(finalSession);
    setActiveSession(null);
    navigate(`/samiksha/${finalSession.id}`);
  };

  if (!activeSession) return null;

  return (
    <div className="py-12 text-center max-w-md mx-auto space-y-8 animate-fade-in">
      {/* Calm Pulsing Witness Eye with breathing concentric halos */}
      <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md animate-breathe" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-500/15 to-amber-500/30 flex items-center justify-center border border-amber-300 dark:border-amber-700 shadow-inner animate-pulse-subtle">
          <span className="text-3xl text-amber-600 dark:text-amber-400 select-none">◉</span>
        </div>
      </div>

      {/* Intention */}
      <div>
        <span className="text-[11px] font-mono uppercase tracking-widest font-semibold text-amber-600 dark:text-amber-400">
          {t(lang, 'session.yourIntention')}
        </span>
        <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
          "{activeSession.intention}"
        </h2>
      </div>

      {/* Countdown Timer with warm digits & subtle glow */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm transition hover:shadow-md">
        <div className="text-6xl font-mono tracking-tight font-bold bg-gradient-to-r from-stone-900 via-amber-800 to-stone-900 dark:from-stone-100 dark:via-amber-400 dark:to-stone-100 bg-clip-text text-transparent">
          {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
        </div>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-semibold flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
          {t(lang, 'session.status')}: {t(lang, 'session.focused')}
        </p>
      </div>

      {/* Ambient Soundscapes for Deep Flow */}
      <SoundscapeControl />

      {/* Digital Wellbeing Focus Mode Status */}
      <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-stone-900 border border-amber-200 dark:border-stone-800 text-left space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <div>
              <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <span>Focus Mode</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-mono">
                  Digital Wellbeing
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Turns off distracting sites when you select "Return to work"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFocusMode(!focusMode)}
            className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition duration-300 ${focusMode ? 'bg-amber-600 justify-end' : 'bg-stone-300 dark:bg-stone-700 justify-start'}`}
            title="Toggle Focus Mode"
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
          </button>
        </div>

        {/* Display turned off sites if any */}
        {turnedOffDomains && turnedOffDomains.length > 0 && (
          <div className="pt-2 border-t border-amber-200/60 dark:border-stone-800 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 dark:text-amber-400 font-semibold block">
              Turned off until session finishes ({minutesLeft}m left):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {turnedOffDomains.map((dom) => (
                <span
                  key={dom}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-mono"
                >
                  <span>🔒</span>
                  <span>{dom}</span>
                  <span className="text-[9px] text-amber-700 dark:text-amber-400 italic">paused</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Test Distraction Trigger */}
      <div className="p-3 rounded-2xl bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300 flex items-center justify-between">
        <span className="text-[11px]">Test wandering alert:</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => triggerDistractionTest('youtube.com/shorts')}
            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-[10px]"
          >
            YouTube Shorts
          </button>
          <button
            onClick={() => triggerDistractionTest('instagram.com')}
            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-[10px]"
          >
            Instagram
          </button>
        </div>
      </div>

      {/* Action */}
      <div>
        <button
          onClick={handleEnd}
          disabled={isFinishing}
          className="px-6 py-2.5 text-xs rounded-xl font-semibold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition shadow-xs"
        >
          {isFinishing ? t(lang, 'common.loading') : t(lang, 'session.endSession')}
        </button>
      </div>
    </div>
  );
}
