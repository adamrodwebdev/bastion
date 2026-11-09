/**
 * @file Translation service (French / English / Indonesian) and language detection.
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';
import { orElse, readText } from '../core/input.js';
import { TEXT_LIMITS } from '../core/limits.js';

/**
 * A language tag as the address, browsers and portals give it (`fr`, `pt-BR`, `en_US`):
 * letters, then subtags of letters and digits.
 */
const LANGUAGE_TAG = Object.freeze({
  maxLength: TEXT_LIMITS.languageTag,
  required: true,
  pattern: /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/,
});

/**
 * A language tag from outside (the address, the browser, a portal's SDK), or null when it is not one.
 * @param {unknown} value
 * @returns {string|null}
 */
export function readLanguageTag(value) {
  return orElse(() => readText(value, LANGUAGE_TAG, 'language'), null);
}

/**
 * Lightweight translation service.
 *  - nested keys:      t('menu.play')
 *  - interpolation:    t('hud.wave', { n: 3, total: 8 })  →  "Wave {n}/{total}"
 *  - plural:           "1 star|{count} stars"             →  t(key, { count })
 *  - language detection: ?lang= query → saved setting → browser language
 * Also keeps <html lang>, <title> and meta description in sync (SEO / a11y).
 *
 * Dictionaries are loaded on demand (see src/locales/index.js). Language codes from
 * outside are matched against the loaders in a Map: a plain object would also answer
 * to `constructor` or `__proto__`, and show every text as its key.
 */
export class I18nService extends EventEmitter {
  /**
   * @param {Record<string, () => Promise<{default: object}>>} loaders one dynamic import per language
   * @param {Record<string, string>} names language names shown in the picker
   * @param {string} fallback
   */
  constructor(loaders, names, fallback = 'en') {
    super();
    /** @type {Map<string, () => Promise<{default: object}>>} */
    this.loaders = new Map(Object.entries(loaders));
    this.names = new Map(Object.entries(names));
    /** Dictionaries already loaded. */
    this.dictionaries = new Map();
    this.fallback = fallback;
    this.locale = fallback;
  }

  get available() {
    return [...this.loaders.keys()].map((code) => ({ code, label: this.names.get(code) || code }));
  }

  /**
   * Is this one of the languages the game has?
   * @param {unknown} code
   */
  supports(code) {
    return typeof code === 'string' && this.loaders.has(code);
  }

  /**
   * The language the game has for a tag from outside (`fr-CA` → `fr`), or null.
   * @param {unknown} value
   * @returns {string|null}
   */
  match(value) {
    const tag = readLanguageTag(value);
    if (!tag) return null;
    const code = tag.toLowerCase().split(/[-_]/)[0];
    return this.supports(code) ? code : null;
  }

  /** Picks the best language among the supported ones. */
  detect(saved) {
    const candidates = [];
    try {
      const q = new URLSearchParams(globalThis.location?.search || '').get('lang');
      if (q) candidates.push(q);
    } catch {
      /* ignore */
    }
    if (saved) candidates.push(saved);
    const nav = globalThis.navigator;
    if (nav) candidates.push(...(Array.isArray(nav.languages) ? nav.languages : [nav.language]));
    for (const c of candidates) {
      const code = this.match(c);
      if (code) return code;
    }
    return this.fallback;
  }

  /** Loads a dictionary (cached). */
  async load(code) {
    if (!this.dictionaries.has(code)) this.dictionaries.set(code, (await this.loaders.get(code)()).default);
    return this.dictionaries.get(code);
  }

  /**
   * Switches language once its dictionary is loaded.
   * @param {unknown} code 'fr' | 'en' | 'id' — ignored if the language is not available
   */
  async setLocale(code) {
    if (!this.supports(code)) return;
    await this.load(code);
    this.locale = code;
    this._syncDocument();
    this.emit('change', code);
  }

  _syncDocument() {
    if (typeof document === 'undefined') return;
    const meta = this.dictionaries.get(this.locale)?._meta;
    if (!meta) return;
    document.documentElement.lang = this.locale;
    document.title = meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', meta.description);
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', meta.ogLocale);
  }

  _lookup(dict, key) {
    return key.split('.').reduce((node, part) => (node && node[part] !== undefined ? node[part] : undefined), dict);
  }

  /**
   * Translates a key. Falls back to the default language, then to the key itself.
   * @param {string} key dotted path, e.g. 'menu.play'
   * @param {Record<string, string|number>} [params] values for {placeholders}; `count` selects the plural
   * @returns {string}
   */
  t(key, params = {}) {
    let str = this._lookup(this.dictionaries.get(this.locale), key);
    const fallback = this.dictionaries.get(this.fallback);
    if (str === undefined && fallback) str = this._lookup(fallback, key);
    if (typeof str !== 'string') return key;
    if (str.includes('|') && params.count !== undefined) {
      const [one, many] = str.split('|');
      str = params.count === 1 ? one : many;
    }
    return str.replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined ? String(params[name]) : m));
  }
}
