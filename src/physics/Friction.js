/**
 * Friction helper
 */
export function applyFriction(body, friction, dt) {
  if (friction <= 0) return;
  const factor = Math.max(0, 1 - friction * dt * 60); // scale roughly to 60fps
  body.velocityX *= factor;
  body.velocityY *= factor;
}

export function applySurfaceFriction(body, surfaceFriction) {
  if (!surfaceFriction || surfaceFriction <= 0) return;
  body.velocityX *= (1 - surfaceFriction);
  body.velocityY *= (1 - surfaceFriction * 0.3); // less on vertical
}
