/**
 * @file The cursor tells what can be clicked: the canonical block sits once in the base styles,
 * no other rule gives the hand, and the board shows it only over a tile where a click acts.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, LevelCatalog, Difficulty, TowerFactory } from '../src/core/index.js';

const css = readFileSync(new URL('../src/styles/main.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('main.css: one place gives the hand', () => {
  test('the arrow is the default of the whole page', () => {
    assert.match(css, /html\s*\{\s*cursor:\s*default;\s*\}/);
  });

  test('the hand is given twice, by the block and its :has() rule, never elsewhere', () => {
    assert.equal(css.match(/cursor:\s*pointer/g).length, 2);
    assert.match(css, /label:has\(> input:not\(:disabled\)\)\s*\{\s*cursor:\s*pointer;\s*\}/);
  });

  test('text fields show the I-beam and disabled controls "not allowed"', () => {
    assert.match(css, /textarea:not\(:disabled\),\s*\[contenteditable='true'\]\s*\{\s*cursor:\s*text;/);
    assert.match(css, /:disabled,\s*\[aria-disabled='true'\]\s*\{\s*cursor:\s*not-allowed;/);
  });

  test('aiming a power keeps its crosshair on the board', () => {
    assert.match(css, /\.board\.is-aiming\s*\{\s*cursor:\s*crosshair;/);
  });
});

describe('GameMap#actsAt: where a click on the board does something', () => {
  const level = LevelCatalog.byNumber(12);
  const game = new Game({ level, difficulty: Difficulty.get('normal'), players: 1 });
  const { map } = game;
  const cells = [];
  for (let row = 0; row < map.rows; row++) for (let col = 0; col < map.cols; col++) cells.push({ col, row });

  test('a free tile acts (the build menu opens)', () => {
    const free = cells.find(({ col, row }) => map.isBuildable(col, row));
    assert.equal(map.actsAt(free.col, free.row), true);
  });

  test('a road does not', () => {
    const road = cells.find(({ col, row }) => map.isPath(col, row));
    assert.equal(map.actsAt(road.col, road.row), false);
  });

  test('a tower acts (its panel opens)', () => {
    const free = cells.find(({ col, row }) => map.isBuildable(col, row));
    game.players[0].gold = 10_000;
    assert.ok(game.buildTower(TowerFactory.types()[0], free.col, free.row, 1));
    assert.equal(map.isBuildable(free.col, free.row), false);
    assert.equal(map.actsAt(free.col, free.row), true);
  });

  for (const [name, col, row] of [
    ['left of the map', -1, 0],
    ['below the map', 0, map.rows],
    ['at NaN', Number.NaN, Number.NaN],
  ]) {
    test(`nothing acts ${name}`, () => assert.equal(map.actsAt(col, row), false));
  }
});
