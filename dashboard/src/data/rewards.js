import goodiesData from './goodies.json';

export const GOODIES = goodiesData;

/**
 * Points logic:
 * - 1 point per 10 minutes of unbroken productive stretch (longestStretchMin)
 * - Bonus point when average return time improves versus the previous session
 * - Never subtract points, never show negative scores
 */
export function calculateSessionPoints(session, previousSession = null) {
  if (!session) return 0;

  // 1 point per 10 minutes of unbroken productive stretch
  const stretchMin = session.longestStretchMin || session.minutes?.productive || 0;
  const stretchPoints = Math.floor(stretchMin / 10);

  // Bonus when average return time improves (i.e. is faster) vs previous session
  let returnBonus = 0;
  if (previousSession && typeof previousSession.avgReturnSec === 'number' && typeof session.avgReturnSec === 'number') {
    if (session.avgReturnSec < previousSession.avgReturnSec) {
      returnBonus = 2; // return latency improved
    }
  } else if (session.avgReturnSec && session.avgReturnSec <= 60) {
    // Quick baseline return bonus for single sessions
    returnBonus = 1;
  }

  // Base encouragement of at least 1 point for any completed intentional session
  return Math.max(1, stretchPoints + returnBonus);
}

/**
 * Calculate total points earned across all completed sessions in sequence
 */
export function calculateAllEarnedPoints(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < sessions.length; i++) {
    const prev = i > 0 ? sessions[i - 1] : null;
    total += calculateSessionPoints(sessions[i], prev);
  }
  return total;
}
