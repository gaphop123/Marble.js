import { EventEmitter } from './EventEmitter.js';
import { MarbleError, assertNumber, assertBoolean, assertString, clamp } from './MarbleError.js';

let _nextId = 1;

/**
 * Base Entity for all game objects
 */
export class Entity extends EventEmitter {
  constructor(options = {}) {
    super();
    this.id = _nextId++;
    this.type = 'entity';

    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.rotation = options.rotation ?? 0;
    this.scale = options.scale ?? 1;

    this.color = options.color ?? '#ffffff';
    this.opacity = options.opacity ?? 1;
    this.visible = options.visible !== false;

    this.collision = options.collision !== false;
    this.destroyed = false;

    this.surface = options.surface ?? null;

    // Internal
    this._world = null;
    this._game = null;
  }

  setPosition(x, y) {
    assertNumber(x, 'x');
    assertNumber(y, 'y');
    this.x = x;
    this.y = y;
    return this;
  }

  setRotation(angle) {
    assertNumber(angle, 'rotation');
    this.rotation = angle;
    return this;
  }

  setScale(s) {
    assertNumber(s, 'scale');
    this.scale = s;
    return this;
  }

  setColor(color) {
    assertString(color, 'color');
    this.color = color;
    return this;
  }

  setOpacity(o) {
    assertNumber(o, 'opacity');
    this.opacity = clamp(o, 0, 1);
    return this;
  }

  show() {
    this.visible = true;
    return this;
  }

  hide() {
    this.visible = false;
    return this;
  }

  enableCollision() {
    this.collision = true;
    return this;
  }

  disableCollision() {
    this.collision = false;
    return this;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit('destroy', this);
    if (this._world) {
      this._world.remove(this);
    }
  }

  /** Override in subclasses */
  update(dt) {}
  render(ctx, camera) {}

  /** AABB for broad-phase (override) */
  getAABB() {
    return { minX: this.x, minY: this.y, maxX: this.x, maxY: this.y };
  }
}
