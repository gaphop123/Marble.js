import { Entity } from '../core/Entity.js';
import { assertString, assertNumber } from '../core/MarbleError.js';

export class Text extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = 'text';
    this.text = options.text ?? '';
    this.size = options.size ?? 24;
    this.font = options.font ?? 'sans-serif';
    this.align = options.align ?? 'left';
    this.baseline = options.baseline ?? 'top';
    this.bold = options.bold ?? false;
    this.stroke = options.stroke ?? false;
    this.strokeColor = options.strokeColor ?? '#000';
    this.strokeWidth = options.strokeWidth ?? 3;
  }

  setText(t) {
    assertString(t, 'text');
    this.text = t;
    return this;
  }

  setSize(s) {
    assertNumber(s, 'size', false);
    this.size = s;
    return this;
  }

  render(ctx) {
    if (!this.visible || this.destroyed) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.font = `${this.bold ? 'bold ' : ''}${this.size}px ${this.font}`;
    ctx.textAlign = this.align;
    ctx.textBaseline = this.baseline;
    if (this.stroke) {
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = this.strokeWidth;
      ctx.strokeText(this.text, this.x, this.y);
    }
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}
