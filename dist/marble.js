/**
 * Marble.js v1.0.0
 * 2D Marble Race / Simulation Library
 * Bundled for browser (IIFE)
 */
(function (global) {
  'use strict';

  // ========== MarbleError ==========
  class MarbleError extends Error {
    constructor(message, received = null) {
      const full = received !== null
        ? `MarbleError: ${message}\nReceived: ${typeof received === 'object' ? JSON.stringify(received) : String(received)}`
        : `MarbleError: ${message}`;
      super(full);
      this.name = 'MarbleError';
    }
  }
  function assertNumber(value, name, allowNegative = true) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new MarbleError(`${name} must be a number.`, typeof value);
    }
    if (!allowNegative && value < 0) {
      throw new MarbleError(`${name} must be >= 0.`, value);
    }
  }
  function assertString(value, name) {
    if (typeof value !== 'string') throw new MarbleError(`${name} must be a string.`, typeof value);
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // ========== EventEmitter ==========
  class EventEmitter {
    constructor() { this._listeners = new Map(); }
    on(event, callback) {
      if (typeof callback !== 'function') throw new Error('callback must be a function');
      if (!this._listeners.has(event)) this._listeners.set(event, []);
      this._listeners.get(event).push(callback);
      return this;
    }
    once(event, callback) {
      const wrapper = (...args) => { this.off(event, wrapper); callback(...args); };
      return this.on(event, wrapper);
    }
    off(event, callback) {
      if (!this._listeners.has(event)) return this;
      if (!callback) { this._listeners.delete(event); return this; }
      const list = this._listeners.get(event);
      const idx = list.indexOf(callback);
      if (idx !== -1) list.splice(idx, 1);
      return this;
    }
    emit(event, ...args) {
      if (!this._listeners.has(event)) return this;
      for (const cb of this._listeners.get(event).slice()) {
        try { cb(...args); } catch (err) { console.error(`Marble.js event "${event}" error:`, err); }
      }
      return this;
    }
    removeAllListeners() { this._listeners.clear(); return this; }
  }

  // ========== Entity ==========
  let _nextId = 1;
  class Entity extends EventEmitter {
    constructor(options = {}) {
      super();
      this.id = _nextId++;
      this.type = 'entity';
      this.x = options.x ?? 0;
      this.y = options.y ?? 0;
      this.rotation = options.rotation ?? 0;
      this.scale = options.scale ?? 1;
      this.color = options.color ?? '#ffffff';
      this.opacity = options.opacity ?? 1;
      this.visible = options.visible !== false;
      this.collision = options.collision !== false;
      this.destroyed = false;
      this.surface = options.surface ?? null;
      this._world = null;
      this._game = null;
    }
    setPosition(x, y) { assertNumber(x, 'x'); assertNumber(y, 'y'); this.x = x; this.y = y; return this; }
    setRotation(angle) { assertNumber(angle, 'rotation'); this.rotation = angle; return this; }
    setScale(s) { assertNumber(s, 'scale'); this.scale = s; return this; }
    setColor(color) { assertString(color, 'color'); this.color = color; return this; }
    setOpacity(o) { assertNumber(o, 'opacity'); this.opacity = clamp(o, 0, 1); return this; }
    show() { this.visible = true; return this; }
    hide() { this.visible = false; return this; }
    enableCollision() { this.collision = true; return this; }
    disableCollision() { this.collision = false; return this; }
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.emit('destroy', this);
      if (this._world) this._world.remove(this);
    }
    update(dt) {}
    render(ctx, camera) {}
    getAABB() { return { minX: this.x, minY: this.y, maxX: this.x, maxY: this.y }; }
  }

  class GameObject extends Entity {
    constructor(options = {}) {
      super(options);
      this.type = 'object';
      this.width = options.width ?? 0;
      this.height = options.height ?? 0;
      this.static = options.static !== false;
    }
    setSize(w, h) { this.width = w; this.height = h; return this; }
  }

  // ========== Physics ==========
  class Gravity {
    constructor(x = 0, y = 980) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; }
  }

  function applyFriction(body, friction, dt) {
    if (friction <= 0) return;
    const factor = Math.max(0, 1 - friction * dt * 60);
    body.velocityX *= factor;
    body.velocityY *= factor;
  }

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
    const r = circle.radius;
    if (distSq >= r * r) return null;
    let nx, ny, penetration;
    if (distSq < EPSILON) {
      const left = circle.x - rect.x, right = rect.x + rect.width - circle.x;
      const top = circle.y - rect.y, bottom = rect.y + rect.height - circle.y;
      const min = Math.min(left, right, top, bottom);
      if (min === left) { nx = -1; ny = 0; penetration = left + r; }
      else if (min === right) { nx = 1; ny = 0; penetration = right + r; }
      else if (min === top) { nx = 0; ny = -1; penetration = top + r; }
      else { nx = 0; ny = 1; penetration = bottom + r; }
    } else {
      const dist = Math.sqrt(distSq);
      nx = dx / dist; ny = dy / dist; penetration = r - dist;
    }
    return { normalX: nx, normalY: ny, penetration };
  }

  function circleVsPolygon(circle, polygon) {
    const points = polygon.getWorldPoints();
    if (points.length < 3) return null;
    let minPenetration = Infinity, bestNX = 0, bestNY = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i], p2 = points[(i + 1) % points.length];
      const edgeX = p2[0] - p1[0], edgeY = p2[1] - p1[1];
      const len = Math.sqrt(edgeX * edgeX + edgeY * edgeY) || 1;
      let nx = edgeY / len, ny = -edgeX / len;
      const dx = circle.x - p1[0], dy = circle.y - p1[1];
      const dist = dx * nx + dy * ny;
      if (dist > circle.radius) return null;
      const penetration = circle.radius - dist;
      if (penetration < minPenetration) { minPenetration = penetration; bestNX = nx; bestNY = ny; }
      const t = Math.max(0, Math.min(1, (dx * edgeX + dy * edgeY) / (len * len)));
      const closestX = p1[0] + t * edgeX, closestY = p1[1] + t * edgeY;
      const cdx = circle.x - closestX, cdy = circle.y - closestY;
      const cDistSq = cdx * cdx + cdy * cdy;
      if (cDistSq < circle.radius * circle.radius) {
        const cDist = Math.sqrt(cDistSq) || EPSILON;
        const pen = circle.radius - cDist;
        if (pen < minPenetration) { minPenetration = pen; bestNX = cdx / cDist; bestNY = cdy / cDist; }
      }
    }
    if (minPenetration === Infinity) return null;
    return { normalX: bestNX, normalY: bestNY, penetration: minPenetration };
  }

  function resolveBallBall(a, b, contact) {
    const nx = contact.normalX, ny = contact.normalY;
    const rvx = b.velocityX - a.velocityX, rvy = b.velocityY - a.velocityY;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) return;
    const restitution = Math.min(a.bounce ?? 0.5, b.bounce ?? 0.5);
    const j = -(1 + restitution) * velAlongNormal;
    const invMassA = a.mass > 0 ? 1 / a.mass : 0;
    const invMassB = b.mass > 0 ? 1 / b.mass : 0;
    const invSum = invMassA + invMassB;
    if (invSum < EPSILON) return;
    const impulse = j / invSum;
    a.velocityX -= impulse * nx * invMassA; a.velocityY -= impulse * ny * invMassA;
    b.velocityX += impulse * nx * invMassB; b.velocityY += impulse * ny * invMassB;
    const correction = Math.max(contact.penetration - 0.01, 0) / invSum * 0.8;
    a.x -= correction * nx * invMassA; a.y -= correction * ny * invMassA;
    b.x += correction * nx * invMassB; b.y += correction * ny * invMassB;
    a.emit('collision', b, contact); b.emit('collision', a, contact);
    a.emit('bounce', contact); b.emit('bounce', contact);
  }

  function resolveBallStatic(ball, contact, surface = null) {
    const nx = contact.normalX, ny = contact.normalY;
    const velAlongNormal = ball.velocityX * nx + ball.velocityY * ny;
    if (velAlongNormal > 0) return;
    const restitution = surface?.bounce ?? ball.bounce ?? 0.5;
    const friction = surface?.friction ?? ball.friction ?? 0.1;
    ball.velocityX -= (1 + restitution) * velAlongNormal * nx;
    ball.velocityY -= (1 + restitution) * velAlongNormal * ny;
    const tx = -ny, ty = nx;
    const velAlongT = ball.velocityX * tx + ball.velocityY * ty;
    const frictionImpulse = Math.min(Math.abs(velAlongT) * friction, Math.abs(velAlongT));
    const sign = velAlongT > 0 ? 1 : -1;
    ball.velocityX -= frictionImpulse * sign * tx;
    ball.velocityY -= frictionImpulse * sign * ty;
    const correction = Math.max(contact.penetration - 0.01, 0) * 0.9;
    ball.x += correction * nx; ball.y += correction * ny;
    ball.emit('collision', null, contact); ball.emit('bounce', contact);
  }

  class SpatialHash {
    constructor(cellSize = 64) { this.cellSize = cellSize; this.cells = new Map(); }
    clear() { this.cells.clear(); }
    _key(cx, cy) { return cx + ',' + cy; }
    insert(obj) {
      const aabb = obj.getAABB();
      const minCX = Math.floor(aabb.minX / this.cellSize), maxCX = Math.floor(aabb.maxX / this.cellSize);
      const minCY = Math.floor(aabb.minY / this.cellSize), maxCY = Math.floor(aabb.maxY / this.cellSize);
      for (let cx = minCX; cx <= maxCX; cx++)
        for (let cy = minCY; cy <= maxCY; cy++) {
          const key = this._key(cx, cy);
          if (!this.cells.has(key)) this.cells.set(key, []);
          this.cells.get(key).push(obj);
        }
    }
    query(obj) {
      const aabb = obj.getAABB();
      const minCX = Math.floor(aabb.minX / this.cellSize), maxCX = Math.floor(aabb.maxX / this.cellSize);
      const minCY = Math.floor(aabb.minY / this.cellSize), maxCY = Math.floor(aabb.maxY / this.cellSize);
      const result = new Set();
      for (let cx = minCX; cx <= maxCX; cx++)
        for (let cy = minCY; cy <= maxCY; cy++) {
          const cell = this.cells.get(this._key(cx, cy));
          if (cell) for (const o of cell) if (o !== obj) result.add(o);
        }
      return result;
    }
  }

  function updateReal(ball, dt, worldGravity) {
    if (ball.gravity !== 0) {
      const gx = ball.gravityX !== undefined ? ball.gravityX : worldGravity.x;
      const gy = ball.gravityY !== undefined ? ball.gravityY : (typeof ball.gravity === 'number' ? ball.gravity : worldGravity.y);
      ball.velocityX += gx * dt;
      ball.velocityY += gy * dt;
    }
    ball.x += ball.velocityX * dt;
    ball.y += ball.velocityY * dt;
    if (ball.friction > 0) applyFriction(ball, ball.friction * 0.02, dt);
  }

  function initDVD(ball, options = {}) {
    const speed = options.speed ?? ball.speed ?? 250;
    ball.dvdSpeed = speed; ball.speed = speed;
    if (options.randomDirection !== false) {
      const angle = Math.random() * Math.PI * 2;
      ball.velocityX = Math.cos(angle) * speed;
      ball.velocityY = Math.sin(angle) * speed;
    } else if (ball.velocityX === 0 && ball.velocityY === 0) {
      ball.velocityX = speed; ball.velocityY = speed * 0.6;
    }
  }

  function updateDVD(ball, dt, bounds) {
    const speed = ball.dvdSpeed ?? ball.speed ?? 250;
    const mag = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
    if (mag < 1e-6) {
      const angle = Math.random() * Math.PI * 2;
      ball.velocityX = Math.cos(angle) * speed;
      ball.velocityY = Math.sin(angle) * speed;
    } else {
      ball.velocityX = (ball.velocityX / mag) * speed;
      ball.velocityY = (ball.velocityY / mag) * speed;
    }
    ball.x += ball.velocityX * dt;
    ball.y += ball.velocityY * dt;
    if (bounds) {
      const r = ball.radius;
      if (ball.x - r < bounds.left) { ball.x = bounds.left + r; ball.velocityX = Math.abs(ball.velocityX); ball.emit('bounce'); }
      else if (ball.x + r > bounds.right) { ball.x = bounds.right - r; ball.velocityX = -Math.abs(ball.velocityX); ball.emit('bounce'); }
      if (ball.y - r < bounds.top) { ball.y = bounds.top + r; ball.velocityY = Math.abs(ball.velocityY); ball.emit('bounce'); }
      else if (ball.y + r > bounds.bottom) { ball.y = bounds.bottom - r; ball.velocityY = -Math.abs(ball.velocityY); ball.emit('bounce'); }
    }
  }

  function updateCustom(ball, dt) {
    if (typeof ball._customUpdate === 'function') ball._customUpdate(ball, dt);
  }

  class Solver {
    constructor(options = {}) {
      this.spatial = new SpatialHash(options.cellSize ?? 80);
      this.collisionCount = 0;
    }
    solve(balls, statics, specials) {
      this.collisionCount = 0;
      this.spatial.clear();
      for (const b of balls) if (b.collision && !b.destroyed) this.spatial.insert(b);
      for (const s of statics) if (s.collision && !s.destroyed) this.spatial.insert(s);
      for (const sp of specials) if (sp.collision && !sp.destroyed) this.spatial.insert(sp);

      const checked = new Set();
      for (const a of balls) {
        if (!a.collision || a.destroyed || a.physicsMode === 'ghost') continue;
        for (const b of this.spatial.query(a)) {
          if (b.type !== 'ball' || !b.collision || b.destroyed || b.physicsMode === 'ghost') continue;
          if (a.id >= b.id) continue;
          const key = a.id + '-' + b.id;
          if (checked.has(key)) continue;
          checked.add(key);
          const contact = circleVsCircle(a, b);
          if (contact) { resolveBallBall(a, b, contact); this.collisionCount++; }
        }
      }

      for (const ball of balls) {
        if (!ball.collision || ball.destroyed || ball.physicsMode === 'ghost') continue;
        for (const other of this.spatial.query(ball)) {
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
            if (other.onCollision) other.onCollision(ball, contact);
            else resolveBallStatic(ball, contact, other.surface);
            this.collisionCount++;
          }
        }
      }
    }
  }

  class PhysicsWorld {
    constructor(options = {}) {
      this.gravity = new Gravity(options.gravityX ?? 0, options.gravityY ?? options.gravity ?? 980);
      this.solver = new Solver({ cellSize: options.cellSize ?? 80 });
      this.fixedDt = options.fixedDt ?? 1 / 60;
      this.accumulator = 0;
      this.maxSubSteps = options.maxSubSteps ?? 5;
      this.bounds = options.bounds ?? null;
      this.boundsMode = options.boundsMode ?? 'bounce';
    }
    setGravity(x, y) {
      if (y === undefined) this.gravity.set(0, x);
      else this.gravity.set(x, y);
    }
    setBounds(bounds, mode = 'bounce') { this.bounds = bounds; this.boundsMode = mode; }
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
      return this.accumulator / this.fixedDt;
    }
    _integrate(balls, dt) {
      for (const ball of balls) {
        if (ball.destroyed || ball.physicsMode === 'static') continue;
        switch (ball.physicsMode) {
          case 'dvd': updateDVD(ball, dt, this.bounds); break;
          case 'custom': updateCustom(ball, dt); break;
          case 'ghost':
            ball.x += ball.velocityX * dt; ball.y += ball.velocityY * dt; break;
          default: updateReal(ball, dt, this.gravity); break;
        }
      }
    }
    _handleBounds(balls) {
      if (!this.bounds) return;
      const { left, top, right, bottom } = this.bounds;
      for (const ball of balls) {
        if (ball.destroyed || ball.physicsMode === 'dvd') continue;
        const r = ball.radius;
        if (this.boundsMode === 'bounce') {
          if (ball.x - r < left) { ball.x = left + r; ball.velocityX = Math.abs(ball.velocityX) * (ball.bounce ?? 0.5); }
          else if (ball.x + r > right) { ball.x = right - r; ball.velocityX = -Math.abs(ball.velocityX) * (ball.bounce ?? 0.5); }
          if (ball.y - r < top) { ball.y = top + r; ball.velocityY = Math.abs(ball.velocityY) * (ball.bounce ?? 0.5); }
          else if (ball.y + r > bottom) { ball.y = bottom - r; ball.velocityY = -Math.abs(ball.velocityY) * (ball.bounce ?? 0.5); }
        } else if (this.boundsMode === 'destroy') {
          if (ball.x + r < left || ball.x - r > right || ball.y + r < top || ball.y - r > bottom) ball.destroy();
        } else if (this.boundsMode === 'wrap') {
          if (ball.x + r < left) ball.x = right + r;
          else if (ball.x - r > right) ball.x = left - r;
          if (ball.y + r < top) ball.y = bottom + r;
          else if (ball.y - r > bottom) ball.y = top - r;
        }
      }
    }
    get collisionCount() { return this.solver.collisionCount; }
  }

  // ========== Shapes ==========
  class Circle extends GameObject {
    constructor(options = {}) {
      super(options);
      this.type = 'circle';
      this.radius = options.radius ?? 20;
      assertNumber(this.radius, 'Circle.radius', false);
    }
    getAABB() {
      return { minX: this.x - this.radius, minY: this.y - this.radius, maxX: this.x + this.radius, maxY: this.y + this.radius };
    }
    render(ctx) {
      if (!this.visible || this.destroyed) return;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * this.scale, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  const COLORS = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#1abc9c','#e67e22','#e91e63','#00bcd4','#8bc34a','#ff5722','#673ab7','#009688','#ff9800','#3f51b5'];
  const NAMES = ['Red','Blue','Green','Yellow','Purple','Cyan','Orange','Pink','Teal','Lime','Coral','Indigo','Amber','Violet','Mint','Ruby','Sapphire','Emerald','Gold','Silver'];

  class Ball extends Entity {
    constructor(options = {}) {
      super(options);
      this.type = 'ball';
      this.radius = options.radius ?? 20;
      assertNumber(this.radius, 'Ball.radius', false);
      this.velocityX = options.velocityX ?? 0;
      this.velocityY = options.velocityY ?? 0;
      this.mass = options.mass ?? (this.radius * this.radius * 0.01);
      this.bounce = clamp(options.bounce ?? 0.6, 0, 1);
      this.friction = options.friction ?? 0.05;
      this.gravity = options.gravity;
      this.gravityX = options.gravityX;
      this.gravityY = options.gravityY;
      this.physicsMode = options.physics ?? options.physicsMode ?? 'real';
      this.speed = options.speed ?? 250;
      this.dvdSpeed = options.dvd?.speed ?? this.speed;
      if (this.physicsMode === 'dvd') initDVD(this, options.dvd ?? { speed: this.speed, randomDirection: true });
      this.name = options.name ?? null;
      this.showName = options.showName ?? false;
      this.trail = options.trail ?? false;
      this._trailPoints = [];
      this._customUpdate = null;
      this._prevX = this.x;
      this._prevY = this.y;
    }
    setVelocity(vx, vy) { assertNumber(vx, 'velocityX'); assertNumber(vy, 'velocityY'); this.velocityX = vx; this.velocityY = vy; return this; }
    applyForce(fx, fy) {
      assertNumber(fx, 'forceX'); assertNumber(fy, 'forceY');
      if (this.mass > 0) { this.velocityX += fx / this.mass; this.velocityY += fy / this.mass; }
      return this;
    }
    setBounce(v) { assertNumber(v, 'bounce'); this.bounce = clamp(v, 0, 1); return this; }
    setSpeed(s) { assertNumber(s, 'speed', false); this.speed = s; this.dvdSpeed = s; return this; }
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
      return { minX: this.x - this.radius, minY: this.y - this.radius, maxX: this.x + this.radius, maxY: this.y + this.radius };
    }
    update(dt) {
      this._prevX = this.x; this._prevY = this.y;
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
      if (this.trail && this._trailPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this._trailPoints[0].x, this._trailPoints[0].y);
        for (let i = 1; i < this._trailPoints.length; i++) ctx.lineTo(this._trailPoints[i].x, this._trailPoints[i].y);
        ctx.strokeStyle = this.color; ctx.globalAlpha = this.opacity * 0.3; ctx.lineWidth = this.radius * 0.5; ctx.stroke();
        ctx.globalAlpha = this.opacity;
      }
      ctx.beginPath();
      ctx.arc(rx, ry, this.radius * this.scale, 0, Math.PI * 2);
      ctx.fillStyle = this.color; ctx.fill();
      ctx.beginPath();
      ctx.arc(rx - this.radius * 0.3, ry - this.radius * 0.3, this.radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      if (this.showName && this.name) {
        ctx.font = 'bold ' + Math.max(10, this.radius * 0.7) + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
        ctx.strokeText(this.name, rx, ry); ctx.fillText(this.name, rx, ry);
      }
      ctx.restore();
    }
    static random(options = {}) {
      const minR = options.minRadius ?? 12, maxR = options.maxRadius ?? 28;
      const radius = minR + Math.random() * (maxR - minR);
      return new Ball({
        x: options.x ?? 100, y: options.y ?? 100, radius,
        color: options.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
        name: options.name ?? NAMES[Math.floor(Math.random() * NAMES.length)],
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

  class Rectangle extends GameObject {
    constructor(options = {}) {
      super(options);
      this.type = 'rectangle';
      this.width = options.width ?? 100;
      this.height = options.height ?? 40;
      assertNumber(this.width, 'Rectangle.width', false);
      assertNumber(this.height, 'Rectangle.height', false);
    }
    getAABB() { return { minX: this.x, minY: this.y, maxX: this.x + this.width, maxY: this.y + this.height }; }
    render(ctx) {
      if (!this.visible || this.destroyed) return;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.rotate(this.rotation); ctx.scale(this.scale, this.scale);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2;
      ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    }
  }

  class Square extends Rectangle {
    constructor(options = {}) {
      const size = options.size ?? options.width ?? options.height ?? 80;
      super({ ...options, width: size, height: size });
      this.type = 'square';
    }
  }

  class Polygon extends GameObject {
    constructor(options = {}) {
      super(options);
      this.type = 'polygon';
      this.points = options.points ?? [[0, -40], [40, 40], [-40, 40]];
      if (!Array.isArray(this.points) || this.points.length < 3) {
        throw new MarbleError('Polygon.points must be an array of at least 3 [x,y] pairs.');
      }
    }
    getWorldPoints() {
      const cos = Math.cos(this.rotation), sin = Math.sin(this.rotation);
      return this.points.map(([px, py]) => {
        const sx = px * this.scale, sy = py * this.scale;
        return [this.x + sx * cos - sy * sin, this.y + sx * sin + sy * cos];
      });
    }
    getAABB() {
      const pts = this.getWorldPoints();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [x, y] of pts) {
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
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
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = this.color; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  // ========== Special Objects ==========
  class Lava extends Rectangle {
    constructor(options = {}) {
      super({ color: options.color ?? '#ff3300', ...options });
      this.type = 'lava';
      this._onTouch = options.onTouch ?? null;
      this.animated = options.animated !== false;
      this._time = 0;
    }
    onTouch(callback) { this._onTouch = callback; return this; }
    onCollision(ball) {
      this.emit('touch', ball);
      if (this._onTouch) this._onTouch(ball);
      else ball.destroy();
    }
    update(dt) { this._time += dt; }
    render(ctx) {
      if (!this.visible || this.destroyed) return;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
      gradient.addColorStop(0, '#ff6600'); gradient.addColorStop(0.5, this.color); gradient.addColorStop(1, '#cc1100');
      ctx.fillStyle = gradient;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      if (this.animated) {
        ctx.fillStyle = 'rgba(255,200,50,0.4)';
        for (let i = 0; i < 8; i++) {
          const bx = this.x + ((i * 97 + this._time * 40) % this.width);
          const by = this.y + 10 + Math.sin(this._time * 3 + i) * 8;
          ctx.beginPath(); ctx.arc(bx, by, 4 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  class Goal extends Circle {
    constructor(options = {}) {
      super({ radius: options.radius ?? 40, color: options.color ?? '#2ecc71', ...options });
      this.type = 'goal';
      this._onEnter = options.onEnter ?? null;
      this.triggered = new Set();
      this._pulse = 0;
    }
    onEnter(callback) { this._onEnter = callback; return this; }
    onCollision(ball) {
      if (this.triggered.has(ball.id)) return;
      this.triggered.add(ball.id);
      this.emit('enter', ball); ball.emit('goal', this);
      if (this._onEnter) this._onEnter(ball);
    }
    update(dt) { this._pulse += dt * 3; }
    render(ctx) {
      if (!this.visible || this.destroyed) return;
      const pulse = 1 + Math.sin(this._pulse) * 0.08;
      ctx.save();
      ctx.globalAlpha = this.opacity * 0.9;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * pulse * 1.15, 0, Math.PI * 2);
      ctx.strokeStyle = this.color; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = this.color; ctx.globalAlpha = this.opacity * 0.35; ctx.fill();
      ctx.globalAlpha = this.opacity; ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + (this.radius * 0.6) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★', this.x, this.y);
      ctx.restore();
    }
  }

  class Checkpoint extends Circle {
    constructor(options = {}) {
      super({ radius: options.radius ?? 30, color: options.color ?? '#3498db', ...options });
      this.type = 'checkpoint';
      this._onReach = options.onReach ?? null;
      this.activated = new Set();
      this._pulse = 0;
    }
    onReach(callback) { this._onReach = callback; return this; }
    onCollision(ball) {
      if (this.activated.has(ball.id)) return;
      this.activated.add(ball.id);
      ball._lastCheckpoint = { x: this.x, y: this.y };
      this.emit('reach', ball);
      if (this._onReach) this._onReach(ball);
    }
    update(dt) { this._pulse += dt * 2; }
    render(ctx) {
      if (!this.visible || this.destroyed) return;
      ctx.save();
      ctx.globalAlpha = this.opacity * 0.7;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * (1 + Math.sin(this._pulse) * 0.1), 0, Math.PI * 2);
      ctx.strokeStyle = this.color; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = this.color; ctx.globalAlpha = this.opacity * 0.2; ctx.fill();
      ctx.restore();
    }
  }

  class BallTeleport extends Circle {
    constructor(options = {}) {
      super({ radius: options.radius ?? 25, color: options.color ?? '#00ffff', ...options });
      this.type = 'teleport';
      this.targetX = options.targetX ?? 100;
      this.targetY = options.targetY ?? 100;
      this.cooldown = options.cooldown ?? 0.5;
      this._lastTeleport = new Map();
      this._spin = 0;
    }
    onCollision(ball) {
      const now = performance.now() / 1000;
      const last = this._lastTeleport.get(ball.id) ?? 0;
      if (now - last < this.cooldown) return;
      this._lastTeleport.set(ball.id, now);
      ball.setPosition(this.targetX, this.targetY);
      ball.emit('teleport', this); this.emit('teleport', ball);
    }
    update(dt) { this._spin += dt * 4; }
    render(ctx) {
      if (!this.visible || this.destroyed) return;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * (0.5 + i * 0.25), 0, Math.PI * 2);
        ctx.strokeStyle = this.color; ctx.globalAlpha = this.opacity * (0.8 - i * 0.2); ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.translate(this.x, this.y); ctx.rotate(this._spin);
      ctx.beginPath();
      ctx.moveTo(0, -this.radius * 0.3); ctx.lineTo(this.radius * 0.3, 0);
      ctx.lineTo(0, this.radius * 0.3); ctx.lineTo(-this.radius * 0.3, 0); ctx.closePath();
      ctx.fillStyle = this.color; ctx.globalAlpha = this.opacity * 0.6; ctx.fill();
      ctx.restore();
    }
  }

  // ========== Render ==========
  class Camera {
    constructor(options = {}) {
      this.x = options.x ?? 0; this.y = options.y ?? 0;
      this.zoom = options.zoom ?? 1;
      this.width = options.width ?? 1280; this.height = options.height ?? 720;
      this._followTarget = null; this.lerp = options.lerp ?? 0.1;
      this.bounds = options.bounds ?? null;
    }
    follow(target) { this._followTarget = target; return this; }
    unfollow() { this._followTarget = null; return this; }
    setZoom(z) { this.zoom = Math.max(0.1, Math.min(5, z)); return this; }
    setPosition(x, y) { this.x = x; this.y = y; return this; }
    update() {
      if (this._followTarget && !this._followTarget.destroyed) {
        const tx = this._followTarget.x - this.width / (2 * this.zoom);
        const ty = this._followTarget.y - this.height / (2 * this.zoom);
        this.x += (tx - this.x) * this.lerp;
        this.y += (ty - this.y) * this.lerp;
      }
      if (this.bounds) {
        const maxX = this.bounds.right - this.width / this.zoom;
        const maxY = this.bounds.bottom - this.height / this.zoom;
        this.x = Math.max(this.bounds.left, Math.min(this.x, maxX));
        this.y = Math.max(this.bounds.top, Math.min(this.y, maxY));
      }
    }
    apply(ctx) { ctx.setTransform(this.zoom, 0, 0, this.zoom, -this.x * this.zoom, -this.y * this.zoom); }
    reset(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); }
  }

  class CanvasRenderer {
    constructor(canvas, options = {}) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.width = canvas.width; this.height = canvas.height;
      this.background = options.background ?? '#1a1a2e';
      this.debug = false;
    }
    clear() {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.fillStyle = this.background;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    begin(camera) { this.clear(); if (camera) camera.apply(this.ctx); }
    end(camera) { if (camera) camera.reset(this.ctx); }
    drawDebug(info) {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(8, 8, 180, 90);
      ctx.fillStyle = '#0f0'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
      ctx.fillText('FPS: ' + info.fps, 16, 28);
      ctx.fillText('Objects: ' + info.objects, 16, 44);
      ctx.fillText('Collisions: ' + info.collisions, 16, 60);
      ctx.fillText('Physics: ' + info.physicsMs + 'ms', 16, 76);
    }
    drawVelocity(ball) {
      if (!this.debug) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(ball.x + ball.velocityX * 0.1, ball.y + ball.velocityY * 0.1); ctx.stroke();
      ctx.fillStyle = '#f0f'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ========== UI ==========
  class Text extends Entity {
    constructor(options = {}) {
      super(options);
      this.type = 'text';
      this.text = options.text ?? '';
      this.size = options.size ?? 24;
      this.font = options.font ?? 'sans-serif';
      this.align = options.align ?? 'left';
      this.baseline = options.baseline ?? 'top';
      this.bold = options.bold ?? false;
      this.stroke = options.stroke ?? false;
      this.strokeColor = options.strokeColor ?? '#000';
      this.strokeWidth = options.strokeWidth ?? 3;
    }
    setText(t) { assertString(t, 'text'); this.text = t; return this; }
    setSize(s) { assertNumber(s, 'size', false); this.size = s; return this; }
    render(ctx) {
      if (!this.visible || this.destroyed) return;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.font = (this.bold ? 'bold ' : '') + this.size + 'px ' + this.font;
      ctx.textAlign = this.align; ctx.textBaseline = this.baseline;
      if (this.stroke) { ctx.strokeStyle = this.strokeColor; ctx.lineWidth = this.strokeWidth; ctx.strokeText(this.text, this.x, this.y); }
      ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  class Counter extends Text {
    constructor(options = {}) {
      super({ text: String(options.value ?? 0), ...options });
      this.type = 'counter';
      this.value = options.value ?? 0;
      this.prefix = options.prefix ?? '';
      this.suffix = options.suffix ?? '';
    }
    setValue(v) { this.value = v; this.text = this.prefix + v + this.suffix; return this; }
    increment(n = 1) { return this.setValue(this.value + n); }
    decrement(n = 1) { return this.setValue(this.value - n); }
  }

  class Timer extends Text {
    constructor(options = {}) {
      super({ text: '0.00', ...options });
      this.type = 'timer';
      this.elapsed = 0; this.running = false;
      this.precision = options.precision ?? 2;
    }
    start() { this.running = true; return this; }
    stop() { this.running = false; return this; }
    reset() { this.elapsed = 0; this._updateText(); return this; }
    update(dt) { if (this.running) { this.elapsed += dt; this._updateText(); } }
    _updateText() { this.text = this.elapsed.toFixed(this.precision); }
  }

  class Panel extends Entity {
    constructor(options = {}) {
      super(options);
      this.type = 'panel';
      this.width = options.width ?? 200; this.height = options.height ?? 100;
      this.background = options.background ?? 'rgba(0,0,0,0.6)';
      this.borderColor = options.borderColor ?? 'rgba(255,255,255,0.2)';
      this.borderWidth = options.borderWidth ?? 2;
      this.radius = options.radius ?? 8;
      this.children = [];
    }
    add(child) { this.children.push(child); return this; }
    render(ctx) {
      if (!this.visible || this.destroyed) return;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.background; ctx.strokeStyle = this.borderColor; ctx.lineWidth = this.borderWidth;
      const x = this.x, y = this.y, w = this.width, h = this.height, r = this.radius;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      ctx.fill(); if (this.borderWidth > 0) ctx.stroke();
      for (const child of this.children) child.render(ctx);
      ctx.restore();
    }
  }

  // ========== World & Game ==========
  class World extends EventEmitter {
    constructor(options = {}) {
      super();
      this.width = options.width ?? 1280; this.height = options.height ?? 720;
      this.balls = []; this.statics = []; this.specials = []; this.ui = []; this._all = [];
    }
    add(obj) {
      if (!obj || obj.destroyed) return this;
      obj._world = this;
      if (obj.type === 'ball') this.balls.push(obj);
      else if (obj.type === 'lava' || obj.type === 'goal' || obj.type === 'checkpoint' || obj.type === 'teleport') this.specials.push(obj);
      else if (obj.type === 'text' || obj.type === 'counter' || obj.type === 'timer' || obj.type === 'panel') this.ui.push(obj);
      else this.statics.push(obj);
      this._all.push(obj);
      this.emit('add', obj);
      return this;
    }
    remove(obj) {
      const rm = (arr) => { const i = arr.indexOf(obj); if (i !== -1) arr.splice(i, 1); };
      rm(this.balls); rm(this.statics); rm(this.specials); rm(this.ui); rm(this._all);
      obj._world = null; this.emit('remove', obj); return this;
    }
    clear() {
      for (const o of this._all.slice()) o.destroy();
      this.balls.length = 0; this.statics.length = 0; this.specials.length = 0; this.ui.length = 0; this._all.length = 0;
    }
    get objects() { return this._all; }
    getObjectCount() { return this._all.filter(o => !o.destroyed).length; }
  }

  class Game extends EventEmitter {
    constructor(options = {}) {
      super();
      this.width = options.width ?? 1280; this.height = options.height ?? 720;
      assertNumber(this.width, 'width', false); assertNumber(this.height, 'height', false);
      this.canvas = options.canvas ?? null;
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width; this.canvas.height = this.height;
        if (options.parent) {
          const parent = typeof options.parent === 'string' ? document.querySelector(options.parent) : options.parent;
          if (parent) parent.appendChild(this.canvas); else document.body.appendChild(this.canvas);
        } else document.body.appendChild(this.canvas);
      } else {
        this.canvas.width = this.width; this.canvas.height = this.height;
      }
      this.world = new World({ width: this.width, height: this.height });
      this.physics = new PhysicsWorld({
        gravity: options.gravity ?? 980, gravityX: options.gravityX ?? 0, gravityY: options.gravityY, cellSize: options.cellSize ?? 80
      });
      this.renderer = new CanvasRenderer(this.canvas, { background: options.background ?? '#1a1a2e' });
      this.camera = new Camera({ width: this.width, height: this.height, bounds: options.cameraBounds ?? null });
      this.running = false; this.paused = false; this.debug = options.debug ?? false;
      this._raf = null; this._lastTime = 0; this._fps = 60; this._frameCount = 0; this._fpsTime = 0; this._physicsMs = 0; this._alpha = 0;
      if (options.bounds) this.setBounds(options.bounds, options.boundsMode ?? 'bounce');
      else this.setBounds({ left: 0, top: 0, right: this.width, bottom: this.height }, 'bounce');
    }
    get gravity() { return this.physics.gravity.y; }
    set gravity(v) { this.physics.gravity.y = v; }
    setGravity(x, y) { this.physics.setGravity(x, y); return this; }
    setBounds(bounds, mode = 'bounce') { this.physics.setBounds(bounds, mode); this.camera.bounds = bounds; return this; }
    add(obj) { obj._game = this; this.world.add(obj); return this; }
    remove(obj) { this.world.remove(obj); return this; }
    start() {
      if (this.running) return this;
      this.running = true; this.paused = false; this._lastTime = performance.now();
      this.emit('start'); this._loop(); return this;
    }
    pause() { this.paused = true; this.emit('pause'); return this; }
    resume() { if (!this.running) return this.start(); this.paused = false; this._lastTime = performance.now(); this.emit('resume'); return this; }
    stop() {
      this.running = false; this.paused = false;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      this.emit('stop'); return this;
    }
    reset() { this.world.clear(); this.emit('reset'); return this; }
    update(dt) {
      for (const ui of this.world.ui) if (ui.update) ui.update(dt);
      for (const sp of this.world.specials) if (sp.update) sp.update(dt);
      for (const ball of this.world.balls) if (!ball.destroyed) ball.update(dt);
      const t0 = performance.now();
      this._alpha = this.physics.step(
        this.world.balls.filter(b => !b.destroyed),
        this.world.statics.filter(s => !s.destroyed),
        this.world.specials.filter(s => !s.destroyed),
        dt
      );
      this._physicsMs = +(performance.now() - t0).toFixed(2);
      this.camera.update();
      this.emit('update', dt);
    }
    render() {
      this.renderer.debug = this.debug;
      this.renderer.begin(this.camera);
      for (const s of this.world.statics) if (!s.destroyed) s.render(this.renderer.ctx);
      for (const sp of this.world.specials) if (!sp.destroyed) sp.render(this.renderer.ctx);
      for (const b of this.world.balls) {
        if (!b.destroyed) { b.render(this.renderer.ctx, this._alpha); if (this.debug) this.renderer.drawVelocity(b); }
      }
      this.renderer.end(this.camera);
      for (const ui of this.world.ui) if (!ui.destroyed) ui.render(this.renderer.ctx);
      if (this.debug) {
        this.renderer.drawDebug({
          fps: this._fps, objects: this.world.getObjectCount(),
          collisions: this.physics.collisionCount, physicsMs: this._physicsMs
        });
      }
      this.emit('render');
    }
    _loop = () => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(this._loop);
      const now = performance.now();
      let dt = (now - this._lastTime) / 1000;
      this._lastTime = now;
      if (dt > 0.05) dt = 0.05;
      this._frameCount++; this._fpsTime += dt;
      if (this._fpsTime >= 1) { this._fps = this._frameCount; this._frameCount = 0; this._fpsTime = 0; }
      if (!this.paused) this.update(dt);
      this.render();
    };
  }

  // ========== Race ==========
  const RACE_COLORS = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#1abc9c','#e67e22','#e91e63','#00bcd4','#8bc34a','#ff5722','#673ab7','#009688','#ff9800','#3f51b5','#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad'];
  const RACE_NAMES = ['Ruby','Sapphire','Emerald','Topaz','Amethyst','Jade','Amber','Coral','Pearl','Onyx','Garnet','Aquamarine','Peridot','Citrine','Opal','Turquoise','Spinel','Zircon','Moonstone','Sunstone'];

  class Race extends EventEmitter {
    constructor(options = {}) {
      super();
      this.game = options.game ?? null;
      this.count = options.balls ?? options.count ?? 10;
      this.startX = options.startX ?? 100; this.startY = options.startY ?? 100;
      this.spreadX = options.spreadX ?? 40; this.spreadY = options.spreadY ?? 0;
      this.goalX = options.goalX ?? 1100; this.goalY = options.goalY ?? 600;
      this.goalRadius = options.goalRadius ?? 50;
      this.balls = []; this.goal = null; this.finished = []; this.ranking = [];
      this.started = false; this.countdown = options.countdown ?? 3;
    }
    spawn() {
      this.balls = [];
      for (let i = 0; i < this.count; i++) {
        const ball = new Ball({
          x: this.startX + (i % 5) * this.spreadX,
          y: this.startY + Math.floor(i / 5) * (this.spreadY || 35),
          radius: 14 + Math.random() * 8,
          color: RACE_COLORS[i % RACE_COLORS.length],
          name: RACE_NAMES[i % RACE_NAMES.length],
          showName: true, bounce: 0.5 + Math.random() * 0.3, mass: 1 + Math.random(), physics: 'real'
        });
        this.balls.push(ball);
        if (this.game) this.game.add(ball);
      }
      this.goal = new Goal({ x: this.goalX, y: this.goalY, radius: this.goalRadius });
      this.goal.onEnter((ball) => {
        if (!this.finished.includes(ball)) {
          this.finished.push(ball);
          this.ranking.push({ place: this.finished.length, ball, name: ball.name, color: ball.color });
          this.emit('finish', ball, this.finished.length);
          if (this.finished.length === 1) this.emit('winner', ball);
          if (this.finished.length >= this.balls.length) this.emit('complete', this.ranking);
        }
      });
      if (this.game) this.game.add(this.goal);
      return this;
    }
    start() {
      if (!this.balls.length) this.spawn();
      this.started = true; this.finished = []; this.ranking = [];
      this.emit('start'); return this;
    }
    getWinner() { return this.finished[0] ?? null; }
    getRanking() { return this.ranking.slice(); }
  }

  // ========== Export ==========
  const Marble = {
    Game, World, Race, Ball, Circle, Rectangle, Square, Polygon,
    Lava, Goal, Checkpoint, BallTeleport,
    Text, Counter, Timer, Panel, Camera,
    MarbleError, EventEmitter, Entity, GameObject,
    PhysicsWorld, Gravity, Solver, SpatialHash,
    randomBall: (opts) => Ball.random(opts),
    version: '1.0.0'
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Marble;
  }
  global.Marble = Marble;

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
