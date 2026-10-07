/**
 * Sakshi - Attention Classification Rules
 * Manifest V3 compatible rule engine for domain and URL inspection.
 */

const DEFAULT_PRODUCTIVE_DOMAINS = [
  'github.com',
  'gitlab.com',
  'stackoverflow.com',
  'stackexchange.com',
  'leetcode.com',
  'developer.mozilla.org',
  'w3schools.com',
  'geeksforgeeks.org',
  'docs.google.com',
  'drive.google.com',
  'notion.so',
  'figma.com',
  'dev.to',
  'arxiv.org',
  'wikipedia.org',
  'localhost',
  '127.0.0.1',
  'claude.ai',
  'chatgpt.com',
  'chat.openai.com',
  'gemini.google.com'
];

const DEFAULT_DISTRACTING_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'x.com',
  'twitter.com',
  'reddit.com',
  'tiktok.com',
  'netflix.com',
  'twitch.tv',
  'pinterest.com',
  'threads.net',
  '9gag.com',
  'buzzfeed.com'
];

/**
 * Extracts and normalizes hostname from any URL.
 * Returns empty string for invalid or internal browser URLs.
 */
function extractDomain(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl);
    if (['chrome:', 'chrome-extension:', 'about:', 'edge:', 'devtools:', 'file:'].includes(parsed.protocol)) {
      return '';
    }
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    return host;
  } catch (err) {
    return '';
  }
}

/**
 * Checks whether a host matches an entry in a list, including subdomains.
 * e.g., 'gist.github.com' matches 'github.com'.
 */
function matchesDomainList(host, domainList) {
  if (!host || !Array.isArray(domainList)) return false;
  const targetHost = host.toLowerCase().trim();
  return domainList.some(entry => {
    let cleanEntry = entry.toLowerCase().trim();
    if (cleanEntry.startsWith('www.')) cleanEntry = cleanEntry.slice(4);
    if (!cleanEntry) return false;
    return targetHost === cleanEntry || targetHost.endsWith('.' + cleanEntry);
  });
}

/**
 * Checks if a URL targets short-video platforms or feeds (Shorts / Reels).
 */
function isSpecialDistractingPath(rawUrl) {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // YouTube Shorts
    if ((host.includes('youtube.com') || host.includes('youtu.be')) && pathname.startsWith('/shorts')) {
      return true;
    }

    // Instagram Reels
    if (host.includes('instagram.com') && pathname.startsWith('/reels')) {
      return true;
    }

    // Facebook Reels
    if (host.includes('facebook.com') && pathname.includes('/reels')) {
      return true;
    }

    // TikTok video stream
    if (host.includes('tiktok.com')) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Classifies a URL based on deterministic rules:
 * 1. Special paths (Shorts/Reels) -> 'distracting'
 * 2. Distracting domains list -> 'distracting'
 * 3. Productive domains list -> 'productive'
 * 4. Otherwise -> 'unknown' (delegated to Gemini or neutral fallback)
 */
function classifyUrlByRules(rawUrl, productiveList = DEFAULT_PRODUCTIVE_DOMAINS, distractingList = DEFAULT_DISTRACTING_DOMAINS) {
  const domain = extractDomain(rawUrl);
  if (!domain) {
    return { label: 'neutral', reason: 'Internal or blank browser page', source: 'internal' };
  }

  // 1. Special short-form paths
  if (isSpecialDistractingPath(rawUrl)) {
    return { label: 'distracting', reason: 'Short-form rapid-content stream (Shorts/Reels)', source: 'special_path' };
  }

  // 2. Explicit distracting domain list
  if (matchesDomainList(domain, distractingList)) {
    return { label: 'distracting', reason: `Matched distracting domain rule (${domain})`, source: 'rule' };
  }

  // 3. Explicit productive domain list
  if (matchesDomainList(domain, productiveList)) {
    return { label: 'productive', reason: `Matched productive domain rule (${domain})`, source: 'rule' };
  }

  // 4. Ambiguous / Unknown
  return { label: 'unknown', reason: 'Not found in static rules', source: 'unknown' };
}

// Universal export
const SakshiRules = {
  DEFAULT_PRODUCTIVE_DOMAINS,
  DEFAULT_DISTRACTING_DOMAINS,
  extractDomain,
  matchesDomainList,
  isSpecialDistractingPath,
  classifyUrlByRules
};

if (typeof self !== 'undefined') {
  self.SakshiRules = SakshiRules;
}
if (typeof window !== 'undefined') {
  window.SakshiRules = SakshiRules;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SakshiRules;
}
