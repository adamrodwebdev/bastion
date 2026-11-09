/**
 * @file One save under its key, read through the door once (the user's rule of 9 November 2026).
 */

import { InputRecord, orElse } from '../core/input.js';

/**
 * One save under its key: a text no longer than the save's limit, then JSON, then a record,
 * which its owner reads field by field. A stored value it cannot read (too long, not JSON, not
 * a record, a version the game does not know, a storage that failed to give it back) is kept:
 * the game plays on from its defaults, and only the player's own progress or choice (a level
 * won, an upgrade bought, a setting changed) is saved over it, never what the game notes by
 * itself (a story read, a tutorial seen, the portal's language, the system's colours). A text
 * over the limit is never written: the game could not read it back.
 */
export class SaveSlot {
  #storage;
  #key;
  #maxLength;
  /** What was saved, read through the door: a record, or null when nothing was or it could not be read. */
  #saved;
  /** The stored value could not be read: it stays until the player's progress replaces it. */
  #kept;

  /**
   * @param {import('./StorageService.js').StorageService} storage
   * @param {string} key
   * @param {number} maxLength the longest text read back, in UTF-16 units (SAVE_LIMITS)
   */
  constructor(storage, key, maxLength) {
    this.#storage = storage;
    this.#key = key;
    this.#maxLength = maxLength;
    const stored = storage.readText(key);
    this.#saved = typeof stored === 'string' ? orElse(() => InputRecord.parse(stored, maxLength, key), null) : null;
    this.#kept = stored !== null && this.#saved === null;
  }

  /** @returns {InputRecord|null} the record read at start, for its owner to read field by field */
  get saved() {
    return this.#saved;
  }

  /** True while the stored value could not be read and no progress has replaced it. */
  get kept() {
    return this.#kept;
  }

  /** The owner cannot read the record either (a version it does not know): keep it like text that is not JSON. */
  keep() {
    this.#saved = null;
    this.#kept = true;
  }

  /**
   * The player's progress or own choice: saved, over a value that could not be read too.
   * @param {unknown} value
   * @returns {boolean} false when the value is too long to be read back (nothing written)
   */
  write(value) {
    return this.#store(value, true);
  }

  /**
   * What the game notes by itself: saved, but never over a value that could not be read.
   * @param {unknown} value
   * @returns {boolean} false when nothing was written
   */
  note(value) {
    return this.#store(value, false);
  }

  /** The player drops it (a new level started, a reset). */
  clear() {
    this.#kept = false;
    this.#saved = null;
    this.#storage.remove(this.#key);
  }

  #store(value, progress) {
    if (this.#kept && !progress) return false;
    const text = JSON.stringify(value);
    if (text.length > this.#maxLength) return false;
    this.#kept = false;
    this.#storage.writeText(this.#key, text);
    return true;
  }
}
