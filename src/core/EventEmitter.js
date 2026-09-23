/**
 * Lightweight EventEmitter for Marble.js objects and game
 */
export class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('EventEmitter.on: callback must be a function');
    }
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return this;
  }

  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  off(event, callback) {
    if (!this._listeners.has(event)) return this;
    if (!callback) {
      this._listeners.delete(event);
      return this;
    }
    const list = this._listeners.get(event);
    const idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
    return this;
  }

  emit(event, ...args) {
    if (!this._listeners.has(event)) return this;
    const list = this._listeners.get(event).slice();
    for (const cb of list) {
      try {
        cb(...args);
      } catch (err) {
        console.error(`Marble.js event "${event}" handler error:`, err);
      }
    }
    return this;
  }

  removeAllListeners() {
    this._listeners.clear();
    return this;
  }
}
