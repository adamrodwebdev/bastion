/**
 * @file Base class of everything that lives on the board.
 */

/** Base class of every object living on the board. */
export class Entity {
  static _nextId = 1;

  constructor(x = 0, y = 0) {
    this.id = Entity._nextId++;
    this.x = x;
    this.y = y;
    this.alive = true;
  }

  /** @param {number} dt seconds  @param {import('../Game.js').Game} game */
  // eslint-disable-next-line no-unused-vars
  update(dt, game) {}

  destroy() {
    this.alive = false;
  }
}
