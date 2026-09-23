declare module 'marble.js' {
  export class MarbleError extends Error {
    constructor(message: string, received?: any);
  }

  export class EventEmitter {
    on(event: string, callback: (...args: any[]) => void): this;
    once(event: string, callback: (...args: any[]) => void): this;
    off(event: string, callback?: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): this;
    removeAllListeners(): this;
  }

  export interface EntityOptions {
    x?: number;
    y?: number;
    rotation?: number;
    scale?: number;
    color?: string;
    opacity?: number;
    visible?: boolean;
    collision?: boolean;
    surface?: { friction?: number; bounce?: number };
  }

  export class Entity extends EventEmitter {
    id: number;
    type: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    color: string;
    opacity: number;
    visible: boolean;
    collision: boolean;
    destroyed: boolean;
    surface: { friction?: number; bounce?: number } | null;

    setPosition(x: number, y: number): this;
    setRotation(angle: number): this;
    setScale(s: number): this;
    setColor(color: string): this;
    setOpacity(o: number): this;
    show(): this;
    hide(): this;
    enableCollision(): this;
    disableCollision(): this;
    destroy(): void;
    update(dt: number): void;
    render(ctx: CanvasRenderingContext2D, camera?: any): void;
    getAABB(): { minX: number; minY: number; maxX: number; maxY: number };
  }

  export class GameObject extends Entity {
    width: number;
    height: number;
    static: boolean;
    setSize(w: number, h: number): this;
  }

  export interface BallOptions extends EntityOptions {
    radius?: number;
    velocityX?: number;
    velocityY?: number;
    mass?: number;
    bounce?: number;
    friction?: number;
    gravity?: number;
    gravityX?: number;
    gravityY?: number;
    physics?: 'real' | 'dvd' | 'static' | 'ghost' | 'custom';
    speed?: number;
    name?: string;
    showName?: boolean;
    trail?: boolean;
    dvd?: { speed?: number; bounce?: boolean; randomDirection?: boolean };
  }

  export class Ball extends Entity {
    radius: number;
    velocityX: number;
    velocityY: number;
    mass: number;
    bounce: number;
    friction: number;
    gravity?: number;
    physicsMode: string;
    speed: number;
    name: string | null;
    showName: boolean;

    setVelocity(vx: number, vy: number): this;
    applyForce(fx: number, fy: number): this;
    setBounce(v: number): this;
    setSpeed(s: number): this;
    setPhysics(mode: string | { update: (ball: Ball, dt: number) => void }): this;

    static random(options?: Partial<BallOptions> & { minRadius?: number; maxRadius?: number }): Ball;
  }

  export class Circle extends GameObject {
    radius: number;
    constructor(options?: EntityOptions & { radius?: number });
  }

  export class Rectangle extends GameObject {
    constructor(options?: EntityOptions & { width?: number; height?: number });
  }

  export class Square extends Rectangle {
    constructor(options?: EntityOptions & { size?: number; width?: number; height?: number });
  }

  export class Polygon extends GameObject {
    points: number[][];
    constructor(options?: EntityOptions & { points?: number[][] });
    getWorldPoints(): number[][];
  }

  export class Lava extends Rectangle {
    onTouch(callback: (ball: Ball) => void): this;
  }

  export class Goal extends Circle {
    onEnter(callback: (ball: Ball) => void): this;
  }

  export class Checkpoint extends Circle {
    onReach(callback: (ball: Ball) => void): this;
  }

  export class BallTeleport extends Circle {
    targetX: number;
    targetY: number;
    constructor(options?: EntityOptions & { radius?: number; targetX?: number; targetY?: number; cooldown?: number });
  }

  export class Text extends Entity {
    text: string;
    size: number;
    setText(t: string): this;
    setSize(s: number): this;
  }

  export class Counter extends Text {
    value: number;
    setValue(v: number): this;
    increment(n?: number): this;
    decrement(n?: number): this;
  }

  export class Timer extends Text {
    elapsed: number;
    running: boolean;
    start(): this;
    stop(): this;
    reset(): this;
  }

  export class Panel extends Entity {
    width: number;
    height: number;
    add(child: Entity): this;
  }

  export class Camera {
    x: number;
    y: number;
    zoom: number;
    follow(target: Entity): this;
    unfollow(): this;
    setZoom(z: number): this;
    setPosition(x: number, y: number): this;
  }

  export class World extends EventEmitter {
    width: number;
    height: number;
    balls: Ball[];
    statics: GameObject[];
    specials: Entity[];
    ui: Entity[];
    add(obj: Entity): this;
    remove(obj: Entity): this;
    clear(): void;
    getObjectCount(): number;
  }

  export interface GameOptions {
    width?: number;
    height?: number;
    gravity?: number;
    gravityX?: number;
    gravityY?: number;
    canvas?: HTMLCanvasElement;
    parent?: string | HTMLElement;
    background?: string;
    debug?: boolean;
    bounds?: { left: number; top: number; right: number; bottom: number };
    boundsMode?: 'bounce' | 'destroy' | 'wrap';
    cellSize?: number;
  }

  export class Game extends EventEmitter {
    width: number;
    height: number;
    canvas: HTMLCanvasElement;
    world: World;
    camera: Camera;
    running: boolean;
    paused: boolean;
    debug: boolean;
    gravity: number;

    constructor(options?: GameOptions);
    setGravity(x: number, y?: number): this;
    setBounds(bounds: { left: number; top: number; right: number; bottom: number }, mode?: string): this;
    add(obj: Entity): this;
    remove(obj: Entity): this;
    start(): this;
    pause(): this;
    resume(): this;
    stop(): this;
    reset(): this;
    update(dt: number): void;
    render(): void;
  }

  export class Race extends EventEmitter {
    balls: Ball[];
    ranking: Array<{ place: number; ball: Ball; name: string; color: string }>;
    constructor(options?: {
      game?: Game;
      balls?: number;
      count?: number;
      startX?: number;
      startY?: number;
      goalX?: number;
      goalY?: number;
      goalRadius?: number;
      countdown?: number;
    });
    spawn(): this;
    start(): this;
    getWinner(): Ball | null;
    getRanking(): Array<{ place: number; ball: Ball; name: string; color: string }>;
  }

  const Marble: {
    Game: typeof Game;
    World: typeof World;
    Race: typeof Race;
    Ball: typeof Ball;
    Circle: typeof Circle;
    Rectangle: typeof Rectangle;
    Square: typeof Square;
    Polygon: typeof Polygon;
    Lava: typeof Lava;
    Goal: typeof Goal;
    Checkpoint: typeof Checkpoint;
    BallTeleport: typeof BallTeleport;
    Text: typeof Text;
    Counter: typeof Counter;
    Timer: typeof Timer;
    Panel: typeof Panel;
    Camera: typeof Camera;
    randomBall: (opts?: any) => Ball;
    version: string;
  };

  export default Marble;
}
