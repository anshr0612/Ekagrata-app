import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { GOODIES } from '../data/rewards';

export default function Rewards() {
  const {
    lang,
    availablePoints,
    totalEarnedPoints,
    claimedGoodies,
    claimGoodie,
    sessions,
  } = useApp();

  const [notification, setNotification] = useState(null);

  const handleClaim = (item) => {
    const success = claimGoodie(item);
    if (success) {
      setNotification(`Redeemed ${item.name}! Confirmation saved to your history.`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Calm Header & Points Balance */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-600/15 border border-amber-300 dark:border-amber-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest font-semibold text-amber-700 dark:text-amber-400">
              Goodies Shelf
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
              {availablePoints} <span className="text-base font-sans font-normal text-stone-500">Points Balance</span>
            </h1>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-lg leading-relaxed">
              Points celebrate your growth in concentration. They are a small encouragement, not the goal.
            </p>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 shrink-0 text-left sm:text-right shadow-xs">
            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">
              Concentration Milestones
            </span>
            <span className="text-sm font-semibold font-mono text-stone-800 dark:text-stone-200">
              {sessions.length} sessions completed
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
              +{totalEarnedPoints} lifetime points earned
            </span>
          </div>
        </div>

        {/* Milestone Badges Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-4 border-t border-amber-200/60 dark:border-amber-900/40 text-xs">
          {[
            { name: 'Sankalpa Initiate', icon: '🌱', req: '1 session', earned: sessions.length >= 1 },
            { name: 'The Steadfast Mind', icon: '🛡️', req: '5 sessions', earned: sessions.length >= 5 },
            { name: 'Swift Recovery Master', icon: '⚡', req: 'Sub-60s return', earned: sessions.some(s => s.avgReturnSec && s.avgReturnSec <= 60) },
            { name: 'Deep Dhyana Flow', icon: '🧘', req: '25+ min stretch', earned: sessions.some(s => (s.longestStretchMin || 0) >= 25) },
          ].map((b) => (
            <div
              key={b.name}
              className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition ${
                b.earned
                  ? 'bg-white/90 dark:bg-stone-850/80 border-amber-400/80 dark:border-amber-700 shadow-xs'
                  : 'bg-white/40 dark:bg-stone-900/30 border-stone-200/50 dark:border-stone-800 opacity-60'
              }`}
            >
              <span className="text-xl">{b.icon}</span>
              <div>
                <span className="font-semibold text-[11px] text-stone-900 dark:text-stone-100 block">
                  {b.name}
                </span>
                <span className="text-[9px] font-mono text-stone-400">
                  {b.earned ? '✓ Unlocked' : b.req}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Redemption notification */}
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center justify-between shadow-xs">
          <span>✓ {notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Goodies 3-Column Responsive Grid (1 col on mobile, 3 col on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {GOODIES.map((goodie) => {
          const cost = goodie.cost;
          const canAfford = availablePoints >= cost;
          const isClaimed = claimedGoodies.some((c) => c.id === goodie.id);

          return (
            <div
              key={goodie.id}
              className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800/80 hover:-translate-y-1 transition duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Product Image Frame */}
                <div className="w-full h-44 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-800 flex items-center justify-center p-4 relative group">
                  <img
                    src={goodie.image}
                    alt={`Illustration of ${goodie.name}`}
                    className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-white/90 dark:bg-stone-900/90 text-amber-700 dark:text-amber-400 shadow-xs border border-amber-200/60 dark:border-stone-700 backdrop-blur-xs">
                    {cost} pts
                  </span>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {goodie.name}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed line-clamp-3">
                    {goodie.description}
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-5 pt-0">
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-stone-400">
                    {canAfford ? 'Eligible' : `${cost - availablePoints} pts away`}
                  </span>

                  <button
                    onClick={() => handleClaim(goodie)}
                    disabled={!canAfford}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition ${
                      canAfford
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-not-allowed border border-stone-200/50 dark:border-stone-800'
                    }`}
                  >
                    {isClaimed ? 'Redeem Another' : 'Redeem'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Redemption History in localStorage */}
      {claimedGoodies.length > 0 && (
        <div className="p-5 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3 shadow-xs">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Redemption History
          </h3>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {claimedGoodies.map((item, idx) => (
              <div
                key={idx}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-8 h-8 rounded-lg object-contain bg-stone-50 dark:bg-stone-800 p-0.5"
                  />
                  <div>
                    <span className="font-medium text-stone-800 dark:text-stone-200">{item.name}</span>
                    <span className="text-[10px] text-stone-400 block font-mono">
                      {item.claimedAt ? new Date(item.claimedAt).toLocaleDateString() : 'Recent'} · {item.cost} points
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
                  Redeemed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gentle Philosophy Reminder */}
      <div className="p-4 rounded-2xl bg-stone-100/70 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 leading-relaxed text-center">
        Points are awarded for genuine growth: 1 point per 10 minutes of unbroken focus stretch, plus a bonus when your recovery time speeds up. When a session drifts, there is no penalty or shame—only the invitation to <span className="font-semibold text-stone-800 dark:text-stone-200">Begin again</span>.
      </div>
    </div>
  );
}
