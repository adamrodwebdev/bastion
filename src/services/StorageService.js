/**
 * @file Safe localStorage wrapper with an in-memory fallback.
 */

/**
 * Safe wrapper around localStorage: JSON (de)serialisation, key namespacing,
 * and graceful fallback to memory when storage is unavailable
 * (private mode, quota exceeded, disabled cookies…).
 */
export class StorageService {
  constructor(namespace = 'app', backend = StorageService.detectBackend()) {
    this.namespace = namespace;
    this.backend = backend;
    this.persistent = backend !== null;
    this._memory = new Map();
  }

  static detectBackend() {
    try {
      const ls = globalThis.localStorage;
      const probe = '__probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    } catch {
      return null;
    }
  }

  _key(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * @param {string} key
   * @param {*} [fallback] returned when the key is missing or unreadable
   * @returns {*}
   */
  get(key, fallback = null) {
    try {
      const raw = this.backend ? this.backend.getItem(this._key(key)) : this._memory.get(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /**
   * @param {string} key
   * @param {*} value any JSON-serialisable value
   * @returns {boolean} false if it could only be kept in memory
   */
  set(key, value) {
    const raw = JSON.stringify(value);
    try {
      if (this.backend) this.backend.setItem(this._key(key), raw);
      else this._memory.set(key, raw);
      return true;
    } catch {
      this._memory.set(key, raw);
      return false;
    }
  }

  remove(key) {
    try {
      if (this.backend) this.backend.removeItem(this._key(key));
    } catch {
      /* ignore */
    }
    this._memory.delete(key);
  }
}
