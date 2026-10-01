/**
 * @file Creates towers from their type name and lists them for the shop (Factory pattern).
 */

import { ArrowTower, CannonTower, FrostTower, LaserTower } from './types.js';

/** Factory + catalogue of buildable towers. */
export class TowerFactory {
  static registry = new Map([ArrowTower, CannonTower, FrostTower, LaserTower].map((C) => [C.type, C]));

  /**
   * @param {string} type
   * @param {number} col
   * @param {number} row
   * @returns {import('./Tower.js').Tower}
   * @throws {Error} if the type is not registered
   */
  static create(type, col, row) {
    const Ctor = TowerFactory.registry.get(type);
    if (!Ctor) throw new Error(`Unknown tower type: ${type}`);
    return new Ctor(col, row);
  }

  /** @returns {typeof import('./Tower.js').Tower|undefined} the tower class, for its static data (cost, levels…) */
  static get(type) {
    return TowerFactory.registry.get(type);
  }

  /** Data used by the shop UI. */
  static catalogue() {
    return [...TowerFactory.registry.values()].map((C) => ({
      type: C.type,
      cost: C.cost,
      color: C.color,
      range: C.levels[0].range,
      damage: C.levels[0].damage,
      fireRate: C.levels[0].fireRate,
    }));
  }
}
