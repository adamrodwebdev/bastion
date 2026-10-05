/**
 * @file The 100 campaign levels.
 */

import { Level } from './Level.js';
import { CHAPTERS, LEVELS_PER_CHAPTER, CHAPTER_COUNT } from './chapters.js';

export const LEVEL_COUNT = LEVELS_PER_CHAPTER * CHAPTER_COUNT;

export class LevelCatalog {
  static _levels = Array.from({ length: LEVEL_COUNT }, (_, i) => new Level(i + 1));

  static all() {
    return LevelCatalog._levels;
  }

  /** @param {number} index 0-based */
  static get(index) {
    return LevelCatalog._levels[index] || null;
  }

  /** @param {number} number 1-based */
  static byNumber(number) {
    return LevelCatalog._levels[number - 1] || null;
  }

  static get count() {
    return LevelCatalog._levels.length;
  }

  /** Levels of a chapter (1-10). */
  static chapter(id) {
    return LevelCatalog._levels.filter((l) => l.chapter === id);
  }

  static get chapters() {
    return CHAPTERS;
  }
}
