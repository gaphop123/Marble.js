import { EventEmitter } from './EventEmitter.js';

/**
 * World – container for entities, acts as a scene
 */
export class World extends EventEmitter {
  constructor(options = {}) {
    super();
    this.width = options.width ?? 1280;
    this.height = options.height ?? 720;
    this.balls = [];
    this.statics = [];
    this.specials = [];
    this.ui = [];
    this._all = [];
  }

  add(obj) {
    if (!obj || obj.destroyed) return this;
    obj._world = this;
    if (obj.type === 'ball') {
      this.balls.push(obj);
    } else if (obj.type === 'lava' || obj.type === 'goal' || obj.type === 'checkpoint' || obj.type === 'teleport') {
      this.specials.push(obj);
    } else if (obj.type === 'text' || obj.type === 'counter' || obj.type === 'timer' || obj.type === 'panel') {
      this.ui.push(obj);
    } else {
      this.statics.push(obj);
    }
    this._all.push(obj);
    this.emit('add', obj);
    return this;
  }

  remove(obj) {
    const removeFrom = (arr) => {
      const i = arr.indexOf(obj);
      if (i !== -1) arr.splice(i, 1);
    };
    removeFrom(this.balls);
    removeFrom(this.statics);
    removeFrom(this.specials);
    removeFrom(this.ui);
    removeFrom(this._all);
    obj._world = null;
    this.emit('remove', obj);
    return this;
  }

  clear() {
    for (const o of this._all.slice()) {
      o.destroy();
    }
    this.balls.length = 0;
    this.statics.length = 0;
    this.specials.length = 0;
    this.ui.length = 0;
    this._all.length = 0;
  }

  get objects() {
    return this._all;
  }

  getObjectCount() {
    return this._all.filter(o => !o.destroyed).length;
  }
}
