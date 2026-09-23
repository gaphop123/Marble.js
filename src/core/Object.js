import { Entity } from './Entity.js';

/**
 * Static / kinematic game object base (walls, platforms, etc.)
 */
export class GameObject extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = 'object';
    this.width = options.width ?? 0;
    this.height = options.height ?? 0;
    this.static = options.static !== false;
  }

  setSize(w, h) {
    this.width = w;
    this.height = h;
    return this;
  }
}
