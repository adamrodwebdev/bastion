/**
 * @file Crowns (the workshop currency): how many a finished level pays.
 *
 * Crowns reward mastery, not grinding: the first victory pays well, each new
 * star and each new challenge pays more, replaying a level already beaten only
 * pays a little, and a defeat pays nothing.
 */

import { countAchievements } from './Achievements.js';

export const GOLD = Object.freeze({
  FIRST_WIN: 30,
  STAR: 15,
  CHALLENGE: 100,
  ALL_CHALLENGES: 50,
  REPLAY: 5,
});

/**
 * @param {object} o
 * @param {boolean} o.firstWin first victory of this level (any difficulty)
 * @param {number} o.oldStars best stars before (this difficulty)
 * @param {number} o.newStars stars of this run
 * @param {number} o.oldMask challenges already passed before
 * @param {number} o.newMask challenges passed in this run
 * @returns {{total:number, parts:Array<{id:string, amount:number}>}}
 */
export function crownsFor({ firstWin, oldStars, newStars, oldMask, newMask }) {
  const parts = [];
  if (firstWin) parts.push({ id: 'firstWin', amount: GOLD.FIRST_WIN });
  const stars = Math.max(0, newStars - oldStars);
  if (stars) parts.push({ id: 'stars', amount: stars * GOLD.STAR });
  const gained = newMask & ~oldMask;
  const challenges = countAchievements(gained);
  if (challenges) parts.push({ id: 'challenges', amount: challenges * GOLD.CHALLENGE });
  if (gained && (oldMask | newMask) === 7) parts.push({ id: 'allChallenges', amount: GOLD.ALL_CHALLENGES });
  if (!parts.length) parts.push({ id: 'replay', amount: GOLD.REPLAY });
  return { total: parts.reduce((s, p) => s + p.amount, 0), parts };
}

/** Most crowns the whole campaign can pay (first wins, 3 stars, every challenge). */
export function campaignMaximum(levelCount = 100) {
  return levelCount * (GOLD.FIRST_WIN + 3 * GOLD.STAR + 3 * GOLD.CHALLENGE + GOLD.ALL_CHALLENGES);
}
