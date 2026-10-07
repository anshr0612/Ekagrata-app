import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

export default function Navbar() {
  const { lang, theme, updateSettings, profile, availablePoints } = useApp();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: t(lang, 'nav.home') },
    { path: '/journey', label: t(lang, 'nav.journey') },
    { path: '/methods', label: t(lang, 'nav.methods') },
    { path: '/rewards', label: t(lang, 'nav.rewards') },
    { path: '/privacy', label: t(lang, 'nav.privacy') },
    { path: '/settings', label: t(lang, 'nav.settings') },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="border-b border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur sticky top-0 z-40 transition-colors">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 group-hover:scale-125 transition-transform"></span>
            <span className="absolute w-4 h-4 rounded-full bg-amber-400/40 animate-ping pointer-events-none"></span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-lg font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent tracking-tight">
              Ekāgratā
            </span>
            <span className="font-serif text-xs text-amber-800/70 dark:text-amber-400/70 font-medium">
              एकाग्रता
            </span>
          </div>
          {profile?.name && (
            <span className="text-stone-400 dark:text-stone-500 font-normal text-xs hidden md:inline">
              / {profile.name}
            </span>
          )}
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-1.5 text-xs rounded-xl transition ${
                isActive(item.path)
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium border border-amber-200/50 dark:border-amber-900/40'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800/50'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Points Pill */}
          <Link
            to="/rewards"
            className="ml-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs hover:opacity-90 transition flex items-center gap-1"
            title="Redeem your concentration points"
          >
            <span>🎁</span>
            <span>{availablePoints}</span>
          </Link>

          {/* Quick theme & lang toggles */}
          <div className="flex items-center ml-2 pl-2 border-l border-stone-200 dark:border-stone-800 gap-1 text-xs text-stone-500">
            <button
              onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
              className="px-1.5 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => updateSettings({ lang: lang === 'en' ? 'hi' : 'en' })}
              className="px-1.5 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 font-medium"
              title="Toggle language"
            >
              {lang === 'en' ? 'हि' : 'En'}
            </button>
          </div>
        </div>

        {/* Mobile menu toggle & points pill */}
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            to="/rewards"
            className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white"
          >
            🎁 {availablePoints}
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-xs px-2.5 py-1.5 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 rounded-lg"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div className="sm:hidden border-t border-stone-200 dark:border-stone-800 px-4 py-3 bg-stone-50/95 dark:bg-stone-900/95 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 text-xs rounded-xl ${
                isActive(item.path)
                  ? 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold'
                  : 'text-stone-700 dark:text-stone-300'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2 border-t border-stone-200 dark:border-stone-800 text-xs">
            <button
              onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
              className="text-stone-600 dark:text-stone-400 px-2 py-1 rounded bg-stone-200/50 dark:bg-stone-800"
            >
              {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
            <button
              onClick={() => updateSettings({ lang: lang === 'en' ? 'hi' : 'en' })}
              className="text-stone-600 dark:text-stone-400 px-2 py-1 rounded bg-stone-200/50 dark:bg-stone-800"
            >
              {lang === 'en' ? 'हिन्दी' : 'English'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
