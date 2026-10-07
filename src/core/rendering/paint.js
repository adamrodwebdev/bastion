/**
 * @file Small drawing helpers shared by the renderer modules: colours, seeded
 * randomness, rounded shapes and soft shadows. No state, no DOM.
 */

export const TAU = Math.PI * 2;

/** Fast deterministic random generator (mulberry32), returns floats in [0, 1). */
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map();

/** '#rrggbb' → [r, g, b]. */
export function hexToRgb(hex) {
  let v = cache.get(hex);
  if (!v) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    cache.set(hex, v);
  }
  return v;
}

const toHex = (r, g, b) => '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');

/** Mixes two hex colours (t = 0 → a, t = 1 → b). */
export function mix(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Lightens (amount > 0) or darkens (amount < 0) a hex colour, amount in [-1, 1]. */
export function shade(hex, amount) {
  return amount >= 0 ? mix(hex, '#ffffff', amount) : mix(hex, '#000000', -amount);
}

/** Hex colour with alpha, as an rgba() string. */
export function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Adds a rounded rectangle to the current path (does not fill). */
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Soft elliptical contact shadow. */
export function shadow(ctx, x, y, rx, ry, alpha = 0.28) {
  ctx.fillStyle = `rgba(20,14,8,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

/** Fills then outlines the current path. */
export function fillStroke(ctx, fill, stroke, width) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

/** Five-pointed star path. */
export function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** Creates an offscreen canvas (OffscreenCanvas is avoided for Safari 14). */
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Ink colour used for every outline: a warm, very dark brown reads softer than black. */
export const INK = '#2a1f17';
