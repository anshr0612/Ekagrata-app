import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { pingExtension, startSession } from '../services/extensionBridge';
import SoundscapeControl from '../components/SoundscapeControl';

export default function Home() {
  const {
    lang,
    profile,
    extensionConnected,
    setExtensionConnected,
    setExtensionVersion,
    setActiveSession,
    demoMode,
    updateSettings,
    triggerDistractionTest,
    availablePoints,
    focusMode,
    setFocusMode,
  } = useApp();
  const navigate = useNavigate();

  const [intention, setIntention] = useState('');
  const [durationMin, setDurationMin] = useState(25);
  const [graceMinutes, setGraceMinutes] = useState(2);
  const [isStarting, setIsStarting] = useState(false);
  const [checkingExtension, setCheckingExtension] = useState(true);

  useEffect(() => {
    let mounted = true;
    pingExtension(1500)
      .then((res) => {
        if (!mounted) return;
        setExtensionConnected(res.connected);
        if (res.version) setExtensionVersion(res.version);
      })
      .catch(() => {
        if (mounted) setExtensionConnected(false);
      })
      .finally(() => {
        if (mounted) setCheckingExtension(false);
      });

    return () => {
      mounted = false;
    };
  }, [setExtensionConnected, setExtensionVersion]);

  const handleBegin = async (e) => {
    e.preventDefault();
    if (!intention.trim()) return;

    setIsStarting(true);
    const sessionPayload = {
      intention: intention.trim(),
      durationMin: Number(durationMin),
      graceMinutes: Number(graceMinutes),
      profile: {
        profession: profile?.profession,
        interests: profile?.interests,
        hobbies: profile?.hobbies,
      },
    };

    if (extensionConnected) {
      try {
        const { sessionId } = await startSession(sessionPayload);
        const active = {
          id: sessionId || `session_${Date.now()}`,
          intention: intention.trim(),
          startedAt: new Date().toISOString(),
          durationMin: Number(durationMin),
          graceMinutes: Number(graceMinutes),
          timeline: [],
          drifts: 0,
        };
        setActiveSession(active);
        navigate('/session');
      } catch (err) {
        console.warn('Could not start via extension, falling back to local session', err);
        startLocalSession();
      }
    } else {
      startLocalSession();
    }
  };

  const startLocalSession = () => {
    const active = {
      id: `session_${Date.now()}`,
      intention: intention.trim(),
      startedAt: new Date().toISOString(),
      durationMin: Number(durationMin),
      graceMinutes: Number(graceMinutes),
      timeline: [],
      drifts: 0,
      isLocal: true,
    };
    setActiveSession(active);
    navigate('/session');
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome with warm accent palette & breathing background */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-emerald-500/10 border border-amber-200/60 dark:border-amber-800/40 relative overflow-hidden animate-fade-in">
        {/* Subtle decorative background element */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none animate-breathe" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400">
                {t(lang, 'home.sankalpTitle')}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              What is your one intention?
            </h1>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 max-w-lg leading-relaxed">
              Set one chosen goal for this sit. When distracting tabs open, Ekāgratā pops up a gentle reminder to witness the urge and steer back.
            </p>
          </div>

          <Link
            to="/rewards"
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-stone-800 border border-amber-200 dark:border-stone-700 shadow-sm shrink-0 hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 transition duration-200 group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🎁</span>
            <div>
              <div className="text-[10px] uppercase font-bold text-stone-400">Available Points</div>
              <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                {availablePoints} pts
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Extension status note if offline */}
      {!checkingExtension && !extensionConnected && (
        <div className="p-4 bg-amber-50 dark:bg-stone-900 border border-amber-200 dark:border-stone-800 rounded-2xl text-xs text-stone-700 dark:text-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <span className="font-semibold text-amber-800 dark:text-amber-400">
              Companion extension offline:
            </span>{' '}
            Running standalone in-browser timer mode. You can test live distraction notifications below!
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => triggerDistractionTest('youtube.com')}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium text-xs shadow-xs"
            >
              Simulate Distraction Popup
            </button>
            <button
              onClick={() => pingExtension(1500).then(r => setExtensionConnected(r.connected))}
              className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs underline"
            >
              Re-check
            </button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-5">
        <form onSubmit={handleBegin} className="space-y-5">
          {/* Intention */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200 mb-1.5">
              {t(lang, 'home.intentionLabel')}
            </label>
            <input
              type="text"
              required
              autoFocus
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder={t(lang, 'home.intentionPlaceholder')}
              className="w-full px-4 py-3 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-stone-900 dark:text-stone-100"
            />
            {/* Quick Intention Templates */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-stone-400 font-medium">Quick ideas:</span>
              {[
                'Deep code refactor',
                'Study algorithms',
                'Write documentation',
                'Read research paper',
                'Design wireframes',
              ].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setIntention(template)}
                  className="px-2 py-0.5 rounded-lg text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-800 dark:hover:text-amber-300 transition"
                >
                  + {template}
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Grace */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200 mb-1.5">
                {t(lang, 'home.durationLabel')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 25, 45, 60].map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setDurationMin(d)}
                    className={`py-2 text-xs rounded-xl font-semibold border transition ${
                      durationMin === d
                        ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-amber-300'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Alert Delay / Grace Period */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Distraction Alert Delay (Grace Period)
                  </label>
                  <p className="text-[11px] text-stone-500">
                    How long you can drift onto an unproductive site before Ekāgratā alerts you
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900">
                  {graceMinutes <= 0.2 ? '10s (Instant)' : `${graceMinutes} min`}
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  { label: '10 sec (Test)', value: 0.16 },
                  { label: '2 min', value: 2 },
                  { label: '5 min', value: 5 },
                  { label: '10 min', value: 10 },
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => setGraceMinutes(preset.value)}
                    className={`py-1.5 text-xs rounded-xl font-medium border transition ${
                      graceMinutes === preset.value
                        ? 'border-amber-600 bg-amber-600 text-white font-semibold shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-amber-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Digital Wellbeing Focus Mode */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-stone-800/50 border border-amber-200/80 dark:border-stone-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⏳</span>
                <div>
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <span>Digital Wellbeing Focus Mode</span>
                    <span className="text-[9px] bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded font-mono font-medium">Recommended</span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    If you wander and select "Return to work", the distracting site is turned off until your session finishes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFocusMode(!focusMode)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition duration-300 shrink-0 ${focusMode ? 'bg-amber-600 justify-end' : 'bg-stone-300 dark:bg-stone-700 justify-start'}`}
                title="Toggle Focus Mode"
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
              </button>
            </div>
          </div>

          {/* Begin button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isStarting || !intention.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold text-sm rounded-2xl shadow-md transition disabled:opacity-50"
            >
              {isStarting ? t(lang, 'common.loading') : `${t(lang, 'home.begin')} Focus Session`}
            </button>
          </div>
        </form>
      </div>

      {/* Focus Soundscapes Audio Control Add-on */}
      <SoundscapeControl />

      {/* Quick shortcuts */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <Link to="/methods" className="text-amber-600 dark:text-amber-400 hover:underline">
          📖 Read Vivekananda concentration methods
        </Link>
        <button
          onClick={() => updateSettings({ demoMode: !demoMode })}
          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
        >
          {demoMode ? 'Turn off demo data' : 'Demo Mode (14-day history)'}
        </button>
      </div>
    </div>
  );
}
