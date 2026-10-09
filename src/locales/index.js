/**
 * @file Available languages. Each dictionary is a separate file loaded on
 * demand: a player downloads only their own language.
 *
 * Adding a language: create src/locales/xx.js (copy en.js), then add it to
 * LOADERS and LANGUAGE_NAMES below and to scripts/check-i18n.mjs.
 */

export const LOADERS = Object.freeze({
  fr: () => import('./fr.js'),
  en: () => import('./en.js'),
  id: () => import('./id.js'),
});

/** Name of each language in its own language (language picker). */
export const LANGUAGE_NAMES = Object.freeze({ fr: 'Français', en: 'English', id: 'Bahasa Indonesia' });
