/**
 * @file The ten towers as real buildings, drawn in "sprite space" (screen-aligned,
 * 1 unit = 1 tile, origin at the centre of the tower's cell).
 *
 * Each tower is split in two:
 *  - a static body (walls, roofs, decks) that only changes with the level: it is
 *    painted once into a small offscreen canvas and reused (see BuildingCache);
 *  - a live layer drawn every frame: the weapon that turns towards its target,
 *    the archer, flames, the floating frost crystal, flags, lanterns…
 *
 * Levels read at a glance: wood at level 1, stone at level 2, taller stone with
 * banners at level 3, gold trims for the elite version.
 */

import { TAU, rng, shade, rgba, shadow, makeCanvas, INK, starPath } from './paint.js';
import { MATERIALS as M } from './palettes.js';
import { banner } from './props.js';

const BASE = 0.34; // y of the front foot of a building

// ---------------------------------------------------------------- primitives

/** Vertical cylinder (round tower) with block or plank texture. */
function cylinder(ctx, cx, base, w, h, o) {
  const ry = w * 0.2;
  const left = cx - w / 2;
  const right = cx + w / 2;
  ctx.beginPath();
  ctx.moveTo(left, base - h);
  ctx.lineTo(left, base);
  ctx.ellipse(cx, base, w / 2, ry, 0, Math.PI, 0, true);
  ctx.lineTo(right, base - h);
  ctx.closePath();
  const g = ctx.createLinearGradient(left, 0, right, 0);
  g.addColorStop(0, o.light);
  g.addColorStop(0.45, o.mid);
  g.addColorStop(1, o.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = o.line;
  ctx.lineWidth = 0.012;
  if (o.planks) {
    for (let i = 1; i < 9; i++) {
      const a = Math.PI - (i / 9) * Math.PI;
      const x = cx + Math.cos(a) * (w / 2);
      ctx.beginPath();
      ctx.moveTo(x, base - h);
      ctx.lineTo(x, base + Math.sin(a) * ry);
      ctx.stroke();
    }
    // Iron bands.
    ctx.strokeStyle = rgba(M.iron, 0.8);
    ctx.lineWidth = 0.025;
    for (const k of [0.25, 0.75]) {
      ctx.beginPath();
      ctx.ellipse(cx, base - h * k, w / 2, ry, 0, Math.PI, 0, true);
      ctx.stroke();
    }
  } else {
    const row = o.row || 0.085;
    let n = 0;
    for (let y = base - h + row; y < base + ry; y += row, n++) {
      ctx.beginPath();
      ctx.ellipse(cx, y, w / 2, ry, 0, Math.PI, 0, true);
      ctx.stroke();
      for (let j = 0; j < 4; j++) {
        const a = Math.PI - ((j + (n % 2 ? 0.5 : 0) + 0.5) / 4.5) * Math.PI;
        const x = cx + Math.cos(a) * (w / 2);
        const yy = y + Math.sin(a) * ry;
        ctx.beginPath();
        ctx.moveTo(x, yy - row);
        ctx.lineTo(x, yy);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(left, base - h);
  ctx.lineTo(left, base);
  ctx.ellipse(cx, base, w / 2, ry, 0, Math.PI, 0, true);
  ctx.lineTo(right, base - h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.022;
  ctx.stroke();
}

/** Flat top of a cylinder, with an inner floor. */
function cap(ctx, cx, top, w, o) {
  const ry = w * 0.2;
  ctx.fillStyle = o.top;
  ctx.beginPath();
  ctx.ellipse(cx, top, w / 2, ry, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.02;
  ctx.stroke();
  ctx.fillStyle = o.floor;
  ctx.beginPath();
  ctx.ellipse(cx, top + 0.005, w * 0.4, ry * 0.78, 0, 0, TAU);
  ctx.fill();
}

/** Merlons around the top: back half first (before the floor content), front half after. */
function merlons(ctx, cx, top, w, o, half) {
  const ry = w * 0.2;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Math.PI / n;
    const front = Math.sin(a) > 0;
    if ((half === 'front') !== front) continue;
    const x = cx + Math.cos(a) * (w / 2) * 0.92;
    const y = top + Math.sin(a) * ry * 0.92;
    const mw = w * 0.13;
    const mh = 0.075;
    ctx.fillStyle = Math.cos(a) < 0 ? o.light : o.mid;
    ctx.fillRect(x - mw / 2, y - mh, mw, mh);
    ctx.fillStyle = o.top;
    ctx.fillRect(x - mw / 2, y - mh - 0.012, mw, 0.016);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.014;
    ctx.strokeRect(x - mw / 2, y - mh - 0.012, mw, mh + 0.012);
  }
}

/** Cone roof standing on an ellipse. */
function cone(ctx, cx, base, w, h, color, dark) {
  const ry = w * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, base);
  ctx.lineTo(cx, base - h);
  ctx.lineTo(cx + w / 2, base);
  ctx.ellipse(cx, base, w / 2, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, shade(color, 0.15));
  g.addColorStop(0.55, color);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = rgba(dark, 0.7);
  ctx.lineWidth = 0.012;
  for (let k = 0.25; k < 1; k += 0.22) {
    ctx.beginPath();
    ctx.ellipse(cx, base - h * (1 - k) + 0.0, (w / 2) * k, ry * k, 0, 0, Math.PI, false);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, base);
  ctx.lineTo(cx, base - h);
  ctx.lineTo(cx + w / 2, base);
  ctx.ellipse(cx, base, w / 2, ry, 0, 0, Math.PI, false);
  ctx.stroke();
}

/** Arrow slit / window (glows warm at night, see lights). */
function slit(ctx, x, y, h = 0.1) {
  ctx.fillStyle = '#2a1d14';
  ctx.beginPath();
  ctx.moveTo(x - 0.016, y + h);
  ctx.lineTo(x - 0.016, y + 0.016);
  ctx.arc(x, y + 0.016, 0.016, Math.PI, 0);
  ctx.lineTo(x + 0.016, y + h);
  ctx.closePath();
  ctx.fill();
}

function goldRing(ctx, cx, y, w) {
  ctx.strokeStyle = M.gold;
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.ellipse(cx, y, w / 2, w * 0.2, 0, Math.PI * 0.05, Math.PI * 0.95, false);
  ctx.stroke();
}

function plinth(ctx, w = 0.8) {
  cylinder(ctx, 0, BASE + 0.03, w, 0.09, { light: '#a59c88', mid: '#8a8170', dark: '#625a4c', line: 'rgba(40,30,20,0.35)', row: 0.2 });
}

const STONE = { light: M.stone, mid: M.stoneMid, dark: M.stoneDark, line: 'rgba(60,45,30,0.38)', top: '#e4dccb', floor: '#9c917b' };
const WOOD = { light: M.woodLight, mid: M.wood, dark: M.woodDark, line: 'rgba(50,30,15,0.55)', top: '#c99a64', floor: '#8a6038', planks: true };
const GRANITE = { light: '#bdb7ae', mid: '#958f86', dark: '#5f5a54', line: 'rgba(30,25,20,0.4)', top: '#cfc9c0', floor: '#7d776f' };
const ICE = { light: '#f1f7fb', mid: '#c8d9e6', dark: '#8aa2b6', line: 'rgba(60,90,120,0.35)', top: '#ffffff', floor: '#a9c0d2' };
const SLATE = { light: '#7d7f92', mid: '#5c5e70', dark: '#3a3b4a', line: 'rgba(15,15,25,0.45)', top: '#8a8ca0', floor: '#4a4b5c' };

// ---------------------------------------------------------------- static bodies

/** Height of the platform where the live part stands, per type and level (tiles above the cell centre). */
export function topOf(type, level) {
  const L = Math.min(level, 3) - 1;
  switch (type) {
    case 'archer': return BASE - [0.5, 0.62, 0.78][L];
    case 'cannon': return BASE - [0.32, 0.42, 0.5][L];
    case 'frost': return BASE - [0.6, 0.76, 0.9][L];
    case 'ballista': return BASE - [0.24, 0.3, 0.38][L];
    case 'catapult': return BASE - 0.14;
    case 'fire': return BASE - [0.4, 0.5, 0.6][L];
    case 'storm': return BASE - [0.7, 0.86, 1.0][L];
    case 'watch': return BASE - [0.86, 1.0, 1.12][L];
    case 'barracks': return BASE - [0.62, 0.68, 0.72][L];
    case 'treasury': return BASE - 0.6;
    default: return BASE - 0.5;
  }
}

function archer(ctx, L, elite, color) {
  const h = [0.5, 0.62, 0.78][L];
  const w = [0.6, 0.58, 0.6][L];
  const mat = L === 0 ? WOOD : STONE;
  if (L === 2) plinth(ctx);
  cylinder(ctx, 0, BASE, w, h, mat);
  if (L > 0) {
    slit(ctx, -0.1, BASE - h * 0.62);
    slit(ctx, 0.12, BASE - h * 0.55);
  }
  const top = BASE - h;
  if (L === 0) {
    // Palisade spikes.
    for (let i = 0; i < 7; i++) {
      const x = -w / 2 + 0.04 + (i * (w - 0.08)) / 6;
      ctx.fillStyle = i < 3 ? M.woodLight : M.wood;
      ctx.beginPath();
      ctx.moveTo(x - 0.035, top + 0.02);
      ctx.lineTo(x, top - 0.07);
      ctx.lineTo(x + 0.035, top + 0.02);
      ctx.fill();
    }
    cap(ctx, 0, top, w, mat);
  } else {
    merlons(ctx, 0, top, w, mat, 'back');
    cap(ctx, 0, top, w, mat);
  }
  if (L === 2) {
    banner(ctx, -w / 2 - 0.02, top + 0.2, 0.42, color, 0, { still: true, width: 0.16, dir: -1 });
  }
  if (elite) goldRing(ctx, 0, top + 0.03, w);
}

function archerFront(ctx, L, elite) {
  if (L === 0) return;
  const h = [0.5, 0.62, 0.78][L];
  const w = [0.6, 0.58, 0.6][L];
  merlons(ctx, 0, BASE - h, w, STONE, 'front');
  if (elite) {
    ctx.fillStyle = M.gold;
    starPath(ctx, 0, BASE - h * 0.35, 0.05);
    ctx.fill();
  }
}

function cannon(ctx, L, elite) {
  const h = [0.32, 0.42, 0.5][L];
  const w = 0.76;
  if (L === 2) plinth(ctx, 0.84);
  cylinder(ctx, 0, BASE, w, h, GRANITE);
  // Gun ports and iron bands.
  ctx.fillStyle = '#20180f';
  for (const x of [-0.2, 0.16]) {
    ctx.beginPath();
    ctx.arc(x, BASE - h * 0.45, 0.035, 0, TAU);
    ctx.fill();
  }
  if (L >= 1) {
    ctx.strokeStyle = M.iron;
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.ellipse(0, BASE - h * 0.15, w / 2, w * 0.2, 0, Math.PI * 0.02, Math.PI * 0.98);
    ctx.stroke();
  }
  merlons(ctx, 0, BASE - h, w, GRANITE, 'back');
  cap(ctx, 0, BASE - h, w, GRANITE);
  if (elite) goldRing(ctx, 0, BASE - h + 0.03, w);
}

function frost(ctx, L, elite) {
  const h = [0.6, 0.76, 0.9][L];
  const w = 0.4;
  if (L === 2) plinth(ctx, 0.66);
  cylinder(ctx, 0, BASE, w, h, ICE);
  if (L >= 1) {
    ctx.fillStyle = '#5fd3f3';
    for (let i = 0; i < 3; i++) {
      const y = BASE - h * (0.25 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(-0.03, y);
      ctx.lineTo(0, y - 0.045);
      ctx.lineTo(0.03, y);
      ctx.lineTo(0, y + 0.045);
      ctx.closePath();
      ctx.fill();
    }
  }
  const top = BASE - h;
  // Four slim pillars carrying a small blue roof ring.
  cap(ctx, 0, top, w, ICE);
  ctx.strokeStyle = '#9fb6c8';
  ctx.lineWidth = 0.025;
  for (const x of [-0.15, 0.15]) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top - 0.16);
    ctx.stroke();
  }
  ctx.fillStyle = '#3d6fa0';
  ctx.beginPath();
  ctx.ellipse(0, top - 0.17, w * 0.52, w * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.016;
  ctx.stroke();
  if (elite) goldRing(ctx, 0, top - 0.17, w * 1.04);
}

function ballista(ctx, L, elite) {
  const h = [0.24, 0.3, 0.38][L];
  const w = 0.72;
  cylinder(ctx, 0, BASE, w, h, L === 0 ? WOOD : STONE);
  const top = BASE - h;
  cap(ctx, 0, top, w, WOOD);
  // Deck planks.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, top, w / 2, w * 0.2, 0, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = 'rgba(60,35,15,0.45)';
  ctx.lineWidth = 0.012;
  for (let x = -w / 2; x < w / 2; x += 0.07) {
    ctx.beginPath();
    ctx.moveTo(x, top - 0.2);
    ctx.lineTo(x, top + 0.2);
    ctx.stroke();
  }
  ctx.restore();
  if (elite) goldRing(ctx, 0, top + 0.02, w);
}

function catapult(ctx, L, elite) {
  // Stone pad.
  cylinder(ctx, 0, BASE, 0.78, 0.1, GRANITE);
  cap(ctx, 0, BASE - 0.1, 0.78, GRANITE);
  // Wooden chassis and A-frame (the arm is live).
  const y = BASE - 0.12;
  ctx.fillStyle = M.woodDark;
  ctx.fillRect(-0.3, y - 0.06, 0.6, 0.07);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.016;
  ctx.strokeRect(-0.3, y - 0.06, 0.6, 0.07);
  // Wheels.
  for (const x of [-0.24, 0.24]) {
    ctx.fillStyle = M.woodDark;
    ctx.beginPath();
    ctx.arc(x, y + 0.01, L >= 1 ? 0.085 : 0.07, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = L >= 1 ? M.iron : INK;
    ctx.lineWidth = 0.02;
    ctx.stroke();
    ctx.strokeStyle = M.wood;
    ctx.lineWidth = 0.012;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * 0.06, y + 0.01 - Math.sin(a) * 0.06);
      ctx.lineTo(x + Math.cos(a) * 0.06, y + 0.01 + Math.sin(a) * 0.06);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = M.wood;
  ctx.lineWidth = 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.12, y - 0.04);
  ctx.lineTo(0, y - 0.3);
  ctx.lineTo(0.12, y - 0.04);
  ctx.stroke();
  if (elite) {
    ctx.strokeStyle = M.gold;
    ctx.lineWidth = 0.02;
    ctx.strokeRect(-0.3, y - 0.06, 0.6, 0.07);
  }
}

function fire(ctx, L, elite) {
  const h = [0.4, 0.5, 0.6][L];
  const w = 0.34;
  if (L >= 1) plinth(ctx, 0.62);
  cylinder(ctx, 0, BASE, w, h, L === 0 ? GRANITE : STONE);
  const top = BASE - h;
  // Iron bowl.
  ctx.fillStyle = elite ? M.goldDark : M.iron;
  ctx.beginPath();
  ctx.moveTo(-0.26, top - 0.04);
  ctx.quadraticCurveTo(-0.22, top + 0.1, 0, top + 0.1);
  ctx.quadraticCurveTo(0.22, top + 0.1, 0.26, top - 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.018;
  ctx.stroke();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.ellipse(0, top - 0.04, 0.26, 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = elite ? M.gold : M.ironLight;
  ctx.lineWidth = 0.02;
  ctx.stroke();
  // Glowing coals.
  ctx.fillStyle = '#ff7a2a';
  ctx.beginPath();
  ctx.ellipse(0, top - 0.035, 0.18, 0.035, 0, 0, TAU);
  ctx.fill();
}

function storm(ctx, L, elite) {
  const h = [0.7, 0.86, 1.0][L];
  const wb = 0.44;
  const wt = 0.26;
  if (L === 2) plinth(ctx, 0.66);
  // Tapered slate spire.
  ctx.beginPath();
  ctx.moveTo(-wb / 2, BASE);
  ctx.lineTo(-wt / 2, BASE - h);
  ctx.lineTo(wt / 2, BASE - h);
  ctx.lineTo(wb / 2, BASE);
  ctx.ellipse(0, BASE, wb / 2, wb * 0.2, 0, 0, Math.PI, false);
  ctx.closePath();
  const g = ctx.createLinearGradient(-wb / 2, 0, wb / 2, 0);
  g.addColorStop(0, SLATE.light);
  g.addColorStop(0.5, SLATE.mid);
  g.addColorStop(1, SLATE.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.02;
  ctx.stroke();
  // Copper bands.
  ctx.strokeStyle = '#c87533';
  ctx.lineWidth = 0.028;
  for (let i = 1; i <= 2 + L; i++) {
    const k = i / (3 + L);
    const w = wb + (wt - wb) * k;
    ctx.beginPath();
    ctx.ellipse(0, BASE - h * k, w / 2, w * 0.2, 0, Math.PI * 0.05, Math.PI * 0.95);
    ctx.stroke();
  }
  // Copper prongs.
  const top = BASE - h;
  ctx.strokeStyle = '#d98a4a';
  ctx.lineWidth = 0.022;
  for (const x of [-0.1, 0, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(x * 0.8, top);
    ctx.lineTo(x * 1.3, top - 0.12 - (x === 0 ? 0.04 : 0));
    ctx.stroke();
  }
  if (elite) goldRing(ctx, 0, top + 0.02, wt);
}

function barracks(ctx, L, elite, color) {
  const w = 0.76;
  const wallH = 0.32;
  const left = -w / 2;
  shadow(ctx, 0, BASE, 0.46, 0.14, 0.25);
  // Front wall.
  ctx.fillStyle = L === 0 ? M.wood : M.stoneMid;
  ctx.fillRect(left, BASE - wallH, w, wallH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, BASE - wallH, w, wallH);
  ctx.clip();
  ctx.strokeStyle = L === 0 ? 'rgba(50,30,15,0.5)' : 'rgba(60,45,30,0.4)';
  ctx.lineWidth = 0.012;
  if (L === 0) {
    for (let x = left; x < -left; x += 0.075) {
      ctx.beginPath();
      ctx.moveTo(x, BASE - wallH);
      ctx.lineTo(x, BASE);
      ctx.stroke();
    }
  } else {
    let n = 0;
    for (let y = BASE - wallH + 0.08; y < BASE; y += 0.08, n++) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(-left, y);
      ctx.stroke();
      for (let x = left + (n % 2 ? 0.06 : 0.12); x < -left; x += 0.14) {
        ctx.beginPath();
        ctx.moveTo(x, y - 0.08);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
    // Half-timbering upstairs look.
    ctx.fillStyle = 'rgba(255,240,210,0.12)';
    ctx.fillRect(left, BASE - wallH, w * 0.45, wallH);
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.022;
  ctx.strokeRect(left, BASE - wallH, w, wallH);
  // Door.
  ctx.fillStyle = M.woodDark;
  ctx.beginPath();
  ctx.moveTo(-0.08, BASE);
  ctx.lineTo(-0.08, BASE - 0.13);
  ctx.arc(0, BASE - 0.13, 0.08, Math.PI, 0);
  ctx.lineTo(0.08, BASE);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = M.iron;
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.moveTo(-0.08, BASE - 0.06);
  ctx.lineTo(0.08, BASE - 0.06);
  ctx.moveTo(-0.08, BASE - 0.15);
  ctx.lineTo(0.08, BASE - 0.15);
  ctx.stroke();
  // Windows.
  for (const x of [-0.25, 0.25]) {
    ctx.fillStyle = '#2a1d14';
    ctx.fillRect(x - 0.035, BASE - 0.24, 0.07, 0.07);
    ctx.strokeStyle = M.woodDark;
    ctx.lineWidth = 0.012;
    ctx.strokeRect(x - 0.035, BASE - 0.24, 0.07, 0.07);
  }
  // Shields on the wall.
  for (const x of [-0.15, 0.15]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 0.035, BASE - 0.27);
    ctx.lineTo(x + 0.035, BASE - 0.27);
    ctx.lineTo(x + 0.035, BASE - 0.23);
    ctx.quadraticCurveTo(x, BASE - 0.18, x - 0.035, BASE - 0.23);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = elite ? M.gold : INK;
    ctx.lineWidth = 0.01;
    ctx.stroke();
  }
  // Roof seen from above-front.
  const roof = L === 0 ? [M.thatch, M.thatchDark] : L === 1 ? [M.roofRed, M.roofRedDark] : [M.roofBlue, M.roofBlueDark];
  const ry = BASE - [0.62, 0.68, 0.72][L];
  ctx.beginPath();
  ctx.moveTo(left - 0.05, BASE - wallH + 0.02);
  ctx.lineTo(left + 0.06, ry);
  ctx.lineTo(-left - 0.06, ry);
  ctx.lineTo(-left + 0.05, BASE - wallH + 0.02);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, ry, 0, BASE - wallH);
  g.addColorStop(0, shade(roof[0], 0.12));
  g.addColorStop(1, roof[1]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = rgba(roof[1], 0.8);
  ctx.lineWidth = 0.012;
  for (let y = ry + 0.05; y < BASE - wallH; y += 0.055) {
    ctx.beginPath();
    ctx.moveTo(left - 0.1, y);
    ctx.lineTo(-left + 0.1, y);
    ctx.stroke();
  }
  if (L === 0) {
    for (let x = left; x < -left; x += 0.05) {
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.lineTo(x - 0.02, BASE - wallH);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.02;
  ctx.stroke();
  ctx.strokeStyle = elite ? M.gold : shade(roof[1], -0.2);
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(left + 0.06, ry);
  ctx.lineTo(-left - 0.06, ry);
  ctx.stroke();
  // Level 3: a corner turret.
  if (L === 2) {
    cylinder(ctx, w / 2 - 0.02, BASE + 0.02, 0.2, 0.55, STONE);
    cone(ctx, w / 2 - 0.02, BASE - 0.53, 0.26, 0.24, M.roofBlue, M.roofBlueDark);
  }
}

function watch(ctx, L, elite) {
  const h = [0.86, 1.0, 1.12][L];
  const top = BASE - h;
  if (L === 2) {
    cylinder(ctx, 0, BASE, 0.5, 0.24, STONE);
    cap(ctx, 0, BASE - 0.24, 0.5, STONE);
  }
  const legBase = L === 2 ? BASE - 0.24 : BASE;
  // Back legs (darker), cross braces, front legs.
  const legs = (xs, color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    for (const [xb, xt] of xs) {
      ctx.beginPath();
      ctx.moveTo(xb, legBase);
      ctx.lineTo(xt, top + 0.12);
      ctx.stroke();
    }
  };
  legs([[-0.16, -0.09], [0.16, 0.09]], M.woodDark, 0.035);
  ctx.strokeStyle = M.wood;
  ctx.lineWidth = 0.018;
  const segs = 3;
  for (let i = 0; i < segs; i++) {
    const y0 = legBase - ((legBase - top - 0.12) * i) / segs;
    const y1 = legBase - ((legBase - top - 0.12) * (i + 1)) / segs;
    const x0 = 0.22 - 0.1 * (i / segs);
    const x1 = 0.22 - 0.1 * ((i + 1) / segs);
    ctx.beginPath();
    ctx.moveTo(-x0, y0);
    ctx.lineTo(x1, y1);
    ctx.moveTo(x0, y0);
    ctx.lineTo(-x1, y1);
    ctx.stroke();
  }
  legs([[-0.22, -0.12], [0.22, 0.12]], M.wood, 0.045);
  // Cabin.
  ctx.fillStyle = M.wood;
  ctx.fillRect(-0.2, top - 0.02, 0.4, 0.16);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.02;
  ctx.strokeRect(-0.2, top - 0.02, 0.4, 0.16);
  ctx.fillStyle = '#2a1d14';
  ctx.fillRect(-0.15, top + 0.0, 0.3, 0.06);
  // Roof.
  ctx.fillStyle = L === 0 ? M.thatch : M.roofRed;
  ctx.beginPath();
  ctx.moveTo(-0.27, top - 0.01);
  ctx.lineTo(0, top - 0.22);
  ctx.lineTo(0.27, top - 0.01);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = L === 0 ? M.thatchDark : M.roofRedDark;
  ctx.beginPath();
  ctx.moveTo(0, top - 0.22);
  ctx.lineTo(0.27, top - 0.01);
  ctx.lineTo(0.05, top - 0.01);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-0.27, top - 0.01);
  ctx.lineTo(0, top - 0.22);
  ctx.lineTo(0.27, top - 0.01);
  ctx.closePath();
  ctx.stroke();
  if (elite) {
    ctx.fillStyle = M.gold;
    starPath(ctx, 0, top - 0.25, 0.045);
    ctx.fill();
  }
}

function treasury(ctx, L, elite) {
  const w = 0.66;
  const wallH = 0.36;
  const left = -w / 2;
  shadow(ctx, 0, BASE, 0.42, 0.14, 0.25);
  const g = ctx.createLinearGradient(left, 0, -left, 0);
  g.addColorStop(0, M.stone);
  g.addColorStop(1, M.stoneMid);
  ctx.fillStyle = g;
  ctx.fillRect(left, BASE - wallH, w, wallH);
  ctx.strokeStyle = 'rgba(60,45,30,0.35)';
  ctx.lineWidth = 0.012;
  for (let y = BASE - wallH + 0.09; y < BASE; y += 0.09) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(-left, y);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.022;
  ctx.strokeRect(left, BASE - wallH, w, wallH);
  // Columns.
  for (const x of [left + 0.06, -left - 0.06]) {
    ctx.fillStyle = '#efe7d6';
    ctx.fillRect(x - 0.03, BASE - wallH, 0.06, wallH);
    ctx.strokeRect(x - 0.03, BASE - wallH, 0.06, wallH);
  }
  // Iron-bound door.
  ctx.fillStyle = M.woodDark;
  ctx.fillRect(-0.09, BASE - 0.2, 0.18, 0.2);
  ctx.strokeRect(-0.09, BASE - 0.2, 0.18, 0.2);
  ctx.strokeStyle = M.iron;
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.09, BASE - 0.14);
  ctx.lineTo(0.09, BASE - 0.14);
  ctx.moveTo(-0.09, BASE - 0.06);
  ctx.lineTo(0.09, BASE - 0.06);
  ctx.stroke();
  ctx.fillStyle = M.gold;
  ctx.beginPath();
  ctx.arc(0.05, BASE - 0.1, 0.014, 0, TAU);
  ctx.fill();
  // Pediment / roof.
  const roofTop = BASE - wallH - (L === 2 ? 0.3 : 0.22);
  if (L === 2) {
    // Golden dome.
    ctx.beginPath();
    ctx.moveTo(left + 0.04, BASE - wallH);
    ctx.quadraticCurveTo(left + 0.04, roofTop, 0, roofTop);
    ctx.quadraticCurveTo(-left - 0.04, roofTop, -left - 0.04, BASE - wallH);
    ctx.closePath();
    const dg = ctx.createLinearGradient(left, roofTop, -left, BASE - wallH);
    dg.addColorStop(0, '#fff1b8');
    dg.addColorStop(0.5, M.gold);
    dg.addColorStop(1, M.goldDark);
    ctx.fillStyle = dg;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(left - 0.04, BASE - wallH);
    ctx.lineTo(0, roofTop);
    ctx.lineTo(-left + 0.04, BASE - wallH);
    ctx.closePath();
    ctx.fillStyle = L === 0 ? M.roofRed : M.roofRedDark;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = L === 1 ? M.gold : '#f2ead6';
    ctx.beginPath();
    ctx.arc(0, BASE - wallH - 0.08, 0.04, 0, TAU);
    ctx.fill();
  }
  // Treasure in front: chest and coin pile.
  ctx.fillStyle = M.woodDark;
  ctx.fillRect(0.14, BASE - 0.06, 0.14, 0.09);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.014;
  ctx.strokeRect(0.14, BASE - 0.06, 0.14, 0.09);
  ctx.fillStyle = M.gold;
  ctx.fillRect(0.14, BASE - 0.03, 0.14, 0.02);
  ctx.beginPath();
  ctx.ellipse(-0.2, BASE + 0.01, 0.09, 0.04, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff1b8';
  ctx.beginPath();
  ctx.ellipse(-0.22, BASE - 0.01, 0.04, 0.015, 0, 0, TAU);
  ctx.fill();
  if (elite) {
    ctx.strokeStyle = M.gold;
    ctx.lineWidth = 0.025;
    ctx.strokeRect(left, BASE - wallH, w, 0.03);
  }
}

const BODIES = { archer, cannon, frost, ballista, catapult, fire, storm, barracks, watch, treasury };
const FRONTS = { archer: archerFront };

/** Draws the static body of a tower at the origin (sprite space). */
export function drawBody(ctx, type, level, elite, color) {
  const L = Math.min(level, 3) - 1;
  if (type !== 'barracks' && type !== 'treasury') shadow(ctx, 0, BASE + 0.02, 0.44, 0.16, 0.3);
  (BODIES[type] || archer)(ctx, L, elite, color);
}

/** Parts in front of the live layer (front merlons hide the archer's legs). */
export function drawFront(ctx, type, level, elite) {
  const fn = FRONTS[type];
  if (fn) fn(ctx, Math.min(level, 3) - 1, elite);
}

/**
 * Cache of static bodies, one small canvas per type × level × elite × scale.
 * Cleared when the board is resized.
 */
export class BuildingCache {
  constructor() {
    this.map = new Map();
    this.scale = 0;
  }

  /** Box of a cached sprite in tiles: from (-W/2, -TOP) to (W/2, BOTTOM). */
  static W = 1.5;
  static TOP = 1.75;
  static BOTTOM = 0.62;

  get(type, level, elite, color, scale, part = 'body') {
    if (scale !== this.scale) {
      this.map.clear();
      this.scale = scale;
    }
    const key = `${part}|${type}|${level}|${elite}|${color}`;
    let c = this.map.get(key);
    if (!c) {
      const { W, TOP, BOTTOM } = BuildingCache;
      c = makeCanvas(W * scale, (TOP + BOTTOM) * scale);
      const ctx = c.getContext('2d');
      ctx.setTransform(scale, 0, 0, scale, (W / 2) * scale, TOP * scale);
      ctx.lineJoin = 'round';
      if (part === 'body') drawBody(ctx, type, level, elite, color);
      else drawFront(ctx, type, level, elite);
      this.map.set(key, c);
    }
    return c;
  }
}

// ---------------------------------------------------------------- live layer

/**
 * Animated parts of a tower, drawn every frame in sprite space.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} t tower
 * @param {number} time seconds
 * @param {number} aim screen-space aim angle (radians)
 * @param {(hex:string)=>string} [ownerColor]
 */
export function drawLive(ctx, t, time, aim, { reduced = false, banner: bannerColor = null } = {}) {
  const level = t.level;
  const L = Math.min(level, 3) - 1;
  const elite = t.isElite;
  const top = topOf(t.type, level);
  const kick = t.recoil || 0;
  const face = Math.cos(aim) < 0 ? -1 : 1;
  switch (t.type) {
    case 'archer': {
      // The archer on the platform.
      ctx.save();
      ctx.translate(0, top + 0.02);
      ctx.scale(face, 1);
      archerFigure(ctx, kick, elite);
      ctx.restore();
      break;
    }
    case 'cannon': {
      ctx.save();
      ctx.translate(0, top - 0.02);
      // Carriage.
      ctx.fillStyle = M.woodDark;
      ctx.fillRect(-0.12, -0.02, 0.24, 0.07);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.014;
      ctx.strokeRect(-0.12, -0.02, 0.24, 0.07);
      // Barrel: foreshortened by the 3/4 view.
      ctx.scale(1, 0.72);
      ctx.rotate(aim);
      const back = kick * 0.06;
      const len = 0.3 + L * 0.03;
      const g = ctx.createLinearGradient(0, -0.07, 0, 0.07);
      g.addColorStop(0, '#8a919c');
      g.addColorStop(0.5, '#3a3f48');
      g.addColorStop(1, '#1d2026');
      ctx.fillStyle = elite ? M.goldDark : g;
      ctx.beginPath();
      ctx.moveTo(-0.08 - back, -0.075);
      ctx.lineTo(len - back, -0.055);
      ctx.lineTo(len - back, 0.055);
      ctx.lineTo(-0.08 - back, 0.075);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.016;
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.ellipse(len - back, 0, 0.018, 0.05, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'frost': {
      const bob = reduced ? 0 : Math.sin(time * 2.2 + t.id) * 0.035;
      const y = top - 0.35 + bob;
      const pulse = 0.6 + 0.4 * Math.sin(time * 3 + t.id) + kick * 0.6;
      const glow = ctx.createRadialGradient(0, y, 0, 0, y, 0.3);
      glow.addColorStop(0, `rgba(140,230,255,${0.45 * pulse})`);
      glow.addColorStop(1, 'rgba(140,230,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-0.3, y - 0.3, 0.6, 0.6);
      ctx.save();
      ctx.translate(0, y);
      ctx.rotate(reduced ? 0 : Math.sin(time * 0.9) * 0.15);
      const s = 0.1 + L * 0.012;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.7);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s * 1.3);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      const cg = ctx.createLinearGradient(-s, -s, s, s);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(0.5, '#8fe3ff');
      cg.addColorStop(1, '#2f8fc0');
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.strokeStyle = '#e8fbff';
      ctx.lineWidth = 0.012;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.7);
      ctx.lineTo(0, s * 1.3);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'ballista': {
      ctx.save();
      ctx.translate(0, top - 0.03);
      ctx.fillStyle = M.woodDark;
      ctx.fillRect(-0.03, -0.02, 0.06, 0.06);
      ctx.scale(1.35, 0.97);
      ctx.rotate(aim);
      const back = kick * 0.05;
      // Stock.
      ctx.fillStyle = M.wood;
      ctx.fillRect(-0.16 - back, -0.035, 0.38, 0.07);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.014;
      ctx.strokeRect(-0.16 - back, -0.035, 0.38, 0.07);
      // Bow arms (bent by the tension).
      const bend = kick > 0.5 ? 0.02 : 0.08;
      ctx.strokeStyle = elite ? M.gold : M.woodDark;
      ctx.lineWidth = 0.035;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0.08, -0.26);
      ctx.quadraticCurveTo(0.08 + bend, 0, 0.08, 0.26);
      ctx.stroke();
      ctx.strokeStyle = '#e8e2d0';
      ctx.lineWidth = 0.008;
      ctx.beginPath();
      ctx.moveTo(0.08, -0.26);
      ctx.lineTo(kick > 0.5 ? 0.06 : -0.1, 0);
      ctx.lineTo(0.08, 0.26);
      ctx.stroke();
      if (kick < 0.5) {
        ctx.strokeStyle = M.iron;
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        ctx.moveTo(-0.1, 0);
        ctx.lineTo(0.26, 0);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'catapult': {
      // Throwing arm: leaning back at rest, flung forward just after a shot.
      const y = BASE - 0.42;
      const thrown = kick > 0 ? Math.min(1, kick * 1.6) : 0;
      const ang = -0.95 + thrown * 1.5;
      ctx.save();
      ctx.translate(0, y);
      ctx.scale(face, 1);
      ctx.rotate(ang);
      ctx.strokeStyle = M.woodLight;
      ctx.lineWidth = 0.045;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0.12);
      ctx.lineTo(0, -0.46);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.012;
      ctx.stroke();
      ctx.fillStyle = M.woodDark;
      ctx.beginPath();
      ctx.ellipse(0, -0.48, 0.07, 0.04, 0, 0, TAU);
      ctx.fill();
      if (thrown < 0.2) {
        ctx.fillStyle = '#7a6a58';
        ctx.beginPath();
        ctx.arc(0, -0.52, 0.05, 0, TAU);
        ctx.fill();
      }
      // Counterweight.
      ctx.fillStyle = M.iron;
      ctx.fillRect(-0.07, 0.1, 0.14, 0.1);
      ctx.restore();
      ctx.fillStyle = M.iron;
      ctx.beginPath();
      ctx.arc(0, y, 0.028, 0, TAU);
      ctx.fill();
      break;
    }
    case 'fire': {
      flames(ctx, 0, top - 0.04, 0.2 + L * 0.03 + kick * 0.06, time + t.id, reduced);
      break;
    }
    case 'storm': {
      const y = top - 0.2;
      const pulse = 0.7 + 0.3 * Math.sin(time * 5 + t.id) + kick;
      const glow = ctx.createRadialGradient(0, y, 0, 0, y, 0.32);
      glow.addColorStop(0, `rgba(190,170,255,${0.55 * pulse})`);
      glow.addColorStop(1, 'rgba(150,120,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-0.32, y - 0.32, 0.64, 0.64);
      const og = ctx.createRadialGradient(-0.02, y - 0.02, 0.01, 0, y, 0.08);
      og.addColorStop(0, '#ffffff');
      og.addColorStop(0.5, '#c9b8ff');
      og.addColorStop(1, '#6a4fd0');
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(0, y, 0.075, 0, TAU);
      ctx.fill();
      if (!reduced) {
        const r = rng(Math.floor(time * 12) + t.id * 31);
        ctx.strokeStyle = 'rgba(230,220,255,0.9)';
        ctx.lineWidth = 0.012;
        for (let i = 0; i < 2 + Math.round(kick * 3); i++) {
          const a = r() * TAU;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 0.07, y + Math.sin(a) * 0.07);
          ctx.lineTo(Math.cos(a + 0.4) * 0.14, y + Math.sin(a + 0.3) * 0.12);
          ctx.lineTo(Math.cos(a - 0.2) * 0.2, y + Math.sin(a) * 0.18);
          ctx.stroke();
        }
      }
      break;
    }
    case 'barracks': {
      const ry = topOf('barracks', level);
      banner(ctx, -0.2, ry + 0.02, 0.26, bannerColor || t.constructor.color, time + t.id, { width: 0.18, emblem: elite ? M.gold : null, still: reduced });
      break;
    }
    case 'watch': {
      const y = top + 0.04;
      const sweep = reduced ? 0 : Math.sin(time * 1.4 + t.id) * 0.6;
      ctx.fillStyle = 'rgba(255,220,120,0.07)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(Math.cos(sweep) * 0.6, y + 0.45 + Math.sin(sweep) * 0.15);
      ctx.lineTo(Math.cos(sweep + 0.5) * 0.6, y + 0.6 + Math.sin(sweep) * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd77a';
      ctx.beginPath();
      ctx.arc(0, y, 0.03, 0, TAU);
      ctx.fill();
      break;
    }
    case 'treasury': {
      if (!reduced) {
        const k = (time * 0.8 + t.id * 0.37) % 1;
        const r = rng(Math.floor(time * 0.8 + t.id * 0.37) + t.id);
        const x = -0.25 + r() * 0.5;
        const y = BASE - 0.05 - r() * 0.35;
        ctx.globalAlpha = Math.sin(k * Math.PI);
        ctx.fillStyle = '#fff6c8';
        starPath(ctx, x, y, 0.04);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    default:
  }
  if (bannerColor && t.type !== 'barracks') {
    banner(ctx, 0.3, BASE - 0.02, 0.4, bannerColor, time + t.id, { width: 0.14, still: reduced });
  }
}

/** Small archer standing on a platform (origin at the feet, facing right). */
function archerFigure(ctx, kick, elite) {
  // Legs hidden by the merlons; torso, head, bow.
  ctx.fillStyle = '#3f6a3a';
  ctx.beginPath();
  ctx.moveTo(-0.045, 0);
  ctx.lineTo(-0.04, -0.13);
  ctx.lineTo(0.04, -0.13);
  ctx.lineTo(0.045, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.012;
  ctx.stroke();
  // Hood.
  ctx.fillStyle = '#2f5230';
  ctx.beginPath();
  ctx.arc(0, -0.165, 0.042, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e3b48a';
  ctx.beginPath();
  ctx.arc(0.012, -0.16, 0.026, 0, TAU);
  ctx.fill();
  // Bow.
  const draw = kick > 0.4 ? 0 : 0.06;
  ctx.strokeStyle = elite ? M.gold : M.woodDark;
  ctx.lineWidth = 0.016;
  ctx.beginPath();
  ctx.arc(0.05, -0.1, 0.09, -1.2, 1.2);
  ctx.stroke();
  ctx.strokeStyle = '#efe9da';
  ctx.lineWidth = 0.006;
  ctx.beginPath();
  ctx.moveTo(0.05 + Math.cos(-1.2) * 0.09, -0.1 + Math.sin(-1.2) * 0.09);
  ctx.lineTo(0.05 - draw, -0.1);
  ctx.lineTo(0.05 + Math.cos(1.2) * 0.09, -0.1 + Math.sin(1.2) * 0.09);
  ctx.stroke();
  // Arms.
  ctx.strokeStyle = '#3f6a3a';
  ctx.lineWidth = 0.022;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -0.11);
  ctx.lineTo(0.13, -0.1);
  ctx.moveTo(0, -0.11);
  ctx.lineTo(0.05 - draw, -0.1);
  ctx.stroke();
}

/** Layered flickering flames (brazier, burning ground). */
export function flames(ctx, x, y, size, time, reduced) {
  const layers = [
    ['rgba(255,90,20,0.9)', 1],
    ['rgba(255,170,40,0.95)', 0.68],
    ['rgba(255,240,170,0.95)', 0.36],
  ];
  for (const [color, k] of layers) {
    const s = size * k;
    ctx.fillStyle = color;
    ctx.beginPath();
    const tips = 3;
    ctx.moveTo(x - s, y);
    for (let i = 0; i <= tips; i++) {
      const px = x - s + (i / tips) * s * 2;
      const flick = reduced ? 0.5 : (Math.sin(time * (9 + i * 2.3) + i * 1.7) + 1) / 2;
      const h = s * (1.6 + flick * 0.9) * (i === 0 || i === tips ? 0.5 : 1);
      ctx.quadraticCurveTo(px - s * 0.3, y - h * 0.5, px, y - h);
      ctx.quadraticCurveTo(px + s * 0.25, y - h * 0.4, px + (s * 2) / tips / 2, y - h * 0.2);
    }
    ctx.lineTo(x + s, y);
    ctx.quadraticCurveTo(x, y + s * 0.3, x - s, y);
    ctx.fill();
  }
}

/** Gold pips (or a star for the elite) on the ground in front of a tower. */
export function levelPips(ctx, level, elite) {
  if (elite) {
    ctx.fillStyle = M.gold;
    starPath(ctx, 0, BASE + 0.13, 0.07);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.012;
    ctx.stroke();
    return;
  }
  for (let i = 0; i < level; i++) {
    const x = (i - (level - 1) / 2) * 0.11;
    ctx.fillStyle = M.gold;
    ctx.beginPath();
    ctx.moveTo(x, BASE + 0.09);
    ctx.lineTo(x + 0.035, BASE + 0.13);
    ctx.lineTo(x, BASE + 0.17);
    ctx.lineTo(x - 0.035, BASE + 0.13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.01;
    ctx.stroke();
  }
}

/** Where light sources of a tower are, for the night look (sprite-space offsets). */
export function lightsOf(t) {
  const top = topOf(t.type, t.level);
  switch (t.type) {
    case 'fire': return [{ x: 0, y: top - 0.1, r: 1.3, color: '255,150,60' }];
    case 'frost': return [{ x: 0, y: top - 0.35, r: 0.8, color: '120,210,255' }];
    case 'storm': return [{ x: 0, y: top - 0.2, r: 0.9, color: '170,140,255' }];
    case 'watch': return [{ x: 0, y: top + 0.04, r: 1.0, color: '255,210,120' }];
    case 'barracks': return [{ x: -0.25, y: BASE - 0.2, r: 0.45, color: '255,190,100' }, { x: 0.25, y: BASE - 0.2, r: 0.45, color: '255,190,100' }];
    case 'treasury': return [{ x: 0, y: BASE - 0.2, r: 0.6, color: '255,210,110' }];
    default: return t.level >= 2 ? [{ x: -0.1, y: top + 0.25, r: 0.4, color: '255,190,100' }] : [];
  }
}

export { BASE };
