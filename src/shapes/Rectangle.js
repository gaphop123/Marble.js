import { GameObject } from '../core/Object.js';
import { assertNumber } from '../core/MarbleError.js';

export class Rectangle extends GameObject {
  constructor(options = {}) {
    super(options);
    this.type = 'rectangle';
    this.width = options.width ?? 100;
    this.height = options.height ?? 40;
    assertNumber(this.width, 'Rectangle.width', false);
    assertNumber(this.height, 'Rectangle.height', false);
  }

  getAABB() {
    return {
      minX: this.x,
      minY: this.y,
      maxX: this.x + this.width,
      maxY: this.y + this.height
    };
  }

  render(ctx) {
    if (!this.visible || this.destroyed) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    // subtle border
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}
