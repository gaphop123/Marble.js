import { Rectangle } from './Rectangle.js';

export class Square extends Rectangle {
  constructor(options = {}) {
    const size = options.size ?? options.width ?? options.height ?? 80;
    super({
      ...options,
      width: size,
      height: size
    });
    this.type = 'square';
  }
}
