/**
 * @file The three difficulty presets (easy, normal, hard).
 */

/**
 * Difficulty preset. Multiplies enemy stats and the player's resources.
 */
export class Difficulty {
  constructor(id, { hpMult, speedMult, rewardMult, goldMult, lives, scoreMult }) {
    this.id = id;
    this.hpMult = hpMult;
    this.speedMult = speedMult;
    this.rewardMult = rewardMult;
    this.goldMult = goldMult;
    this.lives = lives;
    this.scoreMult = scoreMult;
    Object.freeze(this);
  }

  static EASY = new Difficulty('easy', { hpMult: 0.75, speedMult: 0.9, rewardMult: 1.2, goldMult: 1.3, lives: 25, scoreMult: 0.75 });
  static NORMAL = new Difficulty('normal', { hpMult: 1, speedMult: 1, rewardMult: 1, goldMult: 1, lives: 20, scoreMult: 1 });
  static HARD = new Difficulty('hard', { hpMult: 1.25, speedMult: 1.08, rewardMult: 0.95, goldMult: 0.95, lives: 15, scoreMult: 1.6 });

  static all() {
    return [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD];
  }

  static get(id) {
    return Difficulty.all().find((d) => d.id === id) || Difficulty.NORMAL;
  }
}
