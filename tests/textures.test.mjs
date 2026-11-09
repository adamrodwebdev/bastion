/**
 * @file Messages from the textures' worker are read at the door like any message: the end, or a
 * texture of a known name with its image; anything else is ignored.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TEXTURE_NAMES, readTextureMessage } from '../src/services/TextureService.js';
import { TEXTURES } from '../src/core/rendering/Textures.js';

describe('readTextureMessage', () => {
  test('the names allowed are the textures the worker paints', () => {
    assert.deepEqual([...TEXTURE_NAMES], Object.keys(TEXTURES));
  });

  test('reads the end of the painting', () => {
    assert.deepEqual(readTextureMessage({ done: true }), { done: true });
  });

  test('reads a texture and its image', () => {
    const blob = new Blob(['png']);
    assert.deepEqual(readTextureMessage({ name: 'wood', blob }), { name: 'wood', blob });
  });

  test('reads a texture the worker could not paint', () => {
    assert.deepEqual(readTextureMessage({ name: 'iron', blob: null }), { name: 'iron', blob: null });
  });

  for (const [name, data] of [
    ['null (it threw on data.done)', null],
    ['a text', 'done'],
    ['an end that is not true', { done: 'yes' }],
    ['a name that would become another CSS property', { name: 'x); background: url(evil', blob: new Blob(['']) }],
    ['a prototype name', { name: 'constructor', blob: new Blob(['']) }],
    ['an image that is text', { name: 'wood', blob: 'data:image/png;base64,AAAA' }],
    ['an image that is an object', { name: 'wood', blob: { size: 3 } }],
    ['no name', { blob: new Blob(['']) }],
  ]) {
    test(`ignores ${name}`, () => assert.equal(readTextureMessage(data), null));
  }
});
