/**
 * @file Safe localStorage wrapper with an in-memory fallback, read and written as text.
 */

/** What a storage gives for a value it holds but could not read back: it is not "nothing saved". */
export const UNREADABLE = Symbol('unreadable');

/**
 * Safe wrapper around localStorage (or a portal's storage with the same interface): key
 * namespacing, text in and out, and graceful fallback to memory when storage is unavailable
 * (private mode, quota exceeded, disabled cookies…). The text is read at the door by SaveSlot.
 */
export class StorageService {
  constructor(namespace = 'app', backend = StorageService.detectBackend()) {
    this.namespace = namespace;
    this.backend = backend;
    /** Texts the storage refused to keep (or every text, without one): read back from here first. */
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
   * The text stored under a key: a string, null when nothing is stored, or UNREADABLE when the
   * storage holds something it could not give back as text (it threw, or gave another type).
   * @param {string} key
   * @returns {string|null|typeof UNREADABLE}
   */
  readText(key) {
    if (this._memory.has(key)) return this._memory.get(key);
    if (!this.backend) return null;
    try {
      const raw = this.backend.getItem(this._key(key));
      if (raw === null || raw === undefined) return null;
      return typeof raw === 'string' ? raw : UNREADABLE;
    } catch {
      return UNREADABLE;
    }
  }

  /**
   * @param {string} key
   * @param {string} text
   * @returns {boolean} false if it could only be kept in memory
   */
  writeText(key, text) {
    if (this.backend) {
      try {
        this.backend.setItem(this._key(key), text);
        this._memory.delete(key);
        return true;
      } catch {
        // Quota, private mode: kept in memory below, and read back from there.
      }
    }
    this._memory.set(key, text);
    return false;
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
