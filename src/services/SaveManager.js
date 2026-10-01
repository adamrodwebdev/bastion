/**
 * @file Saves campaign progress, settings and the game in progress.
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';
import { PowerManager } from '../core/powers/PowerManager.js';
import { LevelCatalog } from '../core/config/LevelCatalog.js';

const DEFAULT_PROGRESS = () => ({
  version: 1,
  completed: 0, // number of levels completed (unlocks levels and powers)
  stars: {}, // levelId -> { easy: n, normal: n, hard: n }
  best: {}, // levelId -> best score
});

const DEFAULT_SETTINGS = () => ({ locale: null, theme: 'system', difficulty: 'normal', sound: true });

/**
 * Persistence of everything the player owns: campaign progress,
 * settings, and the snapshot of the game in progress.
 */
export class SaveManager extends EventEmitter {
  /** @param {import('./StorageService.js').StorageService} storage */
  constructor(storage) {
    super();
    this.storage = storage;
    this.progress = { ...DEFAULT_PROGRESS(), ...storage.get('progress', {}) };
    this.settings = { ...DEFAULT_SETTINGS(), ...storage.get('settings', {}) };
  }

  // ------------------------------------------------------------ progress
  /** @param {number} index 0-based level index */
  isLevelUnlocked(index) {
    return index <= this.progress.completed;
  }

  /**
   * @param {string} levelId
   * @param {string} [difficulty] omit to get the best result across difficulties
   * @returns {number} 0 to 3
   */
  starsFor(levelId, difficulty) {
    const s = this.progress.stars[levelId];
    if (!s) return 0;
    return difficulty ? s[difficulty] || 0 : Math.max(0, ...Object.values(s));
  }

  get totalStars() {
    return LevelCatalog.all().reduce((sum, l) => sum + this.starsFor(l.id), 0);
  }

  get unlockedPowers() {
    return PowerManager.unlockedFor(this.progress.completed);
  }

  /**
   * Records a victory: stars, best score, and unlocks the next level.
   * @param {import('../core/config/Level.js').Level} level
   * @param {string} difficulty
   * @param {number} stars
   * @param {number} score
   * @returns {string[]} ids of the powers newly unlocked by this victory
   */
  completeLevel(level, difficulty, stars, score) {
    const before = this.unlockedPowers;
    const s = (this.progress.stars[level.id] ||= {});
    s[difficulty] = Math.max(s[difficulty] || 0, stars);
    this.progress.best[level.id] = Math.max(this.progress.best[level.id] || 0, score);
    this.progress.completed = Math.max(this.progress.completed, level.index + 1);
    this._persistProgress();
    return this.unlockedPowers.filter((id) => !before.includes(id));
  }

  _persistProgress() {
    this.storage.set('progress', this.progress);
    this.emit('progress', this.progress);
  }

  // ------------------------------------------------------------ settings
  /** @param {Partial<{locale:string, theme:string, difficulty:string, sound:boolean}>} patch */
  updateSettings(patch) {
    Object.assign(this.settings, patch);
    this.storage.set('settings', this.settings);
    this.emit('settings', this.settings);
  }

  // ------------------------------------------------------------ game in progress
  /**
   * @param {object} snapshot output of Game#serialize()
   * @returns {boolean} false if the browser refused to store it (quota, private mode)
   */
  saveGame(snapshot) {
    return this.storage.set('currentGame', snapshot);
  }

  loadGame() {
    return this.storage.get('currentGame', null);
  }

  get hasSavedGame() {
    return !!this.loadGame();
  }

  clearGame() {
    this.storage.remove('currentGame');
  }

  // ------------------------------------------------------------ reset
  resetAll() {
    this.progress = DEFAULT_PROGRESS();
    this.clearGame();
    this._persistProgress();
  }
}
