/**
 * @file Paints the textures of the interface away from the page's thread, and
 * sends each one back as an image (TextureService).
 */

import { TEXTURES, paintWhole } from '../core/rendering/Textures.js';

const makeCanvas = (width, height) => new OffscreenCanvas(width, height);

self.addEventListener('message', async () => {
  for (const [name, spec] of Object.entries(TEXTURES)) {
    let blob = null;
    try {
      const canvas = makeCanvas(spec.width, spec.height);
      paintWhole(spec, canvas, makeCanvas);
      // PNG: four times quicker to write than WebP, and the image never leaves the device.
      blob = await canvas.convertToBlob({ type: 'image/png' });
    } catch {
      // No 2D canvas in this worker, or no encoder: this texture stays a colour.
    }
    self.postMessage({ name, blob });
  }
  self.postMessage({ done: true });
});
