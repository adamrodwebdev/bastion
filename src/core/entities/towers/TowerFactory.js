/**
 * @file Creates towers from their type name and lists them for the shop (Factory pattern).
 */

import * as T from './types.js';

/** Factory + catalogue of buildable towers, in shop order. */
export class TowerFactory {
  static registry = new Map(
    [
      T.ArcherTower,
      T.BarracksTower,
      T.CannonTower,
      T.FrostTower,
      T.BallistaTower,
      T.WatchTower,
      T.TreasuryTower,
      T.CatapultTower,
      T.FireTower,
      T.StormTower,
    ].map((C) => [C.type, C]),
  );

  /**
   * @param {string} type
   * @param {number} col
   * @param {number} row
   * @param {{owner?:number, eliteUnlocked?:boolean, priceFactor?:number}} [opts]
   * @returns {import('./Tower.js').Tower}
   * @throws {Error} if the type is not registered
   */
  static create(type, col, row, opts) {
    const Ctor = TowerFactory.registry.get(type);
    if (!Ctor) throw new Error(`Unknown tower type: ${type}`);
    return new Ctor(col, row, opts);
  }

  /** @returns {typeof import('./Tower.js').Tower|undefined} the tower class, for its static data */
  static get(type) {
    return TowerFactory.registry.get(type);
  }

  static types() {
    return [...TowerFactory.registry.keys()];
  }

  /** Data used by the shop UI. */
  static catalogue() {
    return [...TowerFactory.registry.values()].map((C) => ({
      type: C.type,
      cost: C.cost,
      color: C.color,
      targets: C.targets,
      category: C.category,
      dtype: C.dtype,
      range: C.levels[0].range || 0,
      hasElite: Boolean(C.elite),
    }));
  }
}
