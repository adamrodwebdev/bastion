/**
 * @file How much the game accepts from outside (the user's rule of 9 November 2026), in one
 * place: every text, save and list read at a door has its limit here. A value over its limit
 * is refused, never cut, and falls back as any value the game cannot read. The game never
 * writes more than it would read back.
 */

/** The longest text read at a door, in characters once cleaned (see `readText`). */
export const TEXT_LIMITS = Object.freeze({
  /** A player's name (two-player modes): also the `maxlength` of its field in the settings. */
  playerName: 16,
  /** A language tag from the address, the browser or a portal (`pt-BR`): 35 at most (BCP 47). */
  languageTag: 35,
  /**
   * A name the game wrote into a save: a story episode, a tutorial, a lesson, a power, a tower,
   * an upgrade, a kill cause. The longest on 9 November 2026 has 20 (`power-reinforcements`).
   */
  saveId: 40,
});

/**
 * The longest save read back from storage (the browser's or the portal's), in UTF-16 units of
 * its JSON, checked before it is parsed. Measured on 9 November 2026: the progress with all 100
 * levels won in both campaigns and every count at its maximum, 18,286; the settings, 228; the
 * largest game in progress the bot reached in the 100 levels, 13,810.
 */
export const SAVE_LIMITS = Object.freeze({
  progress: 65_536,
  settings: 8_192,
  currentGame: 262_144,
});

/**
 * The most items read from a list or a map of a save: what the game writes, many times over
 * (the bot's largest game on 9 November 2026: 93 towers, 38 enemies, 52 spawns waiting).
 */
export const LIST_LIMITS = Object.freeze({
  /** Levels with a record, in one campaign: 100 exist. */
  levels: 100,
  /** Story episodes read (11), tutorials seen (23), lessons done (4). */
  episodes: 50,
  tutorials: 100,
  training: 10,
  /** Powers in a loadout (5 slots at most) or in a game (10 exist), towers mastered (10). */
  powers: 16,
  towerTypes: 16,
  /** Players of a game: one, or two in cooperation. */
  players: 2,
  /** Towers on a board: the grid has 144 tiles. */
  towers: 144,
  /** Enemies on a board and spawns waiting: a level sends 320 at most, summoners add some. */
  enemies: 1_024,
  spawns: 1_024,
  /** Kinds of kills counted in a game (a cause per tower and power, soldiers, fire). */
  killCauses: 64,
});
