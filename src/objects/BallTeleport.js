import { Circle } from '../shapes/Circle.js';

export class BallTeleport extends Circle {
  constructor(options = {}) {
    super({
      radius: options.radius ?? 25,
      color: options.color ?? '#00ffff',
      ...options
    });
    this.type = 'teleport';
    this.targetX = options.targetX ?? 100;
    this.targetY = options.targetY ?? 100;
    this.cooldown = options.cooldown ?? 0.5;
    this._lastTeleport = new Map();
    this._spin = 0;
  }

  onCollision(ball) {
    const now = performance.now() / 1000;
    const last = this._lastTeleport.get(ball.id) ?? 0;
    if (now - last < this.cooldown) return;

    this._lastTeleport.set(ball.id, now);
    ball.setPosition(this.targetX, this.targetY);
    // Optional: slight velocity reset or keep
    ball.emit('teleport', this);
    this.emit('teleport', ball);
  }

  update(dt) {
    this._spin += dt * 4;
  }

  render(ctx) {
    if (!this.visible || this.destroyed) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Portal rings
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * (0.5 + i * 0.25), 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = this.opacity * (0.8 - i * 0.2);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Spinning indicator
    ctx.translate(this.x, this.y);
    ctx.rotate(this._spin);
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 0.3);
    ctx.lineTo(this.radius * 0.3, 0);
    ctx.lineTo(0, this.radius * 0.3);
    ctx.lineTo(-this.radius * 0.3, 0);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity * 0.6;
    ctx.fill();

    ctx.restore();
  }
}
