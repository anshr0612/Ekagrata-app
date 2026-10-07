import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { t } from "../i18n/translations";
import { generateWeeklyTip, fallbackWeeklyTip } from "../services/gemini";
import { generateDemoSessions } from "../services/demoData";
import RecoveryTimeChart from "../components/RecoveryTimeChart";
import ErrorBoundary from "../components/ErrorBoundary";

export default function Journey() {
  const {
    lang,
    sessions = [],
    profile,
    settings,
    availablePoints = 0,
    replaceSessions,
    updateSettings,
  } = useApp();

  const [tip, setTip] = useState("");
  const [loadingTip, setLoadingTip] = useState(true);

  // Safely aggregate sessions by day for charts with resilient parsing
  const sessionsByDay = useMemo(() => {
    if (!Array.isArray(sessions) || sessions.length === 0) return [];

    const map = new Map();
    sessions.forEach((s) => {
      if (!s) return;
      let dateKey = "Today";
      let label = "Today";

      try {
        if (s.startedAt) {
          const parsed = new Date(s.startedAt);
          if (!isNaN(parsed.getTime())) {
            dateKey = s.startedAt.slice(0, 10);
            label = parsed.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", {
              month: "numeric",
              day: "numeric",
            });
          }
        }
      } catch (err) {
        dateKey = "Today";
        label = "Today";
      }

      const stretch = typeof s.longestStretchMin === "number" ? s.longestStretchMin : (s.minutes?.productive || 0);
      const retTime = typeof s.avgReturnSec === "number" ? s.avgReturnSec : 0;
      const prod = s.minutes?.productive || stretch || 0;
      const nonProd = (s.minutes?.distracting || 0) + (s.minutes?.neutral || 0);

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: dateKey,
          label,
          longestStretch: stretch,
          returnTime: retTime,
          prodMin: prod,
          nonProdMin: nonProd,
          count: 1,
        });
      } else {
        const existing = map.get(dateKey);
        existing.longestStretch = Math.max(existing.longestStretch, stretch);
        existing.returnTime = Math.round((existing.returnTime * existing.count + retTime) / (existing.count + 1));
        existing.prodMin += prod;
        existing.nonProdMin += nonProd;
        existing.count += 1;
      }
    });

    const result = Array.from(map.values()).slice(-14);
    return result;
  }, [sessions, lang]);

  // Compute this week vs last week comparison
  const {
    thisWeekAvgStretch,
    lastWeekAvgStretch,
    thisWeekAvgReturn,
    lastWeekAvgReturn,
    thisWeekProdPct,
    lastWeekProdPct,
  } = useMemo(() => {
    if (!sessionsByDay || sessionsByDay.length === 0) {
      return {
        thisWeekAvgStretch: 0,
        lastWeekAvgStretch: 0,
        thisWeekAvgReturn: 0,
        lastWeekAvgReturn: 0,
        thisWeekProdPct: 0,
        lastWeekProdPct: 0,
      };
    }
    const mid = Math.floor(sessionsByDay.length / 2);
    const lastWeekDays = sessionsByDay.slice(0, mid);
    const thisWeekDays = sessionsByDay.slice(mid);

    const calcAvg = (arr, key) =>
      arr.length ? Math.round(arr.reduce((acc, d) => acc + (d[key] || 0), 0) / arr.length) : 0;

    const calcPct = (arr) => {
      const totalProd = arr.reduce((acc, d) => acc + (d.prodMin || 0), 0);
      const totalNonProd = arr.reduce((acc, d) => acc + (d.nonProdMin || 0), 0);
      const total = totalProd + totalNonProd;
      return total > 0 ? Math.round((totalProd / total) * 100) : 85;
    };

    return {
      lastWeekAvgStretch: calcAvg(lastWeekDays, "longestStretch"),
      thisWeekAvgStretch: calcAvg(thisWeekDays, "longestStretch"),
      lastWeekAvgReturn: calcAvg(lastWeekDays, "returnTime"),
      thisWeekAvgReturn: calcAvg(thisWeekDays, "returnTime"),
      lastWeekProdPct: calcPct(lastWeekDays),
      thisWeekProdPct: calcPct(thisWeekDays),
    };
  }, [sessionsByDay]);

  useEffect(() => {
    if (!sessions || sessions.length === 0) {
      setLoadingTip(false);
      return;
    }

    let isMounted = true;
    setLoadingTip(true);

    const weekData = {
      sessions,
      avgStretch: thisWeekAvgStretch,
      avgReturnTime: thisWeekAvgReturn,
      trend: thisWeekAvgStretch >= lastWeekAvgStretch ? "improving" : "steady",
    };

    if (settings?.geminiKey) {
      generateWeeklyTip(weekData, profile || {}, settings.geminiKey)
        .then((res) => {
          if (isMounted) setTip(res);
        })
        .catch(() => {
          if (isMounted) setTip(fallbackWeeklyTip(weekData));
        })
        .finally(() => {
          if (isMounted) setLoadingTip(false);
        });
    } else {
      setTip(fallbackWeeklyTip(weekData));
      setLoadingTip(false);
    }

    return () => {
      isMounted = false;
    };
  }, [sessions, thisWeekAvgStretch, thisWeekAvgReturn, lastWeekAvgStretch, settings?.geminiKey, profile]);

  const handleLoadDemoJourney = () => {
    const demo = generateDemoSessions(14);
    updateSettings({ demoMode: true });
    replaceSessions(demo);
  };

  // If no sessions exist yet, render a welcoming card with quick demo load button
  if (!sessions || sessions.length === 0) {
    return (
      <div className="py-12 space-y-6 max-w-xl mx-auto">
        <div className="p-8 border border-stone-200 dark:border-stone-800 bg-[#FDFBF7] dark:bg-[#1E1B16] rounded-3xl text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-2xl mx-auto">
            📈
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
              Welcome to Your Attention Journey
            </h2>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              Ekāgratā graphs your weekly recovery latency (how quickly you notice and gently return from wandering) and shows how recovery time directly shapes your productivity percentage.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              type="button"
              onClick={handleLoadDemoJourney}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2"
            >
              <span>✨</span>
              <span>Load Sample Journey (14-Day History)</span>
            </button>
          </div>
          <span className="text-[10px] text-stone-400 block">
            Or begin a live session from the Home tab to record your real-time attention.
          </span>
        </div>
      </div>
    );
  }

  const currentStage =
    thisWeekAvgStretch >= 25
      ? "dhyana"
      : thisWeekAvgStretch >= 12
      ? "dharana"
      : "pratyahara";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
            {t(lang, "journey.title")}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Weekly progression in unbroken focus, recovery times, and productivity ratio.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {settings?.demoMode && (
            <button
              type="button"
              onClick={handleLoadDemoJourney}
              className="px-3 py-1.5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 transition"
              title="Refresh demo session dataset"
            >
              ↻ Refresh Demo
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const rows = [
                ['Date', 'Intention', 'Duration (Min)', 'Longest Stretch (Min)', 'Recovery Latency (Sec)', 'Productive Min', 'Distracting Min'],
                ...sessions.map(s => [
                  s.startedAt ? s.startedAt.slice(0, 10) : 'Today',
                  `"${(s.intention || '').replace(/"/g, '""')}"`,
                  s.durationMin || 0,
                  s.longestStretchMin || 0,
                  s.avgReturnSec || 0,
                  s.minutes?.productive || 0,
                  s.minutes?.distracting || 0
                ])
              ];
              const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `ekagrata_focus_audit_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-3 py-1.5 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-semibold hover:bg-amber-100 transition flex items-center gap-1.5"
            title="Download CSV audit report for research & productivity tracking"
          >
            <span>📥</span>
            <span>Export CSV Audit</span>
          </button>

          <div className="px-3 py-1.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <span>🎁</span>
            <span>{availablePoints} points accumulated</span>
          </div>
        </div>
      </div>

      {/* Week comparison: Stretch, Recovery Time & Productivity % */}
      <div className="p-5 border border-stone-200 dark:border-stone-800 bg-[#FDFBF7] dark:bg-[#1C1917] rounded-3xl shadow-xs">
        <div className="text-xs font-semibold text-stone-500 mb-3 flex justify-between">
          <span className="uppercase tracking-wider">{t(lang, "journey.weekComparison")}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {t(lang, "journey.improvementNote")}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 divide-x divide-stone-100 dark:divide-stone-800 text-xs">
          <div>
            <span className="text-stone-400 block font-medium">{t(lang, "journey.thisWeek")}</span>
            <div className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {thisWeekAvgReturn}s recovery <span className="text-stone-400 text-xs font-normal">·</span> {thisWeekProdPct}% focus
            </div>
            <span className="text-[11px] text-stone-500 font-sans block mt-0.5">
              {thisWeekAvgStretch}m longest stretch
            </span>
          </div>
          <div className="pl-4">
            <span className="text-stone-400 block font-medium">{t(lang, "journey.lastWeek")}</span>
            <div className="text-lg font-mono font-semibold text-stone-500 mt-0.5">
              {lastWeekAvgReturn}s recovery <span className="text-stone-400 text-xs font-normal">·</span> {lastWeekProdPct}% focus
            </div>
            <span className="text-[11px] text-stone-500 font-sans block mt-0.5">
              {lastWeekAvgStretch}m longest stretch
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Recovery Time & Productivity Percentage Charts */}
      <ErrorBoundary>
        <RecoveryTimeChart
          sessions={sessions}
          isDemo={Boolean(settings?.demoMode)}
          lang={lang}
        />
      </ErrorBoundary>

      {/* AI Weekly Counsel using Vivekananda psychology */}
      <div className="p-6 border border-amber-300 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50/20 dark:from-stone-900 dark:to-stone-900 rounded-3xl space-y-2 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
            <span>🧘</span>
            <span>Weekly Vivekananda Psychological Counsel</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
            {settings?.geminiKey ? "Gemini AI Integration" : "Classical Counsel"}
          </span>
        </div>
        <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-serif pt-1">
          {loadingTip ? t(lang, "common.loading") : `"${tip}"`}
        </p>
      </div>

      {/* Concentration stages */}
      <div className="p-5 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-3xl space-y-3 shadow-xs">
        <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {t(lang, "journey.stagesTitle")} (Patanjali & Vivekananda)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className={`p-4 rounded-2xl border transition ${currentStage === "pratyahara" ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 shadow-xs" : "border-stone-200 dark:border-stone-800"}`}>
            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold block text-[10px]">STAGE 1</span>
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">{t(lang, "journey.pratyahara")}</span>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">{t(lang, "journey.pratyaharaDesc")}</p>
          </div>
          <div className={`p-4 rounded-2xl border transition ${currentStage === "dharana" ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 shadow-xs" : "border-stone-200 dark:border-stone-800"}`}>
            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold block text-[10px]">STAGE 2</span>
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">{t(lang, "journey.dharana")}</span>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">{t(lang, "journey.dharanaDesc")}</p>
          </div>
          <div className={`p-4 rounded-2xl border transition ${currentStage === "dhyana" ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 shadow-xs" : "border-stone-200 dark:border-stone-800"}`}>
            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold block text-[10px]">STAGE 3</span>
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">{t(lang, "journey.dhyana")}</span>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">{t(lang, "journey.dhyanaDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
