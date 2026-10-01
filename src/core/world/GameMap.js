/**
 * @file Grid of the board: road cells, rocks, and which cells hold a tower.
 */

import { Path } from './Path.js';

/**
 * Grid map: knows which cells belong to the road (not buildable),
 * which ones are decorative obstacles, and which ones hold a tower.
 */
export class GameMap {
  /**
   * @param {object} cfg
   * @param {number} cfg.cols
   * @param {number} cfg.rows
   * @param {Array<[number,number]>} cfg.waypoints grid cells (may start/end outside the map)
   * @param {Array<[number,number]>} [cfg.rocks] non-buildable decorative cells
   */
  constructor({ cols, rows, waypoints, rocks = [] }) {
    this.cols = cols;
    this.rows = rows;
    this.waypoints = waypoints;
    this.path = Path.fromGrid(waypoints);
    this.pathCells = new Set();
    this.occupied = new Map(); // key -> tower
    this._rasterizePath();
    this.rockCells = new Set(rocks.map(([c, r]) => GameMap.key(c, r)).filter((k) => !this.pathCells.has(k)));
  }

  static key(c, r) {
    return `${c},${r}`;
  }

  _rasterizePath() {
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const [c1, r1] = this.waypoints[i];
      const [c2, r2] = this.waypoints[i + 1];
      const steps = Math.max(Math.abs(c2 - c1), Math.abs(r2 - r1));
      for (let s = 0; s <= steps; s++) {
        const c = Math.round(c1 + ((c2 - c1) * s) / (steps || 1));
        const r = Math.round(r1 + ((r2 - r1) * s) / (steps || 1));
        if (this.inBounds(c, r)) this.pathCells.add(GameMap.key(c, r));
      }
    }
  }

  inBounds(c, r) {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows;
  }

  isPath(c, r) {
    return this.pathCells.has(GameMap.key(c, r));
  }

  isRock(c, r) {
    return this.rockCells.has(GameMap.key(c, r));
  }

  isBuildable(c, r) {
    const k = GameMap.key(c, r);
    return this.inBounds(c, r) && !this.pathCells.has(k) && !this.rockCells.has(k) && !this.occupied.has(k);
  }

  towerAt(c, r) {
    return this.occupied.get(GameMap.key(c, r)) || null;
  }

  place(tower) {
    this.occupied.set(GameMap.key(tower.col, tower.row), tower);
  }

  remove(tower) {
    this.occupied.delete(GameMap.key(tower.col, tower.row));
  }
}
