/**
 * @file Tiny publish/subscribe base class used by the engine and the services.
 */

/**
 * Minimal publish/subscribe base class.
 * Most engine objects and services extend it so the UI layer (Vue)
 * can react to what happens without the engine knowing about Vue.
 */
export class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  /** Subscribe; returns an unsubscribe function. */
  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const set = this._listeners.get(event);
    if (set) set.delete(handler);
  }

  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const handler of [...set]) handler(payload);
  }

  removeAllListeners() {
    this._listeners.clear();
  }
}
