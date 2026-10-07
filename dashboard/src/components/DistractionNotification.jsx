import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  getRandomPraiseQuote,
  getRandomDisciplineQuote
} from '../data/vivekanandaQuotes';

export default function DistractionNotification() {
  const [showProtocol, setShowProtocol] = useState(false);
  const [viewState, setViewState] = useState('prompt'); // 'prompt' | 'praise' | 'discipline'
  const [activeQuote, setActiveQuote] = useState(null);

  const {
    distractionAlert,
    dismissDistractionAlert,
    handleReturnToWork,
    handleContinueAnyway,
    focusMode,
    lang
  } = useApp();

  const isHi = lang === 'hi';

  // Reset state when new distraction alert appears
  useEffect(() => {
    if (distractionAlert) {
      setViewState('prompt');
      setShowProtocol(false);
      setActiveQuote(null);
    }
  }, [distractionAlert]);

  // Auto-dismiss logic: only during initial prompt after 12s, or after praise after 6s
  useEffect(() => {
    if (!distractionAlert) return;

    if (viewState === 'prompt') {
      const timer = setTimeout(() => {
        dismissDistractionAlert();
      }, 15000);
      return () => clearTimeout(timer);
    }

    if (viewState === 'praise') {
      const timer = setTimeout(() => {
        dismissDistractionAlert();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [distractionAlert, viewState, dismissDistractionAlert]);

  if (!distractionAlert) return null;

  // Handler: When user clicks Return to work
  const onReturnToWork = (domain) => {
    const praise = getRandomPraiseQuote();
    setActiveQuote(praise);
    setViewState('praise');
    handleReturnToWork(domain);
  };

  // Handler: When user clicks Continue anyway -> Intervene with Vivekananda discipline quote
  const onContinueAnywayClick = () => {
    const discipline = getRandomDisciplineQuote();
    setActiveQuote(discipline);
    setViewState('discipline');
  };

  // Handler: When user finally confirms continue anyway after discipline prompt
  const onConfirmContinueAnyway = () => {
    handleContinueAnyway();
    dismissDistractionAlert();
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[94%] sm:w-full animate-fade-in transition-all">
      {/* 1. INITIAL PROMPT STATE */}
      {viewState === 'prompt' && (
        <div className="bg-amber-50/95 dark:bg-stone-900/95 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl text-stone-900 dark:text-stone-100 flex items-start gap-3.5 backdrop-blur-md animate-glow-border">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0 font-bold animate-pulse-subtle">
            ⏳
          </div>

          <div className="flex-1 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <span>{isHi ? 'एकाग्रता मोड' : 'Focus Mode'}</span>
                {focusMode && (
                  <span className="text-[9px] bg-amber-200 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-1 py-0.2 rounded font-mono">
                    {isHi ? 'डिजिटल वेलबीइंग' : 'Digital Wellbeing'}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                {distractionAlert.time}
              </span>
            </div>

            <p className="font-medium text-stone-800 dark:text-stone-200">
              {isHi ? 'भटकाव पाया गया: ' : 'Wandering detected on '}
              <span className="font-mono text-amber-700 dark:text-amber-300 underline font-semibold">
                {distractionAlert.domain}
              </span>
            </p>

            <p className="text-[11px] text-stone-600 dark:text-stone-400">
              {isHi
                ? 'आपका ध्यान कार्य से विचलित हो रहा है। क्या आप जारी रखना चाहते हैं?'
                : 'You are getting distracted from your task. Do you want to continue?'}
            </p>

            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onReturnToWork(distractionAlert.domain)}
                title={
                  focusMode
                    ? `Turns off ${distractionAlert.domain} until your session finishes`
                    : 'Return to focus'
                }
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-[11px] shadow-sm transition flex items-center gap-1.5 transform active:scale-95"
              >
                <span>🦁</span>
                <span>{isHi ? 'कार्य पर लौटें' : 'Return to work'}</span>
                {focusMode && (
                  <span className="text-[9px] opacity-90">
                    ({isHi ? 'साइट बंद होगी' : 'turns off site'})
                  </span>
                )}
              </button>

              <button
                onClick={onContinueAnywayClick}
                className="px-2.5 py-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-[11px] transition"
              >
                {isHi ? 'फिर भी जारी रखें' : 'Continue anyway'}
              </button>

              <button
                type="button"
                onClick={() => setShowProtocol(!showProtocol)}
                className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 ml-auto"
              >
                <span>🧘</span>
                <span>
                  {showProtocol
                    ? (isHi ? 'छिपाएं' : 'Hide Reset')
                    : (isHi ? '60s रीसेट तकनीक' : '60s Recovery Tip')}
                </span>
              </button>
            </div>

            {showProtocol && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800/80 space-y-1 text-[11px] animate-fade-in text-stone-800 dark:text-stone-200">
                <span className="font-semibold text-amber-900 dark:text-amber-300 block">
                  💨 {isHi ? 'दैहिक निःश्वास तकनीक (Double Exhale):' : 'The Double-Exhale Recovery:'}
                </span>
                <p className="leading-relaxed text-[10px] text-stone-700 dark:text-stone-300">
                  {isHi ? (
                    <>
                      1. नाक से दो बार त्वरित श्वास भीतर लें।<br />
                      2. मुख से लंबा, धीमा निःश्वास छोड़ें।<br />
                      3. मुस्कुराकर कहें: "मन भटकना चाहता था, पर मैं साक्षी हूँ।" और लौट आएं।
                    </>
                  ) : (
                    <>
                      1. Take two quick inhales through your nose.<br />
                      2. Release a long, slow sigh through your mouth.<br />
                      3. Acknowledge: "The mind wanted to play." Then return gently.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={dismissDistractionAlert}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm leading-none p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. PRAISE / CONGRATULATORY STATE (When Return to Work is clicked) */}
      {viewState === 'praise' && activeQuote && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800 border-2 border-emerald-500/80 dark:border-emerald-500/60 rounded-2xl p-4 shadow-2xl text-stone-900 dark:text-stone-100 space-y-3 backdrop-blur-md animate-scale-up">
          <div className="flex items-center justify-between border-b border-amber-200 dark:border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <span className="font-bold text-emerald-800 dark:text-emerald-400 text-sm tracking-wide">
                {isHi ? activeQuote.praiseTitleHi : activeQuote.praiseTitle}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full font-semibold">
              {isHi ? 'आत्म-विजय +10 XP' : 'Self-Mastery Win +10 XP'}
            </span>
          </div>

          {/* Authentic Vivekananda Praise Quote */}
          <div className="bg-white/80 dark:bg-stone-950/70 p-3.5 rounded-xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-2">
            <blockquote className="font-serif italic text-xs leading-relaxed text-stone-800 dark:text-stone-200">
              "{isHi ? activeQuote.quoteHi : activeQuote.quote}"
            </blockquote>
            <div className="flex items-center justify-between text-[10px] text-amber-800 dark:text-amber-400 pt-1 font-medium border-t border-amber-100 dark:border-stone-800/80">
              <span>— स्वामी विवेकानन्द · {activeQuote.source}</span>
              <span className="text-stone-500 dark:text-stone-400">
                {isHi ? 'मन के विजेता' : 'Master of Mind'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-stone-600 dark:text-stone-300 font-medium flex items-center gap-1.5">
              <span>✨</span>
              <span>
                {isHi
                  ? 'आपने भटकाव को जीत लिया है। कार्य में पुनः स्वागत है!'
                  : 'You conquered the impulse. Focus state restored!'}
              </span>
            </p>
            <button
              onClick={dismissDistractionAlert}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-medium shadow-sm transition"
            >
              {isHi ? 'आगे बढ़ें' : 'Begin Focus'}
            </button>
          </div>
        </div>
      )}

      {/* 3. DISCIPLINE / SOLEMN INTERVENTION (When Continue Anyway is clicked) */}
      {viewState === 'discipline' && activeQuote && (
        <div className="bg-stone-950 text-stone-100 border-2 border-red-500/80 rounded-2xl p-5 shadow-2xl space-y-3.5 backdrop-blur-md animate-scale-up">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div>
                <span className="font-bold text-amber-400 text-sm tracking-wide block">
                  {isHi ? activeQuote.alertTitleHi : activeQuote.alertTitle}
                </span>
                <span className="text-[10px] text-stone-400">
                  {isHi
                    ? 'स्वामी विवेकानन्द का विवेक-आह्वान'
                    : 'Swami Vivekananda’s Call to Your Will'}
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider bg-red-950/80 text-red-300 border border-red-800/50 px-2 py-0.5 rounded">
              {isHi ? 'सजगता परीक्षा' : 'Resolve Tested'}
            </span>
          </div>

          {/* Disciplined / Awakening Quote */}
          <div className="bg-stone-900/90 p-4 rounded-xl border border-stone-800 space-y-2">
            <blockquote className="font-serif italic text-xs leading-relaxed text-amber-100/90">
              "{isHi ? activeQuote.quoteHi : activeQuote.quote}"
            </blockquote>
            <div className="text-[10px] text-amber-400/90 pt-1 font-semibold flex items-center justify-between border-t border-stone-800">
              <span>— स्वामी विवेकानन्द · {activeQuote.source}</span>
              <span className="text-stone-400 text-[9px] font-mono">
                {isHi ? 'राजा योग / संकलित रचनाएं' : 'Complete Works'}
              </span>
            </div>
          </div>

          {/* Urgent Psychological Call to Action */}
          <p className="text-[11px] text-stone-300 font-medium leading-relaxed bg-stone-900/40 p-2.5 rounded-lg border border-amber-900/30">
            {isHi
              ? 'समय की प्रत्येक सांस अमूल्य है। क्या आप एक क्षणिक भटकाव के आगे अपने संकल्प को तोड़ देंगे, या अभी सिंह की भांति खड़े होकर कार्य पर लौटेंगे?'
              : activeQuote.callToAction}
          </p>

          <div className="pt-1 flex items-center gap-2 justify-end">
            <button
              onClick={onConfirmContinueAnyway}
              className="px-3 py-1.5 text-stone-400 hover:text-stone-200 border border-stone-800 hover:bg-stone-900 rounded-lg text-[10px] transition"
            >
              {isHi ? 'फिर भी भटकना चुनता हूँ' : 'Surrender to distraction'}
            </button>
            <button
              onClick={() => onReturnToWork(distractionAlert.domain)}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-semibold text-xs shadow-lg transition flex items-center gap-1.5 transform active:scale-95 animate-pulse-subtle"
            >
              <span>🦁</span>
              <span>
                {isHi ? 'उठो! कार्य पर वापस लौटो' : 'Arise & Return to Work!'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
