/**
 * @file Saves everything the player owns: campaign progress (solo and
 * cooperation), crowns and workshop upgrades, chosen powers, story and
 * tutorial progress, settings, and the game in progress.
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';
import { PowerManager, DEFAULT_SLOTS } from '../core/powers/PowerManager.js';
import { LevelCatalog, LEVEL_COUNT } from '../core/config/LevelCatalog.js';
import { UpgradeCatalog } from '../core/progression/UpgradeCatalog.js';
import { crownsFor } from '../core/progression/GoldRules.js';
import { countAchievements } from '../core/progression/Achievements.js';

export const TRACKS = Object.freeze(['solo', 'coop']);
const DIFFICULTIES = ['easy', 'normal', 'hard'];

const emptyCampaign = () => ({ completed: 0, levels: {} });

const DEFAULT_PROGRESS = () => ({
  version: 2,
  campaigns: { solo: emptyCampaign(), coop: emptyCampaign() },
  crowns: 0,
  crownsEarned: 0,
  crownsSpent: 0,
  ranks: {},
  loadout: [],
  episodes: [],
  tutorials: [],
  duel: { played: 0, wins: [0, 0] },
});

const DEFAULT_SETTINGS = () => ({
  locale: null,
  theme: 'system',
  difficulty: 'normal',
  music: 0.6,
  sfx: 0.8,
  story: true,
  tutorials: true,
  names: ['', ''],
  // Blood is off by default on game portals (family-friendly hosts), on elsewhere.
  gore: typeof __TARGET__ === 'undefined' || __TARGET__ === 'web',
  particles: true,
});

const int = (v, min, max, fallback = min) => (Number.isInteger(v) && v >= min && v <= max ? v : fallback);

/**
 * Persistence of the player's progress. Every value read from storage is
 * checked and clamped: a damaged or hand-edited save cannot crash the game.
 */
export class SaveManager extends EventEmitter {
  /** @param {import('./StorageService.js').StorageService} storage */
  constructor(storage) {
    super();
    this.storage = storage;
    this.progress = SaveManager.sanitize(storage.get('progress', null));
    this.settings = { ...DEFAULT_SETTINGS(), ...SaveManager.sanitizeSettings(storage.get('settings', {})) };
  }

  /** Validates (and migrates from version 1) a stored progress object. */
  static sanitize(raw) {
    const p = DEFAULT_PROGRESS();
    if (!raw || typeof raw !== 'object') return p;
    if (raw.version !== 2) {
      // Version 1 had 6 levels: keep how far the player went.
      p.campaigns.solo.completed = int(raw.completed, 0, 6, 0);
      return p;
    }
    for (const track of TRACKS) {
      const c = raw.campaigns?.[track];
      if (!c) continue;
      p.campaigns[track].completed = int(c.completed, 0, LEVEL_COUNT, 0);
      for (const [id, rec] of Object.entries(c.levels || {})) {
        const n = Number(id.slice(1));
        if (!/^l\d+$/.test(id) || n < 1 || n > LEVEL_COUNT || n > p.campaigns[track].completed + 1) continue;
        const stars = {};
        for (const d of DIFFICULTIES) stars[d] = int(rec?.stars?.[d], 0, 3, 0);
        p.campaigns[track].levels[id] = { stars, ach: int(rec?.ach, 0, 7, 0), best: int(rec?.best, 0, 1e9, 0), wins: int(rec?.wins, 0, 1e6, 0) };
      }
    }
    p.crownsEarned = int(raw.crownsEarned, 0, 1e7, 0);
    p.crownsSpent = int(raw.crownsSpent, 0, p.crownsEarned, 0);
    p.crowns = p.crownsEarned - p.crownsSpent;
    for (const u of UpgradeCatalog.all()) {
      const r = int(raw.ranks?.[u.id], 0, u.prices.length, 0);
      if (r) p.ranks[u.id] = r;
    }
    p.loadout = Array.isArray(raw.loadout) ? raw.loadout.filter((x) => typeof x === 'string').slice(0, DEFAULT_SLOTS + 1) : [];
    p.episodes = Array.isArray(raw.episodes) ? raw.episodes.filter((x) => typeof x === 'string').slice(0, 50) : [];
    p.tutorials = Array.isArray(raw.tutorials) ? raw.tutorials.filter((x) => typeof x === 'string').slice(0, 100) : [];
    p.duel = { played: int(raw.duel?.played, 0, 1e6, 0), wins: [int(raw.duel?.wins?.[0], 0, 1e6, 0), int(raw.duel?.wins?.[1], 0, 1e6, 0)] };
    return p;
  }

  static sanitizeSettings(raw) {
    const s = {};
    if (!raw || typeof raw !== 'object') return s;
    if (typeof raw.locale === 'string' && /^[a-z]{2}$/.test(raw.locale)) s.locale = raw.locale;
    if (['system', 'light', 'dark'].includes(raw.theme)) s.theme = raw.theme;
    if (DIFFICULTIES.includes(raw.difficulty)) s.difficulty = raw.difficulty;
    for (const k of ['music', 'sfx']) if (typeof raw[k] === 'number' && raw[k] >= 0 && raw[k] <= 1) s[k] = raw[k];
    for (const k of ['story', 'tutorials', 'gore', 'particles']) if (typeof raw[k] === 'boolean') s[k] = raw[k];
    if (Array.isArray(raw.names)) s.names = [0, 1].map((i) => String(raw.names[i] ?? '').slice(0, 16));
    return s;
  }

  // ------------------------------------------------------------ campaign
  campaign(track = 'solo') {
    return this.progress.campaigns[track];
  }

  /** @param {number} number level number (1-100) */
  isLevelUnlocked(number, track = 'solo') {
    return number <= this.campaign(track).completed + 1;
  }

  record(number, track = 'solo') {
    return this.campaign(track).levels[`l${number}`] || null;
  }

  /**
   * Best stars of a level.
   * @param {string} [difficulty] omit for the best across difficulties
   */
  starsFor(number, difficulty, track = 'solo') {
    const rec = this.record(number, track);
    if (!rec) return 0;
    return difficulty ? rec.stars[difficulty] : Math.max(...Object.values(rec.stars));
  }

  /** Challenges passed in a level (mask of 3 bits). */
  achievementsFor(number, track = 'solo') {
    return this.record(number, track)?.ach || 0;
  }

  /** Stars that count for the workshop: best of solo and cooperation, per level. */
  get totalStars() {
    let sum = 0;
    for (let n = 1; n <= LEVEL_COUNT; n++) sum += Math.max(this.starsFor(n, null, 'solo'), this.starsFor(n, null, 'coop'));
    return sum;
  }

  get totalAchievements() {
    let sum = 0;
    for (let n = 1; n <= LEVEL_COUNT; n++) sum += countAchievements(this.achievementsFor(n, 'solo') | this.achievementsFor(n, 'coop'));
    return sum;
  }

  /** Levels beaten in the furthest campaign (unlocks powers and towers in the workshop). */
  get furthest() {
    return Math.max(this.campaign('solo').completed, this.campaign('coop').completed);
  }

  unlockedPowers(track = 'solo') {
    return PowerManager.unlockedFor(this.campaign(track).completed);
  }

  /**
   * Records a finished level (won or lost) and pays crowns for a victory.
   * @param {object} o
   * @param {import('../core/config/Level.js').Level} o.level
   * @param {string} o.difficulty
   * @param {boolean} o.won
   * @param {number} o.stars
   * @param {number} o.score
   * @param {number} o.mask challenges passed in this run
   * @param {string} [o.track]
   * @returns {{crowns:{total:number, parts:Array}, newPowers:string[], firstWin:boolean, newMask:number}}
   */
  completeLevel({ level, difficulty, won, stars, score, mask, track = 'solo' }) {
    const c = this.campaign(track);
    const id = level.id;
    if (!won) return { crowns: { total: 0, parts: [] }, newPowers: [], firstWin: false, newMask: 0 };
    const beforePowers = this.unlockedPowers(track);
    const rec = (c.levels[id] ||= { stars: { easy: 0, normal: 0, hard: 0 }, ach: 0, best: 0, wins: 0 });
    const firstWin = rec.wins === 0;
    const crowns = crownsFor({ firstWin, oldStars: rec.stars[difficulty] || 0, newStars: stars, oldMask: rec.ach, newMask: mask });
    const newMask = mask & ~rec.ach;
    rec.stars[difficulty] = Math.max(rec.stars[difficulty] || 0, stars);
    rec.ach |= mask;
    rec.best = Math.max(rec.best, score);
    rec.wins += 1;
    c.completed = Math.max(c.completed, level.number);
    this.progress.crownsEarned += crowns.total;
    this.progress.crowns += crowns.total;
    this._persistProgress();
    const newPowers = this.unlockedPowers(track).filter((p) => !beforePowers.includes(p));
    return { crowns, newPowers, firstWin, newMask };
  }

  /**
   * Extra crowns from a rewarded video (doubling a victory). Kept apart and
   * capped: videos can never pay more than playing could.
   */
  addBonusCrowns(amount) {
    const n = Math.max(0, Math.min(500, Math.round(amount)));
    this.progress.crownsEarned += n;
    this.progress.crowns += n;
    this._persistProgress();
  }

  // ------------------------------------------------------------ workshop
  get ranks() {
    return this.progress.ranks;
  }

  checkUpgrade(id) {
    return UpgradeCatalog.check(id, { ranks: this.ranks, crowns: this.progress.crowns, stars: this.totalStars, completed: this.furthest });
  }

  buyUpgrade(id) {
    const check = this.checkUpgrade(id);
    if (!check.ok) return false;
    this.progress.ranks[id] = (this.progress.ranks[id] || 0) + 1;
    this.progress.crowns -= check.price;
    this.progress.crownsSpent += check.price;
    this._persistProgress();
    return true;
  }

  /** Game modifiers from the workshop. */
  mods() {
    return UpgradeCatalog.modsFor(this.ranks);
  }

  get powerSlots() {
    return this.mods().powerSlots;
  }

  /** Powers taken into the next level: saved choice, completed with unlocked ones. */
  loadout(track = 'solo') {
    const unlocked = this.unlockedPowers(track);
    const slots = this.powerSlots;
    const chosen = this.progress.loadout.filter((id) => unlocked.includes(id));
    for (const id of [...unlocked].reverse()) {
      if (chosen.length >= slots) break;
      if (!chosen.includes(id)) chosen.push(id);
    }
    return chosen.slice(0, slots);
  }

  setLoadout(ids) {
    this.progress.loadout = ids.slice(0, this.powerSlots);
    this._persistProgress();
  }

  // ------------------------------------------------------------ story & tutorials
  hasSeen(kind, id) {
    return this.progress[kind].includes(id);
  }

  markSeen(kind, id) {
    if (this.hasSeen(kind, id)) return;
    this.progress[kind].push(id);
    this._persistProgress();
  }

  recordDuel(winner) {
    this.progress.duel.played += 1;
    if (winner === 1 || winner === 2) this.progress.duel.wins[winner - 1] += 1;
    this._persistProgress();
  }

  _persistProgress() {
    this.storage.set('progress', this.progress);
    this.emit('progress', this.progress);
  }

  // ------------------------------------------------------------ settings
  updateSettings(patch) {
    Object.assign(this.settings, SaveManager.sanitizeSettings({ ...this.settings, ...patch }));
    this.storage.set('settings', this.settings);
    this.emit('settings', this.settings);
  }

  // ------------------------------------------------------------ game in progress
  /**
   * @param {object} snapshot output of Game#serialize() (+ track)
   * @returns {boolean} false if the browser refused to store it
   */
  saveGame(snapshot) {
    return this.storage.set('currentGame', snapshot);
  }

  loadGame() {
    return this.storage.get('currentGame', null);
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

  /** Total levels (for portal progress reports). */
  static get levelCount() {
    return LevelCatalog.count;
  }
}
