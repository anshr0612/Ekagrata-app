import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { generateReflection, fallbackReflection } from '../services/gemini';
import { calculateSessionPoints } from '../data/rewards';

export default function Samiksha() {
  const { sessionId } = useParams();
  const { lang, sessions, profile, settings, availablePoints, extensionConnected, demoMode } = useApp();

  const session = sessionId
    ? sessions.find((s) => s.id === sessionId)
    : sessions[sessions.length - 1];

  const [reflection, setReflection] = useState('');
  const [loadingReflection, setLoadingReflection] = useState(true);

  // Check if current session is demo data
  const isDemoSession = Boolean(session?.isDemo || session?.id?.startsWith('demo_') || (!extensionConnected && demoMode));

  useEffect(() => {
    if (!session) {
      setLoadingReflection(false);
      return;
    }

    let isMounted = true;
    setLoadingReflection(true);

    if (settings.geminiKey) {
      generateReflection(session, profile || {}, settings.geminiKey)
        .then((text) => {
          if (isMounted) setReflection(text);
        })
        .catch(() => {
          if (isMounted) setReflection(fallbackReflection(session));
        })
        .finally(() => {
          if (isMounted) setLoadingReflection(false);
        });
    } else {
      setReflection(fallbackReflection(session));
      setLoadingReflection(false);
    }

    return () => {
      isMounted = false;
    };
  }, [session, settings.geminiKey, profile]);

  // Build the distraction breakdown:
  // ONLY real session events from the extension when connected, grouped by domain with minutes.
  // When extension is not connected or Demo mode is on, use session timeline if marked demo, labeled with badge.
  const distractingBreakdown = useMemo(() => {
    if (!session || !Array.isArray(session.timeline)) return [];

    const domainMap = new Map();

    session.timeline.forEach((item) => {
      if (item.category === 'distracting' && item.domain) {
        let durationMin = 0;
        if (item.start && item.end) {
          const diffMs = new Date(item.end).getTime() - new Date(item.start).getTime();
          durationMin = Math.max(1, Math.round(diffMs / 60000));
        } else {
          durationMin = item.minutes || 1;
        }

        const existing = domainMap.get(item.domain) || { domain: item.domain, title: item.title, minutes: 0, count: 0 };
        existing.minutes += durationMin;
        existing.count += 1;
        domainMap.set(item.domain, existing);
      }
    });

    return Array.from(domainMap.values()).sort((a, b) => b.minutes - a.minutes);
  }, [session]);

  if (!session) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-xs text-stone-500">{t(lang, 'samiksha.noData')}</p>
        <Link
          to="/"
          className="inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition"
        >
          {t(lang, 'samiksha.beginAgain')}
        </Link>
      </div>
    );
  }

  const {
    intention,
    longestStretchMin = 0,
    avgReturnSec = 0,
    minutes = { productive: 0, neutral: 0, distracting: 0 },
  } = session;

  const totalMin = (minutes.productive || 0) + (minutes.neutral || 0) + (minutes.distracting || 0) || 1;
  const prodPct = Math.round(((minutes.productive || 0) / totalMin) * 100);
  const neutPct = Math.round(((minutes.neutral || 0) / totalMin) * 100);
  const distPct = Math.round(((minutes.distracting || 0) / totalMin) * 100);

  const earnedThisSession = calculateSessionPoints(session);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title & Points Earned Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-600/15 border border-amber-300 dark:border-amber-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400">
              {t(lang, 'samiksha.title')}
            </span>
            {isDemoSession && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700">
                Demo data
              </span>
            )}
          </div>
          <h1 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            "{intention}"
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-2xl bg-amber-600 text-white text-xs font-mono font-bold flex items-center gap-1 shadow-xs">
            <span>+{earnedThisSession}</span>
            <span className="text-[10px] font-sans font-normal opacity-90">pts earned</span>
          </div>
          <Link
            to="/rewards"
            className="text-xs text-amber-700 dark:text-amber-400 font-semibold underline hover:opacity-80"
          >
            Goodies Shelf ({availablePoints} pts) →
          </Link>
        </div>
      </div>

      {/* Hero Metrics with colorful border accents */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-500/5 to-transparent rounded-3xl">
          <span className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 block font-semibold">
            {t(lang, 'samiksha.longestStretch')}
          </span>
          <div className="text-3xl font-mono font-bold text-stone-900 dark:text-stone-100 mt-1">
            {longestStretchMin} <span className="text-xs text-stone-500 font-sans font-normal">{t(lang, 'samiksha.minutes')}</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Unbroken river of single-pointed focus (Ekagrata)
          </p>
        </div>

        <div className="p-5 border border-sky-200 dark:border-sky-900/60 bg-gradient-to-br from-sky-500/5 to-transparent rounded-3xl">
          <span className="text-[11px] uppercase tracking-wider text-sky-700 dark:text-sky-400 block font-semibold">
            {t(lang, 'samiksha.avgReturnTime')}
          </span>
          <div className="text-3xl font-mono font-bold text-stone-900 dark:text-stone-100 mt-1">
            {avgReturnSec} <span className="text-xs text-stone-500 font-sans font-normal">{t(lang, 'samiksha.seconds')}</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Gentle recovery time after wandering (Ekāgratā / Witness attitude)
          </p>
        </div>
      </div>

      {/* Timeline breakdown with soft colors */}
      <div className="p-5 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-3xl space-y-3 shadow-xs">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-stone-900 dark:text-stone-100">{t(lang, 'samiksha.timeline')}</span>
          <span className="text-stone-500 font-mono">{totalMin}m tracked</span>
        </div>

        {/* Proportional bar with soothing soft colors */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-stone-100 dark:bg-stone-800">
          {prodPct > 0 && <div style={{ width: `${prodPct}%` }} className="bg-emerald-500 h-full" title={`Productive: ${minutes.productive}m`} />}
          {neutPct > 0 && <div style={{ width: `${neutPct}%` }} className="bg-sky-400 h-full" title={`Neutral: ${minutes.neutral}m`} />}
          {distPct > 0 && <div style={{ width: `${distPct}%` }} className="bg-rose-400 h-full" title={`Distracting: ${minutes.distracting}m`} />}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-stone-700 dark:text-stone-300">{t(lang, 'samiksha.productive')}: {minutes.productive}m ({prodPct}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="text-stone-700 dark:text-stone-300">{t(lang, 'samiksha.neutral')}: {minutes.neutral}m ({neutPct}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-stone-700 dark:text-stone-300">{t(lang, 'samiksha.distracting')}: {minutes.distracting}m ({distPct}%)</span>
          </div>
        </div>
      </div>

      {/* Distraction Tracking View (ISSUE 1 Fix: grouped by domain with minutes per domain, demo badge or real events only) */}
      <div className="p-5 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-3xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Distraction Tracking
            </h3>
            <p className="text-[11px] text-stone-500">
              Websites where attention wandered during this sitting
            </p>
          </div>

          {isDemoSession ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              Demo data
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Live extension events
            </span>
          )}
        </div>

        {distractingBreakdown.length > 0 ? (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {distractingBreakdown.map((item) => (
              <div key={item.domain} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                  <div>
                    <span className="font-mono font-medium text-stone-800 dark:text-stone-200">
                      {item.domain}
                    </span>
                    {item.title && item.title !== item.domain && (
                      <span className="text-[11px] text-stone-400 block truncate max-w-xs">
                        {item.title}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-stone-700 dark:text-stone-300">
                    {item.minutes} min
                  </span>
                  <span className="text-[10px] text-stone-400 block">
                    {item.count} {item.count === 1 ? 'drift' : 'drifts'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-stone-400 dark:text-stone-500 italic">
            No distracting sites recorded yet. Unbroken attention preserved!
          </div>
        )}
      </div>

      {/* AI Activity Reflection using Vivekananda teachings */}
      <div className="p-6 border border-amber-300 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50/30 dark:from-stone-900 dark:to-stone-900 rounded-3xl space-y-2 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
            <span>✨</span>
            <span>Vivekananda Reflection on Your Activity</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
            {settings.geminiKey ? 'Gemini 2.0 Flash' : 'Rule-based Wisdom'}
          </span>
        </div>
        <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-serif pt-1">
          {loadingReflection ? t(lang, 'common.loading') : `"${reflection}"`}
        </p>
      </div>

      {/* Action */}
      <div className="pt-2 flex items-center justify-between">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
        >
          {t(lang, 'samiksha.beginAgain')}
        </Link>
        <Link
          to="/rewards"
          className="px-4 py-2.5 rounded-2xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 transition"
        >
          🎁 Goodies Shelf
        </Link>
      </div>
    </div>
  );
}
