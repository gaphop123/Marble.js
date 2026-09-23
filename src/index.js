/**
 * Marble.js – 2D Marble Race / Simulation Library
 * Focused on balls, physics, obstacles, races and colorful 2D experiences.
 */

export { MarbleError } from './core/MarbleError.js';
export { EventEmitter } from './core/EventEmitter.js';
export { Entity } from './core/Entity.js';
export { GameObject } from './core/Object.js';
export { World } from './core/World.js';
export { Game } from './core/Game.js';
export { Race } from './core/Race.js';

export { Ball } from './shapes/Ball.js';
export { Circle } from './shapes/Circle.js';
export { Rectangle } from './shapes/Rectangle.js';
export { Square } from './shapes/Square.js';
export { Polygon } from './shapes/Polygon.js';

export { Lava } from './objects/Lava.js';
export { Goal } from './objects/Goal.js';
export { Checkpoint } from './objects/Checkpoint.js';
export { BallTeleport } from './objects/BallTeleport.js';

export { Camera } from './render/Camera.js';
export { CanvasRenderer } from './render/CanvasRenderer.js';

export { Text } from './ui/Text.js';
export { Counter } from './ui/Counter.js';
export { Timer } from './ui/Timer.js';
export { Panel } from './ui/Panel.js';

export { PhysicsWorld } from './physics/PhysicsWorld.js';
export { Gravity } from './physics/Gravity.js';
export { Solver } from './physics/Solver.js';
export { SpatialHash } from './physics/Collision.js';

// Namespace convenience
import { Game } from './core/Game.js';
import { World } from './core/World.js';
import { Race } from './core/Race.js';
import { Ball } from './shapes/Ball.js';
import { Circle } from './shapes/Circle.js';
import { Rectangle } from './shapes/Rectangle.js';
import { Square } from './shapes/Square.js';
import { Polygon } from './shapes/Polygon.js';
import { Lava } from './objects/Lava.js';
import { Goal } from './objects/Goal.js';
import { Checkpoint } from './objects/Checkpoint.js';
import { BallTeleport } from './objects/BallTeleport.js';
import { Text } from './ui/Text.js';
import { Counter } from './ui/Counter.js';
import { Timer } from './ui/Timer.js';
import { Panel } from './ui/Panel.js';
import { Camera } from './render/Camera.js';

const Marble = {
  Game,
  World,
  Race,
  Ball,
  Circle,
  Rectangle,
  Square,
  Polygon,
  Lava,
  Goal,
  Checkpoint,
  BallTeleport,
  Text,
  Counter,
  Timer,
  Panel,
  Camera,
  randomBall: (opts) => Ball.random(opts),
  version: '1.0.0'
};

export default Marble;

// Also attach to global for CDN usage
if (typeof window !== 'undefined') {
  window.Marble = Marble;
}
