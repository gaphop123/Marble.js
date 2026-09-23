import {
  circleVsCircle,
  circleVsAABB,
  circleVsPolygon,
  resolveBallBall,
  resolveBallStatic,
  SpatialHash
} from './Collision.js';

/**
 * Physics solver – broad phase + narrow phase + response
 */
export class Solver {
  constructor(options = {}) {
    this.spatial = new SpatialHash(options.cellSize ?? 80);
    this.collisionCount = 0;
  }

  /**
   * Resolve all collisions for dynamic balls against everything
   */
  solve(balls, statics, specials) {
    this.collisionCount = 0;
    this.spatial.clear();

    // Insert all collidable objects
    for (const b of balls) {
      if (b.collision && !b.destroyed) this.spatial.insert(b);
    }
    for (const s of statics) {
      if (s.collision && !s.destroyed) this.spatial.insert(s);
    }
    for (const sp of specials) {
      if (sp.collision && !sp.destroyed) this.spatial.insert(sp);
    }

    // Ball vs Ball
    const checked = new Set();
    for (const a of balls) {
      if (!a.collision || a.destroyed || a.physicsMode === 'ghost') continue;
      const candidates = this.spatial.query(a);
      for (const b of candidates) {
        if (b.type !== 'ball' || !b.collision || b.destroyed || b.physicsMode === 'ghost') continue;
        if (a.id >= b.id) continue; // avoid double
        const key = `${a.id}-${b.id}`;
        if (checked.has(key)) continue;
        checked.add(key);

        const contact = circleVsCircle(a, b);
        if (contact) {
          resolveBallBall(a, b, contact);
          this.collisionCount++;
        }
      }
    }

    // Ball vs Static / Special
    for (const ball of balls) {
      if (!ball.collision || ball.destroyed || ball.physicsMode === 'ghost') continue;
      const candidates = this.spatial.query(ball);

      for (const other of candidates) {
        if (other.type === 'ball' || !other.collision || other.destroyed) continue;

        let contact = null;
        if (other.type === 'rectangle' || other.type === 'square' || other.type === 'lava' || other.type === 'platform') {
          contact = circleVsAABB(ball, other);
        } else if (other.type === 'circle' || other.type === 'goal' || other.type === 'checkpoint' || other.type === 'teleport') {
          contact = circleVsCircle(ball, other);
        } else if (other.type === 'polygon') {
          contact = circleVsPolygon(ball, other);
        }

        if (contact) {
          // Special objects handle their own response
          if (other.onCollision) {
            other.onCollision(ball, contact);
          } else {
            resolveBallStatic(ball, contact, other.surface);
          }
          this.collisionCount++;
        }
      }
    }
  }
}
