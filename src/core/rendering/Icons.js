/**
 * @file Small pictures of the towers and enemies for the interface (shop,
 * briefing, tower panel…), painted with the same drawings as the board so
 * menus and game look alike. Returned as cached data URLs (allowed by the CSP).
 */

import { drawBody, drawLive, drawFront } from './Buildings.js';
import { drawUnit, unitHeight } from './Units.js';
import { makeCanvas } from './paint.js';

const cache = new Map();

/** Crops a canvas to its visible pixels, centred in a square with a small margin. */
function trimmed(src, size) {
  const ctx = src.getContext('2d');
  const { width: w, height: h } = src;
  let data;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return src.toDataURL('image/png');
  }
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return src.toDataURL('image/png');
  const box = Math.max(x1 - x0, y1 - y0) * 1.06;
  const out = makeCanvas(size, size);
  const o = out.getContext('2d');
  const k = size / box;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  o.drawImage(src, x0, y0, x1 - x0 + 1, y1 - y0 + 1, size / 2 - (cx - x0) * k, size / 2 - (cy - y0) * k, (x1 - x0 + 1) * k, (y1 - y0 + 1) * k);
  return out.toDataURL('image/png');
}

/**
 * @param {string} type tower type
 * @param {{level?:number, elite?:boolean, color?:string, size?:number}} [o]
 * @returns {string} data URL ('' outside a browser)
 */
export function towerIcon(type, { level = 1, elite = false, color = '#888', size = 96 } = {}) {
  if (typeof document === 'undefined') return '';
  const key = `t|${type}|${level}|${elite}|${color}|${size}`;
  let url = cache.get(key);
  if (url) return url;
  const big = size * 2;
  const c = makeCanvas(big, big);
  const ctx = c.getContext('2d');
  const top = type === 'watch' || type === 'storm' ? 1.0 : 0.95;
  const s = big / (top + 0.62);
  ctx.setTransform(s, 0, 0, s, big / 2, top * s);
  ctx.lineJoin = 'round';
  drawBody(ctx, type, level, elite, color);
  const fake = { type, level: elite ? 4 : level, isElite: elite, id: 3, recoil: 0, constructor: { color }, baseLevels: 3 };
  drawLive(ctx, fake, 0.8, -0.5, { reduced: true });
  drawFront(ctx, type, level, elite);
  url = trimmed(c, size);
  cache.set(key, url);
  return url;
}

/**
 * @param {string} type enemy type (or 'footman' / 'knightAlly' / 'militia')
 * @param {number} radius enemy radius in tiles (sets the proportions)
 * @param {number} [size] pixels
 */
export function unitIcon(type, radius = 0.26, size = 96) {
  if (typeof document === 'undefined') return '';
  const key = `u|${type}|${radius}|${size}`;
  let url = cache.get(key);
  if (url) return url;
  const big = size * 2;
  const c = makeCanvas(big, big);
  const ctx = c.getContext('2d');
  const h = unitHeight(type, radius);
  const w = radius * 2.6;
  const box = Math.max(h * 1.3, w * 1.6);
  const s = big / box;
  ctx.setTransform(s, 0, 0, s, big / 2, big - (box - h) * s * 0.4);
  ctx.lineJoin = 'round';
  drawUnit(ctx, type, radius, { phase: 0.6, moving: true, attack: 0, flash: false, t: 0.5, seed: 1 });
  url = trimmed(c, size);
  cache.set(key, url);
  return url;
}
