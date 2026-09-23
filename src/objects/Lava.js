import { Rectangle } from '../shapes/Rectangle.js';

export class Lava extends Rectangle {
  constructor(options = {}) {
    super({
      color: options.color ?? '#ff3300',
      ...options
    });
    this.type = 'lava';
    this._onTouch = options.onTouch ?? null;
    this.animated = options.animated !== false;
    this._time = 0;
  }

  onTouch(callback) {
    this._onTouch = callback;
    return this;
  }

  onCollision(ball) {
    this.emit('touch', ball);
    if (this._onTouch) {
      this._onTouch(ball);
    } else {
      ball.destroy();
    }
  }

  update(dt) {
    this._time += dt;
  }

  render(ctx) {
    if (!this.visible || this.destroyed) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Animated lava look
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    gradient.addColorStop(0, '#ff6600');
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, '#cc1100');
    ctx.fillStyle = gradient;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Bubbles
    if (this.animated) {
      ctx.fillStyle = 'rgba(255,200,50,0.4)';
      for (let i = 0; i < 8; i++) {
        const bx = this.x + ((i * 97 + this._time * 40) % this.width);
        const by = this.y + 10 + Math.sin(this._time * 3 + i) * 8;
        ctx.beginPath();
        ctx.arc(bx, by, 4 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
