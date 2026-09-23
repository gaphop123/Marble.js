/**
 * Gravity utilities
 */
export class Gravity {
  constructor(x = 0, y = 980) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
  }

  apply(body, dt) {
    if (body.gravity === 0 || body.physicsMode === 'dvd' || body.physicsMode === 'static') return;
    const gx = body.gravityX !== undefined ? body.gravityX : this.x;
    const gy = body.gravityY !== undefined ? body.gravityY : (body.gravity !== undefined ? body.gravity : this.y);
    body.velocityX += gx * dt;
    body.velocityY += gy * dt;
  }
}
