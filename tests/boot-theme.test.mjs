/**
 * @file The script of index.html that applies the saved theme before the first paint: it reads
 * the stored settings through the same door as the game (a size limit before parsing, the theme
 * from its list, an own field only).
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { SAVE_LIMITS } from '../src/core/limits.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = /<!-- Applies the saved theme before first paint[^>]*-->\s*<script>([\s\S]*?)<\/script>/.exec(html)?.[1];

/**
 * Runs the script as the browser would, over this stored settings text and system scheme.
 * @returns {string|null} the data-theme it set, or null
 */
function themeApplied(stored, { dark = false } = {}) {
  let theme = null;
  const context = {
    localStorage: { getItem: (key) => (key === 'bastion-td:settings' ? stored : null) },
    matchMedia: () => ({ matches: dark }),
    document: { documentElement: { setAttribute: (name, value) => name === 'data-theme' && (theme = value) } },
  };
  runInNewContext(script, context);
  return theme;
}

describe('index.html: the theme applied before the first paint', () => {
  test('the script is found where the Playgama build removes it', () => {
    assert.ok(script);
  });

  test('its size limit is the settings limit of the game', () => {
    assert.match(script, new RegExp(`raw\\.length <= ${SAVE_LIMITS.settings}\\b`));
  });

  test('the saved theme is applied', () => {
    assert.equal(themeApplied('{"theme":"dark"}'), 'dark');
    assert.equal(themeApplied('{"theme":"light"}', { dark: true }), 'light');
  });

  test('"system" and no settings follow the system', () => {
    assert.equal(themeApplied('{"theme":"system"}', { dark: true }), 'dark');
    assert.equal(themeApplied(null), 'light');
  });

  test('a theme outside the list follows the system (regression)', () => {
    assert.equal(themeApplied('{"theme":"x\\" onload=\\"alert(1)"}'), 'light');
    assert.equal(themeApplied('{"theme":["dark"]}'), 'light');
  });

  test('settings longer than the save limit are not parsed (regression)', () => {
    const padded = JSON.stringify({ theme: 'dark', pad: 'x'.repeat(SAVE_LIMITS.settings) });
    assert.equal(themeApplied(padded), 'light');
  });

  test('a theme only inherited from the prototype is not one', () => {
    assert.equal(themeApplied('{"__proto__":{"theme":"dark"}}'), 'light');
  });

  test('settings that are not JSON follow the system', () => {
    assert.equal(themeApplied('{"theme":"da'), 'light');
  });
});
