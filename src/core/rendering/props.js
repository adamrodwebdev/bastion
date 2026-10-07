/**
 * @file Scenery drawn in "sprite space" (screen-aligned, 1 unit = 1 tile, origin
 * at the object's foot): trees, rocks, banners, the enemy camp at each entrance
 * and the kingdom's gatehouse at each exit.
 */

import { TAU, rng, shade, mix, rgba, shadow, INK } from './paint.js';
import { MATERIALS as M } from './palettes.js';

/** Waving flag on a pole. `t` in seconds animates the cloth. */
export function banner(ctx, x, y, h, color, t, { emblem = null, still = false, width = 0.3, dir = 1 } = {}) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.035;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h);
  ctx.stroke();
  ctx.fillStyle = M.gold;
  ctx.beginPath();
  ctx.arc(x, y - h, 0.03, 0, TAU);
  ctx.fill();
  const top = y - h + 0.03;
  const fh = width * 0.62;
  const steps = 6;
  ctx.beginPath();
  ctx.moveTo(x, top);
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const wave = still ? 0 : Math.sin(t * 6 - k * 4) * 0.03 * k;
    ctx.lineTo(x + dir * width * k, top + wave);
  }
  for (let i = steps; i >= 0; i--) {
    const k = i / steps;
    const wave = still ? 0 : Math.sin(t * 6 - k * 4 + 0.6) * 0.03 * k;
    // Swallow-tail end.
    const notch = i === steps ? fh * 0.3 : 0;
    ctx.lineTo(x + dir * (width * k - notch), top + fh + wave);
    if (i === steps) ctx.lineTo(x + dir * width * k, top + fh + wave + 0.0);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 0.018;
  ctx.stroke();
  if (emblem) {
    ctx.fillStyle = emblem;
    ctx.beginPath();
    ctx.arc(x + dir * width * 0.42, top + fh * 0.48, fh * 0.2, 0, TAU);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- trees

function blob(ctx, x, y, r, base, light) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, light);
  g.addColorStop(1, base);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function trunk(ctx, h, w, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(-w * 0.6, -h);
  ctx.lineTo(w * 0.6, -h);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(color, -0.25);
  ctx.fillRect(w * 0.1, -h, w * 0.5, h);
}

function pineTiers(ctx, pal, scale, snow) {
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const w = (0.36 - i * 0.08) * scale;
    const yb = (-0.18 - i * 0.2) * scale;
    const yt = yb - 0.34 * scale;
    ctx.fillStyle = pal.leaf;
    ctx.beginPath();
    ctx.moveTo(-w, yb);
    ctx.lineTo(0, yt);
    ctx.lineTo(w, yb);
    ctx.quadraticCurveTo(0, yb + 0.06 * scale, -w, yb);
    ctx.fill();
    ctx.fillStyle = pal.leafLight;
    ctx.beginPath();
    ctx.moveTo(-w, yb);
    ctx.lineTo(0, yt);
    ctx.lineTo(-w * 0.15, yb + 0.02);
    ctx.closePath();
    ctx.fill();
    if (snow) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, yt + (yb - yt) * 0.55);
      ctx.lineTo(0, yt);
      ctx.lineTo(w * 0.55, yt + (yb - yt) * 0.55);
      ctx.quadraticCurveTo(0, yt + (yb - yt) * 0.4, -w * 0.55, yt + (yb - yt) * 0.55);
      ctx.fill();
    }
  }
}

/**
 * A tree whose kind follows the landscape ('oak', 'pine', 'palm'…).
 * @param {CanvasRenderingContext2D} ctx sprite space, origin at the foot
 * @param {object} pal landscape palette
 * @param {number} seed variation
 */
export function tree(ctx, pal, seed, kind = pal.tree) {
  const r = rng(seed);
  const s = 0.85 + r() * 0.3;
  if (kind === 'forest') kind = r() < 0.5 ? 'pine' : 'oak';
  shadow(ctx, 0.05, 0, 0.34 * s, 0.12 * s, 0.25);
  switch (kind) {
    case 'pine':
    case 'snowpine':
      trunk(ctx, 0.2 * s, 0.05, pal.trunk);
      pineTiers(ctx, pal, s, kind === 'snowpine');
      break;
    case 'palm': {
      ctx.strokeStyle = pal.trunk;
      ctx.lineWidth = 0.07;
      ctx.lineCap = 'round';
      const bend = (r() - 0.5) * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(bend * 0.3, -0.4 * s, bend, -0.75 * s);
      ctx.stroke();
      ctx.strokeStyle = shade(pal.trunk, 0.25);
      ctx.lineWidth = 0.02;
      for (let k = 0.15; k < 0.75; k += 0.12) {
        ctx.beginPath();
        ctx.moveTo(bend * k - 0.035, -k * s);
        ctx.lineTo(bend * k + 0.035, -k * s - 0.02);
        ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.55;
        ctx.fillStyle = i % 2 ? pal.leaf : pal.leafLight;
        ctx.beginPath();
        const hx = bend;
        const hy = -0.75 * s;
        ctx.moveTo(hx, hy);
        ctx.quadraticCurveTo(hx + Math.cos(a - 0.3) * 0.25, hy + Math.sin(a - 0.3) * 0.25 - 0.05, hx + Math.cos(a) * 0.42, hy + Math.sin(a) * 0.3 + 0.12);
        ctx.quadraticCurveTo(hx + Math.cos(a + 0.3) * 0.2, hy + Math.sin(a + 0.3) * 0.2, hx, hy);
        ctx.fill();
      }
      break;
    }
    case 'willow': {
      trunk(ctx, 0.3 * s, 0.07, pal.trunk);
      blob(ctx, 0, -0.5 * s, 0.32 * s, pal.leaf, pal.leafLight);
      ctx.strokeStyle = pal.leaf;
      ctx.lineWidth = 0.025;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 0.08 * s, -0.45 * s);
        ctx.quadraticCurveTo(i * 0.1 * s, -0.25 * s, i * 0.11 * s + 0.02, -0.05 * s);
        ctx.stroke();
      }
      break;
    }
    case 'bare':
    case 'dead': {
      const c = kind === 'dead' ? '#2a2020' : pal.trunk;
      ctx.strokeStyle = c;
      ctx.lineCap = 'round';
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0.02, -0.6 * s);
      ctx.stroke();
      ctx.lineWidth = 0.035;
      for (let i = 0; i < 4; i++) {
        const y = -(0.25 + i * 0.1) * s;
        const dir = i % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(0.01, y);
        ctx.lineTo(dir * (0.18 + r() * 0.1) * s, y - 0.15 * s);
        ctx.stroke();
      }
      if (kind === 'dead') {
        ctx.fillStyle = '#ff7a2a';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc((r() - 0.5) * 0.06, -r() * 0.5 * s, 0.015, 0, TAU);
          ctx.fill();
        }
      } else {
        for (let i = 0; i < 4; i++) blob(ctx, (r() - 0.5) * 0.4 * s, -(0.45 + r() * 0.25) * s, 0.06 * s, pal.leaf, pal.leafLight);
      }
      break;
    }
    case 'cypress': {
      trunk(ctx, 0.12, 0.04, pal.trunk);
      const g = ctx.createLinearGradient(-0.15, 0, 0.15, 0);
      g.addColorStop(0, pal.leafLight);
      g.addColorStop(1, pal.leaf);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -0.5 * s, 0.14 * s, 0.42 * s, 0, 0, TAU);
      ctx.fill();
      break;
    }
    default: {
      // Oak: several soft blobs.
      trunk(ctx, 0.3 * s, 0.07, pal.trunk);
      const parts = [[-0.14, -0.42, 0.2], [0.14, -0.44, 0.2], [0, -0.6, 0.24], [0.02, -0.38, 0.18]];
      for (const [x, y, rr] of parts) blob(ctx, x * s, y * s, rr * s, pal.leaf, pal.leafLight);
      ctx.fillStyle = rgba('#ffffff', 0.12);
      ctx.beginPath();
      ctx.arc(-0.08 * s, -0.66 * s, 0.07 * s, 0, TAU);
      ctx.fill();
    }
  }
}

/** A small cluster of boulders (snow-capped, sandstone or lava-cracked by landscape). */
export function rock(ctx, pal, seed, theme) {
  const r = rng(seed);
  shadow(ctx, 0.02, 0.02, 0.36, 0.13, 0.25);
  const stones = [[-0.12, 0, 0.2], [0.13, 0.02, 0.16], [0.02, -0.06, 0.24]];
  for (const [x, y, s0] of stones) {
    const s = s0 * (0.85 + r() * 0.3);
    const pts = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + r() * 0.4;
      const rr = s * (0.75 + r() * 0.3);
      pts.push([x + Math.cos(a) * rr, y - s * 0.55 + Math.sin(a) * rr * 0.8]);
    }
    const g = ctx.createLinearGradient(x - s, y - s * 1.3, x + s, y + s * 0.2);
    g.addColorStop(0, shade(pal.rock, 0.25));
    g.addColorStop(1, pal.rockDark);
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.45);
    ctx.lineWidth = 0.015;
    ctx.stroke();
    if (theme === 'winter') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x - s * 0.1, y - s * 1.05, s * 0.6, s * 0.22, -0.2, 0, TAU);
      ctx.fill();
    } else if (theme === 'ashlands') {
      ctx.strokeStyle = '#ff8a2a';
      ctx.lineWidth = 0.018;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.4, y - s * 0.5);
      ctx.lineTo(x, y - s * 0.7);
      ctx.lineTo(x + s * 0.3, y - s * 0.45);
      ctx.stroke();
    } else if (theme === 'desert') {
      ctx.strokeStyle = rgba(shade(pal.rock, 0.35), 0.8);
      ctx.lineWidth = 0.015;
      for (let k = 1; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(x - s * 0.7, y - s * (0.3 + k * 0.3));
        ctx.lineTo(x + s * 0.7, y - s * (0.32 + k * 0.3));
        ctx.stroke();
      }
    } else {
      // Moss / light accent.
      ctx.fillStyle = rgba(pal.leafLight, 0.55);
      ctx.beginPath();
      ctx.ellipse(x - s * 0.25, y - s * 1.0, s * 0.3, s * 0.1, -0.3, 0, TAU);
      ctx.fill();
    }
  }
}

/** Grass tuft (two or three blades), used densely by the terrain painter. */
export function tuft(ctx, x, y, color, h = 0.08) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.moveTo(x - 0.02, y);
  ctx.quadraticCurveTo(x - 0.03, y - h * 0.6, x - 0.045, y - h);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 0.004, y - h * 1.15);
  ctx.moveTo(x + 0.02, y);
  ctx.quadraticCurveTo(x + 0.03, y - h * 0.6, x + 0.05, y - h * 0.9);
  ctx.stroke();
}

// ---------------------------------------------------------------- gates

/**
 * Enemy camp at an entrance: two war-banners of Mordrac and a striped tent.
 * @param {{x:number,y:number}} side unit vector (screen space) across the road
 */
export function enemyCamp(ctx, side, t) {
  const off = 0.5;
  // Tent on one side.
  ctx.save();
  ctx.translate(side.x * 0.62, side.y * 0.62 + 0.05);
  shadow(ctx, 0, 0.02, 0.32, 0.1, 0.3);
  ctx.fillStyle = '#5a1a1a';
  ctx.beginPath();
  ctx.moveTo(-0.3, 0);
  ctx.lineTo(0, -0.42);
  ctx.lineTo(0.3, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1e1a22';
  for (let i = -1; i <= 1; i += 2) {
    ctx.beginPath();
    ctx.moveTo(i * 0.1, 0);
    ctx.lineTo(0, -0.42);
    ctx.lineTo(i * 0.2, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#0d0a0c';
  ctx.beginPath();
  ctx.moveTo(-0.07, 0);
  ctx.lineTo(0, -0.18);
  ctx.lineTo(0.07, 0);
  ctx.fill();
  ctx.restore();
  // Banners on both sides of the road.
  for (const k of [-1, 1]) {
    banner(ctx, side.x * off * k, side.y * off * k, 0.62, '#1e1a22', t + k, { emblem: '#c0392b', width: 0.26 });
  }
}

/** The kingdom's gatehouse at an exit: two round towers, a lintel, blue banners. */
export function gatehouse(ctx, side, t, night) {
  const off = 0.5;
  const towers = [-1, 1].map((k) => ({ x: side.x * off * k, y: side.y * off * k }));
  towers.sort((a, b) => a.y - b.y);
  // Lintel behind (drawn between the tops).
  const top = 0.62;
  ctx.strokeStyle = M.stoneDark;
  ctx.lineWidth = 0.12;
  ctx.beginPath();
  ctx.moveTo(towers[0].x, towers[0].y - top + 0.05);
  ctx.lineTo(towers[1].x, towers[1].y - top + 0.05);
  ctx.stroke();
  ctx.strokeStyle = M.stone;
  ctx.lineWidth = 0.07;
  ctx.stroke();
  for (const p of towers) {
    ctx.save();
    ctx.translate(p.x, p.y);
    shadow(ctx, 0, 0.02, 0.2, 0.08, 0.3);
    const w = 0.3;
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, M.stone);
    g.addColorStop(0.6, M.stoneMid);
    g.addColorStop(1, M.stoneDark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -top);
    ctx.lineTo(w / 2, -top);
    ctx.lineTo(w / 2, 0);
    ctx.ellipse(0, 0, w / 2, w * 0.18, 0, 0, Math.PI);
    ctx.fill();
    // Merlons.
    ctx.fillStyle = M.stone;
    for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + i * (w / 2.5) - 0.005, -top - 0.07, w / 5, 0.08);
    ctx.fillStyle = M.roofBlue;
    ctx.beginPath();
    ctx.moveTo(-w * 0.62, -top - 0.06);
    ctx.lineTo(0, -top - 0.36);
    ctx.lineTo(w * 0.62, -top - 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = M.roofBlueDark;
    ctx.beginPath();
    ctx.moveTo(0, -top - 0.36);
    ctx.lineTo(w * 0.62, -top - 0.06);
    ctx.lineTo(w * 0.1, -top - 0.06);
    ctx.closePath();
    ctx.fill();
    // Arrow slit, lit at night.
    ctx.fillStyle = night ? '#ffc861' : '#2a2018';
    ctx.fillRect(-0.02, -top * 0.62, 0.04, 0.12);
    ctx.restore();
    banner(ctx, p.x, p.y - top - 0.3, 0.22, M.woad, t + p.x * 3, { emblem: M.gold, width: 0.22 });
  }
}

/** Water ripple highlights for one cell (animated, drawn every frame). */
export function waterShimmer(ctx, c, r, t, light) {
  ctx.strokeStyle = rgba(light, 0.55);
  ctx.lineWidth = 0.02;
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const ph = t * 0.8 + c * 1.7 + r * 2.3 + i * 2.1;
    const k = (Math.sin(ph) + 1) / 2;
    const x = c + 0.2 + ((i * 0.37 + c * 0.13) % 0.5);
    const y = r + 0.3 + i * 0.38;
    ctx.globalAlpha = 0.25 + k * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 0.08, y - 0.04, x + 0.16 + k * 0.05, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export { mix };
