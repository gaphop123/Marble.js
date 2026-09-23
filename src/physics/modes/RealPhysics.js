import { Gravity } from '../Gravity.js';
import { applyFriction } from '../Friction.js';

/**
 * Real physics mode: gravity, velocity, friction, bounce
 */
export function updateReal(ball, dt, worldGravity) {
  // Apply gravity (per-ball or global)
  if (ball.gravity !== 0) {
    const gx = ball.gravityX !== undefined ? ball.gravityX : worldGravity.x;
    const gy = ball.gravityY !== undefined ? ball.gravityY : (typeof ball.gravity === 'number' ? ball.gravity : worldGravity.y);
    ball.velocityX += gx * dt;
    ball.velocityY += gy * dt;
  }

  // Apply velocity
  ball.x += ball.velocityX * dt;
  ball.y += ball.velocityY * dt;

  // Air friction / drag
  if (ball.friction > 0) {
    applyFriction(ball, ball.friction * 0.02, dt);
  }
}
