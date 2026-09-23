import { GameObject } from '../core/Object.js';
import { assertNumber } from '../core/MarbleError.js';

export class Circle extends GameObject {
  constructor(options = {}) {
    super(options);
    this.type = 'circle';
    this.radius = options.radius ?? 20;
    assertNumber(this.radius, 'Circle.radius', false);
  }

  getAABB() {
    return {
      minX: this.x - this.radius,
      minY: this.y - this.radius,
      maxX: this.x + this.radius,
      maxY: this.y + this.radius
    };
  }

  render(ctx) {
    if (!this.visible || this.destroyed) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * this.scale, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}
