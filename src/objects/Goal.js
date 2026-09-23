import { Circle } from '../shapes/Circle.js';

export class Goal extends Circle {
  constructor(options = {}) {
    super({
      radius: options.radius ?? 40,
      color: options.color ?? '#2ecc71',
      ...options
    });
    this.type = 'goal';
    this._onEnter = options.onEnter ?? null;
    this.triggered = new Set();
    this._pulse = 0;
  }

  onEnter(callback) {
    this._onEnter = callback;
    return this;
  }

  onCollision(ball) {
    if (this.triggered.has(ball.id)) return;
    this.triggered.add(ball.id);
    this.emit('enter', ball);
    ball.emit('goal', this);
    if (this._onEnter) this._onEnter(ball);
  }

  update(dt) {
    this._pulse += dt * 3;
  }

  render(ctx) {
    if (!this.visible || this.destroyed) return;
    const pulse = 1 + Math.sin(this._pulse) * 0.08;
    ctx.save();
    ctx.globalAlpha = this.opacity * 0.9;

    // Outer ring
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * pulse * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner fill
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity * 0.35;
    ctx.fill();

    // Checkmark / flag feel
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${this.radius * 0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', this.x, this.y);

    ctx.restore();
  }
}
