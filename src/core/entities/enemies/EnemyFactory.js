/**
 * @file Creates enemies from their type name (Factory pattern).
 */

import { Grunt, Runner, Tank, Healer, Boss } from './types.js';

/**
 * Factory: creates enemies from their string type.
 * New enemy types only need to be registered here.
 */
export class EnemyFactory {
  static registry = new Map([Grunt, Runner, Tank, Healer, Boss].map((C) => [C.type, C]));

  /**
   * @param {string} type 'grunt' | 'runner' | 'tank' | 'healer' | 'boss'
   * @param {import('../../world/Path.js').Path} path
   * @param {{hpMult?:number, speedMult?:number, rewardMult?:number}} [scaling] level × difficulty multipliers
   * @returns {import('./Enemy.js').Enemy}
   * @throws {Error} if the type is not registered
   */
  static create(type, path, scaling) {
    const Ctor = EnemyFactory.registry.get(type);
    if (!Ctor) throw new Error(`Unknown enemy type: ${type}`);
    return new Ctor(path, scaling);
  }

  static types() {
    return [...EnemyFactory.registry.keys()];
  }
}
