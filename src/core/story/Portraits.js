/**
 * @file The characters of the Chronicle, drawn by code in a <canvas>.
 *
 * No image file: each portrait is a palette and a run-length encoded list of
 * pixels (portraits.data.js, shared with Catapulte Mania), decoded once and
 * painted at its real size. CSS enlarges it with `image-rendering: pixelated`,
 * so the pixel art stays sharp at every size.
 */

import { PORTRAIT_DATA } from './portraits.data.js';

/**
 * Characters. `facing`: side the original drawing looks at; the story scene
 * mirrors portraits so they always look towards the centre.
 */
export const CHARACTERS = Object.freeze({
  ysolde: { role: 'queen', facing: 'right' },
  aubert: { role: 'king', facing: 'right' },
  gontran: { role: 'engineer', facing: 'left' },
  mordrac: { role: 'usurper', facing: 'front' },
});

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const TOKEN = /([A-Za-z.])(\d*)/g;
const cache = new Map();

/**
 * Decodes a portrait into RGBA pixels (cached).
 * @param {string} id
 * @returns {{w:number, h:number, pixels:Uint8ClampedArray}}
 */
export function decodePortrait(id) {
  if (!CHARACTERS[id]) throw new Error(`Unknown portrait: ${id}`);
  if (cache.has(id)) return cache.get(id);
  const { w, h, palette, data } = PORTRAIT_DATA[id];
  const rgb = palette.map((hex) => {
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  const pixels = new Uint8ClampedArray(w * h * 4);
  let p = 0;
  for (const [, sym, count] of data.matchAll(TOKEN)) {
    const n = count ? Number(count) : 1;
    if (sym === '.') {
      p += n;
      continue;
    }
    const c = rgb[ALPHABET.indexOf(sym)];
    if (!c) throw new Error(`portrait ${id}: unknown colour ${sym}`);
    for (let i = 0; i < n; i++, p++) {
      pixels[p * 4] = c[0];
      pixels[p * 4 + 1] = c[1];
      pixels[p * 4 + 2] = c[2];
      pixels[p * 4 + 3] = 255;
    }
  }
  if (p !== w * h) throw new Error(`portrait ${id}: ${p} pixels for ${w}×${h}`);
  const out = Object.freeze({ w, h, pixels });
  cache.set(id, out);
  return out;
}

/**
 * Paints a portrait into a canvas, at its real size (CSS scales it up).
 * @param {HTMLCanvasElement} canvas
 * @param {string} id
 */
export function paintPortrait(canvas, id) {
  const { w, h, pixels } = decodePortrait(id);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.putImageData(new ImageData(pixels, w, h), 0, 0);
}
