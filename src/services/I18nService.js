/**
 * @file Translation service (French / English) and language detection.
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
 * Adding a language = add a dictionary in src/locales and register it.
 */
export class I18nService extends EventEmitter {
  /**
   * @param {Record<string, object>} dictionaries  e.g. { fr, en }
   * @param {string} fallback
   */
  constructor(dictionaries, fallback = 'en') {
    super();
    this.dictionaries = dictionaries;
    this.fallback = fallback;
    this.locale = fallback;
  }

  get available() {
    return Object.keys(this.dictionaries).map((code) => ({ code, label: this.dictionaries[code]._meta.label }));
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
      if (this.dictionaries[code]) return code;
    }
    return this.fallback;
  }

  /** @param {string} code 'fr' | 'en' — ignored if the language is not available */
  setLocale(code) {
    if (!this.dictionaries[code]) return;
    this.locale = code;
    this._syncDocument();
    this.emit('change', code);
  }

  _syncDocument() {
    if (typeof document === 'undefined') return;
    const meta = this.dictionaries[this.locale]._meta;
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
    if (str === undefined) str = this._lookup(this.dictionaries[this.fallback], key);
    if (typeof str !== 'string') return key;
    if (str.includes('|') && params.count !== undefined) {
      const [one, many] = str.split('|');
      str = Number(params.count) === 1 ? one : many;
    }
    return str.replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined ? String(params[name]) : m));
  }
}
