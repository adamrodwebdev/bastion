/**
 * @file Animated panorama of the home screen: the kingdom's castle on its hill,
 * and Duke Mordrac's army marching up the road. Same drawings as the board.
 *
 * Coordinates are in "tiles": the scene is 8 × 3.6 tiles, scaled to the canvas.
 */

import { TAU, rgba, shade, shadow } from './paint.js';
import { LANDSCAPES, MATERIALS as M } from './palettes.js';
import { BuildingCache, drawLive, drawFront } from './Buildings.js';
import { drawUnit } from './Units.js';
import { tree, banner } from './props.js';

const W = 8;
const H = 3.6;
const ARMY = [
  ['grunt', 0.26], ['grunt', 0.26], ['shield', 0.27], ['knight', 0.33], ['grunt', 0.26],
  ['runner', 0.21], ['ram', 0.36], ['warlock', 0.27], ['grunt', 0.26], ['berserker', 0.29],
];

/** Road: from the left edge up to the castle gate (screen units). */
function roadPoint(k) {
  const x = -0.6 + k * 6.0;
  const y = 3.05 - Math.sin(k * Math.PI * 0.9) * 0.35 - k * 0.45;
  return { x, y };
}

export class HeroScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cache = new BuildingCache();
    this.night = false;
    this.reduced = false;
    this.pal = LANDSCAPES.meadow;
  }

  resize(cssWidth, dpr) {
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round((cssWidth * H) / W * dpr);
    this.s = this.canvas.width / W;
  }

  draw(t) {
    const { ctx, s, pal } = this;
    if (!s) return;
    const night = this.night;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.lineJoin = 'round';

    // Sky.
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, night ? '#1b2142' : '#9fc8e8');
    sky.addColorStop(0.6, night ? '#3a3a6a' : '#f3e7c8');
    sky.addColorStop(1, night ? '#3a3a6a' : '#f3e7c8');
    ctx.fillStyle = sky;
    roundedClip(ctx, 0, 0, W, H, 0.25);
    ctx.fillRect(0, 0, W, H);
    if (night) {
      ctx.fillStyle = '#fff8d8';
      for (let i = 0; i < 26; i++) {
        const x = (i * 2.399) % W;
        const y = ((i * 1.731) % 1.4) + 0.05;
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + i));
        ctx.fillRect(x, y, 0.025, 0.025);
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(1.2, 0.55, 0.22, 0, TAU);
      ctx.fill();
    } else {
      const sun = ctx.createRadialGradient(1.3, 0.6, 0, 1.3, 0.6, 1.2);
      sun.addColorStop(0, 'rgba(255,240,190,0.9)');
      sun.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, 3, 2);
    }
    // Clouds.
    ctx.fillStyle = night ? 'rgba(200,200,230,0.12)' : 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 3; i++) {
      const x = ((i * 3.1 + t * 0.06) % (W + 2)) - 1;
      const y = 0.35 + i * 0.28;
      for (const [dx, dy, r] of [[0, 0, 0.22], [0.25, -0.08, 0.28], [0.55, 0, 0.2]]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, TAU);
        ctx.fill();
      }
    }
    // Distant mountains and hills.
    ctx.fillStyle = night ? '#2c3358' : '#b7c4c9';
    ctx.beginPath();
    ctx.moveTo(0, 2.0);
    for (const [x, y] of [[0.8, 1.35], [1.6, 1.8], [2.6, 1.1], [3.6, 1.75], [4.4, 1.4], [5.2, 1.85], [6.6, 1.25], [8, 1.9]]) ctx.lineTo(x, y);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    ctx.fillStyle = night ? '#3f4a64' : '#9cb780';
    ctx.beginPath();
    ctx.moveTo(0, 2.3);
    ctx.quadraticCurveTo(2, 1.9, 4, 2.15);
    ctx.quadraticCurveTo(6, 2.4, 8, 2.0);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    // Foreground hill with the castle.
    const g = ctx.createLinearGradient(0, 2, 0, H);
    g.addColorStop(0, night ? '#3d5a3a' : pal.groundLight);
    g.addColorStop(1, night ? '#2a3f2a' : pal.ground);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 2.75);
    ctx.quadraticCurveTo(2.5, 2.55, 4.5, 2.5);
    ctx.quadraticCurveTo(6, 2.1, 6.4, 1.95);
    ctx.quadraticCurveTo(7.3, 1.9, 8, 2.15);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    // Road.
    ctx.strokeStyle = night ? '#5a5040' : pal.dirt;
    ctx.lineWidth = 0.36;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k <= 1.001; k += 0.05) {
      const p = roadPoint(k);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.strokeStyle = night ? '#7a6e58' : pal.road;
    ctx.lineWidth = 0.26;
    ctx.stroke();

    // Trees.
    const trees = [[0.5, 2.9, 3], [1.4, 2.62, 7], [3.2, 3.5, 11], [4.6, 3.55, 5], [7.6, 3.4, 9], [2.3, 2.4, 13]];
    for (const [x, y, seed] of trees.slice(0, 2)) this._at(x, y, 0.75, () => tree(ctx, night ? { ...pal, leaf: '#2a4a2e', leafLight: '#3c6a40' } : pal, seed));

    // Castle (back to front).
    const castle = [
      { type: 'storm', level: 2, x: 6.9, y: 2.0, k: 0.8 },
      { type: 'archer', level: 3, x: 5.95, y: 2.12, k: 0.9 },
      { type: 'barracks', level: 3, x: 7.35, y: 2.35, k: 0.9 },
      { type: 'frost', level: 2, x: 5.2, y: 2.62, k: 0.8 },
    ];
    // Curtain wall.
    ctx.fillStyle = night ? '#6a6478' : M.stoneMid;
    ctx.fillRect(5.9, 1.86, 1.6, 0.3);
    ctx.fillStyle = night ? '#857e94' : M.stone;
    for (let x = 5.9; x < 7.5; x += 0.16) ctx.fillRect(x, 1.8, 0.09, 0.08);
    for (const b of castle) this._tower(b, t);
    banner(ctx, 6.45, 1.85, 0.7, M.woad, t, { emblem: M.gold, width: 0.32, still: this.reduced });

    // Army marching.
    const n = ARMY.length;
    for (let i = n - 1; i >= 0; i--) {
      const [type, r] = ARMY[i];
      const k = ((t * 0.035 + i / n) % 1) * 0.86;
      const p = roadPoint(k);
      const fade = Math.min(1, k * 12, (0.86 - k) * 10);
      ctx.globalAlpha = Math.max(0, fade);
      this._at(p.x, p.y + 0.04, 0.9, () => {
        shadow(ctx, 0, 0, r * 1.0, r * 0.35, 0.25);
        drawUnit(ctx, type, r, { phase: t * 9 + i, moving: true, attack: 0, flash: false, t: t + i, seed: i });
      });
      ctx.globalAlpha = 1;
    }
    for (const [x, y, seed] of trees.slice(2)) this._at(x, y, 0.85, () => tree(ctx, night ? { ...pal, leaf: '#2a4a2e', leafLight: '#3c6a40' } : pal, seed));

    // A crow crossing the sky.
    const cx = ((t * 0.25) % (W + 2)) - 1;
    this._at(cx, 0.9 + Math.sin(t) * 0.1, 0.6, () => drawUnit(ctx, 'crow', 0.22, { phase: 0, moving: true, t, seed: 2 }));

    if (night) {
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y, r] of [[5.2, 2.0, 0.6], [6.9, 1.2, 0.6], [7.2, 2.2, 0.5]]) {
        const lg = ctx.createRadialGradient(x, y, 0, x, y, r);
        lg.addColorStop(0, 'rgba(255,190,110,0.45)');
        lg.addColorStop(1, 'rgba(255,190,110,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  _at(x, y, k, fn) {
    const { ctx, s } = this;
    ctx.save();
    ctx.setTransform(s * k, 0, 0, s * k, x * s, y * s);
    fn();
    ctx.restore();
  }

  _tower(b, t) {
    const { ctx, s } = this;
    const scale = s * b.k;
    const color = { archer: '#3e8ed0', frost: '#4cc3e6', storm: '#9b7bff', barracks: '#6b8e23' }[b.type];
    const img = this.cache.get(b.type, b.level, false, color, scale);
    const { W: BW, TOP } = BuildingCache;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(img, b.x * s - (BW / 2) * scale, b.y * s - TOP * scale);
    ctx.setTransform(scale, 0, 0, scale, b.x * s, b.y * s);
    const fake = { type: b.type, level: b.level, isElite: false, id: b.x * 10, recoil: 0, constructor: { color } };
    drawLive(ctx, fake, t, Math.PI * 0.9, { reduced: this.reduced });
    drawFront(ctx, b.type, b.level, false);
    ctx.restore();
  }
}

function roundedClip(ctx, x, y, w, h, r) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
}

export { rgba, shade };
