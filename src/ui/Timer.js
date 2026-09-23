import { Text } from './Text.js';

export class Timer extends Text {
  constructor(options = {}) {
    super({
      text: '0.00',
      ...options
    });
    this.type = 'timer';
    this.elapsed = 0;
    this.running = false;
    this.precision = options.precision ?? 2;
  }

  start() {
    this.running = true;
    return this;
  }

  stop() {
    this.running = false;
    return this;
  }

  reset() {
    this.elapsed = 0;
    this._updateText();
    return this;
  }

  update(dt) {
    if (this.running) {
      this.elapsed += dt;
      this._updateText();
    }
  }

  _updateText() {
    this.text = this.elapsed.toFixed(this.precision);
  }
}
