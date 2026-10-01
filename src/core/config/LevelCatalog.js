/**
 * @file Data of the six campaign levels. Edit here to change maps or starting gold.
 */

import { Level } from './Level.js';

/** The campaign: 6 levels of increasing difficulty. */
const DATA = [
  {
    id: 'meadow',
    theme: 'meadow',
    startGold: 220,
    waypoints: [[-1, 2], [4, 2], [4, 7], [10, 7], [10, 3], [15, 3]],
    rocks: [[1, 6], [7, 1], [13, 8], [7, 4], [12, 6]],
  },
  {
    id: 'canyon',
    theme: 'canyon',
    startGold: 240,
    waypoints: [[-1, 7], [3, 7], [3, 2], [7, 2], [7, 8], [12, 8], [12, 4], [15, 4]],
    rocks: [[0, 1], [5, 5], [10, 1], [14, 8], [9, 5]],
  },
  {
    id: 'lagoon',
    theme: 'lagoon',
    startGold: 280,
    waypoints: [[7, -1], [7, 2], [2, 2], [2, 6], [6, 6], [6, 8], [12, 8], [12, 1], [15, 1]],
    rocks: [[0, 9], [4, 4], [9, 5], [14, 6], [10, 2]],
  },
  {
    id: 'volcano',
    theme: 'volcano',
    startGold: 250,
    waypoints: [[-1, 1], [13, 1], [13, 4], [2, 4], [2, 8], [15, 8]],
    rocks: [[0, 6], [7, 6], [11, 6], [14, 3], [5, 2]],
  },
  {
    id: 'fortress',
    theme: 'fortress',
    startGold: 265,
    waypoints: [[-1, 5], [2, 5], [2, 1], [6, 1], [6, 8], [9, 8], [9, 1], [12, 1], [12, 6], [15, 6]],
    rocks: [[4, 4], [0, 9], [14, 9], [11, 8], [4, 8]],
  },
  {
    id: 'abyss',
    theme: 'abyss',
    startGold: 340,
    waypoints: [[-1, 8], [5, 8], [5, 5], [9, 5], [9, 2], [15, 2]],
    rocks: [[2, 2], [12, 7], [7, 8], [1, 5], [13, 5]],
  },
];

export class LevelCatalog {
  static _levels = DATA.map((d, index) => new Level({ ...d, index }));

  static all() {
    return LevelCatalog._levels;
  }

  static get(index) {
    return LevelCatalog._levels[index] || null;
  }

  static get count() {
    return LevelCatalog._levels.length;
  }
}
