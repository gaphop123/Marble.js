/**
 * Collision detection & response for Marble.js
 * Priority: Circle vs Circle, Circle vs AABB, Circle vs Polygon
 */

const EPSILON = 1e-6;

export function circleVsCircle(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const r = a.radius + b.radius;
  if (distSq >= r * r || distSq < EPSILON) return null;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const penetration = r - dist;

  return {
    normalX: nx,
    normalY: ny,
    penetration,
    pointX: a.x + nx * a.radius,
    pointY: a.y + ny * a.radius
  };
}

export function circleVsAABB(circle, rect) {
  // Closest point on AABB to circle center
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const distSq = dx * dx + dy * dy;
  const r = circle.radius;

  if (distSq >= r * r) return null;

  let nx, ny, penetration;

  if (distSq < EPSILON) {
    // Circle center inside AABB – push out by smallest axis
    const left = circle.x - rect.x;
    const right = rect.x + rect.width - circle.x;
    const top = circle.y - rect.y;
    const bottom = rect.y + rect.height - circle.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) { nx = -1; ny = 0; penetration = left + r; }
    else if (min === right) { nx = 1; ny = 0; penetration = right + r; }
    else if (min === top) { nx = 0; ny = -1; penetration = top + r; }
    else { nx = 0; ny = 1; penetration = bottom + r; }
  } else {
    const dist = Math.sqrt(distSq);
    nx = dx / dist;
    ny = dy / dist;
    penetration = r - dist;
  }

  return {
    normalX: nx,
    normalY: ny,
    penetration,
    pointX: closestX,
    pointY: closestY
  };
}

export function circleVsPolygon(circle, polygon) {
  // Transform circle into polygon local space if needed (we store world points)
  const points = polygon.getWorldPoints();
  if (points.length < 3) return null;

  let minPenetration = Infinity;
  let bestNX = 0, bestNY = 0;
  let inside = true;

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const edgeX = p2[0] - p1[0];
    const edgeY = p2[1] - p1[1];
    const len = Math.sqrt(edgeX * edgeX + edgeY * edgeY) || 1;
    // Outward normal (assuming CCW)
    let nx = edgeY / len;
    let ny = -edgeX / len;

    // Project circle center onto edge normal
    const dx = circle.x - p1[0];
    const dy = circle.y - p1[1];
    const dist = dx * nx + dy * ny;

    if (dist > circle.radius) {
      // Separating axis
      return null;
    }

    // Distance from center to edge line
    const penetration = circle.radius - dist;
    if (penetration < minPenetration) {
      minPenetration = penetration;
      bestNX = nx;
      bestNY = ny;
    }

    // Also check closest point on edge segment
    const t = Math.max(0, Math.min(1, (dx * edgeX + dy * edgeY) / (len * len)));
    const closestX = p1[0] + t * edgeX;
    const closestY = p1[1] + t * edgeY;
    const cdx = circle.x - closestX;
    const cdy = circle.y - closestY;
    const cDistSq = cdx * cdx + cdy * cdy;
    if (cDistSq < circle.radius * circle.radius) {
      const cDist = Math.sqrt(cDistSq) || EPSILON;
      const cnx = cdx / cDist;
      const cny = cdy / cDist;
      const pen = circle.radius - cDist;
      if (pen < minPenetration) {
        minPenetration = pen;
        bestNX = cnx;
        bestNY = cny;
      }
    }
  }

  // Point-in-polygon fallback for deep penetration
  if (minPenetration === Infinity) return null;

  return {
    normalX: bestNX,
    normalY: bestNY,
    penetration: minPenetration,
    pointX: circle.x - bestNX * circle.radius,
    pointY: circle.y - bestNY * circle.radius
  };
}

/**
 * Resolve velocity response for two dynamic bodies (ball-ball)
 */
export function resolveBallBall(a, b, contact) {
  const nx = contact.normalX;
  const ny = contact.normalY;

  // Relative velocity
  const rvx = b.velocityX - a.velocityX;
  const rvy = b.velocityY - a.velocityY;
  const velAlongNormal = rvx * nx + rvy * ny;

  if (velAlongNormal > 0) return; // separating

  const restitution = Math.min(a.bounce ?? 0.5, b.bounce ?? 0.5);
  const j = -(1 + restitution) * velAlongNormal;
  const invMassA = a.mass > 0 ? 1 / a.mass : 0;
  const invMassB = b.mass > 0 ? 1 / b.mass : 0;
  const invSum = invMassA + invMassB;
  if (invSum < EPSILON) return;

  const impulse = j / invSum;
  const ix = impulse * nx;
  const iy = impulse * ny;

  a.velocityX -= ix * invMassA;
  a.velocityY -= iy * invMassA;
  b.velocityX += ix * invMassB;
  b.velocityY += iy * invMassB;

  // Positional correction
  const percent = 0.8;
  const slop = 0.01;
  const correction = Math.max(contact.penetration - slop, 0) / invSum * percent;
  a.x -= correction * nx * invMassA;
  a.y -= correction * ny * invMassA;
  b.x += correction * nx * invMassB;
  b.y += correction * ny * invMassB;

  a.emit('collision', b, contact);
  b.emit('collision', a, contact);
  a.emit('bounce', contact);
  b.emit('bounce', contact);
}

/**
 * Resolve ball vs static shape
 */
export function resolveBallStatic(ball, contact, surface = null) {
  const nx = contact.normalX;
  const ny = contact.normalY;

  const velAlongNormal = ball.velocityX * nx + ball.velocityY * ny;
  if (velAlongNormal > 0) return;

  const restitution = surface?.bounce ?? ball.bounce ?? 0.5;
  const friction = surface?.friction ?? ball.friction ?? 0.1;

  // Reflect velocity
  ball.velocityX -= (1 + restitution) * velAlongNormal * nx;
  ball.velocityY -= (1 + restitution) * velAlongNormal * ny;

  // Friction (tangent)
  const tx = -ny;
  const ty = nx;
  const velAlongT = ball.velocityX * tx + ball.velocityY * ty;
  const frictionImpulse = Math.min(Math.abs(velAlongT) * friction, Math.abs(velAlongT));
  const sign = velAlongT > 0 ? 1 : -1;
  ball.velocityX -= frictionImpulse * sign * tx;
  ball.velocityY -= frictionImpulse * sign * ty;

  // Positional correction
  const percent = 0.9;
  const slop = 0.01;
  const correction = Math.max(contact.penetration - slop, 0) * percent;
  ball.x += correction * nx;
  ball.y += correction * ny;

  ball.emit('collision', null, contact);
  ball.emit('bounce', contact);
}

/**
 * Spatial Hash Grid for broad-phase
 */
export class SpatialHash {
  constructor(cellSize = 64) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  _key(cx, cy) {
    return `${cx},${cy}`;
  }

  insert(obj) {
    const aabb = obj.getAABB();
    const minCX = Math.floor(aabb.minX / this.cellSize);
    const maxCX = Math.floor(aabb.maxX / this.cellSize);
    const minCY = Math.floor(aabb.minY / this.cellSize);
    const maxCY = Math.floor(aabb.maxY / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = this._key(cx, cy);
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key).push(obj);
      }
    }
  }

  query(obj) {
    const aabb = obj.getAABB();
    const minCX = Math.floor(aabb.minX / this.cellSize);
    const maxCX = Math.floor(aabb.maxX / this.cellSize);
    const minCY = Math.floor(aabb.minY / this.cellSize);
    const maxCY = Math.floor(aabb.maxY / this.cellSize);

    const result = new Set();
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = this._key(cx, cy);
        const cell = this.cells.get(key);
        if (cell) {
          for (const o of cell) {
            if (o !== obj) result.add(o);
          }
        }
      }
    }
    return result;
  }
}
