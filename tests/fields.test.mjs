/**
 * @file Values read back from the page (src/components/fields.js): a slider's text parsed whole
 * and strictly, a name cleaned and bounded, a computed length read whole.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERCENT, PLAYER_NAME, cssPixels, sliderValue, textValue } from '../src/components/fields.js';
import { TEXT_LIMITS } from '../src/core/limits.js';

/** An input event as the browser gives it, for a field holding this value. */
const input = (value) => ({ target: { value } });

describe('sliderValue: a volume slider, in whole percentages', () => {
  for (const [text, expected] of [['0', 0], ['65', 65], ['100', 100], [' 5 ', 5]]) {
    test(`reads "${text}" as ${expected}`, () => assert.equal(sliderValue(input(text), PERCENT), expected));
  }

  for (const [name, value] of [
    ['an empty value', ''],
    ['trailing letters', '65abc'],
    ['an exponent', '1e2'],
    ['hexadecimal', '0x40'],
    ['a fraction', '0.65'],
    ['a value above the range', '101'],
    ['a negative value', '-5'],
    ['Infinity', 'Infinity'],
    ['a number, not text', 65],
    ['no value at all', undefined],
  ]) {
    test(`refuses ${name}`, () => assert.equal(sliderValue(input(value), PERCENT), null));
  }

  test('refuses an event without a field', () => {
    assert.equal(sliderValue({}, PERCENT), null);
    assert.equal(sliderValue(null, PERCENT), null);
  });
});

describe('textValue: a player name, cleaned and within its length', () => {
  test('the field and the reader share one limit', () => {
    assert.equal(PLAYER_NAME.maxLength, TEXT_LIMITS.playerName);
  });

  for (const [name, value, expected] of [
    ['spaces around and inside', '  Ana   Lima ', 'Ana Lima'],
    ['a right-to-left override', '\u202EAna', 'Ana'],
    ['a zero-width space', 'Lu\u200Bc', 'Luc'],
    ['markup, kept as text', '<img src=x onerror=alert(1)>'.slice(0, 16), '<img src=x onerr'],
    ['an empty name (the default is shown)', '   ', ''],
    ['sixteen characters', 'a'.repeat(16), 'a'.repeat(16)],
  ]) {
    test(`reads ${name}`, () => assert.equal(textValue(input(value), PLAYER_NAME), expected));
  }

  for (const [name, value] of [
    ['seventeen characters (an edited page)', 'a'.repeat(17)],
    ['a number', 12],
    ['an object', { toString: () => 'Ana' }],
  ]) {
    test(`refuses ${name}`, () => assert.equal(textValue(input(value), PLAYER_NAME), null));
  }
});

describe('cssPixels: a length the stylesheet computed', () => {
  for (const [text, expected] of [['0px', 0], ['12px', 12], ['13.3333px', 13.3333], [' 8px ', 8]]) {
    test(`reads "${text}" as ${expected}`, () => assert.equal(cssPixels(text), expected));
  }

  for (const [name, value] of [
    ['auto', 'auto'],
    ['another unit', '2em'],
    ['no unit', '12'],
    ['trailing garbage', '12pxx'],
    ['an exponent', '1e3px'],
    ['a negative length', '-4px'],
    ['nothing', ''],
    ['not text', 12],
  ]) {
    test(`gives 0 for ${name}`, () => assert.equal(cssPixels(value), 0));
  }
});
