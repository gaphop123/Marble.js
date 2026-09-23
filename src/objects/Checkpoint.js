import { Circle } from '../shapes/Circle.js';

export class Checkpoint extends Circle {
  constructor(options = {}) {
    super({
      radius: options.radius ?? 30,
      color: options.color ?? '#3498db',
      ...options
    });
    this.type = 'checkpoint';
    this._onReach = options.onReach ?? null;
    this.activated = new Set();
    this._pulse = 0;
  }

  onReach(callback) {
    this._onReach = callback;
    return this;
  }

  onCollision(ball) {
    if (this.activated.has(ball.id)) return;
    this.activated.add(ball.id);
    ball._lastCheckpoint = { x: this.x, y: this.y };
    this.emit('reach', ball);
    if (this._onReach) this._onReach(ball);
  }

  update(dt) {
    this._pulse += dt * 2;
  }

  render(ctx) {
    if (!this.visible || this.destroyed) return;
    ctx.save();
    ctx.globalAlpha = this.opacity * 0.7;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (1 + Math.sin(this._pulse) * 0.1), 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity * 0.2;
    ctx.fill();
    ctx.restore();
  }
}
