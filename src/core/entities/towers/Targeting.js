/**
 * @file Target selection rules for towers (Strategy pattern).
 */

/**
 * Targeting strategies (Strategy pattern). A tower holds one strategy
 * and the player can switch it at any time.
 */
export class TargetingStrategy {
  static id = 'base';
  /** Higher score = preferred target. */
  // eslint-disable-next-line no-unused-vars
  score(enemy, tower) {
    return 0;
  }

  pick(candidates, tower) {
    let best = null;
    let bestScore = -Infinity;
    for (const e of candidates) {
      const s = this.score(e, tower);
      if (s > bestScore) {
        bestScore = s;
        best = e;
      }
    }
    return best;
  }
}

/** The enemy closest to the exit. */
export class FirstTargeting extends TargetingStrategy {
  static id = 'first';
  score(e) {
    return e.distance;
  }
}

/** The enemy with the most hit points. */
export class StrongestTargeting extends TargetingStrategy {
  static id = 'strongest';
  score(e) {
    return e.hp;
  }
}

/** The enemy nearest to the tower. */
export class ClosestTargeting extends TargetingStrategy {
  static id = 'closest';
  score(e, tower) {
    return -((e.x - tower.x) ** 2 + (e.y - tower.y) ** 2);
  }
}

export const TARGETING = [FirstTargeting, StrongestTargeting, ClosestTargeting];

export function createTargeting(id) {
  const C = TARGETING.find((t) => t.id === id) || FirstTargeting;
  return new C();
}
