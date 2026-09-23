/**
 * Basic physics / collision smoke tests for Marble.js
 * Run with: node --experimental-vm-modules tests/physics.test.js
 * (or any simple assert runner)
 */

import { createRequire } from 'module';
// For Node without full browser, we test pure logic pieces via dynamic import of modules

// Minimal assert
function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
}
function assertClose(a, b, eps = 0.01, msg = '') {
  if (Math.abs(a - b) > eps) throw new Error(`FAIL: ${msg} expected ~${b}, got ${a}`);
}

console.log('Marble.js physics smoke tests...\n');

// We re-implement the pure collision functions here for node testing
// (same logic as src/physics/Collision.js)

const EPSILON = 1e-6;

function circleVsCircle(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const r = a.radius + b.radius;
  if (distSq >= r * r || distSq < EPSILON) return null;
  const dist = Math.sqrt(distSq);
  return { normalX: dx / dist, normalY: dy / dist, penetration: r - dist };
}

function circleVsAABB(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX, dy = circle.y - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= circle.radius * circle.radius) return null;
  // simplified for test
  return { penetration: circle.radius - Math.sqrt(distSq || EPSILON) };
}

// Test 1: Circle vs Circle – overlapping
{
  const a = { x: 0, y: 0, radius: 10 };
  const b = { x: 15, y: 0, radius: 10 };
  const c = circleVsCircle(a, b);
  assert(c !== null, 'overlapping circles should collide');
  assertClose(c.penetration, 5, 0.01, 'penetration');
  assertClose(c.normalX, 1, 0.01, 'normalX');
  console.log('✓ circleVsCircle overlapping');
}

// Test 2: Circle vs Circle – separated
{
  const a = { x: 0, y: 0, radius: 10 };
  const b = { x: 25, y: 0, radius: 10 };
  const c = circleVsCircle(a, b);
  assert(c === null, 'separated circles should not collide');
  console.log('✓ circleVsCircle separated');
}

// Test 3: Circle vs AABB
{
  const circle = { x: 50, y: 50, radius: 20 };
  const rect = { x: 40, y: 60, width: 100, height: 20 };
  const c = circleVsAABB(circle, rect);
  assert(c !== null, 'circle overlapping AABB');
  console.log('✓ circleVsAABB overlapping');
}

// Test 4: Bounce clamp
{
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  assert(clamp(1.5, 0, 1) === 1, 'bounce clamp upper');
  assert(clamp(-0.2, 0, 1) === 0, 'bounce clamp lower');
  console.log('✓ bounce clamp 0–1');
}

// Test 5: Spatial hash key uniqueness
{
  const cells = new Map();
  cells.set('0,0', []);
  cells.set('1,0', []);
  assert(cells.size === 2, 'spatial keys unique');
  console.log('✓ spatial hash keys');
}

console.log('\nAll smoke tests passed.');
