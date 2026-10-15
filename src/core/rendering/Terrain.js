/**
 * @file Paints the static background of a level once (ground, road, decor, gates)
 * into an offscreen canvas. Deterministic: the same level always looks the same.
 */

import { TAU } from '../utils/math.js';

/** Small deterministic PRNG (mulberry32) so decor never "jumps" between redraws. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Paints the background of a level.
 * All drawing happens in tile units (the caller sets the world transform).
 * `up` is the rotation that keeps props upright when the board is rotated on phones.
 */
export class Terrain {
  /**
   * @param {CanvasRenderingContext2D} ctx context with the world transform already set
   * @param {{cols:number, rows:number, map:any, theme:any, pal:any, id:string, up:number}} o
   */
  static paint(ctx, { cols, rows, map, theme, pal, id, up }) {
    const rnd = seeded(hashString(id));
    Terrain._ground(ctx, cols, rows, pal, rnd);
    Terrain._scatter(ctx, cols, rows, map, theme, pal, rnd, up);
    Terrain._road(ctx, map, pal, rnd);
    Terrain._gates(ctx, cols, rows, map, pal, up);
    // Props are drawn top to bottom so the lower ones overlap the upper ones.
    const props = [...map.rockCells].map((k) => k.split(',').map(Number)).sort((a, b) => a[1] - b[1]);
    for (const [c, r] of props) Terrain._prop(ctx, theme.decor, c + 0.5, r + 0.5, pal, rnd, up);
  }

  // ------------------------------------------------------------------ ground
  static _ground(ctx, cols, rows, pal, rnd) {
    ctx.fillStyle = pal.ground;
    ctx.fillRect(-1, -1, cols + 2, rows + 2);
    // Large soft patches of lighter and darker ground: a painted, not tiled, look.
    for (let i = 0; i < cols * rows * 0.35; i++) {
      const x = rnd() * cols;
      const y = rnd() * rows;
      const r = 0.6 + rnd() * 1.8;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const col = rnd() < 0.5 ? pal.groundDark : pal.groundLight;
      g.addColorStop(0, col);
      g.addColorStop(1, Terrain._alpha(col, 0));
      ctx.globalAlpha = 0.35 + rnd() * 0.3;
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    // Very faint tile hint so the build grid stays readable without a checkerboard.
    ctx.strokeStyle = 'rgba(0,0,0,0.045)';
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let c = 1; c < cols; c++) {
      ctx.moveTo(c, 0);
      ctx.lineTo(c, rows);
    }
    for (let r = 1; r < rows; r++) {
      ctx.moveTo(0, r);
      ctx.lineTo(cols, r);
    }
    ctx.stroke();
  }

  static _scatter(ctx, cols, rows, map, theme, pal, rnd, up) {
    const kinds = theme.scatter;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (map.isPath(c, r) || map.isRock(c, r)) continue;
        const n = rnd() < 0.55 ? 1 + Math.floor(rnd() * 3) : 0;
        for (let i = 0; i < n; i++) {
          const kind = kinds[Math.floor(rnd() * kinds.length)];
          const x = c + 0.15 + rnd() * 0.7;
          const y = r + 0.15 + rnd() * 0.7;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(up);
          Terrain._detail(ctx, kind, pal, rnd);
          ctx.restore();
        }
      }
    }
  }

  /** One small ground detail, drawn around (0, 0), about 0.1–0.2 tile wide. */
  static _detail(ctx, kind, pal, rnd) {
    switch (kind) {
      case 'tuft': {
        ctx.strokeStyle = pal.tuft;
        ctx.lineWidth = 0.025;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = -1; i <= 1; i++) {
          ctx.moveTo(i * 0.03, 0);
          ctx.quadraticCurveTo(i * 0.05, -0.06, i * 0.08, -0.1 - rnd() * 0.04);
        }
        ctx.stroke();
        break;
      }
      case 'flower': {
        ctx.fillStyle = pal.flower[Math.floor(rnd() * pal.flower.length)];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0.025, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(0, 0, 0.018, 0, TAU);
        ctx.fill();
        break;
      }
      case 'pebble':
      case 'ash': {
        ctx.fillStyle = kind === 'ash' ? 'rgba(0,0,0,0.25)' : pal.pebble;
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.04 + rnd() * 0.03, 0.03, rnd() * 3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.ellipse(-0.01, -0.01, 0.015, 0.01, 0, 0, TAU);
        ctx.fill();
        break;
      }
      case 'crack': {
        ctx.strokeStyle = pal.groundDark;
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        ctx.moveTo(-0.1, 0);
        ctx.lineTo(-0.02, 0.03);
        ctx.lineTo(0.04, -0.02);
        ctx.lineTo(0.11, 0.02);
        ctx.stroke();
        break;
      }
      case 'cactus': {
        ctx.fillStyle = '#5f8f3a';
        ctx.fillRect(-0.02, -0.14, 0.04, 0.14);
        ctx.fillRect(-0.07, -0.09, 0.03, 0.05);
        ctx.fillRect(0.04, -0.11, 0.03, 0.05);
        break;
      }
      case 'shell': {
        ctx.fillStyle = '#fff4e6';
        ctx.beginPath();
        ctx.arc(0, 0, 0.035, Math.PI, 0);
        ctx.fill();
        break;
      }
      case 'flagstone': {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 0.012;
        ctx.beginPath();
        ctx.rect(-0.09, -0.06, 0.18, 0.12);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'mushroom': {
        ctx.fillStyle = '#e9d8ff';
        ctx.fillRect(-0.012, -0.05, 0.024, 0.05);
        ctx.fillStyle = '#c48bff';
        ctx.beginPath();
        ctx.arc(0, -0.05, 0.045, Math.PI, 0);
        ctx.fill();
        break;
      }
      default:
        break;
    }
  }

  // ------------------------------------------------------------------ road
  static _road(ctx, map, pal, rnd) {
    const pts = map.path.points;
    const stroke = (width, color, dash = null) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    };
    // Soft drop shadow, worn edge, then the dirt itself and two wheel ruts.
    stroke(1.08, 'rgba(0,0,0,0.16)');
    stroke(0.96, pal.roadEdge);
    stroke(0.86, pal.roadDark);
    stroke(0.7, pal.road);
    ctx.globalAlpha = 0.5;
    ctx.save();
    ctx.translate(0, -0.16);
    stroke(0.05, pal.roadDark, [0.5, 0.18]);
    ctx.translate(0, 0.32);
    stroke(0.05, pal.roadDark, [0.42, 0.24]);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Pebbles along the road.
    for (const s of map.path.segments) {
      const n = Math.ceil(s.length * 5);
      for (let i = 0; i < n; i++) {
        const t = rnd();
        const off = (rnd() - 0.5) * 0.7;
        const x = s.a.x + (s.b.x - s.a.x) * t - Math.sin(s.angle) * off;
        const y = s.a.y + (s.b.y - s.a.y) * t + Math.cos(s.angle) * off;
        ctx.fillStyle = rnd() < 0.5 ? pal.pebble : pal.roadDark;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(x, y, 0.018 + rnd() * 0.025, 0.014 + rnd() * 0.015, rnd() * 3, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ gates
  /** Entrance = a dark cave mouth, exit = the bastion's gate the player defends. */
  static _gates(ctx, cols, rows, map, pal, up) {
    const pts = map.path.points;
    const clampPt = (p) => ({ x: Math.min(cols - 0.35, Math.max(0.35, p.x)), y: Math.min(rows - 0.35, Math.max(0.35, p.y)) });
    const start = clampPt(pts[0]);
    const end = clampPt(pts[pts.length - 1]);

    // Cave.
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(up);
    ctx.fillStyle = pal.decorB;
    ctx.beginPath();
    ctx.ellipse(0, 0.05, 0.62, 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = pal.roadEdge;
    ctx.beginPath();
    ctx.ellipse(0, 0.02, 0.5, 0.4, 0, 0, TAU);
    ctx.fill();
    const g = ctx.createRadialGradient(0, 0.1, 0.02, 0, 0.1, 0.42);
    g.addColorStop(0, '#000');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0.1, 0.36, 0.3, 0, Math.PI, 0);
    ctx.lineTo(0.36, 0.3);
    ctx.lineTo(-0.36, 0.3);
    ctx.fill();
    ctx.restore();

    // Gate: two crenellated towers, a portcullis and banners.
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.rotate(up);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0.06, 0.38, 0.62, 0.16, 0, 0, TAU);
    ctx.fill();
    const stone = '#b8ad97';
    const stoneDark = '#7f7562';
    for (const sx of [-0.36, 0.36]) {
      ctx.fillStyle = stoneDark;
      ctx.fillRect(sx - 0.17, -0.52, 0.34, 0.9);
      ctx.fillStyle = stone;
      ctx.fillRect(sx - 0.17, -0.52, 0.26, 0.9);
      for (let i = 0; i < 3; i++) ctx.fillRect(sx - 0.17 + i * 0.13, -0.62, 0.08, 0.1);
      ctx.fillStyle = '#c23a3a';
      ctx.beginPath();
      ctx.moveTo(sx - 0.06, -0.38);
      ctx.lineTo(sx + 0.06, -0.38);
      ctx.lineTo(sx + 0.06, -0.1);
      ctx.lineTo(sx, -0.16);
      ctx.lineTo(sx - 0.06, -0.1);
      ctx.fill();
    }
    ctx.fillStyle = stone;
    ctx.fillRect(-0.2, -0.3, 0.4, 0.62);
    ctx.fillStyle = '#2a1f17';
    ctx.beginPath();
    ctx.moveTo(-0.13, 0.32);
    ctx.lineTo(-0.13, -0.08);
    ctx.arc(0, -0.08, 0.13, Math.PI, 0);
    ctx.lineTo(0.13, 0.32);
    ctx.fill();
    ctx.strokeStyle = '#6b5b45';
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(i * 0.06, -0.16);
      ctx.lineTo(i * 0.06, 0.3);
    }
    ctx.moveTo(-0.13, 0.05);
    ctx.lineTo(0.13, 0.05);
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ props
  /** Obstacle on a rock cell, styled by the level theme. */
  static _prop(ctx, decor, x, y, pal, rnd, up) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(up);
    // Contact shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0.06, 0.3, 0.4, 0.13, 0, 0, TAU);
    ctx.fill();
    switch (decor) {
      case 'tree': {
        ctx.fillStyle = pal.decorC;
        ctx.fillRect(-0.05, 0.02, 0.1, 0.28);
        const blobs = [[-0.16, -0.06, 0.24], [0.15, -0.04, 0.22], [0, -0.24, 0.26], [0, 0.02, 0.24]];
        ctx.fillStyle = pal.decorB;
        for (const [bx, by, br] of blobs) {
          ctx.beginPath();
          ctx.arc(bx + 0.03, by + 0.03, br, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = pal.decorA;
        for (const [bx, by, br] of blobs) {
          ctx.beginPath();
          ctx.arc(bx, by, br * 0.9, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.beginPath();
        ctx.arc(-0.08, -0.3, 0.1, 0, TAU);
        ctx.fill();
        break;
      }
      case 'mesa': {
        ctx.fillStyle = pal.decorB;
        Terrain._poly(ctx, [[-0.4, 0.28], [-0.32, -0.2], [0.3, -0.24], [0.42, 0.28]]);
        ctx.fillStyle = pal.decorA;
        Terrain._poly(ctx, [[-0.32, -0.2], [0.3, -0.24], [0.26, -0.34], [-0.28, -0.32]]);
        ctx.fillStyle = pal.decorC;
        ctx.fillRect(-0.36, 0.02, 0.76, 0.05);
        break;
      }
      case 'pond': {
        ctx.fillStyle = pal.decorB;
        ctx.beginPath();
        ctx.ellipse(0, 0.04, 0.46, 0.36, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = pal.decorA;
        ctx.beginPath();
        ctx.ellipse(0, 0.02, 0.4, 0.3, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#5fae78';
        ctx.beginPath();
        ctx.arc(0.14, 0.08, 0.09, 0.4, TAU - 0.2);
        ctx.lineTo(0.14, 0.08);
        ctx.fill();
        ctx.fillStyle = '#ff9eb5';
        ctx.beginPath();
        ctx.arc(-0.14, -0.04, 0.035, 0, TAU);
        ctx.fill();
        break;
      }
      case 'lava': {
        ctx.fillStyle = pal.decorB;
        Terrain._poly(ctx, [[-0.4, 0.26], [-0.3, -0.14], [0.02, -0.34], [0.34, -0.12], [0.42, 0.26]]);
        ctx.fillStyle = pal.decorA;
        Terrain._poly(ctx, [[-0.3, -0.14], [0.02, -0.34], [0.34, -0.12], [0.02, -0.02]]);
        ctx.strokeStyle = pal.decorC;
        ctx.lineWidth = 0.035;
        ctx.beginPath();
        ctx.moveTo(-0.22, 0.2);
        ctx.lineTo(-0.06, 0.04);
        ctx.lineTo(0.08, 0.14);
        ctx.lineTo(0.24, -0.02);
        ctx.stroke();
        break;
      }
      case 'ruin': {
        ctx.fillStyle = pal.decorB;
        ctx.fillRect(-0.34, -0.22, 0.68, 0.5);
        ctx.fillStyle = pal.decorA;
        ctx.fillRect(-0.34, -0.22, 0.68, 0.38);
        ctx.fillRect(-0.34, -0.36, 0.14, 0.14);
        ctx.fillRect(-0.07, -0.36, 0.14, 0.14);
        ctx.fillRect(0.2, -0.3, 0.14, 0.08);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.015;
        ctx.beginPath();
        for (const ly of [-0.08, 0.06]) {
          ctx.moveTo(-0.34, ly);
          ctx.lineTo(0.34, ly);
        }
        ctx.stroke();
        ctx.fillStyle = pal.decorC;
        ctx.fillRect(-0.04, -0.16, 0.08, 0.2);
        break;
      }
      case 'crystal': {
        const spikes = [[-0.18, 0.2, 0.1, 0.5], [0.04, 0.24, 0.13, 0.7], [0.22, 0.22, 0.09, 0.42]];
        for (const [sx, sy, w, h] of spikes) {
          ctx.fillStyle = pal.decorB;
          Terrain._poly(ctx, [[sx - w, sy], [sx, sy - h], [sx + w, sy]]);
          ctx.fillStyle = pal.decorA;
          Terrain._poly(ctx, [[sx - w, sy], [sx, sy - h], [sx, sy]]);
          ctx.fillStyle = pal.decorC;
          ctx.globalAlpha = 0.6;
          Terrain._poly(ctx, [[sx - w * 0.4, sy - h * 0.3], [sx, sy - h], [sx - w * 0.1, sy - h * 0.3]]);
          ctx.globalAlpha = 1;
        }
        break;
      }
      default: {
        ctx.fillStyle = pal.decorA;
        ctx.beginPath();
        ctx.ellipse(0, 0.06, 0.34, 0.26, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    void rnd;
  }

  static _poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  /** '#rrggbb' + alpha → 'rgba(…)'. */
  static _alpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
}
