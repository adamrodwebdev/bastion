/**
 * @file Grid of the board: roads, obstacles, water and which cells hold a tower.
 */

import { Path } from './Path.js';

/**
 * Grid map. A level may have several roads (each with its own entrance and
 * exit). Flying enemies ignore roads and fly straight over the board along an
 * "air lane" that joins each road's entrance to its exit.
 */
export class GameMap {
  /**
   * @param {object} cfg
   * @param {number} cfg.cols
   * @param {number} cfg.rows
   * @param {Array<Array<[number,number]>>} cfg.paths grid waypoints of each road (may start/end outside the map)
   * @param {Array<[number,number]>} [cfg.rocks] non-buildable cells (rocks, trees…)
   * @param {Array<[number,number]>} [cfg.water] non-buildable water cells
   */
  constructor({ cols, rows, paths, rocks = [], water = [] }) {
    this.cols = cols;
    this.rows = rows;
    this.waypoints = paths;
    this.paths = paths.map((wp) => Path.fromGrid(wp));
    this.airPaths = this.paths.map((p) => Path.airLane(p));
    this.pathCells = new Set();
    this.occupied = new Map(); // key -> tower
    for (const wp of paths) this._rasterize(wp);
    const free = (k) => !this.pathCells.has(k);
    this.rockCells = new Set(rocks.map(([c, r]) => GameMap.key(c, r)).filter(free));
    this.waterCells = new Set(water.map(([c, r]) => GameMap.key(c, r)).filter((k) => free(k) && !this.rockCells.has(k)));
  }

  /** First road (kept for code that only knows single-road maps). */
  get path() {
    return this.paths[0];
  }

  static key(c, r) {
    return `${c},${r}`;
  }

  _rasterize(waypoints) {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const [c1, r1] = waypoints[i];
      const [c2, r2] = waypoints[i + 1];
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

  isWater(c, r) {
    return this.waterCells.has(GameMap.key(c, r));
  }

  isBuildable(c, r) {
    const k = GameMap.key(c, r);
    return (
      this.inBounds(c, r) &&
      !this.pathCells.has(k) &&
      !this.rockCells.has(k) &&
      !this.waterCells.has(k) &&
      !this.occupied.has(k)
    );
  }

  /** All cells where a tower could stand on an empty board. */
  buildableCells() {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const k = GameMap.key(c, r);
        if (!this.pathCells.has(k) && !this.rockCells.has(k) && !this.waterCells.has(k)) out.push([c, r]);
      }
    }
    return out;
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

  /**
   * Closest point on any road to (x, y), with the road index.
   * @returns {{x:number, y:number, distance:number, d2:number, pathIndex:number}}
   */
  closestRoadPoint(x, y) {
    let best = null;
    this.paths.forEach((p, i) => {
      const cp = p.closestPoint(x, y);
      if (!best || cp.d2 < best.d2) best = { ...cp, pathIndex: i };
    });
    return best;
  }
}
