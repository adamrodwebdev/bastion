/**
 * @file Textures of the interface, painted by code: parchment, wooden planks,
 * brushed iron and the weave of cloth. Each one is a seamless tile with an alpha
 * channel: the stylesheet lays it over a colour token, so one tile serves both
 * themes (TextureService turns them into CSS images).
 *
 * They are painted in a worker where the browser allows it (paintWhole). The
 * painters are generators that yield every few dozen strokes, so elsewhere the
 * service spreads the work over idle moments and never holds the page. Soft,
 * wide stains are painted at a quarter of the size and scaled up: they cost a
 * sixteenth of the pixels, which matters where the canvas is drawn without a GPU.
 */

const TAU = Math.PI * 2;

/**
 * Canvases drawn on the processor, not the graphics card: every pixel is read back
 * to make the image anyway, and on a weak (or emulated) GPU the strokes of a texture
 * would queue in front of the page's own drawing and hold it.
 */
const CONTEXT = Object.freeze({ willReadFrequently: true });

/** Seeded generator (Park–Miller): the same textures at every launch. */
export function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * Calls draw(x, y) at a point and at its copies across the edges it comes near,
 * so whatever is drawn there wraps around and the tile repeats without a seam.
 */
export function wrapped(x, y, reach, w, h, draw) {
  const xs = [x];
  if (x < reach) xs.push(x + w);
  if (x > w - reach) xs.push(x - w);
  const ys = [y];
  if (y < reach) ys.push(y + h);
  if (y > h - reach) ys.push(y - h);
  for (const xx of xs) for (const yy of ys) draw(xx, yy);
}

/** The same across the left and right edges only (rows of planks, brushed strokes). */
export function wrappedX(x, reach, w, draw) {
  draw(x);
  if (x < reach) draw(x + w);
  if (x > w - reach) draw(x - w);
}

/** Soft round stain, wrapped across the edges. */
function stain(ctx, x, y, r, color, alpha, w, h) {
  wrapped(x, y, r, w, h, (cx, cy) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${color},${alpha})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  });
}

/**
 * Paints soft shapes on a canvas a quarter of the size, then lays it over the
 * whole tile, smoothed. The small canvas wraps like the tile, so the seam stays hidden.
 */
function softLayer(ctx, w, h, makeCanvas, draw) {
  const low = makeCanvas(w / 4, h / 4);
  draw(low.getContext('2d', CONTEXT), w / 4, h / 4);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(low, 0, 0, w, h);
}

/** Paper: broad stains, smaller blotches, fibres and specks. */
function* parchment(ctx, w, h, rnd, makeCanvas) {
  softLayer(ctx, w, h, makeCanvas, (low, lw, lh) => {
    for (let i = 0; i < 44; i++) {
      const broad = i < 8;
      const r = (broad ? 150 + rnd() * 110 : 24 + rnd() * 86) / 4;
      const alpha = broad ? 0.04 + rnd() * 0.04 : 0.05 + rnd() * 0.08;
      stain(low, rnd() * lw, rnd() * lh, r, '150,104,48', alpha.toFixed(3), lw, lh);
    }
  });
  yield;
  // Fibres, batched by shade: one path per stroke style.
  for (let b = 0; b < 12; b++) {
    const dark = b % 2 === 0;
    const alpha = dark ? 0.06 + (b / 12) * 0.1 : 0.1 + (b / 12) * 0.12;
    ctx.strokeStyle = dark ? `rgba(110,76,34,${alpha.toFixed(3)})` : `rgba(255,250,232,${alpha.toFixed(3)})`;
    ctx.lineWidth = 0.6 + (b % 3) * 0.4;
    ctx.beginPath();
    for (let i = 0; i < 80; i++) {
      const a = rnd() * Math.PI;
      const l = 4 + rnd() * 14;
      const dx = Math.cos(a) * l;
      const dy = Math.sin(a) * l;
      wrapped(rnd() * w, rnd() * h, l, w, h, (x, y) => {
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
      });
    }
    ctx.stroke();
    if (b % 4 === 3) yield;
  }
  ctx.fillStyle = 'rgba(90,60,25,0.28)';
  ctx.beginPath();
  for (let i = 0; i < 140; i++) {
    const r = 0.4 + rnd() * 0.8;
    const x = rnd() * w;
    const y = rnd() * h;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
}

/** Four horizontal planks: grain, a knot, and the gaps between them. */
function* wood(ctx, w, h, rnd) {
  const plank = h / 4;
  const tones = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(255,214,160,0.08)', 'rgba(0,0,0,0.06)'];
  for (let p = 0; p < 4; p++) {
    const y0 = p * plank;
    ctx.fillStyle = tones[p];
    ctx.fillRect(0, y0, w, plank);
    const g = ctx.createLinearGradient(0, y0, 0, y0 + plank);
    g.addColorStop(0, 'rgba(255,226,180,0.13)');
    g.addColorStop(0.45, 'rgba(255,226,180,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, w, plank);
    // Grain: waves whose period divides the width, so the tile wraps.
    for (let i = 0; i < 24; i++) {
      const yy = y0 + 6 + rnd() * (plank - 12);
      const amp = 0.8 + rnd() * 2.6;
      const k = ((2 + Math.floor(rnd() * 5)) * TAU) / w;
      const phase = rnd() * TAU;
      const dark = rnd() < 0.72;
      ctx.strokeStyle = dark ? `rgba(40,20,8,${(0.14 + rnd() * 0.2).toFixed(3)})` : `rgba(255,200,140,${(0.08 + rnd() * 0.1).toFixed(3)})`;
      ctx.lineWidth = 0.8 + rnd() * 1.4;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, yy + Math.sin(x * k + phase) * amp);
      ctx.stroke();
    }
    // A knot, but not on the first plank: buttons show only that one, and under a label it reads as a smudge.
    const kx = rnd() * w;
    const ky = y0 + plank / 2 + (rnd() - 0.5) * plank * 0.3;
    if (p > 0) wrappedX(kx, 30, w, (x) => {
      ctx.strokeStyle = 'rgba(40,20,8,0.34)';
      ctx.lineWidth = 1.4;
      for (let r = 14; r > 2; r -= 3) {
        ctx.beginPath();
        ctx.ellipse(x, ky, r * 1.9, r * 0.7, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,14,6,0.55)';
      ctx.beginPath();
      ctx.ellipse(x, ky, 4, 1.8, 0, 0, TAU);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(20,10,4,0.85)';
    ctx.fillRect(0, y0 + plank - 3, w, 3);
    ctx.fillStyle = 'rgba(255,220,170,0.2)';
    ctx.fillRect(0, y0, w, 1.5);
    yield;
  }
}

/** Dark iron: soft mottling, horizontal brushing, a few pits. */
function* iron(ctx, w, h, rnd, makeCanvas) {
  softLayer(ctx, w, h, makeCanvas, (low, lw, lh) => {
    for (let i = 0; i < 12; i++) {
      const light = i % 3 === 0;
      stain(low, rnd() * lw, rnd() * lh, (60 + rnd() * 90) / 4, light ? '255,255,255' : '0,0,0', light ? 0.035 : 0.1, lw, lh);
    }
  });
  yield;
  for (let b = 0; b < 8; b++) {
    const light = b % 2 === 0;
    ctx.strokeStyle = light ? `rgba(255,255,255,${(0.03 + b * 0.006).toFixed(3)})` : `rgba(0,0,0,${(0.05 + b * 0.008).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 90; i++) {
      const len = 30 + rnd() * 90;
      const y = Math.round(rnd() * h) + 0.5;
      const drift = (rnd() - 0.5) * 1.2;
      wrappedX(rnd() * w, len, w, (x) => {
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y + drift);
      });
    }
    ctx.stroke();
    if (b % 4 === 3) yield;
  }
  // Pits, and the light catching their lower lip: two paths in all.
  const pits = [];
  for (let i = 0; i < 160; i++) pits.push([rnd() * w, rnd() * h, 0.5 + rnd() * 0.9]);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  for (const [x, y, r] of pits) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  for (const [x, y, r] of pits) ctx.rect(x - r, y + r * 0.6, r * 2, 0.8);
  ctx.fill();
}

/** Cloth: light weft threads across, dark warp threads down. */
function* weave(ctx, w, h, rnd) {
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = `rgba(255,255,255,${(0.05 + rnd() * 0.06).toFixed(3)})`;
    ctx.fillRect(0, y, w, 1);
  }
  for (let x = 0; x < w; x += 3) {
    ctx.fillStyle = `rgba(0,0,0,${(0.07 + rnd() * 0.06).toFixed(3)})`;
    ctx.fillRect(x, 0, 1, h);
  }
  yield;
}

/**
 * Every texture of the interface, by the CSS name it is given (`--tex-<name>`).
 * Sizes are multiples of the patterns, so each tile repeats without a seam.
 */
export const TEXTURES = Object.freeze({
  parchment: Object.freeze({ width: 512, height: 512, seed: 7, paint: parchment }),
  wood: Object.freeze({ width: 768, height: 384, seed: 11, paint: wood }),
  iron: Object.freeze({ width: 384, height: 384, seed: 13, paint: iron }),
  weave: Object.freeze({ width: 96, height: 96, seed: 17, paint: weave }),
});

/**
 * The steps of one texture on its canvas.
 * @param {(width: number, height: number) => HTMLCanvasElement|OffscreenCanvas} makeCanvas for the soft layers
 */
export function paintSteps(spec, canvas, makeCanvas) {
  return spec.paint(canvas.getContext('2d', CONTEXT), spec.width, spec.height, seeded(spec.seed), makeCanvas);
}

/** Paints a texture in one go (in a worker, where nothing else waits for the thread). */
export function paintWhole(spec, canvas, makeCanvas) {
  const steps = paintSteps(spec, canvas, makeCanvas);
  let step = steps.next();
  while (!step.done) step = steps.next();
}
