/**
 * @file When towers, powers and enemies appear in the campaign.
 *
 * Numbers are level numbers (1 to 100). A tower is available FROM its level;
 * a power is unlocked AFTER beating its level; an enemy first shows up in its
 * level (the briefing then presents it as new).
 */

/** First level where each tower can be built. */
export const TOWER_UNLOCK = Object.freeze({
  archer: 1,
  cannon: 1,
  barracks: 3,
  frost: 6,
  ballista: 11,
  treasury: 16,
  watch: 21,
  catapult: 31,
  fire: 41,
  storm: 51,
});

/** Power unlocked after beating this level. */
export const POWER_UNLOCK = Object.freeze({
  arrowRain: 1,
  freeze: 3,
  reinforcements: 6,
  goldRush: 10,
  meteor: 15,
  rally: 20,
  quake: 30,
  greekFire: 40,
  blessing: 50,
  wrath: 60,
});

/** First level where each enemy appears. */
export const ENEMY_INTRO = Object.freeze({
  grunt: 1,
  runner: 2,
  wolf: 4,
  shield: 7,
  champion: 10,
  priest: 11,
  crow: 13,
  knight: 16,
  sapper: 21,
  berserker: 25,
  wyvern: 31,
  golem: 41,
  necromancer: 51,
  skeleton: 51,
  warlock: 61,
  ram: 65,
  siege: 71,
  mordrac: 100,
});

/** Towers available in a level. */
export function towersFor(levelNumber) {
  return Object.keys(TOWER_UNLOCK).filter((t) => levelNumber >= TOWER_UNLOCK[t]);
}

/** Enemies seen for the first time in a level. */
export function newEnemiesIn(levelNumber) {
  return Object.keys(ENEMY_INTRO).filter((t) => ENEMY_INTRO[t] === levelNumber && t !== 'skeleton');
}

/** Towers available for the first time in a level. */
export function newTowersIn(levelNumber) {
  return Object.keys(TOWER_UNLOCK).filter((t) => TOWER_UNLOCK[t] === levelNumber && levelNumber > 1);
}
