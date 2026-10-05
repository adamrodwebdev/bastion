/**
 * @file Public API of the game engine. The UI should only import from this file.
 */

export { Game, DEFAULT_MODS, PLAYER_COLORS, COOP_HP } from './Game.js';
export { GameLoop } from './systems/GameLoop.js';
export { Renderer } from './rendering/Renderer.js';
export { LevelCatalog, LEVEL_COUNT } from './config/LevelCatalog.js';
export { Level } from './config/Level.js';
export { CHAPTERS, chapterOf } from './config/chapters.js';
export { Difficulty } from './config/Difficulty.js';
export { DAMAGE } from './config/damage.js';
export { TOWER_UNLOCK, POWER_UNLOCK, ENEMY_INTRO, towersFor } from './config/unlocks.js';
export { TowerFactory } from './entities/towers/TowerFactory.js';
export { TARGETING } from './entities/towers/Targeting.js';
export { PowerManager, DEFAULT_SLOTS } from './powers/PowerManager.js';
export { EnemyFactory } from './entities/enemies/EnemyFactory.js';
