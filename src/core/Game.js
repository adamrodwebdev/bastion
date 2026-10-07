/**
 * @file Game session: rules, state machine, economy, statistics, save/restore.
 */

import { EventEmitter } from './utils/EventEmitter.js';
import { SeededRandom } from './utils/SeededRandom.js';
import { GameMap } from './world/GameMap.js';
import { WaveManager } from './systems/WaveManager.js';
import { PowerManager } from './powers/PowerManager.js';
import { TowerFactory } from './entities/towers/TowerFactory.js';
import { EnemyFactory } from './entities/enemies/EnemyFactory.js';
import { Effect } from './entities/Effect.js';
import { LevelCatalog } from './config/LevelCatalog.js';
import { Difficulty } from './config/Difficulty.js';
import { DAMAGE } from './config/damage.js';

/**
 * Bonuses coming from the workshop (see progression/UpgradeCatalog.js).
 * Multipliers default to 1, flat bonuses to 0.
 */
export const DEFAULT_MODS = Object.freeze({
  startGold: 0,
  lives: 0,
  physical: 1,
  magic: 1,
  fire: 1,
  splash: 1,
  soldierHp: 1,
  soldierDamage: 1,
  towerCost: 1,
  sellRatio: 0.7,
  powerCooldown: 1,
  income: 1,
  elite: [],
});

/** Extra enemy health when two players defend the same board together. */
export const COOP_HP = 1.45;

/** Colours of the players in two-player modes (also marked by a shape). */
export const PLAYER_COLORS = Object.freeze(['#3e8ed0', '#e0662a']);

/**
 * Game session: owns the world, the entities and the rules.
 * It has no knowledge of the DOM or of Vue — it only emits events, so it can
 * run in Node (see scripts/simulate.mjs) as well as in the browser.
 *
 * State machine:
 *   'prepare' (build before the first wave) → 'running' → 'won' | 'lost'
 *
 * Once a wave has finished spawning, the next one starts on its own after a
 * countdown (WAVE_GAP). Calling it earlier pays a gold bonus.
 *
 * Events: 'waveStart' {wave,total,early,bonus} · 'leak' {lives} · 'kill' (enemy)
 * · 'build' | 'upgrade' | 'sell' (tower) · 'power' {id,owner} · 'hit' {kind}
 * · 'won' | 'lost' {stars,score}
 */
export class Game extends EventEmitter {
  /** Bump when the save format changes: older saves are then ignored. */
  static SAVE_VERSION = 2;
  /** Seconds between the end of a wave's spawns and the next wave. */
  static WAVE_GAP = 15;
  /** Gold per second skipped when calling a wave early. */
  static EARLY_BONUS = 1.5;

  /**
   * @param {object} o
   * @param {import('./config/Level.js').Level} o.level
   * @param {Difficulty} o.difficulty
   * @param {string[]} [o.loadout] powers taken into the level
   * @param {Partial<typeof DEFAULT_MODS>} [o.mods] workshop bonuses
   * @param {number} [o.players] 1, or 2 for cooperation
   * @param {number} [o.hpMult] extra enemy health (cooperation)
   * @param {boolean} [o.endless] endless waves (duel)
   * @param {(index:number)=>Array<object>} [o.extraWave] waves after the level's list (endless)
   * @param {string|number} [o.seed]
   */
  constructor({ level, difficulty, loadout = [], mods = {}, players = 1, hpMult = 1, endless = false, extraWave = null, seed }) {
    super();
    this.level = level;
    this.difficulty = difficulty;
    this.mods = { ...DEFAULT_MODS, ...mods };
    this.eliteSet = new Set(this.mods.elite);
    this.hpMult = hpMult;
    this.map = new GameMap(level.mapConfig);
    this.waves = new WaveManager(level, { endless, extraWave });
    this.powers = new PowerManager(loadout);
    this.rng = new SeededRandom(seed ?? `game-${level.number}`);

    const startGold = Math.round(level.startGold * difficulty.goldMult + this.mods.startGold);
    this.playerCount = players;
    this.players = Array.from({ length: players }, (_, i) => ({
      id: i + 1,
      gold: players === 1 ? startGold : Math.round(startGold * 0.6),
      earned: 0,
      kills: 0,
    }));
    this.maxLives = difficulty.lives + this.mods.lives;
    this.lives = this.maxLives;
    this.score = 0;
    this.state = 'prepare';
    this.paused = false;
    this.time = 0;
    this.countdown = null;
    this.shakeTimer = 0;
    this.powerOwner = 1;

    this.enemies = [];
    this.towers = [];
    this.soldiers = [];
    this.projectiles = [];
    this.effects = [];
    this.zones = [];

    this.stats = Game.emptyStats();
    this._recentKills = [];
  }

  /** Statistics gathered during a level (achievements, end screen). */
  static emptyStats() {
    return {
      kills: 0,
      leaks: 0,
      livesLost: 0,
      towersBuilt: 0,
      maxTowers: 0,
      towerTypes: [],
      sold: 0,
      upgrades: 0,
      maxTowerLevel: 0,
      earlyCalls: 0,
      earlyBonus: 0,
      goldEarned: 0,
      goldSpent: 0,
      blocks: 0,
      flyersKilled: 0,
      stealthKilled: 0,
      flyerLeaks: 0,
      stealthLeaks: 0,
      bossKills: 0,
      bossFurthest: 0,
      maxProgress: 0,
      maxBurst: 0,
      killsByCause: {},
      killsByTower: {},
    };
  }

  // ---------------------------------------------------------------- getters
  /** Gold of player 1 (single player). */
  get gold() {
    return this.players[0].gold;
  }

  set gold(v) {
    this.players[0].gold = v;
  }

  get isOver() {
    return this.state === 'won' || this.state === 'lost';
  }

  /** Can the next wave be launched now (by the player)? */
  get canStartWave() {
    if (this.isOver || !this.waves.hasMoreWaves) return false;
    return this.state === 'prepare' || !this.waves.currentWaveSpawning;
  }

  /** Gold the player would get by calling the next wave now. */
  get earlyBonus() {
    return this.state === 'running' && this.countdown !== null ? Math.round(this.countdown * Game.EARLY_BONUS) : 0;
  }

  /** Strength of powers, following the level so they stay useful. */
  get powerScale() {
    return this.level.hpScale * this.difficulty.hpMult * this.hpMult;
  }

  /**
   * Rating of a won level: 3 stars ≥ 90 % lives left, 2 stars ≥ 50 %, otherwise 1.
   * @returns {0|1|2|3}
   */
  get stars() {
    if (this.state !== 'won') return 0;
    const ratio = this.lives / this.maxLives;
    return ratio >= 0.9 ? 3 : ratio >= 0.5 ? 2 : 1;
  }

  player(id = 1) {
    return this.players[Math.max(0, Math.min(this.players.length - 1, id - 1))];
  }

  /** Seeded random number in [0, 1): keeps simulations reproducible. */
  random() {
    return this.rng.next();
  }

  // ---------------------------------------------------------------- modifiers
  /**
   * Workshop bonus or active power effect.
   * @param {string} name e.g. 'splash', 'soldierHp', 'income', 'reward', 'powerCooldown'
   */
  modifier(name) {
    if (name === 'reward') return this.powers.modifier('reward');
    const v = this.mods[name];
    return typeof v === 'number' ? v : 1;
  }

  /** Damage multiplier of a damage type (workshop). */
  // eslint-disable-next-line no-unused-vars
  damageModifier(dtype, tower) {
    if (dtype === DAMAGE.PHYSICAL) return this.mods.physical;
    if (dtype === DAMAGE.MAGIC) return this.mods.magic;
    if (dtype === DAMAGE.FIRE) return this.mods.fire;
    return 1;
  }

  // eslint-disable-next-line no-unused-vars
  towerRateModifier(tower) {
    return this.powers.modifier('towerFireRate');
  }

  enemySpeedModifier(enemy) {
    const m = this.powers.modifier('enemySpeed');
    return m === 0 && enemy.boss ? 0.5 : m;
  }

  // ---------------------------------------------------------------- economy
  earn(owner, amount, reason = 'kill') {
    if (amount <= 0) return;
    if (owner === null || owner === undefined) {
      // Shared income (wave bonus): split between players.
      const share = Math.round(amount / this.players.length);
      for (const p of this.players) {
        p.gold += share;
        p.earned += share;
      }
    } else {
      const p = this.player(owner);
      p.gold += amount;
      p.earned += amount;
    }
    this.stats.goldEarned += amount;
    if (reason === 'early') this.stats.earlyBonus += amount;
  }

  _spend(owner, amount) {
    const p = this.player(owner);
    if (p.gold < amount) return false;
    p.gold -= amount;
    this.stats.goldSpent += amount;
    return true;
  }

  /** Price of a tower type for this session (workshop discount). */
  priceOf(type) {
    const T = TowerFactory.get(type);
    return T ? Math.round(T.cost * this.mods.towerCost) : Infinity;
  }

  canAfford(type, owner = 1) {
    return this.player(owner).gold >= this.priceOf(type);
  }

  isTowerAllowed(type) {
    return this.level.towers.includes(type);
  }

  sellValue(tower) {
    return Math.floor(tower.invested * this.mods.sellRatio);
  }

  // ---------------------------------------------------------------- actions
  /**
   * Launches the next wave. During the countdown, calling it early pays a bonus.
   * @returns {boolean}
   */
  startWave() {
    if (!this.canStartWave) return false;
    const bonus = this.earlyBonus;
    if (bonus > 0) {
      this.earn(null, bonus, 'early');
      this.stats.earlyCalls += 1;
    }
    this._launchWave(bonus > 0, bonus);
    return true;
  }

  _launchWave(early, bonus) {
    this.waves.startNext();
    this.state = 'running';
    this.countdown = null;
    for (const t of this.towers) t.onWaveStart(this);
    this.emit('waveStart', { wave: this.waves.current, total: this.waves.total, early, bonus });
  }

  /**
   * Builds a tower on a free cell and pays for it.
   * @returns {import('./entities/towers/Tower.js').Tower|null}
   */
  buildTower(type, col, row, owner = 1) {
    const T = TowerFactory.get(type);
    if (!T || this.isOver || !this.isTowerAllowed(type) || !this.map.isBuildable(col, row)) return null;
    const price = this.priceOf(type);
    if (!this._spend(owner, price)) return null;
    const tower = TowerFactory.create(type, col, row, { owner, eliteUnlocked: this.eliteSet.has(type), priceFactor: this.mods.towerCost });
    this.towers.push(tower);
    this.map.place(tower);
    tower.onPlaced(this);
    const s = this.stats;
    s.towersBuilt += 1;
    s.maxTowers = Math.max(s.maxTowers, this.towers.length);
    if (!s.towerTypes.includes(type)) s.towerTypes.push(type);
    s.maxTowerLevel = Math.max(s.maxTowerLevel, 1);
    this.addEffect(new Effect('ring', { x: tower.x, y: tower.y, radius: 0.7, color: T.color, ttl: 0.3 }));
    this.emit('build', tower);
    return tower;
  }

  /** Upgrades a tower (only its owner may do it in cooperation). */
  upgradeTower(tower, owner = tower.owner) {
    if (this.isOver || !tower.canUpgrade || tower.owner !== owner) return false;
    if (!this._spend(owner, tower.upgradePrice)) return false;
    tower.upgrade();
    tower.onUpgraded(this);
    this.stats.upgrades += 1;
    this.stats.maxTowerLevel = Math.max(this.stats.maxTowerLevel, tower.level);
    this.addEffect(new Effect('ring', { x: tower.x, y: tower.y, radius: 0.8, color: '#ffd166', ttl: 0.35 }));
    this.emit('upgrade', tower);
    return true;
  }

  /** Sells a tower and refunds part of everything spent on it. */
  sellTower(tower, owner = tower.owner) {
    if (this.isOver || tower.owner !== owner) return false;
    const value = this.sellValue(tower);
    const p = this.player(owner);
    p.gold += value;
    tower.onRemoved(this);
    this.addEffect(new Effect('text', { x: tower.x, y: tower.y, text: `+${value}`, color: '#ffd166', ttl: 0.8 }));
    this.towers = this.towers.filter((t) => t !== tower);
    this.map.remove(tower);
    this.stats.sold += 1;
    this.emit('sell', tower);
    return true;
  }

  /**
   * Triggers a special power (only once the first wave has started).
   * @param {string} id
   * @param {{x:number,y:number}|null} [target] position for targeted powers
   * @param {number} [owner]
   */
  activatePower(id, target = null, owner = 1) {
    if (this.state !== 'running' || this.paused) return false;
    this.powerOwner = owner;
    const ok = this.powers.activate(id, this, target);
    if (ok) this.emit('power', { id, owner });
    return ok;
  }

  // ---------------------------------------------------------------- hooks used by entities
  addProjectile(p) {
    this.projectiles.push(p);
  }

  /** Adds a purely visual effect. Capped to protect low-end phones. */
  addEffect(e) {
    if (this.effects.length < 180) this.effects.push(e);
  }

  addSoldier(s) {
    this.soldiers.push(s);
  }

  /** Removes soldiers of a sold barracks. */
  compactSoldiers() {
    this.soldiers = this.soldiers.filter((s) => !s.removed);
  }

  /** Burning area on the ground (greek fire). */
  addFireZone({ x, y, radius, dps, duration, source = null, owner = null, cause = 'burn' }) {
    this.zones.push({ x, y, radius, dps, ttl: duration, source, owner, cause, alive: true });
    this.addEffect(new Effect('zone', { x, y, radius, color: '#ff7b1c', ttl: duration }));
  }

  /** Brings lives back (never above the maximum). */
  restoreLives(n) {
    const before = this.lives;
    this.lives = Math.min(this.maxLives, this.lives + n);
    if (this.lives > before) this.emit('heal', { lives: this.lives });
  }

  /** Screen shake (seconds). */
  shake(t) {
    this.shakeTimer = Math.max(this.shakeTimer, t);
  }

  /**
   * Spawns an enemy on a road (or its flight lane).
   * @param {string} type
   * @param {{pathIndex?:number, distance?:number, scaling?:object, air?:boolean, summoned?:boolean}} [o]
   */
  spawnEnemy(type, { pathIndex = 0, distance = 0, scaling = null, air = null, summoned = false } = {}) {
    const C = EnemyFactory.get(type);
    if (!C) return null;
    const flying = air ?? C.stats.flying;
    const i = Math.max(0, Math.min(this.map.paths.length - 1, pathIndex));
    const path = flying ? this.map.airPaths[i] : this.map.paths[i];
    const e = EnemyFactory.create(type, path, scaling || this.scalingFor(Math.max(0, this.waves.waveIndex)), { pathIndex: i, distance });
    e.summoned = summoned;
    this.enemies.push(e);
    return e;
  }

  /** Enemy stats multipliers for a wave. */
  scalingFor(waveIndex) {
    const d = this.difficulty;
    return {
      hpMult: this.level.waveHpScale(waveIndex) * d.hpMult * this.hpMult,
      speedMult: d.speedMult,
      rewardMult: this.level.rewardMult * d.rewardMult,
    };
  }

  /**
   * Single entry point for damage: applies it, credits the attacker and
   * handles the kill.
   * @param {import('./entities/enemies/Enemy.js').Enemy} enemy
   * @param {number} amount raw damage
   * @param {string} dtype one of DAMAGE
   * @param {{pierce?:boolean, source?:object|null, owner?:number|null, cause?:string}} [o]
   */
  damageEnemy(enemy, amount, dtype = DAMAGE.PHYSICAL, { pierce = false, source = null, owner = null, cause = 'other' } = {}) {
    if (!enemy.alive) return 0;
    const dealt = enemy.takeDamage(amount, dtype, { pierce });
    if (source && 'damageDealt' in source) source.damageDealt += dealt;
    enemy.lastOwner = owner ?? source?.owner ?? (cause.startsWith('power:') ? this.powerOwner : null);
    if (!enemy.alive) this._onKill(enemy, source, cause);
    return dealt;
  }

  /**
   * Called by projectiles and instant attacks when they hit.
   * @param {{damage:number, dtype?:string, splash?:number, slow?:{factor:number,duration:number},
   *   stun?:number, burn?:{dps:number,duration:number}, fireZone?:object, pierce?:boolean,
   *   crit?:boolean, source?:object|null, owner?:number|null, cause?:string}} payload
   * @param {number} x impact position (tiles)
   * @param {number} y impact position (tiles)
   * @param {import('./entities/enemies/Enemy.js').Enemy|null} target
   */
  resolveHit(payload, x, y, target) {
    const { damage, dtype = DAMAGE.PHYSICAL, splash = 0, slow, stun, burn, fireZone, pierce = false, crit = false, source = null, owner = null, cause = 'other' } = payload;
    const opts = { pierce, source, owner, cause };
    const hitsAir = !source || source.constructor.targets !== 'ground';
    const apply = (e) => {
      if (slow) e.applySlow(slow.factor, slow.duration);
      if (stun) e.applyStun(stun);
      if (burn) e.applyBurn(burn.dps, burn.duration, source);
      this.damageEnemy(e, damage, dtype, opts);
    };
    if (splash > 0) {
      const r2 = splash * splash;
      this.addEffect(new Effect('ring', { x, y, radius: splash, color: source ? source.constructor.color : '#fff', ttl: 0.3 }));
      for (const e of this.enemies) {
        if (!e.alive || (e.flying && !hitsAir)) continue;
        if ((e.x - x) ** 2 + (e.y - y) ** 2 <= r2) apply(e);
      }
    } else if (target && target.alive) {
      apply(target);
    }
    if (fireZone) this.addFireZone({ x, y, ...fireZone, source, owner, cause });
    if (crit) this.addEffect(new Effect('text', { x, y: y - 0.3, text: '!', color: '#ffd166', ttl: 0.5 }));
    this.emit('hit', { kind: source ? source.type : 'power', x, y, splash, dtype, target, cause });
  }

  _onKill(enemy, source, cause) {
    const reward = Math.round(enemy.reward * this.powers.modifier('reward'));
    const owner = enemy.lastOwner;
    this.earn(owner, reward, 'kill');
    if (owner) this.player(owner).kills += 1;
    const s = this.stats;
    s.kills += 1;
    s.killsByCause[cause] = (s.killsByCause[cause] || 0) + 1;
    if (source && source.type) {
      source.kills += 1;
      s.killsByTower[source.type] = (s.killsByTower[source.type] || 0) + 1;
    }
    if (enemy.flying) s.flyersKilled += 1;
    if (enemy.stealth) s.stealthKilled += 1;
    if (enemy.boss) {
      s.bossKills += 1;
      s.bossFurthest = Math.max(s.bossFurthest, enemy.progress);
    }
    this.score += Math.round(reward * 10 * this.difficulty.scoreMult);
    this._recentKills.push(this.time);
    while (this._recentKills.length && this._recentKills[0] < this.time - 2) this._recentKills.shift();
    s.maxBurst = Math.max(s.maxBurst, this._recentKills.length);
    enemy.killCause = cause;
    enemy.onDeath(this);
    this.addEffect(new Effect('spark', { x: enemy.x, y: enemy.y, radius: enemy.radius * 2.2, color: enemy.color, ttl: 0.35 }));
    this.addEffect(new Effect('text', { x: enemy.x, y: enemy.y - 0.2, text: `+${reward}`, color: '#ffd166', ttl: 0.7 }));
    this.emit('kill', enemy);
  }

  _onLeak(enemy) {
    const lost = Math.min(this.lives, enemy.lives);
    this.lives -= lost;
    this.stats.leaks += 1;
    this.stats.livesLost += lost;
    if (enemy.flying) this.stats.flyerLeaks += 1;
    if (enemy.stealth) this.stats.stealthLeaks += 1;
    if (enemy.boss) this.stats.bossFurthest = 1;
    this.shake(0.25);
    this.emit('leak', { lives: this.lives, lost });
    if (this.lives <= 0) this._finish(false);
  }

  _finish(won) {
    if (this.isOver) return;
    this.state = won ? 'won' : 'lost';
    this.countdown = null;
    if (won) this.score += Math.round(this.lives * 100 * this.difficulty.scoreMult);
    this.emit(won ? 'won' : 'lost', { stars: this.stars, score: this.score });
  }

  // ---------------------------------------------------------------- simulation
  /**
   * Advances the simulation by one fixed step.
   * Order: countdown → spawns → powers → auras & vision → enemies move →
   * soldiers fight → towers shoot → projectiles hit → fire zones → leaks →
   * cleanup → end of level.
   * @param {number} dt step duration in seconds (1/60 with GameLoop)
   */
  update(dt) {
    if (this.paused || this.isOver) return;
    this.time += dt;
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.state === 'prepare') {
      for (const fx of this.effects) fx.update(dt);
      Game._compact(this.effects);
      return;
    }

    // Countdown to the next wave once the current one has finished spawning.
    if (this.waves.hasMoreWaves && !this.waves.currentWaveSpawning) {
      if (this.countdown === null) this.countdown = Game.WAVE_GAP;
      this.countdown -= dt;
      if (this.countdown <= 0) this._launchWave(false, 0);
    }

    for (const order of this.waves.update(dt)) {
      this.spawnEnemy(order.type, { pathIndex: order.path, air: order.air, scaling: this.scalingFor(order.wave) });
    }

    this.powers.update(dt, this);
    this._vision();

    for (const e of this.enemies) if (e.alive) e.update(dt, this);
    for (const s of this.soldiers) s.update(dt, this);
    for (const t of this.towers) t.update(dt, this);
    for (const p of this.projectiles) if (p.alive) p.update(dt, this);
    this._updateZones(dt);
    for (const fx of this.effects) fx.update(dt);

    for (const e of this.enemies) {
      if (e.reachedEnd && !e._leakHandled) {
        e._leakHandled = true;
        if (e.blockedBy) e.blockedBy.release();
        this._onLeak(e);
      }
      if (e.alive && !e.flying) this.stats.maxProgress = Math.max(this.stats.maxProgress, e.progress);
    }

    // In-place compaction (no new arrays every frame → less GC pressure).
    Game._compact(this.enemies);
    Game._compact(this.projectiles);
    Game._compact(this.effects);
    Game._compact(this.zones);
    if (this.soldiers.some((s) => s.expired)) this.soldiers = this.soldiers.filter((s) => !s.expired);

    if (this.state === 'running' && !this.waves.hasMoreWaves && !this.waves.spawning && this.enemies.length === 0 && !this.isOver) {
      this._finish(true);
    }
  }

  /** Auras, watchtower vision and range bonuses (reset every step). */
  _vision() {
    for (const e of this.enemies) {
      e.speedBoost = 1;
      e.auraResist = 0;
      e.revealed = !e.stealth || Boolean(e.blockedBy) || e.hitFlash > 0;
    }
    for (const t of this.towers) {
      t.rangeBuff = 0;
      t.critChance = 0;
    }
    for (const w of this.towers) {
      if (w.type !== 'watch') continue;
      const r2 = w.range * w.range;
      for (const e of this.enemies) if ((e.x - w.x) ** 2 + (e.y - w.y) ** 2 <= r2) e.revealed = true;
      for (const t of this.towers) {
        if (t === w || (t.x - w.x) ** 2 + (t.y - w.y) ** 2 > r2) continue;
        t.rangeBuff = Math.max(t.rangeBuff, w.stats.rangeBuff);
        if (w.stats.crit) t.critChance = Math.max(t.critChance, w.stats.crit);
      }
    }
    for (const e of this.enemies) if (e.alive) e.applyAuras(this);
  }

  _updateZones(dt) {
    for (const z of this.zones) {
      z.ttl -= dt;
      if (z.ttl <= 0) {
        z.alive = false;
        continue;
      }
      const r2 = z.radius * z.radius;
      for (const e of this.enemies) {
        if (!e.alive || e.flying) continue;
        if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 <= r2) this.damageEnemy(e, z.dps * dt, DAMAGE.FIRE, { source: z.source, owner: z.owner, cause: z.cause });
      }
    }
  }

  /** Removes dead entities in place. */
  static _compact(arr) {
    let j = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i].alive) arr[j++] = arr[i];
    arr.length = j;
  }

  /**
   * Second chance after a defeat (rewarded video on portals): the level goes
   * on with a few lives, and enemies close to the exit are pushed back.
   * @param {number} lives
   * @returns {boolean}
   */
  revive(lives = 5) {
    if (this.state !== 'lost') return false;
    this.lives = Math.min(this.maxLives, lives);
    this.state = 'running';
    this.revived = true;
    for (const e of this.enemies) {
      if (e.alive && e.progress > 0.75) {
        e.distance = e.path.length * 0.5;
        const p = e.path.pointAt(e.distance);
        e.x = p.x;
        e.y = p.y;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- duel
  /**
   * Sends extra enemies onto this board (duel: bought by the opponent).
   * @param {string} type
   * @param {number} count
   */
  inject(type, count = 1) {
    const roads = this.map.paths.length;
    for (let i = 0; i < count; i++) {
      const e = this.spawnEnemy(type, { pathIndex: i % roads, distance: -0.5 * i });
      if (e) e.sent = true;
    }
  }

  // ---------------------------------------------------------------- save / load
  /**
   * Plain JSON snapshot of the whole session, stored by SaveManager.
   * Projectiles, effects and burning areas are not saved (they last seconds).
   */
  serialize() {
    return {
      version: Game.SAVE_VERSION,
      savedAt: Date.now(),
      levelNumber: this.level.number,
      difficulty: this.difficulty.id,
      loadout: this.powers.powers.map((p) => p.id),
      mods: this.mods,
      hpMult: this.hpMult,
      players: this.players,
      lives: this.lives,
      maxLives: this.maxLives,
      score: this.score,
      state: this.state,
      time: this.time,
      countdown: this.countdown,
      waves: this.waves.serialize(),
      powers: this.powers.serialize(),
      towers: this.towers.map((t) => t.serialize()),
      enemies: this.enemies.filter((e) => e.alive).map((e) => e.serialize()),
      stats: this.stats,
    };
  }

  /**
   * Rebuilds a running game from a snapshot produced by `serialize()`.
   * @returns {Game|null} null if the snapshot is missing, from another version or invalid
   */
  static restore(data) {
    try {
      if (!data || data.version !== Game.SAVE_VERSION) return null;
      const level = LevelCatalog.byNumber(data.levelNumber);
      if (!level) return null;
      const game = new Game({
        level,
        difficulty: Difficulty.get(data.difficulty),
        loadout: data.loadout,
        mods: data.mods,
        players: data.players.length,
        hpMult: data.hpMult || 1,
      });
      data.players.forEach((p, i) => Object.assign(game.players[i], p));
      game.lives = data.lives;
      game.maxLives = data.maxLives;
      game.score = data.score;
      game.state = data.state === 'running' ? 'running' : 'prepare';
      game.time = data.time || 0;
      game.countdown = data.countdown ?? null;
      game.waves.restore(data.waves);
      game.powers.restore(data.powers);
      game.stats = { ...Game.emptyStats(), ...data.stats };
      for (const t of data.towers) {
        const tower = TowerFactory.create(t.type, t.col, t.row, { owner: t.owner || 1, eliteUnlocked: game.eliteSet.has(t.type), priceFactor: game.mods.towerCost }).restore(t);
        game.towers.push(tower);
        game.map.place(tower);
        tower.onPlaced(game);
      }
      for (const e of data.enemies) {
        const paths = e.air ? game.map.airPaths : game.map.paths;
        const path = paths[Math.min(paths.length - 1, e.pathIndex || 0)];
        game.enemies.push(EnemyFactory.create(e.type, path, {}, { pathIndex: e.pathIndex || 0 }).restore(e));
      }
      return game;
    } catch {
      return null;
    }
  }
}
