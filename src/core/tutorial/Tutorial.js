/**
 * @file Guided tutorials: Gontran explains each new thing the first time it shows up.
 *
 * A tutorial is a list of steps. Each step has a text (translation key under
 * `tutorial.`) and a `done(ctx)` test on the current game state; the coach
 * moves on as soon as the player has done what was asked. A step may also
 * wait for a moment to show up (`when(ctx)`).
 */

/**
 * @typedef {object} TutorialContext
 * @property {import('../Game.js').Game} game
 * @property {boolean} cellSelected a cell or a tower is selected
 * @property {string|null} armedType tower type ready to be built
 */

const STEPS = {
  basics: [
    { id: 'select', done: (c) => c.cellSelected || c.armedType || c.game.towers.length > 0 },
    { id: 'build', done: (c) => c.game.towers.length >= 1 },
    { id: 'second', done: (c) => c.game.towers.length >= 2 },
    { id: 'wave', done: (c) => c.game.state === 'running' },
    { id: 'upgrade', when: (c) => c.game.waves.current >= 2, done: (c) => c.game.stats.upgrades >= 1 },
  ],
  early: [{ id: 'early', when: (c) => c.game.countdown !== null && c.game.countdown > 3, done: (c) => c.game.stats.earlyCalls >= 1 }],
  targeting: [{ id: 'targeting', when: (c) => c.game.towers.length >= 3, done: (c) => c.game.towers.some((t) => t.targeting.constructor.id !== 'first') || c.game.waves.current >= 3 }],
};

/** Level where each general tutorial is taught. */
const AT_LEVEL = { basics: 1, early: 5, targeting: 9 };

export class Tutorial {
  /**
   * @param {object} o
   * @param {import('../config/Level.js').Level} o.level
   * @param {string[]} o.newPowers powers the player takes into a level for the first time
   * @param {(id:string)=>boolean} o.seen already taught?
   */
  constructor({ level, newPowers = [], seen }) {
    this.queue = [];
    for (const [id, n] of Object.entries(AT_LEVEL)) {
      if (level.number === n && !seen(id)) this.queue.push({ id, steps: STEPS[id].map((s) => ({ ...s, key: s.id })) });
    }
    for (const type of level.newTowers) {
      const id = `tower-${type}`;
      if (!seen(id)) this.queue.push({ id, steps: [{ key: 'newTower', params: { type }, done: (c) => c.game.stats.towerTypes.includes(type) }] });
    }
    for (const power of newPowers) {
      const id = `power-${power}`;
      if (!seen(id)) {
        this.queue.push({
          id,
          steps: [{ key: 'newPower', params: { power }, when: (c) => c.game.state === 'running' && c.game.enemies.length >= 3, done: (c) => (c.game.powers.get(power)?.uses || 0) > 0 }],
        });
      }
    }
    this.step = 0;
    this.finished = [];
  }

  get active() {
    return this.queue.length > 0;
  }

  /**
   * Current step to display, or null (nothing to say right now).
   * Completed tutorials are moved to `finished` (to be saved as seen).
   * @param {TutorialContext} ctx
   */
  current(ctx) {
    while (this.queue.length) {
      const tut = this.queue[0];
      const step = tut.steps[this.step];
      if (!step) {
        this.finished.push(tut.id);
        this.queue.shift();
        this.step = 0;
        continue;
      }
      if (step.done(ctx)) {
        this.step += 1;
        continue;
      }
      if (step.when && !step.when(ctx)) return null;
      return { tutorial: tut.id, key: step.key, params: step.params || {} };
    }
    return null;
  }

  /** The player closed the bubble: skip the current tutorial. */
  dismiss() {
    if (!this.queue.length) return;
    this.finished.push(this.queue[0].id);
    this.queue.shift();
    this.step = 0;
  }
}
