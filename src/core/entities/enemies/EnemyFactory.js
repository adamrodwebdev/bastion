/**
 * @file Creates enemies from their type name (Factory pattern).
 */

import * as T from './types.js';

/**
 * Factory: creates enemies from their string type.
 * New enemy types only need to be registered here.
 */
export class EnemyFactory {
  static registry = new Map(
    [
      T.Grunt,
      T.Runner,
      T.Wolf,
      T.ShieldBearer,
      T.Knight,
      T.Priest,
      T.Warlock,
      T.Crow,
      T.Wyvern,
      T.Sapper,
      T.Berserker,
      T.Golem,
      T.Ram,
      T.Necromancer,
      T.Skeleton,
      T.SiegeTower,
      T.Champion,
      T.Mordrac,
    ].map((C) => [C.type, C]),
  );

  /**
   * @param {string} type
   * @param {import('../../world/Path.js').Path} path
   * @param {{hpMult?:number, speedMult?:number, rewardMult?:number}} [scaling]
   * @param {{pathIndex?:number, distance?:number}} [spawn]
   * @returns {import('./Enemy.js').Enemy}
   * @throws {Error} if the type is not registered
   */
  static create(type, path, scaling, spawn) {
    const Ctor = EnemyFactory.registry.get(type);
    if (!Ctor) throw new Error(`Unknown enemy type: ${type}`);
    return new Ctor(path, scaling, spawn);
  }

  /** @returns {typeof import('./Enemy.js').Enemy|undefined} */
  static get(type) {
    return EnemyFactory.registry.get(type);
  }

  static types() {
    return [...EnemyFactory.registry.keys()];
  }
}
