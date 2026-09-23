# Marble.js

**A 2D physics library specialized for marble race, marble kingdom, and marble run style games and simulations.**

Marble.js focuses on **balls**, **physics**, **collisions**, **obstacles**, **teleports**, **lava**, **goals** and colorful 2D experiences — not a general-purpose game engine.

```
●  ●  ●  ●  ●
████████████
     ▲
  ~~~~~~~~
```

## Features

- **Ball / Marble** as the main entity
- 2D shapes: Circle, Square, Rectangle, Polygon
- Real physics (gravity, bounce, friction, mass, momentum)
- **DVD screensaver** fly mode
- Collision detection with Spatial Hash Grid
- Special objects: Lava, Goal, Checkpoint, BallTeleport
- Camera with follow & zoom
- Simple UI: Text, Timer, Counter, Panel
- Race helper for quick marble tournaments
- Canvas 2D renderer (no WebGL required)
- Fixed timestep physics + render interpolation
- Clear `MarbleError` messages
- ES Modules + CDN bundle
- TypeScript declarations

## Quick Start

### CDN

```html
<script src="dist/marble.js"></script>
<script>
  const game = new Marble.Game({ width: 1280, height: 720, gravity: 980 });
  const ball = new Marble.Ball({ x: 200, y: 100, radius: 20, color: '#ff0000', bounce: 0.8 });
  game.add(ball);
  game.add(new Marble.Rectangle({ x: 0, y: 680, width: 1280, height: 40, color: '#555' }));
  game.start();
</script>
```

### ES Module

```js
import Marble from './src/index.js';
// or: import { Game, Ball, Rectangle } from './src/index.js';
```

## Core API

### Game

```js
const game = new Marble.Game({
  width: 1280,
  height: 720,
  gravity: 980,
  background: '#1a1a2e',
  debug: false,
  boundsMode: 'bounce' // 'bounce' | 'destroy' | 'wrap'
});

game.start();
game.pause();
game.resume();
game.stop();
game.reset();

game.setGravity(0, 980);
game.setBounds({ left: 0, top: 0, right: 1280, bottom: 720 }, 'bounce');
game.add(object);
game.camera.follow(ball);
game.debug = true;
```

### Ball

```js
const ball = new Marble.Ball({
  x: 200, y: 100,
  radius: 20,
  color: '#ff0000',
  mass: 1,
  bounce: 0.75,      // 0 → 1
  friction: 0.15,
  gravity: 980,      // per-ball or omit for world
  physics: 'real',   // 'real' | 'dvd' | 'static' | 'ghost' | 'custom'
  collision: true,
  name: 'Ruby',
  showName: true,
  trail: false
});

ball.setPosition(x, y);
ball.setVelocity(vx, vy);
ball.applyForce(fx, fy);
ball.setBounce(0.8);
ball.setSpeed(300);          // for dvd mode
ball.setPhysics('dvd');
ball.enableCollision();
ball.disableCollision();
ball.destroy();

// Events
ball.on('collision', (other, contact) => {});
ball.on('bounce', (contact) => {});
ball.on('destroy', () => {});
ball.on('teleport', (portal) => {});
ball.on('goal', (goal) => {});
```

### Physics Modes

| Mode     | Description                                      |
|----------|--------------------------------------------------|
| `real`   | Gravity, acceleration, friction, bounce          |
| `dvd`    | Constant speed, bounce off walls, no gravity     |
| `static` | Not affected by physics                          |
| `ghost`  | Moves but no collisions                          |
| `custom` | Provide your own `update(ball, dt)`              |

```js
// DVD mode
const flyer = new Marble.Ball({
  x: 100, y: 100, radius: 25,
  physics: 'dvd',
  speed: 300,
  dvd: { randomDirection: true }
});

// Custom
ball.setPhysics({
  update(ball, dt) {
    ball.x += 50 * dt;
  }
});
```

### Shapes

```js
new Marble.Circle({ x, y, radius, color });
new Marble.Square({ x, y, size, color });
new Marble.Rectangle({ x, y, width, height, color, surface: { friction, bounce } });
new Marble.Polygon({ x, y, points: [[0,-40],[40,40],[-40,40]], color });
```

Invisible but collidable:

```js
new Marble.Rectangle({ x, y, width, height, visible: false, collision: true });
```

Visible decoration (no collision):

```js
new Marble.Circle({ x, y, radius, visible: true, collision: false });
```

### Special Objects

```js
// Lava – destroys ball on touch
const lava = new Marble.Lava({ x: 0, y: 650, width: 1280, height: 70 });
lava.onTouch(ball => ball.destroy());

// Goal
const goal = new Marble.Goal({ x: 1100, y: 600, radius: 50 });
goal.onEnter(ball => console.log('Winner:', ball.name));

// Checkpoint
const cp = new Marble.Checkpoint({ x: 600, y: 300 });
cp.onReach(ball => { /* save progress */ });

// Teleport
const portal = new Marble.BallTeleport({
  x: 500, y: 300,
  targetX: 100, targetY: 100,
  color: '#00ffff'
});
```

### Race Helper

```js
const race = new Marble.Race({
  game,
  balls: 20,
  startX: 100, startY: 100,
  goalX: 1100, goalY: 600
});
race.spawn();
race.on('winner', ball => console.log(ball.name));
race.on('complete', ranking => console.table(ranking));
race.start();
```

### UI

```js
game.add(new Marble.Text({ x: 50, y: 50, text: 'MARBLE RACE', size: 32, color: '#fff', bold: true }));
const timer = new Marble.Timer({ x: 50, y: 90, color: '#aaa' });
timer.start();
game.add(timer);
```

### Random Ball

```js
const ball = Marble.randomBall({ minRadius: 10, maxRadius: 30 });
```

## Examples

Open any HTML file in `examples/` in a browser:

| Example            | Description                          |
|--------------------|--------------------------------------|
| `marble-race/`     | 16 marbles racing to a goal          |
| `marble-kingdom/`  | Mixed shapes, invisible walls, debug |
| `dvd-marble/`      | DVD screensaver style flying balls   |
| `lava-run/`        | Platforms + lava + teleport survival |
| `teleport-race/`   | Chain of teleports to the finish     |

## Performance

- Spatial Hash Grid broad-phase
- Circle-first narrow-phase
- Fixed physics timestep (1/60)
- Render interpolation
- Targets: 100 marbles smooth, 500 usable, 1000+ with spatial partitioning

## Project Structure

```
Marble.js/
├── src/
│   ├── core/          Game, World, Entity, Race, EventEmitter
│   ├── physics/       PhysicsWorld, Collision, Solver, modes/
│   ├── shapes/        Ball, Circle, Rectangle, Square, Polygon
│   ├── objects/       Lava, Goal, Checkpoint, BallTeleport
│   ├── render/        CanvasRenderer, Camera
│   ├── ui/            Text, Counter, Timer, Panel
│   └── index.js
├── dist/
│   ├── marble.js      Browser bundle (IIFE)
│   └── marble.d.ts    TypeScript declarations
├── examples/
└── README.md
```

## License

MIT
