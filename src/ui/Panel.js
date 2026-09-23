import { Entity } from '../core/Entity.js';

export class Panel extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = 'panel';
    this.width = options.width ?? 200;
    this.height = options.height ?? 100;
    this.background = options.background ?? 'rgba(0,0,0,0.6)';
    this.borderColor = options.borderColor ?? 'rgba(255,255,255,0.2)';
    this.borderWidth = options.borderWidth ?? 2;
    this.radius = options.radius ?? 8;
    this.children = [];
  }

  add(child) {
    this.children.push(child);
    return this;
  }

  render(ctx) {
    if (!this.visible || this.destroyed) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.background;
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = this.borderWidth;

    const x = this.x, y = this.y, w = this.width, h = this.height, r = this.radius;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    if (this.borderWidth > 0) ctx.stroke();

    for (const child of this.children) {
      child.render(ctx);
    }
    ctx.restore();
  }
}
