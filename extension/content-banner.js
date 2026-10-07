/**
 * Sakshi - In-Page Mindful Distraction Banner & Wellbeing Blocker
 * Injected into web pages to:
 * 1. Block turned-off apps (redirects to pause.html immediately)
 * 2. Display the Mindful Witness prompt at TOP-CENTRE directly on distracting apps
 */

(function () {
  // Never run inside our own extension pages or local dashboard
  const currentHref = window.location.href || '';
  if (currentHref.startsWith('chrome-extension://') || currentHref.includes('localhost:5173')) {
    return;
  }

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
        max-width: 480px;
        background: #FDFBF7;
        color: #2B2620;
        border: 2px solid #D97706;
        border-radius: 18px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.22), 0 4px 12px rgba(217, 119, 6, 0.15);
        padding: 16px 20px;
        box-sizing: border-box;
        animation: sakshiSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        overflow: hidden;
      }
      @media (prefers-color-scheme: dark) {
        .nudge-container {
          background: #1C1917;
          color: #F5F5F4;
          border-color: #D97706;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(217, 119, 6, 0.25);
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
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        background: #FEF3C7;
        color: #92400E;
        padding: 2px 7px;
        border-radius: 6px;
      }
      .close-btn {
        background: transparent;
        border: none;
        color: #78716C;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
      }
      .close-btn:hover {
        color: #292524;
      }
      .title {
        font-size: 15px;
        font-weight: 700;
        margin: 0 0 4px 0;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .intention-text {
        font-size: 12px;
        color: #78716C;
        margin: 0 0 10px 0;
        line-height: 1.4;
      }
      .intention-text strong {
        color: #D97706;
      }
      .quote-box {
        background: rgba(217, 119, 6, 0.08);
        border-left: 3px solid #D97706;
        padding: 8px 12px;
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
      .quote-author {
        display: block;
        font-size: 10px;
        font-style: normal;
        font-weight: 600;
        text-align: right;
        margin-top: 4px;
        color: #D97706;
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
      .timer-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: #D97706;
        width: 100%;
        animation: sakshiDrain 10s linear forwards;
      }
      @keyframes sakshiDrain {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;

    const container = document.createElement('div');
    container.className = 'nudge-container';
    container.innerHTML = `
      <div class="header-row">
        <div class="badge-wrap">
          <span style="font-size: 15px;">⏳</span>
          <span class="badge">Sakshi · Focus Mode</span>
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
          Return to work (Turns off site)
        </button>
        <button class="btn btn-secondary" id="sakshiContinueBtn">
          Continue anyway
        </button>
      </div>

      <div class="timer-bar"></div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(container);

    // Event listeners
    shadow.getElementById('sakshiCloseBtn').addEventListener('click', () => {
      removeBanner();
    });

    shadow.getElementById('sakshiContinueBtn').addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({
          type: 'PAUSE_CONTINUE_ANYWAY',
          domain: domain
        });
      } catch (e) {}
      removeBanner();
    });

    shadow.getElementById('sakshiReturnBtn').addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({
          type: 'PAUSE_RETURN_TO_WORK',
          domain: domain,
          turnOff: true
        });
      } catch (e) {}
      removeBanner();
    });

    document.body.appendChild(bannerHost);

    // Auto dismiss after 10 seconds
    autoDismissTimer = setTimeout(() => {
      removeBanner();
    }, 10000);
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
