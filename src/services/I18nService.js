/**
 * @file Translation service (French / English / Indonesian) and language detection.
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';

/**
 * Lightweight translation service.
 *  - nested keys:      t('menu.play')
 *  - interpolation:    t('hud.wave', { n: 3, total: 8 })  →  "Wave {n}/{total}"
 *  - plural:           "1 star|{count} stars"             →  t(key, { count })
 *  - language detection: ?lang= query → saved setting → browser language
 * Also keeps <html lang>, <title> and meta description in sync (SEO / a11y).
 *
 * Dictionaries are loaded on demand (see src/locales/index.js).
 */
export class I18nService extends EventEmitter {
  /**
   * @param {Record<string, () => Promise<{default: object}>>} loaders one dynamic import per language
   * @param {Record<string, string>} names language names shown in the picker
   * @param {string} fallback
   */
  constructor(loaders, names, fallback = 'en') {
    super();
    this.loaders = loaders;
    this.names = names;
    /** Dictionaries already loaded. */
    this.dictionaries = {};
    this.fallback = fallback;
    this.locale = fallback;
  }

  get available() {
    return Object.keys(this.loaders).map((code) => ({ code, label: this.names[code] || code }));
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
    if (nav) candidates.push(...(nav.languages || [nav.language]));
    for (const c of candidates) {
      const code = String(c || '').toLowerCase().split('-')[0];
      if (this.loaders[code]) return code;
    }
    return this.fallback;
  }

  /** Loads a dictionary (cached). */
  async load(code) {
    if (!this.dictionaries[code]) this.dictionaries[code] = (await this.loaders[code]()).default;
    return this.dictionaries[code];
  }

  /**
   * Switches language once its dictionary is loaded.
   * @param {string} code 'fr' | 'en' | 'id' — ignored if the language is not available
   */
  async setLocale(code) {
    if (!this.loaders[code]) return;
    await this.load(code);
    this.locale = code;
    this._syncDocument();
    this.emit('change', code);
  }

  _syncDocument() {
    if (typeof document === 'undefined') return;
    const meta = this.dictionaries[this.locale]?._meta;
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
    let str = this._lookup(this.dictionaries[this.locale], key);
    if (str === undefined && this.dictionaries[this.fallback]) str = this._lookup(this.dictionaries[this.fallback], key);
    if (typeof str !== 'string') return key;
    if (str.includes('|') && params.count !== undefined) {
      const [one, many] = str.split('|');
      str = Number(params.count) === 1 ? one : many;
    }
    return str.replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined ? String(params[name]) : m));
  }
}
