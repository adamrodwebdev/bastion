/**
 * @file Paints the static background of a board once (it is cached by the
 * renderer): textured ground, cobbled roads, ponds with shores, scattered grass
 * and flowers, trees and rocks. Animated scenery is drawn every frame elsewhere.
 */

import { TAU, rng, shade, rgba, makeCanvas, INK } from './paint.js';
import { tree, rock, tuft } from './props.js';

/**
 * @param {import('./Renderer.js').Renderer} R
 * @param {import('../world/GameMap.js').GameMap} map
 * @returns {HTMLCanvasElement}
 */
export function paintTerrain(R, map) {
  const bg = makeCanvas(R.canvas.width, R.canvas.height);
  const ctx = bg.getContext('2d');
  const pal = R.landscape;
  const theme = R.level.theme;
  const seed = (R.level.number || 1) * 7919 + 13;
  const rand = rng(seed);
  const world = () => ctx.setTransform(...R._worldTransform());
  const sprite = (x, y) => {
    const p = R.toScreen(x, y);
    ctx.setTransform(R.scale, 0, 0, R.scale, p.x, p.y);
  };
  const cols = R.cols;
  const rows = R.rows;
  const isRoad = (c, r) => map.pathCells.has(`${c},${r}`);
  const isWater = (c, r) => map.waterCells.has(`${c},${r}`);

  // 1. Ground base and soft colour patches.
  world();
  ctx.fillStyle = pal.ground;
  ctx.fillRect(-1, -1, cols + 2, rows + 2);
  for (let i = 0; i < cols * rows * 1.1; i++) {
    const x = rand() * cols;
    const y = rand() * rows;
    const rr = 0.4 + rand() * 1.1;
    const color = rand() < 0.5 ? pal.groundDark : pal.groundLight;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, rgba(color, 0.28));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // Fine speckle (gives the grass its grain).
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < 16; k++) {
        ctx.fillStyle = rand() < 0.5 ? rgba(pal.groundDark, 0.35) : rgba(pal.groundLight, 0.4);
        ctx.fillRect(c + rand(), r + rand(), 0.025, 0.025);
      }
    }
  }
  // Very faint checkerboard so building spots stay readable.
  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if ((c + r) % 2) ctx.fillRect(c, r, 1, 1);

  // 2. Ponds: shore band, water, inner highlight.
  const waterCells = [...map.waterCells].map((k) => k.split(',').map(Number));
  const pondShape = (grow, radius) => {
    ctx.beginPath();
    for (const [c, r] of waterCells) {
      const g = grow;
      const x0 = c - g + (isWater(c - 1, r) ? -0.02 : 0);
      const y0 = r - g + (isWater(c, r - 1) ? -0.02 : 0);
      const x1 = c + 1 + g + (isWater(c + 1, r) ? 0.02 : 0);
      const y1 = r + 1 + g + (isWater(c, r + 1) ? 0.02 : 0);
      const rr = radius;
      ctx.moveTo(x0 + rr, y0);
      ctx.arcTo(x1, y0, x1, y1, isWater(c, r - 1) || isWater(c + 1, r) ? 0 : rr);
      ctx.arcTo(x1, y1, x0, y1, isWater(c + 1, r) || isWater(c, r + 1) ? 0 : rr);
      ctx.arcTo(x0, y1, x0, y0, isWater(c, r + 1) || isWater(c - 1, r) ? 0 : rr);
      ctx.arcTo(x0, y0, x1, y0, isWater(c - 1, r) || isWater(c, r - 1) ? 0 : rr);
      ctx.closePath();
    }
  };
  if (waterCells.length) {
    pondShape(0.06, 0.32);
    ctx.fillStyle = theme === 'ashlands' ? '#2a1a16' : shade(pal.dirt, -0.05);
    ctx.fill();
    pondShape(-0.02, 0.28);
    ctx.fillStyle = pal.water;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (const [c, r] of waterCells) {
      const g = ctx.createRadialGradient(c + 0.5, r + 0.5, 0.05, c + 0.5, r + 0.5, 0.75);
      g.addColorStop(0, rgba(shade(pal.water, -0.25), 0.6));
      g.addColorStop(1, rgba(pal.waterLight, 0.35));
      ctx.fillStyle = g;
      ctx.fillRect(c - 0.1, r - 0.1, 1.2, 1.2);
    }
    ctx.restore();
    pondShape(-0.02, 0.28);
    ctx.strokeStyle = rgba('#ffffff', theme === 'ashlands' ? 0.15 : 0.45);
    ctx.lineWidth = 0.035;
    ctx.stroke();
  }

  // 3. Roads: soft dirt shoulder, packed base, then cobblestones.
  const strokePath = (pts, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  };
  for (const p of map.paths) strokePath(p.points, 1.04, rgba(pal.dirt, 0.45));
  for (const p of map.paths) strokePath(p.points, 0.9, pal.dirt);
  for (const p of map.paths) strokePath(p.points, 0.76, pal.roadDark);
  const stoneRand = rng(seed + 1);
  for (const p of map.paths) {
    const pts = p.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (!len) continue;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      for (let d = 0; d < len; d += 0.15) {
        for (let k = -2; k <= 2; k++) {
          const off = k * 0.14 + (stoneRand() - 0.5) * 0.05;
          const along = d + (k % 2 ? 0.07 : 0) + (stoneRand() - 0.5) * 0.04;
          const x = a.x + ux * along - uy * off;
          const y = a.y + uy * along + ux * off;
          const s = 0.055 + stoneRand() * 0.025;
          const tone = stoneRand();
          ctx.fillStyle = tone < 0.6 ? pal.road : tone < 0.85 ? pal.stone : shade(pal.road, -0.12);
          ctx.beginPath();
          ctx.ellipse(x, y, s * 1.15, s, Math.atan2(uy, ux), 0, TAU);
          ctx.fill();
        }
      }
    }
  }
  // Light from the top-left on the stones.
  for (const p of map.paths) strokePath(p.points, 0.76, 'rgba(255,248,230,0.08)');
  // Worn edge.
  for (const p of map.paths) {
    ctx.setLineDash([0.06, 0.1]);
    strokePath(p.points, 0.8, 'rgba(0,0,0,0)');
    ctx.setLineDash([]);
  }

  // 4. Small things on the grass: tufts, flowers, pebbles.
  const deco = rng(seed + 2);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (isRoad(c, r) || isWater(c, r) || map.rockCells.has(`${c},${r}`)) continue;
      const n = 3 + Math.floor(deco() * 4);
      for (let k = 0; k < n; k++) {
        const x = c + 0.1 + deco() * 0.8;
        const y = r + 0.15 + deco() * 0.8;
        sprite(x, y);
        const roll = deco();
        if (roll < 0.62) {
          tuft(ctx, 0, 0, deco() < 0.5 ? pal.groundDark : shade(pal.groundDark, -0.15), 0.06 + deco() * 0.05);
        } else if (roll < 0.82 && pal.flowers.length) {
          ctx.fillStyle = pal.flowers[Math.floor(deco() * pal.flowers.length)];
          ctx.beginPath();
          ctx.arc(0, -0.02, 0.022, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,240,170,0.9)';
          ctx.fillRect(-0.006, -0.026, 0.012, 0.012);
        } else {
          ctx.fillStyle = rgba(pal.rockDark, 0.55);
          ctx.beginPath();
          ctx.ellipse(0, 0, 0.03, 0.02, 0, 0, TAU);
          ctx.fill();
        }
      }
    }
  }
  // Grass leaning over the road edges.
  for (const p of map.paths) {
    const pts = p.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (!len) continue;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      for (let d = 0; d < len; d += 0.11) {
        for (const side of [-1, 1]) {
          const off = side * (0.44 + deco() * 0.06);
          const x = a.x + ux * d - uy * off;
          const y = a.y + uy * d + ux * off;
          const c = Math.floor(x);
          const r = Math.floor(y);
          if (isRoad(c, r) && Math.abs(off) < 0.5 && deco() < 0.3) continue;
          sprite(x, y);
          tuft(ctx, 0, 0, pal.groundDark, 0.05 + deco() * 0.04);
        }
      }
    }
  }
  // Theme touches.
  world();
  if (theme === 'ashlands') {
    ctx.strokeStyle = 'rgba(255,120,40,0.55)';
    ctx.lineWidth = 0.025;
    for (let i = 0; i < 18; i++) {
      let x = rand() * cols;
      let y = rand() * rows;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (rand() - 0.5) * 0.5;
        y += (rand() - 0.5) * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (theme === 'desert') {
    ctx.strokeStyle = rgba(pal.groundDark, 0.45);
    ctx.lineWidth = 0.02;
    for (let i = 0; i < 40; i++) {
      const x = rand() * cols;
      const y = rand() * rows;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 0.3, y - 0.08, x + 0.6, y);
      ctx.stroke();
    }
  } else if (theme === 'winter') {
    for (let i = 0; i < 30; i++) {
      const x = rand() * cols;
      const y = rand() * rows;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.ellipse(x, y, 0.3 + rand() * 0.4, 0.12, 0, 0, TAU);
      ctx.fill();
    }
  }

  // 5. Obstacles (trees and rocks), back to front.
  const obstacles = [...map.rockCells].map((k) => k.split(',').map(Number)).sort((a, b) => R.toScreen(a[0] + 0.5, a[1] + 0.5).y - R.toScreen(b[0] + 0.5, b[1] + 0.5).y);
  const woody = theme === 'forest' || theme === 'swamp';
  for (const [c, r] of obstacles) {
    const s = c * 31 + r * 17 + seed;
    const pick = rng(s)();
    sprite(c + 0.5, r + 0.72);
    if (woody || (theme !== 'winter' && theme !== 'ashlands' && pick < 0.35) || (theme === 'winter' && pick < 0.5) || (theme === 'ashlands' && pick < 0.3)) {
      tree(ctx, pal, s);
      // A second, smaller tree for density.
      if (woody) {
        sprite(c + 0.22, r + 0.45);
        tree(ctx, pal, s + 5);
      }
    } else {
      rock(ctx, pal, s, theme);
    }
  }

  // 6. Vignette (screen space).
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const w = bg.width;
  const h = bg.height;
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, rgba(INK, 0.28));
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  return bg;
}
