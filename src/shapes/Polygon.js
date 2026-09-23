import { GameObject } from '../core/Object.js';
import { MarbleError } from '../core/MarbleError.js';

export class Polygon extends GameObject {
  constructor(options = {}) {
    super(options);
    this.type = 'polygon';
    this.points = options.points ?? [[0, -40], [40, 40], [-40, 40]];
    if (!Array.isArray(this.points) || this.points.length < 3) {
      throw new MarbleError('Polygon.points must be an array of at least 3 [x,y] pairs.');
    }
  }

  getWorldPoints() {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    return this.points.map(([px, py]) => {
      const sx = px * this.scale;
      const sy = py * this.scale;
      return [
        this.x + sx * cos - sy * sin,
        this.y + sx * sin + sy * cos
      ];
    });
  }

  getAABB() {
    const pts = this.getWorldPoints();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
  }

  render(ctx) {
    if (!this.visible || this.destroyed) return;
    const pts = this.getWorldPoints();
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
