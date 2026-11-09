/**
 * @file Keys read at the door: the names a keyboard event gives are outside values, matched
 * against the keys the game knows in a Map (a plain object would also answer to `constructor`
 * or `__proto__`), and taken as text only when they are text (Chrome's autofill sends keydown
 * events without a key).
 */

/** Grid step of each arrow key: column, row. */
const ARROWS = new Map([
  ['ArrowLeft', Object.freeze([-1, 0])],
  ['ArrowRight', Object.freeze([1, 0])],
  ['ArrowUp', Object.freeze([0, -1])],
  ['ArrowDown', Object.freeze([0, 1])],
]);

/**
 * The character or name of the key pressed (`KeyboardEvent.key`), or '' when the event has none.
 * @param {{key?: unknown}} event
 * @returns {string}
 */
export function keyName(event) {
  const key = event?.key;
  return typeof key === 'string' ? key : '';
}

/**
 * The key's place on the keyboard (`KeyboardEvent.code`, `KeyW` on QWERTY and AZERTY alike), or ''.
 * @param {{code?: unknown}} event
 * @returns {string}
 */
export function keyPlace(event) {
  const code = event?.code;
  return typeof code === 'string' ? code : '';
}

/**
 * Grid step of an arrow key, or null for any other key.
 * @param {unknown} key `KeyboardEvent.key`
 * @returns {readonly [number, number] | null}
 */
export function arrowStep(key) {
  return ARROWS.get(key) ?? null;
}
