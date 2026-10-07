import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Brush,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";

/**
 * Format duration helpers adhering to quiet notebook specs:
 * "45 seconds" under a minute, "2 min 10 s" above it.
 */
function formatDuration(sec) {
  if (sec == null || isNaN(sec)) return "0 seconds";
  const totalSec = Math.max(0, Math.round(sec));
  if (totalSec < 60) {
    return `${totalSec} seconds`;
  }
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

function formatPlainDuration(sec) {
  if (sec == null || isNaN(sec)) return "0 seconds";
  const totalSec = Math.max(0, Math.round(sec));
  if (totalSec < 60) {
    return `about ${totalSec} seconds`;
  }
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s === 0 ? `about ${m} minutes` : `about ${m} min ${s} s`;
}

function formatDelta(diff) {
  if (diff == null || isNaN(diff)) return null;
  const absSec = Math.abs(Math.round(diff));
  if (absSec <= 1) {
    return "the same as the day before";
  }
  if (diff < 0) {
    return `${formatDuration(absSec)} quicker than the day before`;
  }
  return `${formatDuration(absSec)} slower than the day before`;
}

export default function RecoveryTimeChart({
  sessions = [],
  isDemo = false,
  lang = "en",
}) {
  const [range, setRange] = useState("7"); // Default to weekly ("7"), options: "7", "14", "30"
  const [viewMode, setViewMode] = useState("sideBySide"); // "sideBySide", "correlation", "table"
  const [showRefLine, setShowRefLine] = useState(true);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [brushKey, setBrushKey] = useState(0);

  const containerRef = useRef(null);

  // Check user preference for reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  // Track initial mount for animation duration
  const [hasDrawnOnce, setHasDrawnOnce] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHasDrawnOnce(true), 700);
    return () => clearTimeout(timer);
  }, []);

  const animationDuration = prefersReducedMotion ? 0 : (hasDrawnOnce ? 150 : 500);

  // Keyboard navigation & closing drill-down on Escape
  useEffect(() => {
    const handleKeyDownGlobal = (e) => {
      if (e.key === "Escape" && selectedDay) {
        setSelectedDay(null);
      }
    };
    window.addEventListener("keydown", handleKeyDownGlobal);
    return () => window.removeEventListener("keydown", handleKeyDownGlobal);
  }, [selectedDay]);

  // Aggregate sessions by day for the chosen range
  const chartData = useMemo(() => {
    if (!Array.isArray(sessions) || sessions.length === 0) return [];

    const numDays = parseInt(range, 10) || 7;
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const cutoff = new Date(now.getTime() - numDays * 24 * 60 * 60 * 1000);
    cutoff.setHours(0, 0, 0, 0);

    // Group sessions by ISO date string (YYYY-MM-DD)
    const map = new Map();

    const processSession = (s) => {
      if (!s || !s.startedAt) return;
      const sDate = new Date(s.startedAt);
      if (isNaN(sDate.getTime())) return;

      const dateKey = s.startedAt.slice(0, 10);
      const retTime = typeof s.avgReturnSec === "number" && !isNaN(s.avgReturnSec) ? s.avgReturnSec : 0;
      const stretch = typeof s.longestStretchMin === "number" && !isNaN(s.longestStretchMin)
        ? s.longestStretchMin
        : (s.minutes?.productive || 0);

      // Extract productive, distracting, neutral minutes
      let prod = 0;
      let dist = 0;
      let neut = 0;

      if (s.minutes) {
        prod = Number(s.minutes.productive) || 0;
        dist = Number(s.minutes.distracting) || 0;
        neut = Number(s.minutes.neutral) || 0;
      } else if (Array.isArray(s.timeline) && s.timeline.length > 0) {
        s.timeline.forEach((seg) => {
          let segMin = 0;
          if (seg.start && seg.end) {
            segMin = Math.max(0.2, (new Date(seg.end).getTime() - new Date(seg.start).getTime()) / 60000);
          } else {
            segMin = Number(seg.minutes) || 1;
          }
          if (seg.category === "productive") prod += segMin;
          else if (seg.category === "distracting") dist += segMin;
          else neut += segMin;
        });
      } else {
        prod = stretch || (s.durationMin ? s.durationMin * 0.8 : 20);
        dist = s.durationMin ? Math.max(0, s.durationMin - prod) : 5;
      }

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: dateKey,
          timestamp: sDate.getTime(),
          weekday: sDate.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", { weekday: "short" }),
          label: sDate.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", {
            month: "numeric",
            day: "numeric",
          }),
          fullDate: sDate.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          returnTimes: [retTime],
          longestStretches: [stretch],
          prodMin: prod,
          distMin: dist,
          neutMin: neut,
          sessions: [s],
        });
      } else {
        const existing = map.get(dateKey);
        existing.returnTimes.push(retTime);
        existing.longestStretches.push(stretch);
        existing.prodMin += prod;
        existing.distMin += dist;
        existing.neutMin += neut;
        existing.sessions.push(s);
      }
    };

    // First pass: try within cutoff
    sessions.forEach((s) => {
      if (!s || !s.startedAt) return;
      const sDate = new Date(s.startedAt);
      if (isNaN(sDate.getTime()) || sDate < cutoff) return;
      processSession(s);
    });

    // Fallback: If sessions exist but were earlier than cutoff, include available
    if (map.size === 0 && sessions.length > 0) {
      sessions.forEach(processSession);
    }

    // Sort ascending by date
    const sorted = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Compute derived metrics, percentages & day-over-day changes
    return sorted.map((d, index) => {
      const count = d.returnTimes.length;
      const avgReturn = Math.round(d.returnTimes.reduce((acc, v) => acc + v, 0) / count);
      const minReturn = Math.min(...d.returnTimes);
      const maxReturn = Math.max(...d.returnTimes);
      const longestStretch = Math.max(...d.longestStretches);

      const roundedProdMin = Math.round(d.prodMin);
      const roundedDistMin = Math.round(d.distMin);
      const roundedNeutMin = Math.round(d.neutMin);
      const nonProdMin = roundedDistMin + roundedNeutMin;
      const totalMin = Math.max(1, roundedProdMin + nonProdMin);

      // Productivity and Non-Productivity Percentages
      const productivityPct = Math.min(100, Math.max(0, Math.round((roundedProdMin / totalMin) * 100)));
      const nonProductivityPct = Math.max(0, 100 - productivityPct);

      let diffFromPrev = null;
      let diffFromPrevText = null;
      if (index > 0) {
        const prevAvg = sorted[index - 1].avgReturnTimesAverage;
        diffFromPrev = avgReturn - prevAvg;
        diffFromPrevText = formatDelta(diffFromPrev);
      } else {
        diffFromPrevText = "First day in range";
      }

      d.avgReturnTimesAverage = avgReturn;

      return {
        date: d.date,
        weekday: d.weekday,
        label: d.label,
        fullDate: d.fullDate,
        count,
        avgReturn,
        minReturn,
        maxReturn,
        prodMin: roundedProdMin,
        distMin: roundedDistMin,
        neutMin: roundedNeutMin,
        nonProdMin,
        totalMin,
        productivityPct,
        nonProductivityPct,
        longestStretch,
        diffFromPrev,
        diffFromPrevText,
        sessions: d.sessions,
      };
    });
  }, [sessions, range, lang]);

  // Overall Weekly Aggregate Metrics
  const {
    weeklyAvgRecovery,
    weeklyProdPct,
    weeklyNonProdPct,
    weeklyTotalProdHours,
    weeklyTotalNonProdHours,
  } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        weeklyAvgRecovery: 0,
        weeklyProdPct: 0,
        weeklyNonProdPct: 0,
        weeklyTotalProdHours: "0",
        weeklyTotalNonProdHours: "0",
      };
    }

    let sumReturnTimes = 0;
    let sumSessions = 0;
    let sumProdMin = 0;
    let sumNonProdMin = 0;

    chartData.forEach((d) => {
      sumReturnTimes += d.avgReturn * d.count;
      sumSessions += d.count;
      sumProdMin += d.prodMin;
      sumNonProdMin += d.nonProdMin;
    });

    const avgRet = sumSessions > 0 ? Math.round(sumReturnTimes / sumSessions) : 0;
    const totalMin = Math.max(1, sumProdMin + sumNonProdMin);
    const prodPct = Math.min(100, Math.max(0, Math.round((sumProdMin / totalMin) * 100)));
    const nonProdPct = Math.max(0, 100 - prodPct);

    return {
      weeklyAvgRecovery: avgRet,
      weeklyProdPct: prodPct,
      weeklyNonProdPct: nonProdPct,
      weeklyTotalProdHours: (sumProdMin / 60).toFixed(1),
      weeklyTotalNonProdHours: (sumNonProdMin / 60).toFixed(1),
    };
  }, [chartData]);

  // Plain language correlation insight
  const correlationInsight = useMemo(() => {
    if (!chartData || chartData.length < 2) {
      return "Not enough sessions yet to show a weekly trend.";
    }
    const daysCount = chartData.length;
    if (weeklyAvgRecovery <= 60) {
      return `Over these ${daysCount} days, your average recovery time was swift (${weeklyAvgRecovery}s). Because distraction was noticed promptly, ${weeklyProdPct}% of your attention was dedicated to productive focus, keeping wandering down to ${weeklyNonProdPct}%.`;
    } else if (weeklyAvgRecovery <= 150) {
      return `With a steady recovery latency of about ${formatDuration(weeklyAvgRecovery)}, you sustained an ${weeklyProdPct}% productivity rate across ${daysCount} days, with ${weeklyNonProdPct}% spent wandering.`;
    } else {
      return `Recovery latency averaged ${formatDuration(weeklyAvgRecovery)}. Longer wandering stretches increased non-productivity to ${weeklyNonProdPct}%, while ${weeklyProdPct}% was preserved in deep focus.`;
    }
  }, [chartData, weeklyAvgRecovery, weeklyProdPct, weeklyNonProdPct]);

  // Keyboard navigation within the chart
  const handleKeyDown = useCallback(
    (e) => {
      if (!chartData || chartData.length === 0) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.min(chartData.length - 1, prev + 1);
          setHoveredDate(chartData[next].date);
          return next;
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.max(0, prev - 1);
          setHoveredDate(chartData[next].date);
          return next;
        });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (chartData[focusedIndex]) {
          setSelectedDay(chartData[focusedIndex]);
        }
      }
    },
    [chartData, focusedIndex]
  );

  // Active day preview for small screens
  const activeDayPreview = useMemo(() => {
    if (hoveredDate) {
      return chartData.find((d) => d.date === hoveredDate) || null;
    }
    return chartData[focusedIndex] || null;
  }, [hoveredDate, chartData, focusedIndex]);

  // Custom Paper Note Tooltip
  const renderPaperTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className="p-3.5 bg-[#FDFBF7] dark:bg-[#1E1B16] border border-[#E5DECE] dark:border-[#38322A] rounded-xl shadow-lg text-xs text-[#2B2620] dark:text-[#F2EDE4] space-y-2.5 min-w-[230px] pointer-events-none">
        <div className="border-b border-[#EFEAE0] dark:border-[#302B22] pb-1.5 flex justify-between items-baseline gap-2">
          <span className="font-serif font-bold text-sm text-[#2B2620] dark:text-[#F2EDE4]">
            {item.fullDate}
          </span>
          <span className="text-[10px] font-mono text-stone-500">
            {item.count} {item.count === 1 ? "session" : "sessions"}
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Recovery Time */}
          <div className="flex justify-between items-center">
            <span className="text-stone-500 dark:text-stone-400">Recovery latency:</span>
            <span className="font-semibold text-[#C8742B] dark:text-[#E09045] font-mono">
              {formatPlainDuration(item.avgReturn)}
            </span>
          </div>

          {/* Productivity % */}
          <div className="flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
              <span className="w-2 h-2 rounded-full bg-[#5E8A75]"></span>
              Productivity:
            </span>
            <span className="font-mono font-bold text-[#5E8A75]">
              {item.productivityPct}% ({item.prodMin}m)
            </span>
          </div>

          {/* Non-Productivity % */}
          <div className="flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
              <span className="w-2 h-2 rounded-full bg-[#C86D51]"></span>
              Non-productivity:
            </span>
            <span className="font-mono font-bold text-[#C86D51]">
              {item.nonProductivityPct}% ({item.nonProdMin}m)
            </span>
          </div>

          {item.diffFromPrevText && (
            <div className="text-[10px] text-stone-500 italic pt-1 border-t border-[#EFEAE0] dark:border-[#302B22]">
              {item.diffFromPrevText}
            </div>
          )}
        </div>

        <div className="text-[9px] text-stone-400 dark:text-stone-500 pt-0.5 text-center">
          Click or press Enter for session breakdown
        </div>
      </div>
    );
  };

  // If no sessions at all
  if (!sessions || sessions.length === 0) {
    return (
      <div className="p-8 border border-stone-200 dark:border-stone-800 bg-[#FDFBF7] dark:bg-[#1C1917] rounded-3xl text-center space-y-2">
        <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
          No session events recorded yet
        </h3>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Start a session from the Home tab to witness your focus rhythm and recovery latencies.
        </p>
      </div>
    );
  }

  // If sessions exist but no chartData points could be parsed
  if (!chartData || chartData.length === 0) {
    return (
      <div className="p-8 border border-stone-200 dark:border-stone-800 bg-[#FDFBF7] dark:bg-[#1E1B16] rounded-3xl text-center space-y-2">
        <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
          No sessions found in the selected {range}-day window
        </h3>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Sessions exist, but are outside this timeline view. Try choosing a wider range (30 days).
        </p>
        <button
          type="button"
          onClick={() => setRange("30")}
          className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition mt-2"
        >
          Switch to 30 days
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Recovery time and productivity interactive charts"
      onKeyDown={handleKeyDown}
      className="space-y-4 outline-none focus-visible:ring-1 focus-visible:ring-amber-500/40 rounded-3xl"
    >
      {/* Top Header Card */}
      <div className="p-5 border border-stone-200 dark:border-stone-800 bg-[#FDFBF7] dark:bg-[#1C1917] rounded-3xl space-y-4 shadow-xs">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200/60 dark:border-stone-800/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                Weekly Recovery Time & Attention Rhythm
              </h3>
              {isDemo && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Demo data
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Witness how quickly attention returns from wandering, and how return latency shapes your productivity percentage.
            </p>
          </div>

          {/* Range Selector & View Mode Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Range Selector */}
            <div className="inline-flex p-1 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80">
              {[
                { id: "7", label: "Weekly (7d)" },
                { id: "14", label: "14 days" },
                { id: "30", label: "30 days" },
              ].map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition duration-200 ${
                    range === r.id
                      ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-700 font-semibold"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  }`}
                  aria-pressed={range === r.id}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80">
              <button
                type="button"
                onClick={() => setViewMode("sideBySide")}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                  viewMode === "sideBySide"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setViewMode("correlation")}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                  viewMode === "correlation"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                Correlation
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                  viewMode === "table"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards: Recovery Time vs Productivity % vs Non-Productivity % */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Recovery Latency */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 block uppercase tracking-wider">
              Weekly Recovery Time
            </span>
            <div className="text-xl font-serif font-bold text-amber-700 dark:text-amber-400 mt-0.5">
              {weeklyAvgRecovery}s <span className="text-xs font-sans font-normal text-stone-500">latency</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Time from drift to gentle return
            </p>
          </div>

          {/* Productivity % */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block uppercase tracking-wider">
              Productivity Rate
            </span>
            <div className="text-xl font-serif font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
              {weeklyProdPct}% <span className="text-xs font-sans font-normal text-stone-500">focus</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              {weeklyTotalProdHours} hours unbroken flow
            </p>
          </div>

          {/* Non-Productivity % */}
          <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
            <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 block uppercase tracking-wider">
              Non-Productivity Rate
            </span>
            <div className="text-xl font-serif font-bold text-rose-700 dark:text-rose-400 mt-0.5">
              {weeklyNonProdPct}% <span className="text-xs font-sans font-normal text-stone-500">drift</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              {weeklyTotalNonProdHours} hours wandering observed
            </p>
          </div>
        </div>

        {/* Legend Series Toggles */}
        {viewMode !== "table" && (
          <div className="flex items-center justify-between text-xs flex-wrap gap-2 text-stone-500 dark:text-stone-400 pt-1">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C8742B] inline-block"></span>
                <span>Recovery Latency (s)</span>
              </span>

              <span className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#5E8A75] inline-block"></span>
                <span>Productivity %</span>
              </span>

              <span className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#C86D51] inline-block"></span>
                <span>Non-Productivity %</span>
              </span>

              <button
                type="button"
                onClick={() => setShowRefLine(!showRefLine)}
                className={`flex items-center gap-1.5 transition ${showRefLine ? "text-stone-800 dark:text-stone-200 font-semibold" : "opacity-40 line-through"}`}
              >
                <span className="w-3 border-b-2 border-dashed border-[#A89F91] inline-block"></span>
                <span>Avg line ({weeklyAvgRecovery}s)</span>
              </button>
            </div>

            {range === "30" && chartData && chartData.length > 2 && (
              <button
                type="button"
                onClick={() => setBrushKey((k) => k + 1)}
                className="text-[11px] text-[#C8742B] hover:underline"
              >
                Reset zoom
              </button>
            )}
          </div>
        )}

        {/* Mode 1: Table View */}
        {viewMode === "table" && (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs text-left text-stone-700 dark:text-stone-300 divide-y divide-stone-200 dark:divide-stone-800">
              <thead>
                <tr className="font-semibold text-stone-900 dark:text-stone-100">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 px-3">Sessions</th>
                  <th className="py-2.5 px-3">Avg Recovery Latency</th>
                  <th className="py-2.5 px-3">Productivity %</th>
                  <th className="py-2.5 px-3">Non-Productivity %</th>
                  <th className="py-2.5 px-3">Focus / Drift Min</th>
                  <th className="py-2.5 pl-3">Day Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-mono">
                {chartData.map((row) => (
                  <tr
                    key={row.date}
                    onClick={() => setSelectedDay(row)}
                    className="hover:bg-amber-50/50 dark:hover:bg-stone-800/40 cursor-pointer transition"
                  >
                    <td className="py-2 pr-4 font-sans font-medium text-stone-900 dark:text-stone-100">
                      {row.fullDate}
                    </td>
                    <td className="py-2 px-3">{row.count}</td>
                    <td className="py-2 px-3 text-[#C8742B] font-bold">
                      {formatPlainDuration(row.avgReturn)}
                    </td>
                    <td className="py-2 px-3 text-[#5E8A75] font-bold">
                      {row.productivityPct}%
                    </td>
                    <td className="py-2 px-3 text-[#C86D51] font-bold">
                      {row.nonProductivityPct}%
                    </td>
                    <td className="py-2 px-3 font-sans text-stone-600 dark:text-stone-400">
                      {row.prodMin}m focus / {row.nonProdMin}m drift
                    </td>
                    <td className="py-2 pl-3 font-sans italic text-stone-500">
                      {row.diffFromPrevText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mode 2: Side-by-Side Linked Charts (Default) */}
        {viewMode === "sideBySide" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 items-start">
            {/* Chart 1: Recovery Time Line Chart */}
            <div className="space-y-2 min-w-0">
              <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  Weekly Recovery Time (Latency)
                </span>
                <span className="font-mono text-[11px] text-stone-400">seconds (lower = quicker)</span>
              </div>

              <div style={{ width: "100%", height: 280, minHeight: 280 }} className="w-full">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 12, right: 15, left: -15, bottom: 5 }}
                    onMouseMove={(state) => {
                      if (state && state.activePayload && state.activePayload.length) {
                        const day = state.activePayload[0].payload;
                        setHoveredDate(day.date);
                      }
                    }}
                    onMouseLeave={() => setHoveredDate(null)}
                    onClick={(state) => {
                      if (state && state.activePayload && state.activePayload.length) {
                        setSelectedDay(state.activePayload[0].payload);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.35} />
                    <XAxis
                      dataKey="label"
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      domain={[0, "auto"]}
                    />
                    <Tooltip
                      content={renderPaperTooltip}
                      cursor={{ stroke: "#C8742B", strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.45 }}
                    />

                    {/* Reference Line for Weekly Average */}
                    {showRefLine && weeklyAvgRecovery > 0 && (
                      <ReferenceLine
                        y={weeklyAvgRecovery}
                        stroke="#A89F91"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          value: `Weekly avg: ${weeklyAvgRecovery}s`,
                          position: "insideTopRight",
                          fill: "#8C8275",
                          fontSize: 10,
                          fontFamily: "monospace",
                        }}
                      />
                    )}

                    {/* Recovery Latency Line */}
                    <Line
                      type="monotone"
                      dataKey="avgReturn"
                      name="Recovery Time"
                      stroke="#C8742B"
                      strokeWidth={2.4}
                      dot={(props) => {
                        if (!props || props.cx == null || props.cy == null || isNaN(props.cx) || isNaN(props.cy)) return null;
                        const isHovered = props.payload?.date === hoveredDate;
                        return (
                          <circle
                            key={props.key || props.index}
                            cx={props.cx}
                            cy={props.cy}
                            r={isHovered ? 6 : 3.5}
                            fill={isHovered ? "#FFFFFF" : "#C8742B"}
                            stroke="#C8742B"
                            strokeWidth={isHovered ? 2.5 : 1}
                            className="cursor-pointer transition-all duration-150"
                          />
                        );
                      }}
                      activeDot={{
                        r: 6.5,
                        stroke: "#C8742B",
                        strokeWidth: 2,
                        fill: "#FFFFFF",
                      }}
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={animationDuration}
                    />

                    {/* Range Zoom Brush for 30-day view */}
                    {range === "30" && chartData && chartData.length > 2 && (
                      <Brush
                        key={brushKey}
                        dataKey="label"
                        height={24}
                        stroke="#C8742B"
                        fill="rgba(200, 116, 43, 0.04)"
                        travellerWidth={8}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Productivity vs Non-Productivity Stacked Percentage Bar Chart */}
            <div className="space-y-2 min-w-0 border-t lg:border-t-0 lg:border-l border-stone-200/80 dark:border-stone-800 lg:pl-6 pt-4 lg:pt-0">
              <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  Productivity vs Non-Productivity (%)
                </span>
                <span className="font-mono text-[11px] text-stone-400">% of session time</span>
              </div>

              <div style={{ width: "100%", height: 280, minHeight: 280 }} className="w-full">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 12, right: 10, left: -20, bottom: 5 }}
                    onMouseMove={(state) => {
                      if (state && state.activePayload && state.activePayload.length) {
                        setHoveredDate(state.activePayload[0].payload.date);
                      }
                    }}
                    onMouseLeave={() => setHoveredDate(null)}
                    onClick={(state) => {
                      if (state && state.activePayload && state.activePayload.length) {
                        setSelectedDay(state.activePayload[0].payload);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                    <XAxis
                      dataKey="label"
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      unit="%"
                    />
                    <Tooltip content={renderPaperTooltip} />

                    {/* 80% Benchmark Reference Line */}
                    <ReferenceLine
                      y={80}
                      stroke="#5E8A75"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{
                        value: "80% focus target",
                        position: "insideTopLeft",
                        fill: "#5E8A75",
                        fontSize: 9,
                        fontFamily: "monospace",
                      }}
                    />

                    {/* Productive % Bar */}
                    <Bar
                      dataKey="productivityPct"
                      name="Productive %"
                      stackId="pct"
                      fill="#5E8A75"
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={animationDuration}
                    >
                      {chartData.map((entry) => {
                        const isHighlighted = entry.date === hoveredDate;
                        return (
                          <Cell
                            key={`prod_${entry.date}`}
                            fill={isHighlighted ? "#4A7260" : "#5E8A75"}
                            className="cursor-pointer transition-colors duration-150"
                            opacity={hoveredDate && !isHighlighted ? 0.6 : 1}
                          />
                        );
                      })}
                    </Bar>

                    {/* Non-Productive % Bar */}
                    <Bar
                      dataKey="nonProductivityPct"
                      name="Non-Productive %"
                      stackId="pct"
                      fill="#C86D51"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={animationDuration}
                    >
                      {chartData.map((entry) => {
                        const isHighlighted = entry.date === hoveredDate;
                        return (
                          <Cell
                            key={`nonprod_${entry.date}`}
                            fill={isHighlighted ? "#B0553A" : "#C86D51"}
                            className="cursor-pointer transition-colors duration-150"
                            opacity={hoveredDate && !isHighlighted ? 0.6 : 1}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Mode 3: Combined Dual-Axis Correlation Chart */}
        {viewMode === "correlation" && (
          <div className="space-y-2 min-w-0 pt-2">
            <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                Correlation: Recovery Latency (Left Axis) vs Productivity % (Right Axis)
              </span>
              <span className="font-mono text-[11px] text-stone-400">Notice: faster recovery drives higher focus %</span>
            </div>

            <div style={{ width: "100%", height: 300, minHeight: 300 }} className="w-full">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 12, right: 20, left: -10, bottom: 5 }}
                  onMouseMove={(state) => {
                    if (state && state.activePayload && state.activePayload.length) {
                      setHoveredDate(state.activePayload[0].payload.date);
                    }
                  }}
                  onMouseLeave={() => setHoveredDate(null)}
                  onClick={(state) => {
                    if (state && state.activePayload && state.activePayload.length) {
                      setSelectedDay(state.activePayload[0].payload);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.35} />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke="#C8742B"
                    fontSize={11}
                    tickLine={false}
                    unit="s"
                    domain={[0, "auto"]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#5E8A75"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip content={renderPaperTooltip} />

                  {/* Shaded Area for Productivity % on Right Axis */}
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="productivityPct"
                    name="Productivity %"
                    fill="#5E8A75"
                    fillOpacity={0.15}
                    stroke="#5E8A75"
                    strokeWidth={2}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={animationDuration}
                  />

                  {/* Line for Recovery Time on Left Axis */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgReturn"
                    name="Recovery Time (s)"
                    stroke="#C8742B"
                    strokeWidth={2.4}
                    dot={{ r: 4, fill: "#C8742B" }}
                    activeDot={{ r: 6.5, fill: "#FFFFFF", stroke: "#C8742B", strokeWidth: 2 }}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={animationDuration}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Small Screen Tap-to-Show Info Bar */}
        {activeDayPreview && (
          <div className="sm:hidden p-3 rounded-2xl bg-amber-50/60 dark:bg-stone-850 border border-amber-200/60 dark:border-stone-800 text-xs flex items-center justify-between">
            <div>
              <span className="font-serif font-bold text-stone-900 dark:text-stone-100">
                {activeDayPreview.fullDate}
              </span>
              <p className="text-[11px] text-stone-500">
                {formatPlainDuration(activeDayPreview.avgReturn)} · {activeDayPreview.productivityPct}% focused ({activeDayPreview.nonProductivityPct}% drift)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(activeDayPreview)}
              className="px-2.5 py-1 text-[11px] rounded-lg bg-amber-600 text-white font-medium"
            >
              Details
            </button>
          </div>
        )}

        {/* One-Line Plain-Language Insight Below the Chart */}
        <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between text-xs">
          <p className="text-stone-700 dark:text-stone-300 font-medium">
            <span className="text-[#C8742B] font-bold mr-1.5">◉</span>
            {correlationInsight}
          </p>
          <span className="text-[10px] text-stone-400 hidden sm:inline">
            Use ← → arrow keys to navigate · Enter to drill down · Esc to close
          </span>
        </div>
      </div>

      {/* Drill-down Panel for Selected Day */}
      {selectedDay && (
        <DayDrilldownPanel
          dayData={selectedDay}
          onClose={() => setSelectedDay(null)}
          lang={lang}
        />
      )}
    </div>
  );
}

/**
 * Segmented Timeline Strip & Wandering Drift List for Selected Day
 */
function DayDrilldownPanel({ dayData, onClose, lang }) {
  const sessions = dayData.sessions || [];

  // Flatten timeline segments and collect drifts
  const { timelineSegments, drifts, totalTrackedMin } = useMemo(() => {
    const segments = [];
    const driftList = [];
    let trackedMin = 0;

    sessions.forEach((sess, sIdx) => {
      const sessTimeline = sess.timeline || [];
      trackedMin += sess.durationMin || (sess.minutes?.productive || 0) + (sess.minutes?.distracting || 0);

      sessTimeline.forEach((seg, segIdx) => {
        let segDurationSec = 0;
        if (seg.start && seg.end) {
          segDurationSec = Math.max(15, Math.round((new Date(seg.end).getTime() - new Date(seg.start).getTime()) / 1000));
        } else {
          segDurationSec = (seg.minutes || 1) * 60;
        }

        const category = seg.category || "productive";
        segments.push({
          id: `seg_${sIdx}_${segIdx}`,
          category,
          domain: seg.domain || "active work",
          title: seg.title || seg.domain || "Focus",
          durationSec: segDurationSec,
          start: seg.start,
        });

        if (category === "distracting") {
          const startTimeStr = seg.start
            ? new Date(seg.start).toLocaleTimeString(lang === "hi" ? "hi-IN" : "en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "During session";

          driftList.push({
            id: `drift_${sIdx}_${segIdx}`,
            domain: seg.domain || "Distracting site",
            time: startTimeStr,
            durationSec: segDurationSec,
            intention: sess.intention || "Focus work",
          });
        }
      });
    });

    return { timelineSegments: segments, drifts: driftList, totalTrackedMin: trackedMin };
  }, [sessions, lang]);

  const totalSegmentSec = timelineSegments.reduce((sum, s) => sum + s.durationSec, 0) || 1;

  return (
    <div className="p-5 border border-amber-300/80 dark:border-stone-700 bg-[#FDFBF7] dark:bg-[#1E1B16] rounded-3xl space-y-4 shadow-sm animate-fade-in text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
              {dayData.fullDate}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Average recovery latency: <strong className="text-[#C8742B] font-mono">{formatPlainDuration(dayData.avgReturn)}</strong> · Productivity: <strong className="text-[#5E8A75] font-mono">{dayData.productivityPct}%</strong> ({dayData.prodMin}m) · Wandering: <strong className="text-[#C86D51] font-mono">{dayData.nonProductivityPct}%</strong> ({dayData.nonProdMin}m)
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition text-sm"
          title="Close drill-down (Esc)"
          aria-label="Close drill-down panel"
        >
          ✕
        </button>
      </div>

      {/* Day Productivity vs Non-Productivity Meter */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="font-semibold text-[#5E8A75] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5E8A75]"></span>
            Productive Focus: {dayData.productivityPct}% ({dayData.prodMin} min)
          </span>
          <span className="font-semibold text-[#C86D51] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C86D51]"></span>
            Non-Productive Drift: {dayData.nonProductivityPct}% ({dayData.nonProdMin} min)
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-stone-200/60 dark:bg-stone-800">
          <div
            style={{ width: `${dayData.productivityPct}%` }}
            className="h-full bg-[#5E8A75] transition-all"
            title={`Productive: ${dayData.productivityPct}%`}
          />
          <div
            style={{ width: `${dayData.nonProductivityPct}%` }}
            className="h-full bg-[#C86D51] transition-all"
            title={`Non-Productive: ${dayData.nonProductivityPct}%`}
          />
        </div>
      </div>

      {/* Segmented Timeline Strip in Muted Earth Tones */}
      <div className="space-y-1.5 pt-2">
        <div className="flex justify-between items-center text-[11px] text-stone-500">
          <span className="font-semibold text-stone-700 dark:text-stone-300">Continuous Session Timeline</span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-[#5E8A75] inline-block"></span> Productive
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-[#C2B29D] inline-block"></span> Neutral
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-[#C86D51] inline-block"></span> Distracting
            </span>
          </div>
        </div>

        {timelineSegments.length > 0 ? (
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-stone-200/60 dark:bg-stone-800">
            {timelineSegments.map((seg) => {
              const widthPct = (seg.durationSec / totalSegmentSec) * 100;
              let bg = "#5E8A75";
              if (seg.category === "neutral") bg = "#C2B29D";
              if (seg.category === "distracting") bg = "#C86D51";

              return (
                <div
                  key={seg.id}
                  style={{ width: `${Math.max(1, widthPct)}%`, backgroundColor: bg }}
                  className="h-full transition-opacity hover:opacity-80"
                  title={`${seg.domain} (${seg.category}): ${formatDuration(seg.durationSec)}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="h-3 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-[10px] text-stone-400">
            Timeline breakdown unavailable
          </div>
        )}
      </div>

      {/* Drift List */}
      <div className="space-y-2 pt-2">
        <h4 className="font-semibold text-stone-800 dark:text-stone-200 text-xs">
          Wandering Events & Return Latency
        </h4>

        {drifts.length > 0 ? (
          <div className="divide-y divide-stone-100 dark:divide-stone-800/80 rounded-2xl border border-stone-200/80 dark:border-stone-800 overflow-hidden bg-white/60 dark:bg-stone-900/40">
            {drifts.map((drift) => (
              <div key={drift.id} className="p-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C86D51]"></span>
                  <div>
                    <span className="font-mono font-medium text-stone-800 dark:text-stone-200">
                      {drift.domain}
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      Departed at {drift.time} during "${drift.intention}"
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-semibold text-[#C8742B] dark:text-[#E09045]">
                    {formatDuration(drift.durationSec)}
                  </span>
                  <span className="text-[10px] text-stone-400 block">return latency</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-stone-600 dark:text-stone-300">
            No wandering recorded on this day. A steady, unbroken focus flow.
          </div>
        )}
      </div>
    </div>
  );
}
