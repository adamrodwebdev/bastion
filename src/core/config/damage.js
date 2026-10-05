/**
 * @file Damage types and how enemy defences reduce them.
 *
 *  - physical : arrows, cannonballs, bolts, soldiers. Reduced by `armor`.
 *  - fire     : greek fire, burning. Reduced by `resist`.
 *  - magic    : frost, lightning. Reduced by `resist`.
 *  - true     : powers like Meteor. Never reduced.
 *
 * `armor` and `resist` are fractions (0.35 = 35 % less damage).
 */

export const DAMAGE = Object.freeze({
  PHYSICAL: 'physical',
  FIRE: 'fire',
  MAGIC: 'magic',
  TRUE: 'true',
});

/** Damage never drops below this share of the raw value, whatever the defence. */
export const MIN_DAMAGE_SHARE = 0.2;

/**
 * Damage actually taken.
 * @param {number} amount raw damage
 * @param {string} type one of DAMAGE
 * @param {{armor:number, resist:number}} defence
 * @param {{pierce?:boolean}} [opts] pierce = ignores armor (ballista)
 * @returns {number}
 */
export function mitigate(amount, type, defence, { pierce = false } = {}) {
  let reduction = 0;
  if (type === DAMAGE.PHYSICAL && !pierce) reduction = defence.armor;
  else if (type === DAMAGE.FIRE || type === DAMAGE.MAGIC) reduction = defence.resist;
  return amount * Math.max(MIN_DAMAGE_SHARE, 1 - reduction);
}
