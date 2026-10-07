/**
 * Sakshi - YouTube Content Script
 * Observes video title and channel on youtube.com/watch and notifies background.
 * Respects user privacy: only reads the public title and channel of the active video.
 */

(function () {
  let lastSentUrl = '';
  let lastSentTitle = '';

  function extractMetadata() {
    let videoTitle = '';
    let channel = '';

    // Strategy 1: YouTube Modern DOM elements
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                         document.querySelector('#title h1 yt-formatted-string') ||
                         document.querySelector('#container > h1 > yt-formatted-string');
    if (titleElement) {
      videoTitle = titleElement.textContent.trim();
    }

    // Strategy 2: Meta tags or document.title
    if (!videoTitle) {
      const metaTitle = document.querySelector('meta[name="title"]');
      if (metaTitle && metaTitle.content) {
        videoTitle = metaTitle.content.trim();
      } else if (document.title) {
        videoTitle = document.title.replace(/\s*-\s*YouTube$/i, '').trim();
      }
    }

    // Channel extraction
    const channelElement = document.querySelector('#owner #channel-name yt-formatted-string a') ||
                           document.querySelector('#channel-name yt-formatted-string a') ||
                           document.querySelector('#upload-info #channel-name a') ||
                           document.querySelector('ytd-channel-name a');
    if (channelElement) {
      channel = channelElement.textContent.trim();
    }

    return { videoTitle, channel };
  }

  function reportIfChanged() {
    if (!window.location.pathname.startsWith('/watch')) return;

    const currentUrl = window.location.href;
    const { videoTitle, channel } = extractMetadata();

    // If title is empty or still placeholder loading, wait a bit
    if (!videoTitle || videoTitle === 'YouTube') {
      return;
    }

    if (currentUrl !== lastSentUrl || videoTitle !== lastSentTitle) {
      lastSentUrl = currentUrl;
      lastSentTitle = videoTitle;

      try {
        chrome.runtime.sendMessage({
          type: 'YOUTUBE_WATCH_METADATA',
          url: currentUrl,
          videoTitle: videoTitle,
          channel: channel
        }, () => {
          // Ignore errors if background is sleeping
          if (chrome.runtime.lastError) {
            // Silence expected runtime message error
          }
        });
      } catch (err) {
        // Safe guard against extension context invalidation
      }
    }
  }

  // Periodic polling for the first few seconds of navigation
  function pollForMetadata(retries = 10, delay = 500) {
    reportIfChanged();
    if (retries > 0) {
      setTimeout(() => pollForMetadata(retries - 1, delay), delay);
    }
  }

  function checkShortsBlocking() {
    if (window.location.pathname.startsWith('/shorts')) {
      try {
        chrome.storage.local.get(['activeSession', 'turnedOffDomains'], (data) => {
          const active = data?.activeSession;
          if (!active) return;
          const list = [
            ...(Array.isArray(active.turnedOffDomains) ? active.turnedOffDomains : []),
            ...(Array.isArray(data?.turnedOffDomains) ? data?.turnedOffDomains : [])
          ];
          const isBlocked = list.some(item => {
            if (!item) return false;
            const l = item.toLowerCase();
            return l.includes('shorts') || l.includes('youtube.com');
          });
          if (isBlocked) {
            const remainingMin = Math.max(1, Math.round(((new Date(active.startedAt).getTime() + (active.durationMin || 25) * 60 * 1000) - Date.now()) / 60000));
            window.location.replace(chrome.runtime.getURL(`pause.html?paused=true&domain=youtube.com/shorts&remaining=${remainingMin}`));
          }
        });
      } catch (e) {}
    }
  }

  // Listen to YouTube's SPA navigation events
  window.addEventListener('yt-navigate-finish', () => {
    checkShortsBlocking();
    pollForMetadata();
  });
  window.addEventListener('popstate', checkShortsBlocking);

  // Observe title tag mutations
  const titleTag = document.querySelector('title');
  if (titleTag) {
    const observer = new MutationObserver(() => {
      reportIfChanged();
    });
    observer.observe(titleTag, { childList: true });
  }

  // Initial trigger
  pollForMetadata();
})();
