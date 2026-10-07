const KEYS = {
  PROFILE: 'sakshi_profile',
  SESSIONS: 'sakshi_sessions', 
  SETTINGS: 'sakshi_settings',
  ONBOARDED: 'sakshi_onboarded',
  ACTIVE_SESSION: 'sakshi_active_session',
  REWARDS: 'sakshi_rewards',
};

function safeGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function getProfile() {
  return safeGet(KEYS.PROFILE);
}

export function saveProfile(profile) {
  safeSet(KEYS.PROFILE, profile);
}

export function getSessions() {
  return safeGet(KEYS.SESSIONS, []);
}

export function saveSessions(sessions) {
  safeSet(KEYS.SESSIONS, sessions);
}

export function addSession(session) {
  const sessions = getSessions();
  sessions.push(session);
  saveSessions(sessions);
}

export function getSettings() {
  return safeGet(KEYS.SETTINGS, { geminiKey: '', theme: 'light', lang: 'en', demoMode: false });
}

export function saveSettings(settings) {
  safeSet(KEYS.SETTINGS, settings);
}

export function isOnboarded() {
  return safeGet(KEYS.ONBOARDED, false);
}

export function setOnboarded() {
  safeSet(KEYS.ONBOARDED, true);
}

export function getActiveSession() {
  return safeGet(KEYS.ACTIVE_SESSION);
}

export function saveActiveSession(session) {
  safeSet(KEYS.ACTIVE_SESSION, session);
}

export function clearActiveSession() {
  localStorage.removeItem(KEYS.ACTIVE_SESSION);
}

export function getRewardsData() {
  return safeGet(KEYS.REWARDS, {
    claimedGoodies: [],
    customEarnedPoints: 0
  });
}

export function saveRewardsData(data) {
  safeSet(KEYS.REWARDS, data);
}

export function deleteAllData() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}
