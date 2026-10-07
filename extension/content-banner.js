/**
 * Sakshi - In-Page Mindful Distraction Banner & Wellbeing Blocker
 * Injected into web pages to:
 * 1. Block turned-off apps (redirects to pause.html immediately)
 * 2. Display the Mindful Witness prompt at TOP-CENTRE directly on distracting apps
 * 3. Offer Swami Vivekananda Praise Quotes on "Return to work"
 * 4. Intervene with Swami Vivekananda Disciplined / Wake-up Quotes on "Continue anyway"
 */

(function () {
  // Never run inside our own extension pages or local dashboard
  const currentHref = window.location.href || '';
  if (currentHref.startsWith('chrome-extension://') || currentHref.includes('localhost:5173')) {
    return;
  }

  const VIVEKANANDA_PRAISE = [
    {
      title: 'Victory of the Mind! 🦁',
      quote: 'He is the lion who conquers his own mind; the rest are mere beasts of burden. You have stepped forward as the lion today.',
      source: 'Swami Vivekananda · Raja Yoga & Complete Works'
    },
    {
      title: 'Asserting Divine Strength! ⚡',
      quote: 'Stand up, be bold, be strong! Take the whole responsibility on your own shoulders, and know that all the strength you want is within yourself.',
      source: 'Swami Vivekananda · Lectures from Colombo to Almora'
    },
    {
      title: 'Strength is Life! 🌟',
      quote: 'Strength is life, weakness is death. Expansion is life, contraction is death. By returning to your purpose, you have chosen life and strength.',
      source: 'Swami Vivekananda · Letters'
    },
    {
      title: 'Gathering the Sun’s Rays! ☀️',
      quote: 'The powers of the mind are like the rays of the sun. When they are concentrated, they illumine. You have gathered your rays back.',
      source: 'Swami Vivekananda · Raja Yoga, Chapter 1'
    },
    {
      title: 'The Noble Threefold Shield 🛡️',
      quote: 'Purity, patience, and perseverance are the three essentials to success and, above all: an unbroken will. You have asserted your masterly will.',
      source: 'Swami Vivekananda · Complete Works, Vol. 5'
    }
  ];

  const VIVEKANANDA_DISCIPLINE = [
    {
      title: 'Arise, Awake! ⚔️',
      quote: 'Arise, awake, and stop not till the goal is reached! What! Are you going to sleep away this precious youth and divine energy in fleeting trifles?',
      source: 'Swami Vivekananda · Katha Upanishad Address',
      callToAction: 'Do not sleepwalk through the digital fog. Turn back right now and honor your sacred vow.'
    },
    {
      title: 'Take Up One Idea! 🎯',
      quote: 'Take up one idea. Make that one idea your life — think of it, dream of it, live on that idea. Let every part of your body be full of that idea, and leave every other distraction alone. This is the way to success.',
      source: 'Swami Vivekananda · Raja Yoga',
      callToAction: 'You had a single noble intention when you started. Will you abandon it for a temporary dopamine rush?'
    },
    {
      title: 'Tame the Restless Monkey Mind! 🐒',
      quote: 'The mind is like a mad monkey, restless by nature, stung by the scorpion of desire and intoxicated by impulse. Stand as the witness! Do not let the monkey drag you into waste; you are the master!',
      source: 'Swami Vivekananda · Raja Yoga, Chapter 6',
      callToAction: 'Witness the restless craving without surrendering to it. Hold the reins of your mind!'
    },
    {
      title: 'Do Not Fritter Away Life on Shadows! ⏳',
      quote: 'This fleeting world and its idle amusements are not your true home or your goal. Gather the scattered rays of your intellect! Do not fritter away your life on shadows.',
      source: 'Swami Vivekananda · Karma Yoga',
      callToAction: 'Minutes lost to algorithmic feeds never return. Your time on earth is finite and sacred.'
    },
    {
      title: 'The Soul is the Only Master! 🔥',
      quote: 'You have to grow from the inside out. None can teach you, none can make you great. There is no teacher but your own soul. Will you yield your destiny to a momentary craving?',
      source: 'Swami Vivekananda · Complete Works, Vol. 1',
      callToAction: 'Command yourself. Stand up, cast off the illusion, and step back into the arena.'
    }
  ];

  function getBaseDomain(str) {
    if (!str || typeof str !== 'string') return '';
    let cleaned = str.trim().toLowerCase();
    cleaned = cleaned.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    cleaned = cleaned.split('/')[0].split('?')[0].split(':')[0];
    return cleaned;
  }

  function matchesTurnedOff(url, list) {
    if (!url || !Array.isArray(list) || list.length === 0) return false;
    const urlLower = url.toLowerCase();
    for (const item of list) {
      if (!item) continue;
      const itemLower = item.toLowerCase().trim();
      if (itemLower.includes('youtube.com/shorts') && urlLower.includes('youtube.com/shorts')) {
        return 'youtube.com/shorts';
      }
      const base = getBaseDomain(itemLower);
      if (base && (
        urlLower.includes(`://${base}`) ||
        urlLower.includes(`://www.${base}`) ||
        urlLower.includes(`.${base}/`) ||
        urlLower.includes(`/${base}`) ||
        urlLower.includes(base)
      )) {
        return base;
      }
    }
    return false;
  }

  // 1. Immediate check: Is this page currently turned off?
  function checkAndRedirectIfTurnedOff() {
    try {
      if (!chrome?.storage?.local) return;
      chrome.storage.local.get(['activeSession', 'turnedOffDomains'], (data) => {
        if (chrome.runtime.lastError) return;
        const active = data?.activeSession;
        if (!active) return;
        const list = [
          ...(Array.isArray(active.turnedOffDomains) ? active.turnedOffDomains : []),
          ...(Array.isArray(data?.turnedOffDomains) ? data?.turnedOffDomains : [])
        ];
        const matched = matchesTurnedOff(window.location.href, list);
        if (matched) {
          console.log('[Sakshi Content] Page is turned off by Digital Wellbeing:', matched);
          const remainingMin = Math.max(1, Math.round(((new Date(active.startedAt).getTime() + (active.durationMin || 25) * 60 * 1000) - Date.now()) / 60000));
          window.location.replace(chrome.runtime.getURL(`pause.html?paused=true&domain=${encodeURIComponent(matched)}&remaining=${remainingMin}`));
        }
      });
    } catch (e) {
      // Safe guard against invalidated extension context
    }
  }

  checkAndRedirectIfTurnedOff();

  // Re-check on URL changes (for SPAs like YouTube / Instagram)
  window.addEventListener('popstate', checkAndRedirectIfTurnedOff);
  window.addEventListener('yt-navigate-finish', checkAndRedirectIfTurnedOff);

  // 2. Banner Injection logic (Top Centre Modal)
  let bannerHost = null;
  let autoDismissTimer = null;

  function removeBanner() {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }
    if (bannerHost && bannerHost.parentNode) {
      bannerHost.parentNode.removeChild(bannerHost);
      bannerHost = null;
    }
  }

  function showTopCenterBanner(data) {
    removeBanner();

    const intention = data.intention || 'Your focused practice';
    const domain = data.domain || window.location.hostname;
    const teachingText = data.quoteText || 'The powers of the mind are like the rays of the sun. When they are concentrated, they illumine.';
    const teachingSource = data.quoteSource || 'Swami Vivekananda';

    bannerHost = document.createElement('div');
    bannerHost.id = 'sakshi-mindful-nudge-host';

    const shadow = bannerHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .backdrop-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 2147483646;
      }
      .nudge-container {
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        width: 92%;
        max-width: 490px;
        background: #FDFBF7;
        color: #2B2620;
        border: 2px solid #D97706;
        border-radius: 18px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25), 0 4px 14px rgba(217, 119, 6, 0.2);
        padding: 16px 20px;
        box-sizing: border-box;
        animation: sakshiSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      .nudge-container.praise-mode {
        border-color: #059669;
        background: #F0FDF4;
        box-shadow: 0 20px 40px rgba(5, 150, 105, 0.25), 0 4px 14px rgba(5, 150, 105, 0.3);
      }
      .nudge-container.discipline-mode {
        border-color: #DC2626;
        background: #1C1917;
        color: #F5F5F4;
        box-shadow: 0 25px 50px rgba(220, 38, 38, 0.4), 0 6px 18px rgba(0, 0, 0, 0.8);
      }
      @media (prefers-color-scheme: dark) {
        .nudge-container {
          background: #1C1917;
          color: #F5F5F4;
          border-color: #D97706;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(217, 119, 6, 0.25);
        }
        .nudge-container.praise-mode {
          background: #062419;
          border-color: #10B981;
          color: #ECFDF5;
        }
      }
      @keyframes sakshiSlideDown {
        from {
          opacity: 0;
          transform: translate(-50%, -20px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0) scale(1);
        }
      }
      .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .badge-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .badge {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #B45309;
      }
      .nudge-container.praise-mode .badge {
        color: #047857;
      }
      .nudge-container.discipline-mode .badge {
        color: #F87171;
      }
      .close-btn {
        background: transparent;
        border: none;
        color: #A8A29E;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
      }
      .close-btn:hover {
        color: #78716C;
      }
      .title {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 6px;
      }
      .intention-text {
        font-size: 12px;
        color: #78716C;
        margin: 0 0 10px 0;
        line-height: 1.4;
      }
      .nudge-container.discipline-mode .intention-text {
        color: #A8A29E;
      }
      .intention-text strong {
        color: #D97706;
      }
      .quote-box {
        background: rgba(217, 119, 6, 0.08);
        border-left: 3px solid #D97706;
        padding: 9px 13px;
        border-radius: 6px;
        font-size: 11.5px;
        font-style: italic;
        line-height: 1.45;
        margin-bottom: 14px;
        color: #44403C;
      }
      @media (prefers-color-scheme: dark) {
        .quote-box {
          background: rgba(217, 119, 6, 0.15);
          color: #E7E5E4;
        }
      }
      .nudge-container.praise-mode .quote-box {
        background: rgba(16, 185, 129, 0.12);
        border-left-color: #059669;
        color: #064E3B;
      }
      @media (prefers-color-scheme: dark) {
        .nudge-container.praise-mode .quote-box {
          color: #D1FAE5;
        }
      }
      .nudge-container.discipline-mode .quote-box {
        background: rgba(239, 68, 68, 0.15);
        border-left-color: #EF4444;
        color: #FEE2E2;
      }
      .quote-author {
        display: block;
        font-size: 10px;
        font-style: normal;
        font-weight: 600;
        text-align: right;
        margin-top: 5px;
        color: #D97706;
      }
      .nudge-container.praise-mode .quote-author {
        color: #047857;
      }
      .nudge-container.discipline-mode .quote-author {
        color: #FCA5A5;
      }
      .actions-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .btn {
        font-family: inherit;
        font-size: 12px;
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
        border: none;
      }
      .btn-primary {
        background: #D97706;
        color: #FFFFFF;
        flex: 1;
        box-shadow: 0 2px 4px rgba(217, 119, 6, 0.25);
      }
      .btn-primary:hover {
        background: #B45309;
      }
      .btn-praise {
        background: #059669;
        color: #FFFFFF;
        flex: 1;
        box-shadow: 0 2px 4px rgba(5, 150, 105, 0.25);
      }
      .btn-discipline-primary {
        background: linear-gradient(135deg, #DC2626, #B45309);
        color: #FFFFFF;
        flex: 1;
        box-shadow: 0 2px 6px rgba(220, 38, 38, 0.4);
      }
      .btn-discipline-primary:hover {
        background: linear-gradient(135deg, #B91C1C, #92400E);
      }
      .btn-secondary {
        background: transparent;
        color: #78716C;
        border: 1px solid #D6D3D1;
      }
      @media (prefers-color-scheme: dark) {
        .btn-secondary {
          border-color: #44403C;
          color: #A8A29E;
        }
      }
      .btn-secondary:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #292524;
      }
      .nudge-container.discipline-mode .btn-secondary {
        border-color: #57534E;
        color: #A8A29E;
      }
      .nudge-container.discipline-mode .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #F5F5F4;
      }
      .timer-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: #D97706;
        width: 100%;
        animation: sakshiDrain 12s linear forwards;
      }
      @keyframes sakshiDrain {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;

    const container = document.createElement('div');
    container.className = 'nudge-container';

    // RENDER INITIAL PROMPT
    function renderPrompt() {
      container.className = 'nudge-container';
      container.innerHTML = `
        <div class="header-row">
          <div class="badge-wrap">
            <span style="font-size: 15px;">⏳</span>
            <span class="badge">Ekāgratā · Focus Mode</span>
          </div>
          <button class="close-btn" id="sakshiCloseBtn" title="Dismiss">✕</button>
        </div>

        <div class="title">
          <span>Are you distracted?</span>
        </div>

        <div class="intention-text">
          You set out to: <strong>"${escapeHtml(intention)}"</strong><br>
          Wandering detected on <span style="font-family: monospace; font-weight: 600;">${escapeHtml(domain)}</span>.
        </div>

        <div class="quote-box">
          "${escapeHtml(teachingText)}"
          <span class="quote-author">— ${escapeHtml(teachingSource)}</span>
        </div>

        <div class="actions-row">
          <button class="btn btn-primary" id="sakshiReturnBtn">
            🦁 Return to work (Turns off site)
          </button>
          <button class="btn btn-secondary" id="sakshiContinueBtn">
            Continue anyway
          </button>
        </div>

        <div class="timer-bar"></div>
      `;

      shadow.getElementById('sakshiCloseBtn').addEventListener('click', removeBanner);
      shadow.getElementById('sakshiReturnBtn').addEventListener('click', handleReturnWithPraise);
      shadow.getElementById('sakshiContinueBtn').addEventListener('click', handleContinueWithDiscipline);
    }

    // HANDLER: RETURN TO WORK -> PRAISE QUOTE
    function handleReturnWithPraise() {
      if (autoDismissTimer) clearTimeout(autoDismissTimer);

      const item = VIVEKANANDA_PRAISE[Math.floor(Math.random() * VIVEKANANDA_PRAISE.length)];
      container.className = 'nudge-container praise-mode';
      container.innerHTML = `
        <div class="header-row">
          <div class="badge-wrap">
            <span style="font-size: 17px;">🏆</span>
            <span class="badge" style="color: #047857;">${escapeHtml(item.title)}</span>
          </div>
          <span style="font-size: 11px; font-weight: 600; color: #047857; background: rgba(5,150,105,0.15); padding: 2px 8px; border-radius: 99px;">Self-Mastery Win +10 XP</span>
        </div>

        <div class="quote-box">
          "${escapeHtml(item.quote)}"
          <span class="quote-author">— ${escapeHtml(item.source)}</span>
        </div>

        <div style="font-size: 11.5px; font-weight: 600; color: #065F46; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <span>✨</span>
          <span>You conquered the impulse. Turning off distracting site and restoring focus...</span>
        </div>
      `;

      // Trigger background turn-off and tab closure
      setTimeout(() => {
        try {
          chrome.runtime.sendMessage({
            type: 'PAUSE_RETURN_TO_WORK',
            domain: domain,
            turnOff: true
          });
        } catch (e) {}
        removeBanner();
      }, 1800);
    }

    // HANDLER: CONTINUE ANYWAY -> VIVEKANANDA DISCIPLINED INTERVENTION
    function handleContinueWithDiscipline() {
      if (autoDismissTimer) clearTimeout(autoDismissTimer);

      const item = VIVEKANANDA_DISCIPLINE[Math.floor(Math.random() * VIVEKANANDA_DISCIPLINE.length)];
      container.className = 'nudge-container discipline-mode';
      container.innerHTML = `
        <div class="header-row">
          <div class="badge-wrap">
            <span style="font-size: 17px;">⚡</span>
            <div>
              <span class="badge" style="color: #F87171; font-size: 12px; display: block;">${escapeHtml(item.title)}</span>
              <span style="font-size: 10px; color: #A8A29E;">Swami Vivekananda’s Call to Your Will</span>
            </div>
          </div>
          <span style="font-size: 10px; font-weight: 600; color: #FCA5A5; background: rgba(220,38,38,0.25); border: 1px solid rgba(220,38,38,0.4); padding: 2px 6px; border-radius: 4px;">Resolve Tested</span>
        </div>

        <div class="quote-box">
          "${escapeHtml(item.quote)}"
          <span class="quote-author">— ${escapeHtml(item.source)}</span>
        </div>

        <div style="font-size: 11px; color: #D6D3D1; margin-bottom: 12px; line-height: 1.4; background: rgba(255,255,255,0.05); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
          ${escapeHtml(item.callToAction)}
        </div>

        <div class="actions-row">
          <button class="btn btn-discipline-primary" id="sakshiAriseReturnBtn">
            🦁 Arise & Return to Work!
          </button>
          <button class="btn btn-secondary" id="sakshiForceContinueBtn">
            Proceed to distraction
          </button>
        </div>
      `;

      shadow.getElementById('sakshiAriseReturnBtn').addEventListener('click', handleReturnWithPraise);

      shadow.getElementById('sakshiForceContinueBtn').addEventListener('click', () => {
        try {
          chrome.runtime.sendMessage({
            type: 'PAUSE_CONTINUE_ANYWAY',
            domain: domain
          });
        } catch (e) {}
        removeBanner();
      });
    }

    renderPrompt();

    shadow.appendChild(style);
    shadow.appendChild(container);
    document.body.appendChild(bannerHost);

    // Auto dismiss after 12 seconds if untouched
    autoDismissTimer = setTimeout(() => {
      removeBanner();
    }, 12000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 3. Listen for commands from the background service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return;

    if (message.type === 'SHOW_DISTRACTION_BANNER') {
      showTopCenterBanner(message);
      if (sendResponse) sendResponse({ received: true });
    } else if (message.type === 'DOMAIN_TURNED_OFF') {
      checkAndRedirectIfTurnedOff();
    }
  });

})();
