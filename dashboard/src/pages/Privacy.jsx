import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

export default function Privacy() {
  const { lang, deleteAllData } = useApp();
  const [deleted, setDeleted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    deleteAllData();
    setDeleted(true);
    setShowConfirm(false);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-medium text-stone-900 dark:text-stone-100">
          {t(lang, 'privacy.title')}
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          {t(lang, 'privacy.nothingSold')}
        </p>
      </div>

      <div className="p-5 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-lg space-y-5 text-xs text-stone-700 dark:text-stone-300">
        <div>
          <h3 className="font-medium text-stone-900 dark:text-stone-100 mb-1">
            Local-First Storage
          </h3>
          <p className="text-stone-500 dark:text-stone-400 leading-relaxed">
            All session records, intentions, durations, and profiles reside in your browser's local storage. No user accounts, database servers, or telemetry tracking exist.
          </p>
        </div>

        <div>
          <h3 className="font-medium text-stone-900 dark:text-stone-100 mb-1">
            Gemini Classification & Prompts
          </h3>
          <p className="text-stone-500 dark:text-stone-400 leading-relaxed">
            {t(lang, 'privacy.urlsSentNote')} If an API key is provided, aggregate session numbers and domain names are forwarded strictly to produce your reflection query.
          </p>
        </div>

        <div>
          <h3 className="font-medium text-stone-900 dark:text-stone-100 mb-1">
            Data Deletion
          </h3>
          <p className="text-stone-500 dark:text-stone-400 mb-2 leading-relaxed">
            Clearing your browser storage immediately purges all saved sessions and profile details.
          </p>

          {deleted ? (
            <p className="text-stone-900 dark:text-stone-100 font-medium">
              {t(lang, 'privacy.deleted')}
            </p>
          ) : showConfirm ? (
            <div className="p-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded space-y-2">
              <p>{t(lang, 'privacy.deleteConfirm')}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="px-2.5 py-1 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded text-xs"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-2.5 py-1 border border-stone-300 dark:border-stone-700 rounded text-xs"
                >
                  {t(lang, 'common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded text-xs transition"
            >
              {t(lang, 'privacy.deleteAll')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
