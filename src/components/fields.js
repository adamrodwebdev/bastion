/**
 * @file Values read back from the page at the door: what a form field holds is outside text (a
 * page can be edited), parsed whole and strictly, or cleaned and bounded, before it reaches the
 * settings; a length the stylesheet computes is read whole, never by `parseFloat`.
 */

import { orElse, parseNumber, readText } from '../core/input.js';
import { TEXT_LIMITS } from '../core/limits.js';

/** A volume slider's steps: a whole percentage, 0 to 100. */
export const PERCENT = Object.freeze({ min: 0, max: 100, integer: true });

/** A player's name: also the `maxlength` of its field, from the one table of limits. */
export const PLAYER_NAME = Object.freeze({ maxLength: TEXT_LIMITS.playerName });

/**
 * A slider's value: the text the browser gives, parsed whole and strictly within the slider's
 * range; null when it is not one, and the setting stays as it was.
 * @param {{target?: {value?: unknown}}} event
 * @param {import('../core/input.js').NumberRule} rule
 * @returns {number|null}
 */
export function sliderValue(event, rule) {
  return orElse(() => parseNumber(event?.target?.value, rule, 'slider'), null);
}

/** A length the page's layout can give: a padding, a margin. */
const LAYOUT_PIXELS = Object.freeze({ min: 0, max: 100_000 });

/**
 * A length in pixels as `getComputedStyle` gives it (`"12px"`, `"13.5px"`), or 0 when it is
 * anything else (`auto`, another unit, garbage): the layout then counts no room for it.
 * @param {unknown} value
 * @returns {number}
 */
export function cssPixels(value) {
  const digits = typeof value === 'string' ? /^(.*)px$/.exec(value.trim())?.[1] : undefined;
  return orElse(() => parseNumber(digits, LAYOUT_PIXELS, 'css length'), 0);
}

/**
 * A text field's value, cleaned (invisible characters out, spaces tidied) and within its length;
 * null when it is not text or too long, and the setting stays as it was.
 * @param {{target?: {value?: unknown}}} event
 * @param {import('../core/input.js').TextRule} rule
 * @returns {string|null}
 */
export function textValue(event, rule) {
  return orElse(() => readText(event?.target?.value, rule, 'field'), null);
}
