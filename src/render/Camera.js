/**
 * 2D Camera with follow and zoom
 */
export class Camera {
  constructor(options = {}) {
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.zoom = options.zoom ?? 1;
    this.width = options.width ?? 1280;
    this.height = options.height ?? 720;
    this._followTarget = null;
    this.lerp = options.lerp ?? 0.1;
    this.bounds = options.bounds ?? null;
  }

  follow(target) {
    this._followTarget = target;
    return this;
  }

  unfollow() {
    this._followTarget = null;
    return this;
  }

  setZoom(z) {
    this.zoom = Math.max(0.1, Math.min(5, z));
    return this;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  update() {
    if (this._followTarget && !this._followTarget.destroyed) {
      const tx = this._followTarget.x - this.width / (2 * this.zoom);
      const ty = this._followTarget.y - this.height / (2 * this.zoom);
      this.x += (tx - this.x) * this.lerp;
      this.y += (ty - this.y) * this.lerp;
    }

    if (this.bounds) {
      const maxX = this.bounds.right - this.width / this.zoom;
      const maxY = this.bounds.bottom - this.height / this.zoom;
      this.x = Math.max(this.bounds.left, Math.min(this.x, maxX));
      this.y = Math.max(this.bounds.top, Math.min(this.y, maxY));
    }
  }

  apply(ctx) {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, -this.x * this.zoom, -this.y * this.zoom);
  }

  reset(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Screen to world */
  screenToWorld(sx, sy) {
    return {
      x: sx / this.zoom + this.x,
      y: sy / this.zoom + this.y
    };
  }
}
