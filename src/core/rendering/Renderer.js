/**
 * @file Canvas 2D renderer of the board. Pure presentation: never changes the game state.
 */

import { TAU } from '../utils/math.js';

/** Board colours per level theme and colour scheme. */
const PALETTES = {
  meadow: {
    light: { grass: '#bfe3a5', grassAlt: '#b4dc98', path: '#e9d6aa', pathEdge: '#cdb47f', rock: '#8f9a8a' },
    dark: { grass: '#1f3a24', grassAlt: '#1c3521', path: '#4a412f', pathEdge: '#5e5138', rock: '#56615a' },
  },
  canyon: {
    light: { grass: '#f0cf9f', grassAlt: '#e9c590', path: '#fbe9cc', pathEdge: '#d9b07a', rock: '#a87a52' },
    dark: { grass: '#3b2a1c', grassAlt: '#36261a', path: '#5c4730', pathEdge: '#6f5538', rock: '#7a5a3f' },
  },
  lagoon: {
    light: { grass: '#a9e2d9', grassAlt: '#9cd9cf', path: '#f3e5c0', pathEdge: '#d4c08e', rock: '#6f9a97' },
    dark: { grass: '#123532', grassAlt: '#10302d', path: '#3f4436', pathEdge: '#535942', rock: '#3f6663' },
  },
  volcano: {
    light: { grass: '#e3b3a3', grassAlt: '#dba897', path: '#5b4b48', pathEdge: '#3e3230', rock: '#7d4b41' },
    dark: { grass: '#2e1714', grassAlt: '#291412', path: '#4b3330', pathEdge: '#663f37', rock: '#6a2f26' },
  },
  fortress: {
    light: { grass: '#c9ced6', grassAlt: '#bec4cd', path: '#e8e3d6', pathEdge: '#b8ae97', rock: '#7c8594' },
    dark: { grass: '#222730', grassAlt: '#1e222a', path: '#3c3b37', pathEdge: '#514f48', rock: '#4b5261' },
  },
  abyss: {
    light: { grass: '#cfc1ec', grassAlt: '#c4b4e6', path: '#ece3d0', pathEdge: '#c3b28c', rock: '#7b6aa3' },
    dark: { grass: '#1e1733', grassAlt: '#1a142d', path: '#3c3550', pathEdge: '#524871', rock: '#4c3f72' },
  },
};

/**
 * Canvas 2D renderer. Draws in tile units (1 unit = 1 tile) by
 * scaling the context, and caches the static background.
 */
export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../config/Level.js').Level} level
   */
  constructor(canvas, level) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.level = level;
    this.cols = level.cols;
    this.rows = level.rows;
    this.mode = 'light';
    this.reducedMotion = false;
    this.scale = 1; // device pixels per tile
    this.rotated = false;
    this.cssTile = 1; // CSS pixels per tile
    this._bg = null;
  }

  get palette() {
    const p = PALETTES[this.level.theme] || PALETTES.meadow;
    return p[this.mode];
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this._bg = null;
  }

  /**
   * Fits the canvas into the given CSS box while keeping the grid ratio.
   * On tall screens (phones in portrait) the board is rotated by 90° when
   * that gives noticeably bigger tiles — much easier to tap.
   */
  resize(maxWidth, maxHeight, allowRotate = true) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const normal = Math.min(maxWidth / this.cols, maxHeight / this.rows);
    const rotated = Math.min(maxWidth / this.rows, maxHeight / this.cols);
    this.rotated = allowRotate && rotated > normal * 1.15;
    const tile = Math.max(12, Math.floor(this.rotated ? rotated : normal));
    this.cssTile = tile;
    this.scale = tile * dpr;
    const w = tile * (this.rotated ? this.rows : this.cols);
    const h = tile * (this.rotated ? this.cols : this.rows);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this._bg = null;
  }

  /** World (tile units) → device pixels transform, as setTransform() arguments. */
  _worldTransform() {
    const s = this.scale;
    // Rotated: screen.x = (rows - y) * s, screen.y = x * s (90° clockwise).
    return this.rotated ? [0, s, -s, 0, this.rows * s, 0] : [s, 0, 0, s, 0, 0];
  }

  /** World point → device pixels. */
  toScreen(x, y) {
    const s = this.scale;
    return this.rotated ? { x: (this.rows - y) * s, y: x * s } : { x: x * s, y: y * s };
  }

  /** Converts a pointer event position to a grid cell. */
  cellFromEvent(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const u = (evt.clientX - rect.left) / rect.width; // 0..1 across the canvas
    const v = (evt.clientY - rect.top) / rect.height;
    if (this.rotated) {
      return { col: Math.floor(v * this.cols), row: Math.floor((1 - u) * this.rows) };
    }
    return { col: Math.floor(u * this.cols), row: Math.floor(v * this.rows) };
  }

  // ------------------------------------------------------------- background
  _buildBackground(map) {
    const bg = document.createElement('canvas');
    bg.width = this.canvas.width;
    bg.height = this.canvas.height;
    const ctx = bg.getContext('2d');
    const pal = this.palette;
    ctx.setTransform(...this._worldTransform());

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        ctx.fillStyle = (r + c) % 2 ? pal.grassAlt : pal.grass;
        ctx.fillRect(c, r, 1.02, 1.02);
      }
    }

    // Road: thick rounded poly-line, edge + fill.
    const pts = map.path.points;
    const road = (width, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    };
    road(0.92, pal.pathEdge);
    road(0.76, pal.path);

    // Dashed centre line hints at the direction.
    ctx.save();
    ctx.setLineDash([0.12, 0.28]);
    road(0.04, pal.pathEdge);
    ctx.restore();

    // Rocks.
    for (const key of map.rockCells) {
      const [c, r] = key.split(',').map(Number);
      ctx.fillStyle = pal.rock;
      ctx.beginPath();
      ctx.ellipse(c + 0.5, r + 0.58, 0.34, 0.26, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.ellipse(c + 0.42, r + 0.48, 0.14, 0.08, -0.4, 0, TAU);
      ctx.fill();
    }

    // Exit gate.
    const end = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const ex = Math.min(this.cols - 0.5, Math.max(0.5, end.x));
    const ey = Math.min(this.rows - 0.5, Math.max(0.5, end.y));
    ctx.fillStyle = '#e5484d';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
    ctx.arc(ex, ey, 0.32, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(ex - Math.cos(ang) * 0.15 - Math.sin(ang) * 0.12, ey - Math.sin(ang) * 0.15 + Math.cos(ang) * 0.12);
    ctx.lineTo(ex + Math.cos(ang) * 0.15, ey + Math.sin(ang) * 0.15);
    ctx.lineTo(ex - Math.cos(ang) * 0.15 + Math.sin(ang) * 0.12, ey - Math.sin(ang) * 0.15 - Math.cos(ang) * 0.12);
    ctx.stroke();

    this._bg = bg;
  }

  // ------------------------------------------------------------- frame
  /**
   * @param {import('../Game.js').Game} game
   * @param {{selectedCell?:{col:number,row:number}|null, selectedTower?:any, previewType?:any, hoverCell?:any}} ui
   */
  render(game, ui = {}) {
    const ctx = this.ctx;
    if (!this._bg) this._buildBackground(game.map);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this._bg, 0, 0);
    ctx.setTransform(...this._worldTransform());

    this._drawCells(game, ui);
    for (const t of game.towers) this._drawTower(t, t === ui.selectedTower);
    for (const e of game.enemies) this._drawEnemy(e, game);
    this._drawProjectiles(game.projectiles);
    this._drawEffects(game.effects);
    this._drawRanges(game, ui);
    this._drawPowerOverlay(game);
  }

  _drawCells(game, ui) {
    const ctx = this.ctx;
    const hc = ui.hoverCell;
    if (hc && game.map.inBounds(hc.col, hc.row) && (!ui.selectedCell || hc.col !== ui.selectedCell.col || hc.row !== ui.selectedCell.row)) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(hc.col, hc.row, 1, 1);
    }
    const sc = ui.selectedCell;
    if (sc) {
      const ok = game.map.isBuildable(sc.col, sc.row);
      ctx.strokeStyle = ok ? '#30a46c' : '#e5484d';
      ctx.lineWidth = 0.07;
      ctx.strokeRect(sc.col + 0.06, sc.row + 0.06, 0.88, 0.88);
      ctx.fillStyle = ok ? 'rgba(48,164,108,0.22)' : 'rgba(229,72,77,0.18)';
      ctx.fillRect(sc.col + 0.06, sc.row + 0.06, 0.88, 0.88);
    }
  }

  _drawRanges(game, ui) {
    const ctx = this.ctx;
    const circle = (x, y, r, color) => {
      ctx.fillStyle = color + '22';
      ctx.strokeStyle = color + 'aa';
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.stroke();
    };
    if (ui.selectedTower) {
      const t = ui.selectedTower;
      circle(t.x, t.y, t.range, t.constructor.color);
      if (ui.upgradePreview && t.canUpgrade) {
        ctx.setLineDash([0.1, 0.1]);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 0.04;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.constructor.levels[t.level].range, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (ui.selectedCell && ui.previewType && game.map.isBuildable(ui.selectedCell.col, ui.selectedCell.row)) {
      const T = ui.previewType;
      circle(ui.selectedCell.col + 0.5, ui.selectedCell.row + 0.5, T.levels[0].range, T.color);
    }
  }

  _drawTower(t, selected) {
    const ctx = this.ctx;
    const color = t.constructor.color;
    const { x, y } = t;

    // Base.
    ctx.fillStyle = this.mode === 'dark' ? '#353a48' : '#4a4f5c';
    this._roundRect(x - 0.4, y - 0.4, 0.8, 0.8, 0.16);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 0.07;
      ctx.stroke();
    } else if (this.mode === 'dark') {
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 0.035;
      ctx.stroke();
    }

    // Level pips.
    for (let i = 0; i < t.level; i++) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(x - 0.22 + i * 0.22, y + 0.3, 0.05, 0, TAU);
      ctx.fill();
    }

    // Turret.
    const kick = t.recoil * 0.06;
    ctx.save();
    ctx.translate(x, y - 0.04);
    ctx.rotate(t.angle);
    ctx.fillStyle = color;
    switch (t.type) {
      case 'cannon':
        ctx.fillRect(0.05 - kick, -0.1, 0.36, 0.2);
        break;
      case 'laser':
        ctx.fillRect(0.05 - kick, -0.05, 0.42, 0.1);
        break;
      case 'frost':
        ctx.fillRect(0.05 - kick, -0.07, 0.28, 0.14);
        break;
      default:
        ctx.fillRect(0.05 - kick, -0.05, 0.32, 0.1);
    }
    ctx.restore();

    ctx.fillStyle = color;
    ctx.beginPath();
    if (t.type === 'frost') {
      // Hexagon.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.lineTo(x + Math.cos(a) * 0.23, y - 0.04 + Math.sin(a) * 0.23);
      }
      ctx.closePath();
    } else if (t.type === 'laser') {
      ctx.moveTo(x, y - 0.3);
      ctx.lineTo(x + 0.24, y - 0.04);
      ctx.lineTo(x, y + 0.22);
      ctx.lineTo(x - 0.24, y - 0.04);
      ctx.closePath();
    } else {
      ctx.arc(x, y - 0.04, t.type === 'cannon' ? 0.25 : 0.2, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(x - 0.06, y - 0.1, 0.07, 0, TAU);
    ctx.fill();
  }

  _drawEnemy(e, game) {
    const ctx = this.ctx;
    const frozen = game.powers.modifier('enemySpeed') === 0;
    const r = e.radius;
    const bob = this.reducedMotion || frozen ? 0 : Math.sin(game.time * 10 + e.id) * 0.025;

    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + r * 0.75, r * 0.9, r * 0.35, 0, 0, TAU);
    ctx.fill();

    if (e.type === 'healer' && e.pulse > 0) {
      ctx.strokeStyle = `rgba(48,164,108,${e.pulse * 2})`;
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 1.6 * (1 - e.pulse / 0.4) + 0.2, 0, TAU);
      ctx.stroke();
    }

    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
    ctx.beginPath();
    if (e.type === 'tank') {
      this._roundRect(e.x - r, e.y - r + bob, r * 2, r * 2, r * 0.4);
    } else if (e.type === 'runner') {
      ctx.moveTo(e.x + Math.cos(e.angle) * r * 1.3, e.y + Math.sin(e.angle) * r * 1.3 + bob);
      ctx.lineTo(e.x + Math.cos(e.angle + 2.4) * r, e.y + Math.sin(e.angle + 2.4) * r + bob);
      ctx.lineTo(e.x + Math.cos(e.angle - 2.4) * r, e.y + Math.sin(e.angle - 2.4) * r + bob);
      ctx.closePath();
    } else {
      ctx.arc(e.x, e.y + bob, r, 0, TAU);
    }
    ctx.fill();

    if (e.type === 'boss') {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, r + 0.07, 0, TAU);
      ctx.stroke();
    }
    if (e.type === 'healer') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(e.x - 0.04, e.y - 0.14 + bob, 0.08, 0.28);
      ctx.fillRect(e.x - 0.14, e.y - 0.04 + bob, 0.28, 0.08);
    } else if (e.type !== 'runner') {
      // Eyes, looking where the enemy goes.
      const ex = Math.cos(e.angle) * r * 0.35;
      const ey = Math.sin(e.angle) * r * 0.35;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(e.x + ex - ey * 0.6, e.y + ey + ex * 0.6 + bob, r * 0.22, 0, TAU);
      ctx.arc(e.x + ex + ey * 0.6, e.y + ey - ex * 0.6 + bob, r * 0.22, 0, TAU);
      ctx.fill();
    }

    if (e.isSlowed || frozen) {
      ctx.strokeStyle = 'rgba(76,204,230,0.95)';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, r + 0.04, 0, TAU);
      ctx.stroke();
    }

    // Health bar, drawn in screen space so it stays horizontal on a rotated board.
    if (e.hp < e.maxHp) {
      const s = this.scale;
      const w = Math.max(0.5, r * 2.2) * s;
      const hgt = 0.09 * s;
      const c = this.toScreen(e.x, e.y);
      const top = c.y - (r + 0.2) * s;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(c.x - w / 2, top, w, hgt);
      const ratio = e.hpRatio;
      ctx.fillStyle = ratio > 0.5 ? '#30a46c' : ratio > 0.25 ? '#f5a524' : '#e5484d';
      ctx.fillRect(c.x - w / 2, top, w * ratio, hgt);
      ctx.restore();
    }
  }

  _drawProjectiles(list) {
    const ctx = this.ctx;
    for (const p of list) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
  }

  _drawEffects(list) {
    const ctx = this.ctx;
    for (const fx of list) {
      const t = fx.t;
      ctx.globalAlpha = Math.max(0, 1 - t);
      if (fx.kind === 'ring') {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 0.08 * (1 - t) + 0.01;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.radius * (0.3 + 0.7 * t), 0, TAU);
        ctx.stroke();
      } else if (fx.kind === 'spark') {
        ctx.fillStyle = fx.color;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + fx.id;
          const d = fx.radius * t;
          ctx.beginPath();
          ctx.arc(fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d, 0.06 * (1 - t) + 0.01, 0, TAU);
          ctx.fill();
        }
      } else if (fx.kind === 'beam') {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 0.12 * (1 - t) + 0.02;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.03;
        ctx.stroke();
      } else if (fx.kind === 'text') {
        // Text is drawn in device pixels: tiny fractional font sizes are unreliable.
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = fx.color;
        ctx.font = `700 ${Math.round(0.34 * this.scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        const p = this.toScreen(fx.x, fx.y);
        ctx.fillText(fx.text, p.x, p.y);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawPowerOverlay(game) {
    const ctx = this.ctx;
    if (game.powers.modifier('enemySpeed') === 0) {
      ctx.fillStyle = 'rgba(120,200,255,0.16)';
      ctx.fillRect(0, 0, this.cols, this.rows);
    }
    const meteor = game.powers.get('meteor');
    if (meteor && meteor.isActive && !this.reducedMotion) {
      ctx.fillStyle = `rgba(255,120,40,${0.06 + 0.05 * Math.sin(game.time * 20)})`;
      ctx.fillRect(0, 0, this.cols, this.rows);
    }
    const oc = game.powers.get('overclock');
    if (oc && oc.isActive) {
      ctx.strokeStyle = 'rgba(255,209,102,0.7)';
      ctx.lineWidth = 0.12;
      ctx.strokeRect(0.06, 0.06, this.cols - 0.12, this.rows - 0.12);
    }
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
