/**
 * Sakshi - Dashboard Bridge Content Script
 * Implements the bidirectional window.postMessage protocol between the
 * web dashboard and the Sakshi extension background service worker.
 */

(function () {
  const PAGE_SOURCE = 'sakshi-dashboard';
  const EXT_SOURCE = 'sakshi-extension';

  // Listen to messages posted by the web dashboard
  window.addEventListener('message', async (event) => {
    // We only accept messages from our current window and tagged with our source
    if (event.source !== window || !event.data || event.data.source !== PAGE_SOURCE) {
      return;
    }

    const { type, payload } = event.data;

    switch (type) {
      case 'PING': {
        const manifest = chrome.runtime.getManifest();
        window.postMessage({
          source: EXT_SOURCE,
          type: 'PONG',
          version: manifest.version
        }, '*');
        break;
      }

      case 'START_SESSION': {
        chrome.runtime.sendMessage({
          type: 'BRIDGE_START_SESSION',
          payload: payload || {}
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Sakshi Bridge] Error starting session:', chrome.runtime.lastError.message);
            return;
          }
          if (response && response.sessionId) {
            window.postMessage({
              source: EXT_SOURCE,
              type: 'SESSION_STARTED',
              sessionId: response.sessionId
            }, '*');
          }
        });
        break;
      }

      case 'END_SESSION': {
        chrome.runtime.sendMessage({
          type: 'BRIDGE_END_SESSION'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Sakshi Bridge] Error ending session:', chrome.runtime.lastError.message);
            return;
          }
          window.postMessage({
            source: EXT_SOURCE,
            type: 'SESSION_ENDED',
            summary: (response && response.summary) ? response.summary : null
          }, '*');
        });
        break;
      }

      case 'GET_DATA': {
        chrome.runtime.sendMessage({
          type: 'BRIDGE_GET_DATA'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Sakshi Bridge] Error getting data:', chrome.runtime.lastError.message);
            window.postMessage({
              source: EXT_SOURCE,
              type: 'DATA',
              sessions: [],
              activeSession: null
            }, '*');
            return;
          }
          window.postMessage({
            source: EXT_SOURCE,
            type: 'DATA',
            sessions: (response && response.sessions) || [],
            activeSession: (response && response.activeSession) || null
          }, '*');
        });
        break;
      }

      case 'RETURN_TO_WORK': {
        chrome.runtime.sendMessage({
          type: 'PAUSE_RETURN_TO_WORK',
          domain: payload?.domain,
          turnOff: payload?.turnOff !== false
        });
        break;
      }

      case 'CONTINUE_ANYWAY': {
        chrome.runtime.sendMessage({
          type: 'PAUSE_CONTINUE_ANYWAY'
        });
        break;
      }

      default:
        // Unknown message type
        break;
    }
  });

  // Listen for push notifications from background (e.g. DISTRACTION_DETECTED)
  chrome.runtime.onMessage.addListener((message) => {
    if (message && (message.type === 'DISTRACTION_DETECTED' || message.type === 'DRIFT_DETECTED')) {
      window.postMessage({
        source: EXT_SOURCE,
        type: 'DISTRACTION_DETECTED',
        domain: message.domain || 'distracting site',
        time: message.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, '*');
    }
  });

  // Announce presence once bridge is ready
  window.postMessage({
    source: EXT_SOURCE,
    type: 'BRIDGE_READY',
    version: chrome.runtime.getManifest().version
  }, '*');
})();
