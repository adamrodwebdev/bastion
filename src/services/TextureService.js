/**
 * @file Hands the textures painted by code to the stylesheet.
 */

/** How long a silent worker is given before the textures are painted on the page's thread. */
const WORKER_PATIENCE_MS = 5000;

/** Runs fn when the browser is idle, or soon where it has no idle callback. */
function whenIdle(fn) {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(() => fn(null), 50);
}

/** A canvas outside the page where there is one, otherwise a detached element. */
function createCanvas(width, height) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(width, height);
  return Object.assign(document.createElement('canvas'), { width, height });
}

/** Encodes a canvas as a PNG: quick to write, and the image never leaves the device. */
function encode(canvas) {
  if (typeof canvas.convertToBlob === 'function') return canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Texture not encoded'))), 'image/png');
  });
}

/**
 * Paints each texture once and exposes it on <html> as `--tex-parchment`,
 * `--tex-wood`, `--tex-iron` and `--tex-weave`. The painting happens in a worker
 * where the browser can draw there (OffscreenCanvas), so the page's thread does
 * none of it; elsewhere it is spread over idle moments, a few milliseconds at a
 * time. Until the textures arrive the stylesheet shows the plain colours under
 * them, and a texture that cannot be made simply stays a colour.
 */
export class TextureService {
  #root;
  #schedule;
  #painting = null;

  /**
   * @param {HTMLElement|null} [root] element that receives the custom properties
   * @param {(fn: (deadline: IdleDeadline|null) => void) => void} [schedule] idle scheduler (page-thread painting)
   */
  constructor(root = typeof document === 'undefined' ? null : document.documentElement, schedule = whenIdle) {
    this.#root = root;
    this.#schedule = schedule;
  }

  /** Starts painting, once. @returns {Promise<void>} resolved once the textures are in place or given up; never rejected */
  paint() {
    if (!this.#painting) this.#painting = this.#paintAll().catch(() => {});
    return this.#painting;
  }

  async #paintAll() {
    if (!this.#root || typeof URL.createObjectURL !== 'function') return;
    const blobs = (await this.#inWorker()) ?? (await this.#onPage());
    // All at once: the page restyles a single time.
    for (const [name, blob] of blobs) this.#root.style.setProperty(`--tex-${name}`, `url("${URL.createObjectURL(blob)}")`);
  }

  /** @returns {Promise<Map<string, Blob>|null>} the textures, or null where a worker cannot paint them */
  #inWorker() {
    if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') return Promise.resolve(null);
    return new Promise((resolve) => {
      let worker;
      try {
        worker = new Worker(new URL('./textures.worker.js', import.meta.url), { type: 'module' });
      } catch {
        resolve(null);
        return;
      }
      const blobs = new Map();
      const end = (result) => {
        clearTimeout(timer);
        worker.terminate();
        resolve(result);
      };
      const timer = setTimeout(() => end(null), WORKER_PATIENCE_MS);
      worker.addEventListener('message', ({ data }) => {
        if (data.done) end(blobs.size ? blobs : null);
        else if (data.blob) blobs.set(data.name, data.blob);
      });
      worker.addEventListener('error', () => end(null));
      worker.postMessage('paint');
    });
  }

  /** @returns {Promise<Map<string, Blob>>} the textures painted on the page's thread, in idle slices */
  async #onPage() {
    const { TEXTURES, paintSteps } = await import('../core/rendering/Textures.js');
    const blobs = new Map();
    for (const [name, spec] of Object.entries(TEXTURES)) {
      try {
        const canvas = createCanvas(spec.width, spec.height);
        await this.#drain(paintSteps(spec, canvas, createCanvas));
        blobs.set(name, await encode(canvas));
      } catch {
        // No canvas, or the browser refused to encode it: this texture stays a colour.
      }
    }
    return blobs;
  }

  /** Runs a painter's steps while the browser has time to spare, then waits for the next idle moment. */
  #drain(steps) {
    return new Promise((resolve) => {
      const run = (deadline) => {
        const until = performance.now() + 6;
        const hasTime = () => (deadline && !deadline.didTimeout ? deadline.timeRemaining() > 2 : performance.now() < until);
        do {
          if (steps.next().done) {
            resolve();
            return;
          }
        } while (hasTime());
        this.#schedule(run);
      };
      this.#schedule(run);
    });
  }
}
