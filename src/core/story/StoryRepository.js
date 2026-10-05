/**
 * @file The Chronicle of Bastion: the story told between campaign levels.
 *
 * It follows Catapulte Mania: Ysolde has been crowned, Mordrac fled north.
 * A year later he comes back with a horde, and this time the kingdom must
 * hold its ground, bastion after bastion.
 *
 * Two forms:
 *  - EPISODES (beats), read before the first level of each chapter (`before`)
 *    or after the final victory (`after`): a few pages, each with a speaker
 *    (or null for the narrator) and the characters on stage (`cast`);
 *  - LINES: one sentence before EVERY level, said by a character, shown in
 *    the level briefing.
 * Texts live in the translations: `story.<beat>.p<n>` and `story.lines.l<n>`.
 */

import { CHARACTERS } from './Portraits.js';

const Y = 'ysolde';
const A = 'aubert';
const G = 'gontran';
const M = 'mordrac';
const page = (speaker, cast = speaker ? [speaker] : []) => ({ speaker, cast });

/** @type {ReadonlyArray<{id:string, chapter:number, before?:number, after?:number, pages:Array<{speaker:string|null, cast:string[]}>}>} */
export const BEATS = Object.freeze([
  { id: 'prologue', chapter: 1, before: 1, pages: [page(null, [Y, M]), page(Y), page(G, [G, Y]), page(G)] },
  { id: 'ch2', chapter: 2, before: 11, pages: [page(M), page(G, [G, Y])] },
  { id: 'ch3', chapter: 3, before: 21, pages: [page(Y), page(G, [G, Y])] },
  { id: 'ch4', chapter: 4, before: 31, pages: [page(M), page(G)] },
  { id: 'ch5', chapter: 5, before: 41, pages: [page(A, [A, Y]), page(G)] },
  { id: 'ch6', chapter: 6, before: 51, pages: [page(M), page(Y, [G, Y])] },
  { id: 'ch7', chapter: 7, before: 61, pages: [page(G), page(Y, [G, Y])] },
  { id: 'ch8', chapter: 8, before: 71, pages: [page(M), page(A, [A, Y])] },
  { id: 'ch9', chapter: 9, before: 81, pages: [page(Y), page(G, [G, Y])] },
  { id: 'ch10', chapter: 10, before: 91, pages: [page(M), page(A, [A, Y]), page(Y, [G, Y])] },
  { id: 'epilogue', chapter: 10, after: 100, pages: [page(null, [M]), page(Y, [A, Y]), page(G, [G, Y])] },
]);

/**
 * Who speaks before each level (index 0 = level 1). Gontran gives the
 * technical advice, Ysolde leads, Mordrac taunts before each chapter boss,
 * and old king Aubert joins in on the ramparts and in the capital.
 */
export const LINE_SPEAKERS = Object.freeze([
  G, Y, G, G, Y, G, G, Y, G, M, // 1-10   the border
  G, Y, G, Y, G, G, Y, G, Y, M, // 11-20  the marshes
  G, Y, G, Y, G, Y, G, Y, G, M, // 21-30  the desert
  G, Y, G, Y, G, Y, G, Y, G, M, // 31-40  the mountains
  G, Y, G, Y, G, Y, G, Y, G, M, // 41-50  winter
  G, Y, G, Y, G, Y, G, Y, G, M, // 51-60  the black forest
  G, Y, G, Y, G, Y, G, Y, G, M, // 61-70  the storm
  G, Y, G, Y, G, Y, G, Y, G, M, // 71-80  the ashlands
  Y, G, Y, G, Y, A, G, Y, A, M, // 81-90  the ramparts
  Y, G, A, Y, G, A, Y, G, A, M, // 91-100 the capital
]);

// Consistency check at load time (a typo fails immediately).
for (const b of BEATS) {
  for (const p of b.pages) {
    if (p.speaker !== null && !CHARACTERS[p.speaker]) throw new Error(`story ${b.id}: unknown speaker ${p.speaker}`);
    if (p.cast.length > 2) throw new Error(`story ${b.id}: at most two characters on stage`);
  }
}
if (LINE_SPEAKERS.length !== 100) throw new Error('story: one line per level expected');

export class StoryRepository {
  /** Episode read before a level (chapter opening), or null. */
  static beatBefore(levelNumber) {
    return BEATS.find((b) => b.before === levelNumber) || null;
  }

  /** Episode read after a level (epilogue), or null. */
  static beatAfter(levelNumber) {
    return BEATS.find((b) => b.after === levelNumber) || null;
  }

  static beat(id) {
    return BEATS.find((b) => b.id === id) || null;
  }

  static all() {
    return BEATS;
  }

  /** Who speaks in the briefing of a level. */
  static speakerOf(levelNumber) {
    return LINE_SPEAKERS[levelNumber - 1] || G;
  }
}
