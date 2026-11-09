/**
 * @file Key names from keyboard events are outside values: only the keys the game knows act,
 * and a name that is not text (an autofill event) or names a prototype field does nothing.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { arrowStep, keyName, keyPlace } from '../src/components/keyboard.js';

describe('keyName and keyPlace: the names a keyboard event gives', () => {
  test('a real key gives its name and its place', () => {
    const event = { key: 'z', code: 'KeyW' };
    assert.equal(keyName(event), 'z');
    assert.equal(keyPlace(event), 'KeyW');
  });

  for (const [name, event] of [
    ['an autofill keydown, without key or code', {}],
    ['names that are not text', { key: 12, code: { toString: () => 'KeyW' } }],
    ['null names', { key: null, code: null }],
    ['no event at all', undefined],
  ]) {
    test(`${name} give empty names, which match no key`, () => {
      assert.equal(keyName(event), '');
      assert.equal(keyPlace(event), '');
    });
  }
});

describe('arrowStep: the four arrows move the cursor', () => {
  test('each arrow gives its step on the grid', () => {
    assert.deepEqual(arrowStep('ArrowLeft'), [-1, 0]);
    assert.deepEqual(arrowStep('ArrowRight'), [1, 0]);
    assert.deepEqual(arrowStep('ArrowUp'), [0, -1]);
    assert.deepEqual(arrowStep('ArrowDown'), [0, 1]);
  });

  for (const key of ['constructor', 'toString', '__proto__', 'valueOf', 'hasOwnProperty']) {
    test(`"${key}" is no arrow (regression: it moved the cursor to NaN or threw)`, () => {
      assert.equal(arrowStep(key), null);
    });
  }

  for (const [name, key] of [
    ['undefined (an autofill event)', undefined],
    ['null', null],
    ['a number', 37],
    ['another case', 'arrowleft'],
    ['an empty name', ''],
  ]) {
    test(`${name} is no arrow`, () => {
      assert.equal(arrowStep(key), null);
    });
  }
});
