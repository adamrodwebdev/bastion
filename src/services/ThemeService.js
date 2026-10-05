/**
 * @file Light / dark / system colour scheme.
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';

/**
 * Light / dark / system colour scheme.
 * Applies `data-theme` on <html> and keeps <meta name="theme-color"> in sync.
 */
export class ThemeService extends EventEmitter {
  static MODES = ['system', 'light', 'dark'];

  constructor() {
    super();
    this.mode = 'system';
    this._mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    if (this._mq) {
      const onChange = () => {
        if (this.mode === 'system') this._apply();
      };
      if (this._mq.addEventListener) this._mq.addEventListener('change', onChange);
      else if (this._mq.addListener) this._mq.addListener(onChange); // Safari < 14
    }
  }

  /** The scheme actually displayed: 'light' or 'dark'. */
  get resolved() {
    if (this.mode === 'system') return this._mq && this._mq.matches ? 'dark' : 'light';
    return this.mode;
  }

  setMode(mode) {
    this.mode = ThemeService.MODES.includes(mode) ? mode : 'system';
    this._apply();
  }

  /** Cycles light ↔ dark from the current resolved scheme. */
  toggle() {
    this.setMode(this.resolved === 'dark' ? 'light' : 'dark');
  }

  _apply() {
    const resolved = this.resolved;
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      const meta = document.querySelector('meta[name="theme-color"]:not([media])');
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#141120' : '#d9d5c8');
    }
    this.emit('change', resolved);
  }
}
