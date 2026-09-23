/**
 * DVD Screensaver style physics
 * Constant speed, bounce off bounds / walls, no gravity
 */
export function updateDVD(ball, dt, bounds) {
  // Ensure velocity magnitude matches speed
  const speed = ball.dvdSpeed ?? ball.speed ?? 250;
  const mag = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
  if (mag < 1e-6) {
    // Random initial direction
    const angle = Math.random() * Math.PI * 2;
    ball.velocityX = Math.cos(angle) * speed;
    ball.velocityY = Math.sin(angle) * speed;
  } else {
    // Normalize to constant speed
    ball.velocityX = (ball.velocityX / mag) * speed;
    ball.velocityY = (ball.velocityY / mag) * speed;
  }

  ball.x += ball.velocityX * dt;
  ball.y += ball.velocityY * dt;

  // Bounds bounce (if provided)
  if (bounds) {
    const r = ball.radius;
    if (ball.x - r < bounds.left) {
      ball.x = bounds.left + r;
      ball.velocityX = Math.abs(ball.velocityX);
      ball.emit('bounce');
    } else if (ball.x + r > bounds.right) {
      ball.x = bounds.right - r;
      ball.velocityX = -Math.abs(ball.velocityX);
      ball.emit('bounce');
    }
    if (ball.y - r < bounds.top) {
      ball.y = bounds.top + r;
      ball.velocityY = Math.abs(ball.velocityY);
      ball.emit('bounce');
    } else if (ball.y + r > bounds.bottom) {
      ball.y = bounds.bottom - r;
      ball.velocityY = -Math.abs(ball.velocityY);
      ball.emit('bounce');
    }
  }
}

export function initDVD(ball, options = {}) {
  const speed = options.speed ?? ball.speed ?? 250;
  ball.dvdSpeed = speed;
  ball.speed = speed;
  if (options.randomDirection !== false) {
    const angle = Math.random() * Math.PI * 2;
    ball.velocityX = Math.cos(angle) * speed;
    ball.velocityY = Math.sin(angle) * speed;
  } else if (ball.velocityX === 0 && ball.velocityY === 0) {
    ball.velocityX = speed;
    ball.velocityY = speed * 0.6;
  }
}
