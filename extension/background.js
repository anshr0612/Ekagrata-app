/**
 * Sakshi - Background Service Worker (Manifest V3)
 * Inspired by Swami Vivekananda's teachings on concentration and witnessing attention.
 *
 * Core Principles:
 * 1. NEVER block, force, shame, or reward.
 * 2. Observe calmly and nudge gently once after grace period.
 * 3. Keep ALL state in chrome.storage.local (Service Workers sleep!).
 * 4. All tracking data stays on device.
 */

importScripts('rules.js');

const ALARM_SESSION_END = 'sakshi_session_end';
const ALARM_NUDGE_CHECK = 'nudge-check';
const ALARM_GRACE_CHECK = 'sakshi_grace_check';
const NUDGE_NOTIFICATION_ID = 'sakshi_nudge_notification';
const NUDGE_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes minimum between nudges
const FISHY_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const FISHY_THRESHOLD = 4; // 4+ switches in 2 mins on short video platforms

// Temporary in-flight cache for youtube watch metadata sent by content script
let latestYoutubeMeta = {};

// Clean hostname/domain string
function getBaseDomain(str) {
  if (!str || typeof str !== 'string') return '';
  let cleaned = str.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  cleaned = cleaned.split('/')[0].split('?')[0].split(':')[0];
  return cleaned;
}

// Checks whether a given URL matches any item in the turned-off list
function isUrlTurnedOff(url, list) {
  if (!url || typeof url !== 'string' || !Array.isArray(list) || list.length === 0) return null;
  const urlLower = url.toLowerCase();
  for (const item of list) {
    if (!item) continue;
    const itemLower = item.toLowerCase().trim();
    // Specific match for youtube shorts
    if ((itemLower.includes('youtube.com/shorts') || itemLower === 'shorts') && urlLower.includes('youtube.com/shorts')) {
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
  return null;
}

// Checks if a URL matches any turned-off domain and redirects to Digital Wellbeing screen immediately
async function checkAndBlockTurnedOff(tabId, url, activeSession) {
  if (!url || typeof url !== 'string' || !activeSession) {
    return false;
  }
  if (url.startsWith('chrome-extension://') || url.includes('localhost:5173') || url.startsWith('chrome://')) {
    return false;
  }

  const { turnedOffDomains: storedTurnedOff } = await chrome.storage.local.get(['turnedOffDomains']);
  const allTurnedOff = [
    ...(Array.isArray(activeSession.turnedOffDomains) ? activeSession.turnedOffDomains : []),
    ...(Array.isArray(storedTurnedOff) ? storedTurnedOff : [])
  ];

  const matched = isUrlTurnedOff(url, allTurnedOff);
  if (matched) {
    console.log(`[Sakshi Wellbeing] BLOCKING turned-off site: ${matched} on tab ${tabId}`);
    const remainingMin = Math.max(1, Math.round(((new Date(activeSession.startedAt).getTime() + (activeSession.durationMin || 25) * 60 * 1000) - Date.now()) / 60000));
    try {
      await chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL(`pause.html?paused=true&domain=${encodeURIComponent(matched)}&remaining=${remainingMin}`)
      });
    } catch (e) {
      console.warn('[Sakshi Wellbeing] Error updating blocked tab:', e);
    }
    return true;
  }
  return false;
}

// Helper: Calculate effective grace period in milliseconds
function getEffectiveGraceMs(settings, activeSession) {
  // If demo mode or focus mode is active, or user specified quick grace:
  if (settings?.demoMode || settings?.focusMode || activeSession?.focusMode || activeSession?.graceSeconds) {
    const sec = Number(activeSession?.graceSeconds || settings?.graceSeconds) || 10;
    return sec * 1000;
  }
  if (typeof activeSession?.graceMinutes === 'number' && activeSession.graceMinutes < 0.5) {
    return Math.max(5000, Math.round(activeSession.graceMinutes * 60 * 1000));
  }
  const min = (typeof activeSession?.graceMinutes === 'number')
    ? activeSession.graceMinutes
    : (Number(settings?.graceMinutes) || 2);
  return min * 60 * 1000;
}

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.local.get(['settings', 'sessions', 'classificationCache']);
  
  if (!existing.settings) {
    await chrome.storage.local.set({
      settings: {
        geminiApiKey: '',
        graceMinutes: 10,
        demoMode: false,
        graceSeconds: 10,
        productiveDomains: SakshiRules.DEFAULT_PRODUCTIVE_DOMAINS,
        distractingDomains: SakshiRules.DEFAULT_DISTRACTING_DOMAINS,
        dashboardUrl: 'http://localhost:5173/'
      }
    });
  } else if (existing.settings.demoMode === undefined || !existing.settings.graceSeconds) {
    await chrome.storage.local.set({
      settings: {
        ...existing.settings,
        demoMode: false,
        graceSeconds: 10
      }
    });
  }

  if (!existing.sessions) {
    await chrome.storage.local.set({ sessions: [] });
  }

  if (!existing.classificationCache) {
    await chrome.storage.local.set({ classificationCache: {} });
  }

  // Set idle detection interval (Chrome minimum: 60s)
  chrome.idle.setDetectionInterval(60);
});

// Idle state detection
chrome.idle.onStateChanged.addListener(async (newState) => {
  const { activeSession } = await chrome.storage.local.get(['activeSession']);
  if (!activeSession) return;

  if (newState === 'idle' || newState === 'locked') {
    activeSession.isIdle = true;
    activeSession.idleSince = Date.now();
  } else if (newState === 'active') {
    activeSession.isIdle = false;
    activeSession.idleSince = null;
  }
  await chrome.storage.local.set({ activeSession });
});

// Alarm handling (Session End, Periodic Grace Check, and One-Shot Nudge Check)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_SESSION_END) {
    await endSession();
  } else if (alarm.name === ALARM_GRACE_CHECK || alarm.name === ALARM_NUDGE_CHECK) {
    await checkGraceAndNudgeIfNeeded();
  }
});

// Network-level interception: Block turned-off apps BEFORE the page starts loading
if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return; // Only intercept main window frame
    const url = details.url;
    if (!url || url.startsWith('chrome-extension://') || url.includes('localhost:5173') || url.startsWith('chrome://')) {
      return;
    }
    const { activeSession } = await chrome.storage.local.get(['activeSession']);
    if (activeSession) {
      await checkAndBlockTurnedOff(details.tabId, url, activeSession);
    }
  });
}

// Tab activation listener
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      const { activeSession } = await chrome.storage.local.get(['activeSession']);
      if (activeSession && await checkAndBlockTurnedOff(activeInfo.tabId, tab.url, activeSession)) {
        return;
      }
      // Reset cooldown so visiting a distracting tab again triggers the 10-second alert every time!
      await chrome.storage.local.set({ lastNudgeAt: null, distractingSince: null });
      if (activeSession) {
        activeSession.lastNudgeAt = null;
        activeSession.distractingSince = null;
      }
      await recordNavigation(tab);
    }
  } catch (err) {
    // Tab might have been closed immediately
  }
});

// Tab URL/status update listener (catches navigating attempts immediately)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.pendingUrl || tab.url || '';
  if (currentUrl) {
    const { activeSession } = await chrome.storage.local.get(['activeSession']);
    if (activeSession && await checkAndBlockTurnedOff(tabId, currentUrl, activeSession)) {
      return;
    }
  }
  if ((changeInfo.status === 'complete' || changeInfo.url) && tab.active) {
    await recordNavigation(tab);
  }
});

// Window focus changed listener
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // User switched away to an external application
    return;
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tab && tab.url) {
      await recordNavigation(tab);
    }
  } catch (err) {
    // Window or tab not ready
  }
});

// Notification click listener -> Opens Pause Page
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith('sakshi_nudge')) {
    chrome.tabs.create({ url: chrome.runtime.getURL('pause.html') });
    chrome.notifications.clear(notificationId);
  }
});

/**
 * Core Navigation Recording & Attention Classification
 */
async function recordNavigation(tab) {
  const { activeSession, settings, classificationCache } = await chrome.storage.local.get([
    'activeSession',
    'settings',
    'classificationCache'
  ]);

  if (!activeSession || activeSession.isIdle) {
    return;
  }

  const url = tab.url || '';
  const title = tab.title || '';
  const domain = SakshiRules.extractDomain(url);

  // Ignore internal chrome pages, extension URLs, or empty URLs
  if (!domain || url.startsWith('chrome-extension://')) {
    return;
  }

  // Digital Wellbeing Focus Mode: Check if domain is turned off until session finishes
  if (await checkAndBlockTurnedOff(tab.id, url, activeSession)) {
    return;
  }

  const now = Date.now();
  const productiveList = settings?.productiveDomains || SakshiRules.DEFAULT_PRODUCTIVE_DOMAINS;
  const distractingList = settings?.distractingDomains || SakshiRules.DEFAULT_DISTRACTING_DOMAINS;

  // 1. Short-video "fishy" rapid switching detection
  let isFishy = false;
  if (SakshiRules.isSpecialDistractingPath(url)) {
    const navs = activeSession.shortVideoNavigations || [];
    // Keep entries within last 2 minutes
    const recentNavs = navs.filter(entry => (now - entry.ts) <= FISHY_WINDOW_MS);
    recentNavs.push({ ts: now, url });
    activeSession.shortVideoNavigations = recentNavs;

    if (recentNavs.length >= FISHY_THRESHOLD) {
      isFishy = true;
    }
  }

  // 2. Classify page
  let classification = { label: 'neutral', reason: 'Unclassified', source: 'default' };

  if (isFishy) {
    classification = {
      label: 'distracting',
      reason: 'Rapid switching detected on short-video stream (fishy pattern)',
      source: 'fishy'
    };
  } else {
    // Rule classification
    const ruleResult = SakshiRules.classifyUrlByRules(url, productiveList, distractingList);
    if (ruleResult.label !== 'unknown') {
      classification = ruleResult;
    } else {
      // Ambiguous page or YouTube watch page
      const isYouTubeWatch = url.includes('youtube.com/watch');
      
      // Check cache first
      if (classificationCache && classificationCache[url]) {
        classification = {
          ...classificationCache[url],
          source: 'cache'
        };
      } else if (settings?.geminiApiKey) {
        // Classify with Gemini Flash API
        const ytMeta = isYouTubeWatch ? (latestYoutubeMeta[url] || {}) : {};
        const geminiResult = await classifyWithGemini({
          url,
          title,
          videoTitle: ytMeta.videoTitle || '',
          channel: ytMeta.channel || '',
          profile: activeSession.profile || {},
          intention: activeSession.intention || '',
          apiKey: settings.geminiApiKey
        });

        if (geminiResult) {
          classification = geminiResult;
          // Cache URL result
          const updatedCache = classificationCache || {};
          updatedCache[url] = geminiResult;
          await chrome.storage.local.set({ classificationCache: updatedCache });
        } else {
          // Fallback if API fails
          classification = {
            label: 'neutral',
            reason: 'Gemini classification unavailable, falling back to neutral',
            source: 'gemini_fallback'
          };
        }
      } else {
        // No Gemini API key set -> fallback to neutral
        classification = {
          label: 'neutral',
          reason: 'Ambiguous page without Gemini API key, default neutral',
          source: 'rules_fallback'
        };
      }
    }
  }

  // 3. Update timeline and session state
  const lastEvent = (activeSession.timelineEvents && activeSession.timelineEvents.length > 0)
    ? activeSession.timelineEvents[activeSession.timelineEvents.length - 1]
    : null;

  // Don't flood identical consecutive events within 2 seconds
  if (!lastEvent || lastEvent.url !== url || (now - lastEvent.ts) > 2000) {
    if (!activeSession.timelineEvents) {
      activeSession.timelineEvents = [];
    }

    activeSession.timelineEvents.push({
      ts: now,
      url,
      title,
      domain,
      category: classification.label,
      source: classification.source,
      reason: classification.reason
    });
  }

  // 4. Update state tracking (productive vs distracting)
  const { distractingSince, settings: currentSettings } = await chrome.storage.local.get(['distractingSince', 'settings']);
  let updatedDistractingSince = distractingSince || null;

  if (classification.label === 'productive') {
    activeSession.lastProductiveTabId = tab.id;
    activeSession.lastProductiveUrl = url;
    activeSession.lastProductiveTitle = title;
    updatedDistractingSince = null;
    activeSession.distractingSince = null;
    activeSession.lastNudgeAt = null; // Clear cooldown so subsequent distractions notify every time!
    await chrome.storage.local.set({ distractingSince: null, lastNudgeAt: null });
    chrome.alarms.clear(ALARM_NUDGE_CHECK);
    console.log('[Sakshi Nudge] Classification is productive. Cleared distracting state and reset cooldown.');
  } else if (classification.label === 'distracting') {
    if (!updatedDistractingSince) {
      updatedDistractingSince = now;
      await chrome.storage.local.set({ distractingSince: now });
      const effectiveGraceMs = getEffectiveGraceMs(currentSettings, activeSession);
      chrome.alarms.create(ALARM_NUDGE_CHECK, { when: now + effectiveGraceMs });
      // Direct timeout so the notification triggers in exactly 10s without waiting for 1-minute alarm throttle
      setTimeout(async () => {
        await checkGraceAndNudgeIfNeeded();
      }, effectiveGraceMs);
      console.log(`[Sakshi Nudge] Classification is distracting on ${domain}. Scheduled prompt nudge in ${effectiveGraceMs / 1000}s.`);
    }
    activeSession.distractingSince = updatedDistractingSince;
  }

  activeSession.currentTabInfo = {
    url,
    title,
    domain,
    category: classification.label,
    updatedAt: now
  };

  await chrome.storage.local.set({ activeSession });

  // 5. Evaluate gentle nudge immediately if already over grace period
  await checkGraceAndNudgeIfNeeded();
}

/**
 * Gemini 2.0 Flash API Classifier
 * Calls Generative Language API with strict JSON schema
 */
async function classifyWithGemini({ url, title, videoTitle, channel, profile, intention, apiKey }) {
  if (!apiKey) return null;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = `You are Sakshi, an impartial attention witness assistant inspired by mindfulness and concentration teachings.
The user is working in a dedicated focus session:
- User Intention: "${intention || 'General focused work'}"
- Profession: "${profile.profession || 'Not specified'}"
- Interests: "${(profile.interests || []).join(', ')}"
- Hobbies: "${(profile.hobbies || []).join(', ')}"

The user is currently viewing this page:
- URL: "${url}"
- Page Title: "${title}"
${videoTitle ? `- YouTube Video Title: "${videoTitle}"` : ''}
${channel ? `- YouTube Channel: "${channel}"` : ''}

Determine whether this page is:
1. "productive" (aligned with their intention, profession, technical learning, or work)
2. "distracting" (entertainment, endless feed, unrelated gossip/drama, mind-wandering)
3. "neutral" (general utility, ambiguous search, reference, calm pause)

Respond strictly in valid JSON with exactly this structure:
{
  "label": "productive" | "neutral" | "distracting",
  "reason": "one short, objective sentence explaining why without judging"
}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      console.warn('[Sakshi] Gemini API returned error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText.trim());
    const validLabels = ['productive', 'neutral', 'distracting'];
    const label = validLabels.includes(parsed.label) ? parsed.label : 'neutral';

    return {
      label,
      reason: parsed.reason || 'Classified by Gemini Flash',
      source: 'gemini'
    };
  } catch (err) {
    console.error('[Sakshi] Gemini API call exception:', err);
    return null;
  }
}

/**
 * The Gentle Nudge:
 * On each alarm (one-shot "nudge-check" or periodic 0.5m), if distractingSince exists and (now - distractingSince) > effectiveGrace, fire ONE notification.
 * Do not rely on setTimeout or in-memory variables (the service worker sleeps).
 * After firing, store lastNudgeAt and do not fire again for cooldown period (15m normally, 60s in demoMode).
 */
async function checkGraceAndNudgeIfNeeded() {
  const { activeSession, distractingSince, lastNudgeAt, settings } = await chrome.storage.local.get([
    'activeSession',
    'distractingSince',
    'lastNudgeAt',
    'settings'
  ]);

  if (!activeSession) {
    console.log('[Sakshi Nudge] nudge skipped: reason (no active session)');
    return;
  }

  if (activeSession.isIdle) {
    console.log('[Sakshi Nudge] nudge skipped: reason (user is idle)');
    return;
  }

  if (!distractingSince) {
    console.log('[Sakshi Nudge] nudge skipped: reason (not distracting)');
    return;
  }

  const now = Date.now();
  const isDemo = Boolean(settings?.demoMode);
  const effectiveGraceMs = getEffectiveGraceMs(settings, activeSession);
  const distractingElapsedMs = now - distractingSince;

  if (distractingElapsedMs < effectiveGraceMs) {
    const elapsedSec = (distractingElapsedMs / 1000).toFixed(1);
    const requiredSec = (effectiveGraceMs / 1000).toFixed(1);
    console.log(`[Sakshi Nudge] nudge skipped: reason (grace not reached: ${elapsedSec}s elapsed < ${requiredSec}s required)`);
    return;
  }

  // Cooldown between repetitive nudges while user STAYS continuously on the same distracting site:
  // In focus mode, repeat every 20 seconds so user is continually reminded until they return to work
  const isDemoOrFocus = Boolean(settings?.demoMode || settings?.focusMode || activeSession?.focusMode);
  const cooldownMs = isDemoOrFocus ? (20 * 1000) : (45 * 1000);
  if (lastNudgeAt && (now - lastNudgeAt) < cooldownMs) {
    const remainingCooldownSec = Math.round((cooldownMs - (now - lastNudgeAt)) / 1000);
    console.log(`[Sakshi Nudge] nudge skipped: reason (cooldown on continuous distraction: ${remainingCooldownSec}s remaining)`);
    return;
  }

  const elapsedSec = Math.round(distractingElapsedMs / 1000);
  const domain = activeSession.currentTabInfo?.domain || 'distracting site';

  // Load teachings
  let teachings = [];
  try {
    const response = await fetch(chrome.runtime.getURL('teachings.json'));
    teachings = await response.json();
  } catch (e) {
    teachings = [];
  }

  // Only consider teachings where verified is strictly true!
  const verifiedTeachings = Array.isArray(teachings) ? teachings.filter(t => t.verified === true) : [];
  const selected = verifiedTeachings.length > 0
    ? verifiedTeachings[Math.floor(Math.random() * verifiedTeachings.length)]
    : null;

  let messageBody = `You set out to: ${activeSession.intention || ''}\n\n`;
  if (selected) {
    messageBody += `"${selected.text}"\n— ${selected.source}`;
  } else {
    messageBody += "What was your intention when you began?";
  }

  // Record nudge timestamp in persistent storage
  await chrome.storage.local.set({ lastNudgeAt: now });
  activeSession.lastNudgeAt = now;
  await chrome.storage.local.set({ activeSession });

  // 1. Send system notification
  const notifId = NUDGE_NOTIFICATION_ID + '_' + now;
  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: 'Are you distracted?',
    message: messageBody,
    priority: 2,
    requireInteraction: true
  }, (createdId) => {
    if (chrome.runtime.lastError) {
      console.error('[Sakshi Notification Error]', chrome.runtime.lastError.message);
    } else {
      console.log('[Sakshi Notification] Notification created successfully:', createdId);
    }
  });

  // 2. Broadcast TOP-CENTRE in-page floating banner directly to the active distracting tab
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id) {
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'SHOW_DISTRACTION_BANNER',
        domain,
        intention: activeSession.intention,
        quoteText: selected ? selected.text : 'The powers of the mind are like the rays of the sun. When they are concentrated, they illumine.',
        quoteSource: selected ? selected.source : 'Swami Vivekananda'
      }).catch(() => {});
    }
  } catch (err) {}

  // 3. Broadcast distraction notification to open dashboard tabs
  chrome.tabs.query({}, (tabs) => {
    if (tabs && tabs.length > 0) {
      for (const t of tabs) {
        if (t.id) {
          chrome.tabs.sendMessage(t.id, {
            type: 'DISTRACTION_DETECTED',
            domain,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }).catch(() => {});
        }
      }
    }
  });

  // 4. Repetitive notifications: If the user stays distracted without returning to work, check and alert again
  setTimeout(async () => {
    await checkGraceAndNudgeIfNeeded();
  }, cooldownMs + 1000);

  // Log: "nudge fired after Xs on <domain>"
  console.log(`[Sakshi Nudge] nudge fired after ${elapsedSec}s on ${domain}`);
}

/**
 * Starts a new session
 */
async function startSession({ intention, durationMin, graceMinutes, profile, focusMode }) {
  const now = Date.now();
  const duration = Number(durationMin) || 25;
  const grace = (typeof graceMinutes === 'number') ? graceMinutes : (parseFloat(graceMinutes) || 2);
  const endAt = now + (duration * 60 * 1000);

  const sessionId = 'session_' + now + '_' + Math.random().toString(36).slice(2, 8);

  const newSession = {
    id: sessionId,
    intention: intention || 'Unspecified intention',
    durationMin: duration,
    graceMinutes: grace,
    profile: profile || { profession: '', interests: [], hobbies: [] },
    startedAt: now,
    scheduledEndAt: endAt,
    lastProductiveTabId: null,
    lastProductiveUrl: null,
    lastProductiveTitle: null,
    distractingSince: null,
    lastNudgeAt: null,
    isIdle: false,
    timelineEvents: [],
    shortVideoNavigations: [],
    currentTabInfo: null,
    turnedOffDomains: [],
    focusMode: focusMode !== false
  };

  await chrome.storage.local.set({
    activeSession: newSession,
    turnedOffDomains: [],
    distractingSince: null,
    lastNudgeAt: null
  });

  chrome.alarms.create(ALARM_SESSION_END, { when: endAt });
  chrome.alarms.create(ALARM_GRACE_CHECK, { periodInMinutes: 0.5 });
  console.log('[Sakshi Session] Session started. Grace check alarm set (periodInMinutes: 0.5). Grace:', grace, 'mins');

  // Record initial active tab
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url) {
      await recordNavigation(activeTab);
    }
  } catch (err) {
    // Ignore initial tab query issue
  }

  return { success: true, sessionId };
}

/**
 * Computes metrics and finalizes session
 */
async function endSession() {
  const { activeSession, sessions = [] } = await chrome.storage.local.get(['activeSession', 'sessions']);
  if (!activeSession) {
    return { success: false, summary: null };
  }

  const endedAt = Date.now();
  const events = activeSession.timelineEvents || [];
  const startedAt = activeSession.startedAt;

  // 1. Calculate time breakdown and timeline slices
  let productiveMs = 0;
  let neutralMs = 0;
  let distractingMs = 0;
  let longestProductiveStretchMs = 0;
  let currentProductiveStretchMs = 0;

  let driftCount = 0;
  let returnTimesSec = [];
  let pendingDriftStart = null;

  const timeline = [];

  if (events.length === 0) {
    const totalMs = Math.max(0, endedAt - startedAt);
    neutralMs = totalMs;
    timeline.push({
      start: startedAt,
      end: endedAt,
      category: 'neutral',
      domain: 'unknown',
      title: 'Idle or no trackable activity'
    });
  } else {
    for (let i = 0; i < events.length; i++) {
      const cur = events[i];
      const next = (i + 1 < events.length) ? events[i + 1] : null;
      const start = cur.ts;
      const end = next ? next.ts : endedAt;
      const duration = Math.max(0, end - start);

      if (cur.category === 'productive') {
        productiveMs += duration;
        currentProductiveStretchMs += duration;
        if (currentProductiveStretchMs > longestProductiveStretchMs) {
          longestProductiveStretchMs = currentProductiveStretchMs;
        }

        // If we were waiting for return after a drift
        if (pendingDriftStart !== null) {
          const returnSec = Math.max(1, Math.round((start - pendingDriftStart) / 1000));
          returnTimesSec.push(returnSec);
          pendingDriftStart = null;
        }
      } else {
        currentProductiveStretchMs = 0;

        if (cur.category === 'distracting') {
          distractingMs += duration;
          // Check for drift transition from previous productive state
          const prev = (i > 0) ? events[i - 1] : null;
          if (prev && prev.category === 'productive' && pendingDriftStart === null) {
            driftCount++;
            pendingDriftStart = cur.ts;
          } else if (i === 0 && pendingDriftStart === null) {
            // Started session directly in distraction
            pendingDriftStart = cur.ts;
          }
        } else {
          neutralMs += duration;
        }
      }

      // Consolidate into timeline array
      const lastSlice = timeline.length > 0 ? timeline[timeline.length - 1] : null;
      if (lastSlice && lastSlice.category === cur.category && lastSlice.domain === cur.domain) {
        lastSlice.end = end;
      } else {
        timeline.push({
          start,
          end,
          category: cur.category,
          domain: cur.domain || 'other',
          title: cur.title || ''
        });
      }
    }
  }

  const avgReturnSec = returnTimesSec.length > 0
    ? Math.round(returnTimesSec.reduce((a, b) => a + b, 0) / returnTimesSec.length)
    : 0;

  const actualDurationMin = Math.max(0.1, Math.round(((endedAt - startedAt) / 60000) * 10) / 10);

  const summary = {
    id: activeSession.id,
    intention: activeSession.intention,
    startedAt: startedAt,
    endedAt: endedAt,
    durationMin: actualDurationMin,
    longestStretchMin: Math.round((longestProductiveStretchMs / 60000) * 10) / 10,
    driftCount: driftCount,
    avgReturnSec: avgReturnSec,
    minutes: {
      productive: Math.round((productiveMs / 60000) * 10) / 10,
      neutral: Math.round((neutralMs / 60000) * 10) / 10,
      distracting: Math.round((distractingMs / 60000) * 10) / 10
    },
    timeline: timeline
  };

  // Add to completed sessions (keep last 50)
  sessions.unshift(summary);
  if (sessions.length > 50) {
    sessions.length = 50;
  }

  // Clear session state and completion alarms
  await chrome.storage.local.set({
    activeSession: null,
    distractingSince: null,
    sessions: sessions
  });

  chrome.alarms.clear(ALARM_SESSION_END);
  chrome.alarms.clear(ALARM_GRACE_CHECK);
  chrome.alarms.clear(ALARM_NUDGE_CHECK);
  console.log('[Sakshi Session] Session ended. Cleared alarms and distractingSince.');

  return { success: true, summary };
}

/**
 * Message Dispatcher
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = async () => {
    switch (message.type) {
      case 'BRIDGE_START_SESSION':
      case 'START_SESSION': {
        const result = await startSession(message.payload || {});
        return result;
      }

      case 'BRIDGE_END_SESSION':
      case 'END_SESSION': {
        const result = await endSession();
        return result;
      }

      case 'BRIDGE_GET_DATA': {
        const { sessions = [], activeSession = null } = await chrome.storage.local.get(['sessions', 'activeSession']);
        return { sessions, activeSession };
      }

      case 'GET_ACTIVE_SESSION': {
        const { activeSession = null, settings = {} } = await chrome.storage.local.get(['activeSession', 'settings']);
        return { activeSession, settings };
      }

      case 'YOUTUBE_WATCH_METADATA': {
        if (message.url) {
          latestYoutubeMeta[message.url] = {
            videoTitle: message.videoTitle,
            channel: message.channel,
            ts: Date.now()
          };
          // If active session is tracking, re-evaluate this active tab
          const { activeSession } = await chrome.storage.local.get(['activeSession']);
          if (activeSession && sender.tab && sender.tab.active) {
            await recordNavigation(sender.tab);
          }
        }
        return { received: true };
      }

      case 'PAUSE_RETURN_TO_WORK': {
        const { activeSession, settings } = await chrome.storage.local.get(['activeSession', 'settings']);
        if (activeSession) {
          // Reset distracting counter and reset cooldown so subsequent distractions notify every time!
          activeSession.distractingSince = null;
          activeSession.lastNudgeAt = null;

          const rawDomain = message.domain || activeSession?.currentTabInfo?.domain;
          const domainToTurnOff = getBaseDomain(rawDomain);
          const turnOff = message.turnOff !== false;

          if (domainToTurnOff && turnOff) {
            const currentTurnedOff = [
              ...(Array.isArray(activeSession.turnedOffDomains) ? activeSession.turnedOffDomains : [])
            ];
            if (!currentTurnedOff.includes(domainToTurnOff)) {
              currentTurnedOff.push(domainToTurnOff);
            }
            if (rawDomain && rawDomain.includes('youtube.com/shorts') && !currentTurnedOff.includes('youtube.com/shorts')) {
              currentTurnedOff.push('youtube.com/shorts');
            }
            activeSession.turnedOffDomains = currentTurnedOff;

            // Save both in activeSession and as top-level turnedOffDomains
            await chrome.storage.local.set({ turnedOffDomains: currentTurnedOff });

            // Turn off: Close or redirect any tabs open to that distracting domain
            try {
              const allTabs = await chrome.tabs.query({});
              const remainingMin = Math.max(1, Math.round(((new Date(activeSession.startedAt).getTime() + (activeSession.durationMin || 25) * 60 * 1000) - Date.now()) / 60000));
              for (const t of allTabs) {
                const tUrl = (t.url || t.pendingUrl || '').toLowerCase();
                if (isUrlTurnedOff(tUrl, currentTurnedOff)) {
                  // Do not close dashboard or extension options
                  if (!tUrl.includes('localhost:5173') && !tUrl.startsWith('chrome-extension://')) {
                    await chrome.tabs.remove(t.id).catch(async () => {
                      await chrome.tabs.update(t.id, {
                        url: chrome.runtime.getURL(`pause.html?paused=true&domain=${encodeURIComponent(domainToTurnOff)}&remaining=${remainingMin}`)
                      }).catch(() => {});
                    });
                  }
                }
              }
            } catch (err) {
              console.warn('[Sakshi Wellbeing] Error closing distracting tabs:', err);
            }
          }

          await chrome.storage.local.set({ activeSession, distractingSince: null, lastNudgeAt: null });

          // Broadcast update to open tabs
          chrome.tabs.query({}, (tabs) => {
            if (tabs && tabs.length > 0) {
              for (const t of tabs) {
                if (t.id) {
                  chrome.tabs.sendMessage(t.id, {
                    type: 'DOMAIN_TURNED_OFF',
                    domain: domainToTurnOff,
                    turnedOffDomains: activeSession.turnedOffDomains
                  }).catch(() => {});
                }
              }
            }
          });

          // Focus the last productive tab if available
          if (activeSession.lastProductiveTabId) {
            try {
              const tab = await chrome.tabs.get(activeSession.lastProductiveTabId);
              if (tab) {
                await chrome.tabs.update(activeSession.lastProductiveTabId, { active: true });
                if (tab.windowId) {
                  await chrome.windows.update(tab.windowId, { focused: true });
                }
                return { success: true };
              }
            } catch (e) {
              // Tab was closed, proceed to URL
            }
          }

          const fallbackUrl = activeSession.lastProductiveUrl || settings?.dashboardUrl || 'http://localhost:5173/';
          await chrome.tabs.create({ url: fallbackUrl });
          return { success: true };
        }
        return { success: false };
      }

      case 'PAUSE_CONTINUE_ANYWAY': {
        const { activeSession } = await chrome.storage.local.get(['activeSession']);
        if (activeSession) {
          if (message.domain && activeSession.turnedOffDomains) {
            activeSession.turnedOffDomains = activeSession.turnedOffDomains.filter(d => d !== message.domain);
          }
          // Record conscious decision to continue (no shaming, no penalty)
          if (!activeSession.timelineEvents) activeSession.timelineEvents = [];
          activeSession.timelineEvents.push({
            ts: Date.now(),
            url: 'pause://continue',
            title: 'Conscious Continuation',
            domain: message.domain || 'user_decision',
            category: 'distracting',
            source: 'conscious_continue',
            reason: 'User chose to continue observing without penalty'
          });
          await chrome.storage.local.set({ activeSession });
        }
        return { success: true };
      }

      case 'TEST_GEMINI_KEY': {
        const testResult = await classifyWithGemini({
          url: 'https://leetcode.com/problems/two-sum',
          title: 'Two Sum - LeetCode',
          videoTitle: '',
          channel: '',
          profile: { profession: 'Software Engineer', interests: ['Algorithms'], hobbies: [] },
          intention: 'Practice algorithm problems',
          apiKey: message.apiKey
        });
        return { success: Boolean(testResult), result: testResult };
      }

      case 'TEST_NOTIFICATION': {
        const notifId = 'sakshi_test_' + Date.now();
        chrome.notifications.create(notifId, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: 'Are you distracted?',
          message: 'You set out to: Test focus session\n\nWhat was your intention when you began?',
          priority: 2,
          requireInteraction: true
        }, (createdId) => {
          if (chrome.runtime.lastError) {
            console.error('[Sakshi Notification Error]', chrome.runtime.lastError.message);
          } else {
            console.log('[Sakshi Notification] Test notification displayed successfully, ID:', createdId);
          }
        });
        return { success: true };
      }

      case 'RESET_DEMO': {
        await chrome.storage.local.set({
          distractingSince: null,
          lastNudgeAt: null,
          activeSession: null
        });
        chrome.alarms.clear(ALARM_NUDGE_CHECK);
        chrome.alarms.clear(ALARM_GRACE_CHECK);
        chrome.alarms.clear(ALARM_SESSION_END);
        console.log('[Sakshi Demo] Reset demo: distractingSince, cooldown, and active session cleared.');
        return { success: true };
      }

      default:
        return { error: 'Unknown message type' };
    }
  };

  handler().then(sendResponse).catch(err => {
    console.error('[Sakshi] Error handling message:', err);
    sendResponse({ error: err.message });
  });

  return true; // Keep message channel open for async response
});
