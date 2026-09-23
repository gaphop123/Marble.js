import { Text } from './Text.js';

export class Counter extends Text {
  constructor(options = {}) {
    super({
      text: String(options.value ?? 0),
      ...options
    });
    this.type = 'counter';
    this.value = options.value ?? 0;
    this.prefix = options.prefix ?? '';
    this.suffix = options.suffix ?? '';
  }

  setValue(v) {
    this.value = v;
    this.text = `${this.prefix}${v}${this.suffix}`;
    return this;
  }

  increment(n = 1) {
    return this.setValue(this.value + n);
  }

  decrement(n = 1) {
    return this.setValue(this.value - n);
  }
}
