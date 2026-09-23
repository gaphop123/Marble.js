import { Ball } from '../shapes/Ball.js';
import { Goal } from '../objects/Goal.js';
import { EventEmitter } from './EventEmitter.js';

const RACE_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
  '#ff5722', '#673ab7', '#009688', '#ff9800', '#3f51b5',
  '#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad'
];

const RACE_NAMES = [
  'Ruby', 'Sapphire', 'Emerald', 'Topaz', 'Amethyst',
  'Jade', 'Amber', 'Coral', 'Pearl', 'Onyx',
  'Garnet', 'Aquamarine', 'Peridot', 'Citrine', 'Opal',
  'Turquoise', 'Spinel', 'Zircon', 'Moonstone', 'Sunstone'
];

/**
 * Marble.Race – quick helper for marble race setups
 */
export class Race extends EventEmitter {
  constructor(options = {}) {
    super();
    this.game = options.game ?? null;
    this.count = options.balls ?? options.count ?? 10;
    this.startX = options.startX ?? 100;
    this.startY = options.startY ?? 100;
    this.spreadX = options.spreadX ?? 40;
    this.spreadY = options.spreadY ?? 0;
    this.goalX = options.goalX ?? 1100;
    this.goalY = options.goalY ?? 600;
    this.goalRadius = options.goalRadius ?? 50;
    this.balls = [];
    this.goal = null;
    this.finished = [];
    this.ranking = [];
    this.started = false;
    this.countdown = options.countdown ?? 3;
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
        showName: true,
        bounce: 0.5 + Math.random() * 0.3,
        mass: 1 + Math.random(),
        physics: 'real'
      });
      this.balls.push(ball);
      if (this.game) this.game.add(ball);
    }

    this.goal = new Goal({
      x: this.goalX,
      y: this.goalY,
      radius: this.goalRadius
    });
    this.goal.onEnter((ball) => {
      if (!this.finished.includes(ball)) {
        this.finished.push(ball);
        this.ranking.push({
          place: this.finished.length,
          ball,
          name: ball.name,
          color: ball.color
        });
        this.emit('finish', ball, this.finished.length);
        if (this.finished.length === 1) {
          this.emit('winner', ball);
        }
        if (this.finished.length >= this.balls.length) {
          this.emit('complete', this.ranking);
        }
      }
    });
    if (this.game) this.game.add(this.goal);

    return this;
  }

  start() {
    if (!this.balls.length) this.spawn();
    this.started = true;
    this.finished = [];
    this.ranking = [];
    this.emit('start');
    // Optional countdown can be handled by caller
    return this;
  }

  getWinner() {
    return this.finished[0] ?? null;
  }

  getRanking() {
    return this.ranking.slice();
  }
}
