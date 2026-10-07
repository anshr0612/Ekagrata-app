import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { generateDemoSessions } from '../services/demoData';

export default function Settings() {
  const {
    lang,
    theme,
    settings,
    updateSettings,
    replaceSessions,
  } = useApp();

  const [apiKey, setApiKey] = useState(settings.geminiKey || '');
  const [savedKey, setSavedKey] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);

  const handleSaveKey = (e) => {
    e.preventDefault();
    updateSettings({ geminiKey: apiKey.trim() });
    setSavedKey(true);
    setTimeout(() => setSavedKey(false), 2000);
  };

  const handleToggleDemo = () => {
    const nextMode = !settings.demoMode;
    updateSettings({ demoMode: nextMode });
    if (nextMode) {
      const demoData = generateDemoSessions();
      replaceSessions(demoData);
      setDemoLoaded(true);
      setTimeout(() => setDemoLoaded(false), 2500);
    } else {
      replaceSessions([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-medium text-stone-900 dark:text-stone-100">
          {t(lang, 'settings.title')}
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Configuration and demonstration options.
        </p>
      </div>

      <div className="p-5 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-lg space-y-6">
        {/* Gemini API Key */}
        <div>
          <label className="block text-xs font-medium text-stone-900 dark:text-stone-100 mb-1">
            {t(lang, 'settings.geminiKey')}
          </label>
          <p className="text-[11px] text-stone-500 mb-2">
            Optional. Saved locally to generate non-judgmental session reflections.
          </p>

          <form onSubmit={handleSaveKey} className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t(lang, 'settings.geminiKeyPlaceholder')}
              className="flex-1 px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:border-stone-500 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded text-xs hover:opacity-90 transition font-medium"
            >
              {savedKey ? t(lang, 'settings.geminiKeySaved') : t(lang, 'common.save')}
            </button>
          </form>
        </div>

        {/* Display & Language */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100 dark:border-stone-800">
          <div>
            <label className="block text-xs font-medium text-stone-900 dark:text-stone-100 mb-1.5">
              {t(lang, 'settings.language')}
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => updateSettings({ lang: 'en' })}
                className={`flex-1 py-1 text-xs rounded border transition ${
                  lang === 'en'
                    ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ lang: 'hi' })}
                className={`flex-1 py-1 text-xs rounded border transition ${
                  lang === 'hi'
                    ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                हिन्दी
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-900 dark:text-stone-100 mb-1.5">
              {t(lang, 'settings.theme')}
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'light' })}
                className={`flex-1 py-1 text-xs rounded border transition ${
                  theme === 'light'
                    ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`flex-1 py-1 text-xs rounded border transition ${
                  theme === 'dark'
                    ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        </div>

        {/* Demo Mode */}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-stone-900 dark:text-stone-100">
              {t(lang, 'settings.demoData')}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Seeds 14 days of session history for testing without extension.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleDemo}
            className={`px-3 py-1.5 rounded text-xs border font-medium transition ${
              settings.demoMode
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900'
                : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
            }`}
          >
            {settings.demoMode ? 'Loaded' : 'Load Demo Data'}
          </button>
        </div>

        {demoLoaded && (
          <p className="text-[11px] text-stone-600 dark:text-stone-400 font-mono">
            14 days seeded. Check Journey and Samiksha.
          </p>
        )}
      </div>
    </div>
  );
}
