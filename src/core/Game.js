/**
 * @file Game session: rules, state machine, save/restore.
 */

import { EventEmitter } from './utils/EventEmitter.js';
import { GameMap } from './world/GameMap.js';
import { WaveManager } from './systems/WaveManager.js';
import { PowerManager } from './powers/PowerManager.js';
import { TowerFactory } from './entities/towers/TowerFactory.js';
import { EnemyFactory } from './entities/enemies/EnemyFactory.js';
import { Effect } from './entities/Effect.js';
import { LevelCatalog } from './config/LevelCatalog.js';
import { Difficulty } from './config/Difficulty.js';

/**
 * Game session: owns the world, the entities and the rules.
 * It has no knowledge of the DOM or of Vue — it only emits events,
 * so it can run in Node (see scripts/simulate.mjs) as well as in the browser.
 *
 * State machine:
 *   'building' (between waves) → 'wave' → 'building' → … → 'won' | 'lost'
 *
 * Events emitted:
 *   - 'waveStart' { wave, total }   a wave has just started
 *   - 'waveEnd'   { wave, bonus }   all enemies of the wave are gone
 *   - 'leak'      { lives }         an enemy reached the exit
 *   - 'build' | 'upgrade' | 'sell'  (tower)
 *   - 'power'     (powerId)         a special power was activated
 *   - 'won' | 'lost' { stars, score }
 *
 * @example
 * const game = new Game({ level: LevelCatalog.get(0), difficulty: Difficulty.NORMAL });
 * game.buildTower('arrow', 3, 4);
 * game.startWave();
 * game.update(1 / 60); // called by GameLoop at 60 Hz
 */
export class Game extends EventEmitter {
  /** Bump when the save format changes: older saves are then ignored instead of crashing. */
  static SAVE_VERSION = 1;

  /**
   * @param {object} o
   * @param {import('./config/Level.js').Level} o.level
   * @param {Difficulty} o.difficulty
   * @param {string[]} [o.unlockedPowers] ids of the powers the player has unlocked
   */
  constructor({ level, difficulty, unlockedPowers = [] }) {
    super();
    this.level = level;
    this.difficulty = difficulty;
    this.map = new GameMap(level);
    this.waves = new WaveManager(level, difficulty);
    this.powers = new PowerManager(unlockedPowers);
    this.gold = Math.round(level.startGold * difficulty.goldMult);
    this.maxLives = difficulty.lives;
    this.lives = this.maxLives;
    this.score = 0;
    this.kills = 0;
    this.state = 'building';
    this.paused = false;
    this.time = 0;
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.effects = [];
  }

  // ---------------------------------------------------------------- getters
  /** @returns {boolean} true once the level is won or lost. */
  get isOver() {
    return this.state === 'won' || this.state === 'lost';
  }

  /** @returns {boolean} true when the player may launch the next wave. */
  get canStartWave() {
    return this.state === 'building' && this.waves.hasMoreWaves;
  }

  /**
   * Rating of a won level: 3 stars ≥ 90 % lives left, 2 stars ≥ 50 %, otherwise 1.
   * @returns {0|1|2|3} 0 while the level is not won
   */
  get stars() {
    if (this.state !== 'won') return 0;
    const ratio = this.lives / this.maxLives;
    return ratio >= 0.9 ? 3 : ratio >= 0.5 ? 2 : 1;
  }

  // ---------------------------------------------------------------- actions
  /**
   * Launches the next wave.
   * @returns {boolean} false if a wave is already running or none is left
   */
  startWave() {
    if (!this.canStartWave) return false;
    this.waves.startNext();
    this.state = 'wave';
    this.emit('waveStart', { wave: this.waves.current, total: this.waves.total });
    return true;
  }

  /**
   * @param {string} type tower type ('arrow', 'cannon', …)
   * @returns {boolean} true if the player has enough gold to build it
   */
  canAfford(type) {
    const T = TowerFactory.get(type);
    return !!T && this.gold >= T.cost;
  }

  /**
   * Builds a tower on a grid cell and pays for it.
   * @param {string} type tower type ('arrow', 'cannon', 'frost', 'laser')
   * @param {number} col grid column
   * @param {number} row grid row
   * @returns {import('./entities/towers/Tower.js').Tower|null} the tower, or null if the
   *   cell is not buildable, the type is unknown or the player cannot afford it
   */
  buildTower(type, col, row) {
    const T = TowerFactory.get(type);
    if (!T || this.isOver || !this.map.isBuildable(col, row) || this.gold < T.cost) return null;
    const tower = TowerFactory.create(type, col, row);
    this.gold -= T.cost;
    this.towers.push(tower);
    this.map.place(tower);
    this.addEffect(new Effect('ring', { x: tower.x, y: tower.y, radius: 0.7, color: T.color, ttl: 0.3 }));
    this.emit('build', tower);
    return tower;
  }

  /**
   * Upgrades a tower to its next level and pays for it.
   * @param {import('./entities/towers/Tower.js').Tower} tower
   * @returns {boolean} false if already at max level or not enough gold
   */
  upgradeTower(tower) {
    if (!tower.canUpgrade || this.gold < tower.upgradePrice || this.isOver) return false;
    this.gold -= tower.upgradePrice;
    tower.upgrade();
    this.addEffect(new Effect('ring', { x: tower.x, y: tower.y, radius: 0.8, color: '#ffd166', ttl: 0.35 }));
    this.emit('upgrade', tower);
    return true;
  }

  /**
   * Removes a tower and refunds 70 % of everything spent on it.
   * @param {import('./entities/towers/Tower.js').Tower} tower
   * @returns {boolean}
   */
  sellTower(tower) {
    if (this.isOver) return false;
    this.gold += tower.sellValue;
    this.addEffect(new Effect('text', { x: tower.x, y: tower.y, text: `+${tower.sellValue}`, color: '#ffd166', ttl: 0.8 }));
    this.towers = this.towers.filter((t) => t !== tower);
    this.map.remove(tower);
    this.emit('sell', tower);
    return true;
  }

  /**
   * Triggers a special power. Only allowed while a wave is running.
   * @param {string} id power id ('freeze', 'meteor', 'goldRush', 'overclock')
   * @returns {boolean} false if the power is locked, cooling down or out of a wave
   */
  activatePower(id) {
    if (this.state !== 'wave' || this.paused) return false;
    const ok = this.powers.activate(id, this);
    if (ok) this.emit('power', id);
    return ok;
  }

  // ---------------------------------------------------------------- hooks used by entities
  /** @param {import('./entities/Projectile.js').Projectile} p */
  addProjectile(p) {
    this.projectiles.push(p);
  }

  /**
   * Adds a purely visual effect. Capped at 160 to protect low-end phones.
   * @param {Effect} e
   */
  addEffect(e) {
    if (this.effects.length < 160) this.effects.push(e);
  }

  /**
   * Called by projectiles and instant towers (laser) when they hit.
   * Applies splash damage around (x, y) or single-target damage to `target`.
   * @param {{damage:number, splash?:number, slow?:{factor:number,duration:number}, pierce?:boolean, source?:object|null}} payload
   * @param {number} x impact position (tiles)
   * @param {number} y impact position (tiles)
   * @param {import('./entities/enemies/Enemy.js').Enemy|null} target
   */
  resolveHit(payload, x, y, target) {
    const { damage, splash = 0, slow, pierce = false, source = null } = payload;
    if (splash > 0) {
      const r2 = splash * splash;
      this.addEffect(new Effect('ring', { x, y, radius: splash, color: source ? source.constructor.color : '#fff', ttl: 0.3 }));
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const dx = e.x - x;
        const dy = e.y - y;
        if (dx * dx + dy * dy <= r2) {
          if (slow) e.applySlow(slow.factor, slow.duration);
          this.damageEnemy(e, damage, { pierce }, source);
        }
      }
    } else if (target && target.alive) {
      if (slow) target.applySlow(slow.factor, slow.duration);
      this.damageEnemy(target, damage, { pierce }, source);
    }
  }

  /**
   * Deals damage and handles the reward if the enemy dies.
   * Single entry point for damage, so kills are always counted the same way.
   * @param {import('./entities/enemies/Enemy.js').Enemy} enemy
   * @param {number} amount
   * @param {{pierce?:boolean}} opts pierce = ignore armor
   * @param {object|null} source tower that dealt the damage (for its kill counter)
   */
  damageEnemy(enemy, amount, opts, source) {
    if (!enemy.alive) return;
    enemy.takeDamage(amount, opts);
    if (!enemy.alive) this._onKill(enemy, source);
  }

  /** @private Rewards gold and score for a kill. */
  _onKill(enemy, source) {
    const reward = Math.round(enemy.reward * this.powers.modifier('reward'));
    this.gold += reward;
    this.kills += 1;
    this.score += Math.round(reward * 10 * this.difficulty.scoreMult);
    if (source) source.kills += 1;
    this.addEffect(new Effect('spark', { x: enemy.x, y: enemy.y, radius: enemy.radius * 2.2, color: enemy.color, ttl: 0.35 }));
    this.addEffect(new Effect('text', { x: enemy.x, y: enemy.y - 0.2, text: `+${reward}`, color: '#ffd166', ttl: 0.7 }));
  }

  /** @private An enemy reached the exit: it costs `enemy.damage` lives. */
  _onLeak(enemy) {
    this.lives = Math.max(0, this.lives - enemy.damage);
    this.emit('leak', { lives: this.lives });
    if (this.lives <= 0) this._finish(false);
  }

  /** @private Ends the level once; remaining lives give a score bonus. */
  _finish(won) {
    if (this.isOver) return;
    this.state = won ? 'won' : 'lost';
    if (won) this.score += Math.round(this.lives * 100 * this.difficulty.scoreMult);
    this.emit(won ? 'won' : 'lost', { stars: this.stars, score: this.score });
  }

  // ---------------------------------------------------------------- simulation
  /**
   * Advances the simulation by one fixed step.
   * Order matters: spawn → powers → enemies move → towers shoot → projectiles hit
   * → leaks → cleanup → end-of-wave check.
   * @param {number} dt step duration in seconds (1/60 with GameLoop)
   */
  update(dt) {
    if (this.paused || this.isOver) return;
    this.time += dt;

    for (const e of this.waves.update(dt, this.map.path)) this.enemies.push(e);

    this.powers.update(dt, this);
    for (const e of this.enemies) if (e.alive) e.update(dt, this);
    for (const t of this.towers) t.update(dt, this);
    for (const p of this.projectiles) if (p.alive) p.update(dt, this);
    for (const fx of this.effects) fx.update(dt);

    // Leaks are detected after movement.
    for (const e of this.enemies) {
      if (e.reachedEnd && !e._leakHandled) {
        e._leakHandled = true;
        this._onLeak(e);
      }
    }

    // In-place compaction (no new arrays every frame → less GC pressure).
    Game._compact(this.enemies);
    Game._compact(this.projectiles);
    Game._compact(this.effects);

    if (this.state === 'wave' && !this.waves.spawning && this.enemies.length === 0 && !this.isOver) {
      this._endWave();
    }
  }

  /** @private Pays the end-of-wave bonus, then wins the level or goes back to building. */
  _endWave() {
    const bonus = 20 + this.waves.current * 5;
    this.gold += bonus;
    if (!this.waves.hasMoreWaves) {
      this._finish(true);
      return;
    }
    this.state = 'building';
    this.projectiles.length = 0;
    this.emit('waveEnd', { wave: this.waves.current, bonus });
  }

  /**
   * @private Removes dead entities in place (no new array each frame → less garbage collection).
   * @param {{alive:boolean}[]} arr
   */
  static _compact(arr) {
    let j = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i].alive) arr[j++] = arr[i];
    arr.length = j;
  }

  // ---------------------------------------------------------------- save / load
  /**
   * Plain JSON snapshot of the whole session, stored in localStorage by SaveManager.
   * Projectiles and effects are not saved (they last less than a second).
   * @returns {object}
   */
  serialize() {
    return {
      version: Game.SAVE_VERSION,
      savedAt: Date.now(),
      levelIndex: this.level.index,
      difficulty: this.difficulty.id,
      unlockedPowers: this.powers.powers.map((p) => p.id),
      gold: this.gold,
      lives: this.lives,
      score: this.score,
      kills: this.kills,
      state: this.state,
      time: this.time,
      waves: this.waves.serialize(),
      powers: this.powers.serialize(),
      towers: this.towers.map((t) => t.serialize()),
      enemies: this.enemies.filter((e) => e.alive).map((e) => e.serialize()),
    };
  }

  /**
   * Rebuilds a running game from a snapshot produced by `serialize()`.
   * @param {object} data
   * @returns {Game|null} null if the snapshot is missing, from another version or invalid
   */
  static restore(data) {
    if (!data || data.version !== Game.SAVE_VERSION) return null;
    const level = LevelCatalog.get(data.levelIndex);
    if (!level) return null;
    const game = new Game({ level, difficulty: Difficulty.get(data.difficulty), unlockedPowers: data.unlockedPowers });
    game.gold = data.gold;
    game.lives = data.lives;
    game.score = data.score;
    game.kills = data.kills;
    game.state = data.state === 'wave' ? 'wave' : 'building';
    game.time = data.time || 0;
    game.waves.restore(data.waves);
    game.powers.restore(data.powers);
    for (const t of data.towers) {
      const tower = TowerFactory.create(t.type, t.col, t.row).restore(t);
      game.towers.push(tower);
      game.map.place(tower);
    }
    for (const e of data.enemies) {
      game.enemies.push(EnemyFactory.create(e.type, game.map.path).restore(e));
    }
    return game;
  }
}
