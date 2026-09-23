import { Gravity } from './Gravity.js';
import { Solver } from './Solver.js';
import { updateReal } from './modes/RealPhysics.js';
import { updateDVD, initDVD } from './modes/DVDPhysics.js';
import { updateCustom } from './modes/CustomPhysics.js';

/**
 * PhysicsWorld – owns gravity, timestep, and solves collisions
 */
export class PhysicsWorld {
  constructor(options = {}) {
    this.gravity = new Gravity(options.gravityX ?? 0, options.gravityY ?? options.gravity ?? 980);
    this.solver = new Solver({ cellSize: options.cellSize ?? 80 });
    this.fixedDt = options.fixedDt ?? 1 / 60;
    this.accumulator = 0;
    this.maxSubSteps = options.maxSubSteps ?? 5;
    this.bounds = options.bounds ?? null;
    this.boundsMode = options.boundsMode ?? 'bounce'; // bounce | destroy | wrap
  }

  setGravity(x, y) {
    if (y === undefined) {
      this.gravity.set(0, x);
    } else {
      this.gravity.set(x, y);
    }
  }

  setBounds(bounds, mode = 'bounce') {
    this.bounds = bounds;
    this.boundsMode = mode;
  }

  /**
   * Integrate physics with fixed timestep
   */
  step(balls, statics, specials, dt) {
    this.accumulator += dt;
    let steps = 0;

    while (this.accumulator >= this.fixedDt && steps < this.maxSubSteps) {
      this._integrate(balls, this.fixedDt);
      this.solver.solve(balls, statics, specials);
      this._handleBounds(balls);
      this.accumulator -= this.fixedDt;
      steps++;
    }

    // Remaining fraction for interpolation (optional)
    return this.accumulator / this.fixedDt;
  }

  _integrate(balls, dt) {
    for (const ball of balls) {
      if (ball.destroyed || ball.physicsMode === 'static') continue;

      switch (ball.physicsMode) {
        case 'dvd':
          updateDVD(ball, dt, this.bounds);
          break;
        case 'custom':
          updateCustom(ball, dt);
          break;
        case 'ghost':
          // still move but no collision handled elsewhere
          ball.x += ball.velocityX * dt;
          ball.y += ball.velocityY * dt;
          break;
        case 'real':
        default:
          updateReal(ball, dt, this.gravity);
          break;
      }
    }
  }

  _handleBounds(balls) {
    if (!this.bounds) return;
    const { left, top, right, bottom } = this.bounds;

    for (const ball of balls) {
      if (ball.destroyed || ball.physicsMode === 'dvd') continue; // DVD handles own bounds
      const r = ball.radius;

      if (this.boundsMode === 'bounce') {
        if (ball.x - r < left) {
          ball.x = left + r;
          ball.velocityX = Math.abs(ball.velocityX) * (ball.bounce ?? 0.5);
        } else if (ball.x + r > right) {
          ball.x = right - r;
          ball.velocityX = -Math.abs(ball.velocityX) * (ball.bounce ?? 0.5);
        }
        if (ball.y - r < top) {
          ball.y = top + r;
          ball.velocityY = Math.abs(ball.velocityY) * (ball.bounce ?? 0.5);
        } else if (ball.y + r > bottom) {
          ball.y = bottom - r;
          ball.velocityY = -Math.abs(ball.velocityY) * (ball.bounce ?? 0.5);
        }
      } else if (this.boundsMode === 'destroy') {
        if (ball.x + r < left || ball.x - r > right || ball.y + r < top || ball.y - r > bottom) {
          ball.destroy();
        }
      } else if (this.boundsMode === 'wrap') {
        if (ball.x + r < left) ball.x = right + r;
        else if (ball.x - r > right) ball.x = left - r;
        if (ball.y + r < top) ball.y = bottom + r;
        else if (ball.y - r > bottom) ball.y = top - r;
      }
    }
  }

  get collisionCount() {
    return this.solver.collisionCount;
  }
}
