/**
 * Canvas 2D renderer
 */
export class CanvasRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.background = options.background ?? '#1a1a2e';
    this.debug = false;
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.width = w;
    this.height = h;
  }

  clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = this.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  begin(camera) {
    this.clear();
    if (camera) camera.apply(this.ctx);
  }

  end(camera) {
    if (camera) camera.reset(this.ctx);
  }

  drawDebug(info) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(8, 8, 180, 90);
    ctx.fillStyle = '#0f0';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${info.fps}`, 16, 28);
    ctx.fillText(`Objects: ${info.objects}`, 16, 44);
    ctx.fillText(`Collisions: ${info.collisions}`, 16, 60);
    ctx.fillText(`Physics: ${info.physicsMs}ms`, 16, 76);
  }

  drawVelocity(ball, camera) {
    if (!this.debug) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + ball.velocityX * 0.1, ball.y + ball.velocityY * 0.1);
    ctx.stroke();
    // center
    ctx.fillStyle = '#f0f';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
