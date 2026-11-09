/**
 * @file Saves everything the player owns: campaign progress (solo and
 * cooperation), crowns and workshop upgrades, chosen powers, story and
 * tutorial progress, settings, and the game in progress.
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';
import { PowerManager } from '../core/powers/PowerManager.js';
import { LevelCatalog, LEVEL_COUNT } from '../core/config/LevelCatalog.js';
import { UpgradeCatalog } from '../core/progression/UpgradeCatalog.js';
import { crownsFor } from '../core/progression/GoldRules.js';
import { countAchievements } from '../core/progression/Achievements.js';
import { Game } from '../core/Game.js';
import { InputRecord, orElse, parseNumber, readChoice, readNumber, readText } from '../core/input.js';
import { LIST_LIMITS, SAVE_LIMITS, TEXT_LIMITS } from '../core/limits.js';
import { LANGUAGE_NAMES } from '../locales/index.js';
import { SaveSlot } from './SaveSlot.js';

export const TRACKS = Object.freeze(['solo', 'coop']);
const DIFFICULTIES = Object.freeze(['easy', 'normal', 'hard']);
const THEMES = Object.freeze(['system', 'light', 'dark']);
const LOCALES = Object.freeze(Object.keys(LANGUAGE_NAMES));
const POWER_IDS = Object.freeze(PowerManager.catalogue().map((p) => p.id));
/** Settings that are on or off. */
const SWITCHES = Object.freeze(['story', 'tutorials', 'gore', 'particles', 'muted', 'haptics', 'motion']);

/** A whole number from 0 to `max`. */
const count = (max) => Object.freeze({ min: 0, max, integer: true });
const VOLUME = Object.freeze({ min: 0, max: 1 });
/** A level's record: stars per difficulty, challenges passed (3 bits), best score, victories. */
const STARS = count(3);
const MASK = count(7);
const BEST = count(1e9);
const TIMES = count(1e6);
const CROWNS = count(1e7);
const LEVEL = Object.freeze({ min: 1, max: LEVEL_COUNT, integer: true });

/** A name the game wrote into a save (an episode, a tutorial): letters, digits and dashes. */
const SAVE_ID = Object.freeze({ maxLength: TEXT_LIMITS.saveId, required: true, pattern: /^[A-Za-z][A-Za-z0-9-]*$/ });
/** A training lesson: t1 to t9. */
const LESSON_ID = Object.freeze({ maxLength: TEXT_LIMITS.saveId, required: true, pattern: /^t\d$/ });
/** A player's name: any text the field takes, or nothing (the default "Player 1" is then shown). */
const PLAYER_NAME = Object.freeze({ maxLength: TEXT_LIMITS.playerName });
/** A level's key in a campaign record: l1 to l100, written without leading zeros. */
const LEVEL_KEY = /^l([1-9]\d{0,2})$/;

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
  training: [],
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
  // Sound button in the header (music and effects together).
  muted: false,
  // Short vibrations on phones that support them.
  haptics: true,
  // Banners between screens and animations; off, they give way to short fades.
  motion: true,
});

/** A list read item by item. */
const listOf = (maxItems, item) => ({ maxItems, item });
const textItem = (rule) => (value, field) => readText(value, rule, field);

/**
 * A campaign's record: how far it went, and the record of each level reached. A bad
 * level record is left out; the others stay.
 * @param {InputRecord} campaign
 * @returns {{completed:number, levels:object}}
 */
function readCampaign(campaign) {
  const completed = orElse(() => campaign.number('completed', count(LEVEL_COUNT)), 0);
  const levels = {};
  const records = orElse(() => campaign.record('levels'), null);
  for (const id of records ? orElse(() => records.keys(LIST_LIMITS.levels), []) : []) {
    const digits = LEVEL_KEY.exec(id)?.[1];
    const n = digits ? orElse(() => parseNumber(digits, LEVEL, id), 0) : 0;
    // A record for a level the campaign has not reached is not one.
    if (n === 0 || n > completed + 1) continue;
    const level = orElse(() => records.record(id), null);
    if (!level) continue;
    const stars = orElse(() => level.record('stars'), null);
    levels[id] = {
      stars: Object.fromEntries(DIFFICULTIES.map((d) => [d, stars ? orElse(() => stars.number(d, STARS), 0) : 0])),
      ach: orElse(() => level.number('ach', MASK), 0),
      best: orElse(() => level.number('best', BEST), 0),
      wins: orElse(() => level.number('wins', TIMES), 0),
    };
  }
  return { completed, levels };
}

/**
 * Persistence of the player's progress. Every value read from storage passes the door
 * field by field (see SaveSlot): a damaged, hand-edited or later save cannot crash the
 * game, and one the game cannot read is kept until the player's own progress replaces it.
 */
export class SaveManager extends EventEmitter {
  #slots;
  /** The game in progress, read at the door: the one found at start, then what the session saved. */
  #game;

  /** @param {import('./StorageService.js').StorageService} storage */
  constructor(storage) {
    super();
    this.storage = storage;
    this.#slots = {
      progress: new SaveSlot(storage, 'progress', SAVE_LIMITS.progress),
      settings: new SaveSlot(storage, 'settings', SAVE_LIMITS.settings),
      currentGame: new SaveSlot(storage, 'currentGame', SAVE_LIMITS.currentGame),
    };
    const progress = SaveManager.readProgress(this.#slots.progress.saved);
    // A progress of a version the game never wrote (a later one) is kept, like text that is not JSON.
    if (!progress && this.#slots.progress.saved) this.#slots.progress.keep();
    this.progress = progress ?? DEFAULT_PROGRESS();
    const settings = this.#slots.settings.saved;
    this.settings = settings ? SaveManager.readSettings(settings, DEFAULT_SETTINGS()) : DEFAULT_SETTINGS();
    const game = this.#slots.currentGame.saved;
    this.#game = game ? Game.readSnapshot(game) : null;
  }

  /**
   * Reads a stored progress field by field (version 2), or migrates version 1. A bad field
   * falls back to its default and the rest survives.
   * @param {InputRecord|null} saved
   * @returns {object|null} null when there is none, or when its version is not one the game wrote
   */
  static readProgress(saved) {
    if (!saved) return null;
    const version = orElse(() => saved.choice('version', [1, 2]), null);
    if (version === null) return null;
    const p = DEFAULT_PROGRESS();
    if (version === 1) {
      // Version 1 had 6 levels: keep how far the player went.
      p.campaigns.solo.completed = orElse(() => saved.number('completed', count(6)), 0);
      return p;
    }
    const campaigns = orElse(() => saved.record('campaigns'), null);
    for (const track of TRACKS) {
      const campaign = campaigns && orElse(() => campaigns.record(track), null);
      if (campaign) p.campaigns[track] = readCampaign(campaign);
    }
    p.crownsEarned = orElse(() => saved.number('crownsEarned', CROWNS), 0);
    p.crownsSpent = orElse(() => saved.number('crownsSpent', count(p.crownsEarned)), 0);
    p.crowns = p.crownsEarned - p.crownsSpent;
    const ranks = orElse(() => saved.record('ranks'), null);
    for (const u of ranks ? UpgradeCatalog.all() : []) {
      const rank = orElse(() => ranks.number(u.id, count(u.prices.length)), 0);
      if (rank) p.ranks[u.id] = rank;
    }
    const power = (value, field) => readChoice(value, POWER_IDS, field);
    p.loadout = [...orElse(() => saved.list('loadout', listOf(LIST_LIMITS.powers, power)), [])];
    p.episodes = [...orElse(() => saved.list('episodes', listOf(LIST_LIMITS.episodes, textItem(SAVE_ID))), [])];
    p.tutorials = [...orElse(() => saved.list('tutorials', listOf(LIST_LIMITS.tutorials, textItem(SAVE_ID))), [])];
    p.training = [...orElse(() => saved.list('training', listOf(LIST_LIMITS.training, textItem(LESSON_ID))), [])];
    const duel = orElse(() => saved.record('duel'), null);
    if (duel) {
      const wins = orElse(() => duel.list('wins', listOf(2, (value, field) => readNumber(value, TIMES, field))), []);
      p.duel = { played: orElse(() => duel.number('played', TIMES), 0), wins: [wins[0] ?? 0, wins[1] ?? 0] };
    }
    return p;
  }

  /**
   * Reads settings field by field: from a save, or from a change the interface asks for. A
   * field missing or refused keeps its value in `fallback`.
   * @param {InputRecord} saved
   * @param {object} fallback the settings in force (or the defaults)
   * @returns {object}
   */
  static readSettings(saved, fallback) {
    const s = { ...fallback, names: [...fallback.names] };
    const read = (key, reader) => {
      if (saved.has(key)) s[key] = orElse(reader, s[key]);
    };
    read('locale', () => (saved.isNull('locale') ? null : saved.choice('locale', LOCALES)));
    read('theme', () => saved.choice('theme', THEMES));
    read('difficulty', () => saved.choice('difficulty', DIFFICULTIES));
    read('music', () => saved.number('music', VOLUME));
    read('sfx', () => saved.number('sfx', VOLUME));
    for (const key of SWITCHES) read(key, () => saved.boolean(key));
    // Each name on its own: a bad one is left blank, the other stays.
    read('names', () => {
      const name = (value, field) => orElse(() => readText(value, PLAYER_NAME, field), '');
      const list = saved.list('names', listOf(2, name));
      return [list[0] ?? '', list[1] ?? ''];
    });
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

  // ------------------------------------------------------------ training
  /** Lessons already completed ('t1'…). */
  get training() {
    return this.progress.training;
  }

  /**
   * Records a completed lesson.
   * @param {string} id lesson id
   * @param {number} reward crowns given the first time
   * @returns {number} crowns earned now (0 if already done)
   */
  completeTraining(id, reward) {
    if (this.progress.training.includes(id)) return 0;
    this.progress.training.push(id);
    this.progress.crownsEarned += reward;
    this.progress.crowns += reward;
    this._persistProgress();
    return reward;
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

  /** What the game notes by itself (a story read, a tutorial seen): never over a progress it could not read. */
  markSeen(kind, id) {
    if (this.hasSeen(kind, id)) return;
    this.progress[kind].push(id);
    this.#slots.progress.note(this.progress);
    this.emit('progress', this.progress);
  }

  recordDuel(winner) {
    this.progress.duel.played += 1;
    if (winner === 1 || winner === 2) this.progress.duel.wins[winner - 1] += 1;
    this._persistProgress();
  }

  /** The player's own progress: written, over a progress that could not be read too. */
  _persistProgress() {
    this.#slots.progress.write(this.progress);
    this.emit('progress', this.progress);
  }

  // ------------------------------------------------------------ settings
  /**
   * The player changes settings: each field is read at the door (a field refused keeps its
   * value), then the settings are written, over settings that could not be read too.
   * @param {object} patch
   */
  updateSettings(patch) {
    this.#changeSettings(patch, true);
  }

  /**
   * The game notes a setting by itself (the portal's language): never over settings it could not read.
   * @param {object} patch
   */
  noteSettings(patch) {
    this.#changeSettings(patch, false);
  }

  #changeSettings(patch, chosen) {
    const read = orElse(() => SaveManager.readSettings(InputRecord.from(patch, 'settings'), this.settings), null);
    if (read) Object.assign(this.settings, read);
    if (chosen) this.#slots.settings.write(this.settings);
    else this.#slots.settings.note(this.settings);
    this.emit('settings', this.settings);
  }

  // ------------------------------------------------------------ game in progress
  /**
   * Saves the game in progress, if the game can read it back.
   * @param {object} snapshot output of Game#serialize() (+ track)
   * @returns {boolean} false if it was not saved (it would not read back, or is too long)
   */
  saveGame(snapshot) {
    const copy = JSON.parse(JSON.stringify(snapshot));
    const read = Game.readSnapshot(copy);
    if (!read || !this.#slots.currentGame.write(copy)) return false;
    this.#game = read;
    return true;
  }

  /** @returns {object|null} the game in progress, read at the door (frozen), or null */
  loadGame() {
    return this.#game;
  }

  clearGame() {
    this.#slots.currentGame.clear();
    this.#game = null;
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
