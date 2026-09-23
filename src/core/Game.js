import { EventEmitter } from './EventEmitter.js';
import { World } from './World.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { CanvasRenderer } from '../render/CanvasRenderer.js';
import { Camera } from '../render/Camera.js';
import { MarbleError, assertNumber } from './MarbleError.js';

/**
 * Marble.Game – main entry point
 */
export class Game extends EventEmitter {
  constructor(options = {}) {
    super();
    this.width = options.width ?? 1280;
    this.height = options.height ?? 720;
    assertNumber(this.width, 'width', false);
    assertNumber(this.height, 'height', false);

    // Canvas
    this.canvas = options.canvas ?? null;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      if (options.parent) {
        const parent = typeof options.parent === 'string'
          ? document.querySelector(options.parent)
          : options.parent;
        if (parent) parent.appendChild(this.canvas);
        else document.body.appendChild(this.canvas);
      } else {
        document.body.appendChild(this.canvas);
      }
    } else {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    // Systems
    this.world = new World({ width: this.width, height: this.height });
    this.physics = new PhysicsWorld({
      gravity: options.gravity ?? 980,
      gravityX: options.gravityX ?? 0,
      gravityY: options.gravityY,
      cellSize: options.cellSize ?? 80
    });
    this.renderer = new CanvasRenderer(this.canvas, {
      background: options.background ?? '#1a1a2e'
    });
    this.camera = new Camera({
      width: this.width,
      height: this.height,
      bounds: options.cameraBounds ?? null
    });

    // State
    this.running = false;
    this.paused = false;
    this.debug = options.debug ?? false;
    this._raf = null;
    this._lastTime = 0;
    this._fps = 60;
    this._frameCount = 0;
    this._fpsTime = 0;
    this._physicsMs = 0;
    this._alpha = 0;

    // Bounds
    if (options.bounds) {
      this.setBounds(options.bounds, options.boundsMode ?? 'bounce');
    } else {
      this.setBounds({ left: 0, top: 0, right: this.width, bottom: this.height }, 'bounce');
    }

    // Convenience
    this.gravity = this.physics.gravity.y;
  }

  get gravity() {
    return this.physics.gravity.y;
  }

  set gravity(v) {
    this.physics.gravity.y = v;
  }

  setGravity(x, y) {
    this.physics.setGravity(x, y);
    return this;
  }

  setBounds(bounds, mode = 'bounce') {
    this.physics.setBounds(bounds, mode);
    this.camera.bounds = bounds;
    return this;
  }

  add(obj) {
    obj._game = this;
    this.world.add(obj);
    return this;
  }

  remove(obj) {
    this.world.remove(obj);
    return this;
  }

  start() {
    if (this.running) return this;
    this.running = true;
    this.paused = false;
    this._lastTime = performance.now();
    this.emit('start');
    this._loop();
    return this;
  }

  pause() {
    this.paused = true;
    this.emit('pause');
    return this;
  }

  resume() {
    if (!this.running) return this.start();
    this.paused = false;
    this._lastTime = performance.now();
    this.emit('resume');
    return this;
  }

  stop() {
    this.running = false;
    this.paused = false;
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this.emit('stop');
    return this;
  }

  reset() {
    this.world.clear();
    this.emit('reset');
    return this;
  }

  update(dt) {
    // UI timers etc.
    for (const ui of this.world.ui) {
      if (ui.update) ui.update(dt);
    }
    for (const sp of this.world.specials) {
      if (sp.update) sp.update(dt);
    }
    for (const ball of this.world.balls) {
      if (!ball.destroyed) ball.update(dt);
    }

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

    // Statics & specials
    for (const s of this.world.statics) {
      if (!s.destroyed) s.render(this.renderer.ctx);
    }
    for (const sp of this.world.specials) {
      if (!sp.destroyed) sp.render(this.renderer.ctx);
    }
    // Balls
    for (const b of this.world.balls) {
      if (!b.destroyed) {
        b.render(this.renderer.ctx, this._alpha);
        if (this.debug) this.renderer.drawVelocity(b);
      }
    }

    this.renderer.end(this.camera);

    // UI (screen space)
    for (const ui of this.world.ui) {
      if (!ui.destroyed) ui.render(this.renderer.ctx);
    }

    if (this.debug) {
      this.renderer.drawDebug({
        fps: this._fps,
        objects: this.world.getObjectCount(),
        collisions: this.physics.collisionCount,
        physicsMs: this._physicsMs
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
    // Clamp dt to avoid spiral of death
    if (dt > 0.05) dt = 0.05;

    this._frameCount++;
    this._fpsTime += dt;
    if (this._fpsTime >= 1) {
      this._fps = this._frameCount;
      this._frameCount = 0;
      this._fpsTime = 0;
    }

    if (!this.paused) {
      this.update(dt);
    }
    this.render();
  };
}
