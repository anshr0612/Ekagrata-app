import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { methods } from '../data/methods';
import PranayamaGuide from '../components/PranayamaGuide';

export default function Methods() {
  const { lang } = useApp();
  const [selectedId, setSelectedId] = useState(methods[0].id);

  const selected = methods.find(m => m.id === selectedId) || methods[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-medium text-stone-900 dark:text-stone-100">
          {t(lang, 'nav.methods')}
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Practical concentration disciplines drawn from Swami Vivekananda’s <em>Raja Yoga</em> and lectures.
        </p>
      </div>

      {/* Interactive Breath Trainer Add-on */}
      <PranayamaGuide />

      {/* Method selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-stone-200 dark:border-stone-800">
        {methods.map((item) => {
          const isActive = item.id === selectedId;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap border-b-2 transition -mb-px ${
                isActive
                  ? 'border-stone-800 dark:border-stone-200 text-stone-900 dark:text-stone-100'
                  : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {lang === 'hi' ? item.nameHi : item.name}
            </button>
          );
        })}
      </div>

      {/* Selected Method Details */}
      <div className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 rounded-lg space-y-5">
        <div>
          <span className="text-xs uppercase tracking-wider text-stone-400 font-mono">
            {selected.source}
          </span>
          <h2 className="text-lg font-medium text-stone-900 dark:text-stone-100 mt-1">
            {lang === 'hi' ? selected.nameHi : selected.name}
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-300 italic mt-1">
            "{lang === 'hi' ? selected.taglineHi : selected.tagline}"
          </p>
        </div>

        {/* Concept */}
        <div>
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
            Core Insight
          </h3>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
            {lang === 'hi' ? selected.conceptHi : selected.concept}
          </p>
        </div>

        {/* Step-by-step practice */}
        <div>
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
            Practice Steps
          </h3>
          <ol className="space-y-2">
            {(lang === 'hi' ? selected.stepsHi : selected.steps).map((step, idx) => (
              <li key={idx} className="text-sm text-stone-700 dark:text-stone-300 flex items-start gap-2.5">
                <span className="text-xs font-mono text-stone-400 mt-0.5 w-4 shrink-0">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Application to digital work */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block mb-1">
            In Digital Work
          </span>
          <p className="text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/50 p-3 rounded border border-stone-200 dark:border-stone-800">
            {selected.practicalApplication}
          </p>
        </div>
      </div>
    </div>
  );
}
