import { Entity } from '../core/Entity.js';
import { MarbleError, assertNumber, assertBoolean, clamp } from '../core/MarbleError.js';
import { initDVD } from '../physics/modes/DVDPhysics.js';

const COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
  '#ff5722', '#673ab7', '#009688', '#ff9800', '#3f51b5'
];

const NAMES = [
  'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Cyan', 'Orange', 'Pink',
  'Teal', 'Lime', 'Coral', 'Indigo', 'Amber', 'Violet', 'Mint',
  'Ruby', 'Sapphire', 'Emerald', 'Gold', 'Silver', 'Bronze', 'Pearl'
];

export class Ball extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = 'ball';

    // Geometry
    this.radius = options.radius ?? 20;
    assertNumber(this.radius, 'Ball.radius', false);

    // Physics
    this.velocityX = options.velocityX ?? 0;
    this.velocityY = options.velocityY ?? 0;
    this.mass = options.mass ?? (this.radius * this.radius * 0.01);
    this.bounce = clamp(options.bounce ?? 0.6, 0, 1);
    this.friction = options.friction ?? 0.05;
    this.gravity = options.gravity; // undefined = use world
    this.gravityX = options.gravityX;
    this.gravityY = options.gravityY;

    // Mode
    this.physicsMode = options.physics ?? options.physicsMode ?? 'real';
    this.speed = options.speed ?? 250;
    this.dvdSpeed = options.dvd?.speed ?? this.speed;

    if (this.physicsMode === 'dvd') {
      initDVD(this, options.dvd ?? { speed: this.speed, randomDirection: true });
    }

    // Appearance
    this.name = options.name ?? null;
    this.showName = options.showName ?? false;
    this.trail = options.trail ?? false;
    this._trailPoints = [];

    // Custom physics
    this._customUpdate = null;

    // Previous position for interpolation
    this._prevX = this.x;
    this._prevY = this.y;
  }

  setVelocity(vx, vy) {
    assertNumber(vx, 'velocityX');
    assertNumber(vy, 'velocityY');
    this.velocityX = vx;
    this.velocityY = vy;
    return this;
  }

  applyForce(fx, fy) {
    assertNumber(fx, 'forceX');
    assertNumber(fy, 'forceY');
    if (this.mass > 0) {
      this.velocityX += fx / this.mass;
      this.velocityY += fy / this.mass;
    }
    return this;
  }

  setBounce(v) {
    assertNumber(v, 'bounce');
    this.bounce = clamp(v, 0, 1);
    return this;
  }

  setSpeed(s) {
    assertNumber(s, 'speed', false);
    this.speed = s;
    this.dvdSpeed = s;
    return this;
  }

  setPhysics(modeOrConfig) {
    if (typeof modeOrConfig === 'string') {
      this.physicsMode = modeOrConfig;
      if (modeOrConfig === 'dvd') initDVD(this);
    } else if (modeOrConfig && typeof modeOrConfig.update === 'function') {
      this.physicsMode = 'custom';
      this._customUpdate = modeOrConfig.update;
    }
    return this;
  }

  getAABB() {
    return {
      minX: this.x - this.radius,
      minY: this.y - this.radius,
      maxX: this.x + this.radius,
      maxY: this.y + this.radius
    };
  }

  update(dt) {
    this._prevX = this.x;
    this._prevY = this.y;
    if (this.trail) {
      this._trailPoints.push({ x: this.x, y: this.y });
      if (this._trailPoints.length > 20) this._trailPoints.shift();
    }
  }

  render(ctx, alpha = 1) {
    if (!this.visible || this.destroyed) return;

    const rx = this._prevX + (this.x - this._prevX) * alpha;
    const ry = this._prevY + (this.y - this._prevY) * alpha;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Trail
    if (this.trail && this._trailPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this._trailPoints[0].x, this._trailPoints[0].y);
      for (let i = 1; i < this._trailPoints.length; i++) {
        ctx.lineTo(this._trailPoints[i].x, this._trailPoints[i].y);
      }
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = this.opacity * 0.3;
      ctx.lineWidth = this.radius * 0.5;
      ctx.stroke();
      ctx.globalAlpha = this.opacity;
    }

    // Ball body
    ctx.beginPath();
    ctx.arc(rx, ry, this.radius * this.scale, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(rx - this.radius * 0.3, ry - this.radius * 0.3, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();

    // Name
    if (this.showName && this.name) {
      ctx.font = `bold ${Math.max(10, this.radius * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(this.name, rx, ry);
      ctx.fillText(this.name, rx, ry);
    }

    ctx.restore();
  }

  /** Static helpers */
  static random(options = {}) {
    const minR = options.minRadius ?? 12;
    const maxR = options.maxRadius ?? 28;
    const radius = minR + Math.random() * (maxR - minR);
    const color = options.color ?? COLORS[Math.floor(Math.random() * COLORS.length)];
    const name = options.name ?? NAMES[Math.floor(Math.random() * NAMES.length)];
    return new Ball({
      x: options.x ?? 100,
      y: options.y ?? 100,
      radius,
      color,
      name,
      mass: radius * radius * 0.01,
      bounce: options.bounce ?? (0.4 + Math.random() * 0.4),
      friction: options.friction ?? 0.05,
      physics: options.physics ?? 'real',
      velocityX: options.velocityX ?? (Math.random() - 0.5) * 100,
      velocityY: options.velocityY ?? 0,
      ...options
    });
  }
}

// Alias
export { Ball as MarbleBall };
