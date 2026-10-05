/**
 * @file The ten chapters of the campaign (10 levels each).
 *
 * Each chapter has a landscape (`theme`, used by the renderer), a pool of road
 * layouts, how much water and how many rocks its maps get, and which enemies
 * it favours. Enemies are only used once they have been introduced
 * (config/unlocks.js), so early chapters stay simple.
 */

export const LEVELS_PER_CHAPTER = 10;
export const CHAPTER_COUNT = 10;

export const CHAPTERS = Object.freeze([
  {
    id: 1,
    theme: 'meadow',
    layouts: ['snake', 'zigzag', 'longS', 'bigU', 'maze', 'spiral', 'stairs', 'cup', 'zig', 'castle'],
    rocks: 6,
    water: 0,
    favour: { grunt: 4, runner: 2, wolf: 2, shield: 1.5 },
  },
  {
    id: 2,
    theme: 'swamp',
    layouts: ['zig', 'topdown', 'merge', 'arrow', 'longC', 'hook', 'serpent', 'zed', 'fork', 'doubleU'],
    rocks: 4,
    water: 9,
    favour: { grunt: 3, runner: 2, priest: 2, crow: 2, knight: 1, shield: 1 },
  },
  {
    id: 3,
    theme: 'desert',
    layouts: ['valley', 'parallel', 'short', 'spiral', 'merge', 'crossing', 'maze', 'castle', 'fork', 'longMerge'],
    rocks: 8,
    water: 0,
    favour: { runner: 3, sapper: 3, berserker: 2, wolf: 2, crow: 1, knight: 1 },
  },
  {
    id: 4,
    theme: 'mountain',
    layouts: ['serpent', 'pincer', 'zig', 'twinCross', 'zed', 'longC', 'hook', 'arrow', 'opposite', 'gate'],
    rocks: 12,
    water: 0,
    favour: { wyvern: 2, crow: 2, knight: 2, shield: 2, berserker: 1, grunt: 2 },
  },
  {
    id: 5,
    theme: 'winter',
    layouts: ['longS', 'merge', 'doubleU', 'parallel', 'valley', 'fork', 'snake', 'crossing', 'cup', 'longMerge'],
    rocks: 6,
    water: 8,
    favour: { golem: 2, wolf: 3, knight: 2, priest: 1, crow: 1, shield: 1 },
  },
  {
    id: 6,
    theme: 'forest',
    layouts: ['hook', 'twinCross', 'serpent', 'opposite', 'zigzag', 'pincer', 'topdown', 'gate', 'stairs', 'trident'],
    rocks: 10,
    water: 3,
    favour: { necromancer: 2, sapper: 2, wolf: 2, berserker: 2, grunt: 2, wyvern: 1 },
  },
  {
    id: 7,
    theme: 'storm',
    layouts: ['crossing', 'zed', 'longMerge', 'arrow', 'fork', 'parallel', 'spiral', 'twinCross', 'pincer', 'storm'],
    rocks: 7,
    water: 4,
    favour: { warlock: 2, ram: 1.5, wyvern: 2, knight: 2, priest: 1, crow: 2 },
  },
  {
    id: 8,
    theme: 'ashlands',
    layouts: ['short', 'gate', 'merge', 'castle', 'opposite', 'siege', 'valley', 'twinCross', 'trident', 'storm'],
    rocks: 9,
    water: 0,
    favour: { siege: 1.5, berserker: 2, golem: 1.5, necromancer: 1, knight: 2, ram: 1 },
  },
  {
    id: 9,
    theme: 'ramparts',
    layouts: ['trident', 'pincer', 'longMerge', 'siege', 'crossing', 'gate', 'storm', 'fork', 'opposite', 'trident'],
    rocks: 6,
    water: 6,
    favour: { knight: 2, warlock: 1.5, ram: 1.5, siege: 1.5, wyvern: 1.5, sapper: 1.5, priest: 1 },
  },
  {
    id: 10,
    theme: 'capital',
    layouts: ['siege', 'storm', 'trident', 'gate', 'twinCross', 'siege', 'pincer', 'storm', 'trident', 'siege'],
    rocks: 4,
    water: 10,
    favour: { knight: 2, golem: 1.5, warlock: 1.5, siege: 1.5, ram: 1.5, wyvern: 1.5, necromancer: 1, berserker: 1 },
  },
]);

/** Chapter of a level number (1-100). */
export function chapterOf(levelNumber) {
  return CHAPTERS[Math.min(CHAPTER_COUNT - 1, Math.floor((levelNumber - 1) / LEVELS_PER_CHAPTER))];
}
