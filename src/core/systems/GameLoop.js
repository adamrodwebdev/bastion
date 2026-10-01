/**
 * @file Fixed-timestep game loop based on requestAnimationFrame.
 */

/**
 * Fixed-timestep loop driven by requestAnimationFrame.
 * Simulation runs at a constant 60 Hz regardless of the display rate,
 * rendering happens once per frame. Pauses itself when the tab is hidden.
 */
export class GameLoop {
  /**
   * @param {(dt:number)=>void} update
   * @param {()=>void} render
   */
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.step = 1 / 60;
    this.maxSteps = 8;
    this.timeScale = 1;
    this.running = false;
    this._acc = 0;
    this._last = 0;
    this._raf = 0;
    this._frame = this._frame.bind(this);
    this._onVisibility = () => {
      if (document.hidden) this._last = 0;
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = 0;
    document.addEventListener('visibilitychange', this._onVisibility);
    this._raf = requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    document.removeEventListener('visibilitychange', this._onVisibility);
  }

  _frame(now) {
    if (!this.running) return;
    if (this._last) {
      // Clamp to avoid the "spiral of death" after a long pause.
      const delta = Math.min(0.25, (now - this._last) / 1000) * this.timeScale;
      this._acc += delta;
      let steps = 0;
      while (this._acc >= this.step && steps < this.maxSteps * this.timeScale) {
        this.update(this.step);
        this._acc -= this.step;
        steps++;
      }
      if (steps >= this.maxSteps * this.timeScale) this._acc = 0;
    }
    this._last = now;
    this.render();
    this._raf = requestAnimationFrame(this._frame);
  }
}
