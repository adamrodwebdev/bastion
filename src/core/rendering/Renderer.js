/**
 * @file Canvas 2D renderer of the board. Pure presentation: never changes the game state.
 *
 * Layers, back to front: painted terrain (cached) → road telegraph and placement hints →
 * range circles → towers and enemies sorted by depth → projectiles, effects, particles →
 * night lighting → health bars and floating text (screen space) → vignette and overlays.
 */

import { TAU } from '../utils/math.js';
import { THEMES, TOWER_LOOK } from './themes.js';
import { Terrain } from './Terrain.js';
import { Sprites } from './Sprites.js';
import { Particles } from './Particles.js';
import { GameMap } from '../world/GameMap.js';

/** Ambient particle look per biome: particle kind, colour, size, drift (tiles/s, screen axes). */
const AMBIENT = {
  pollen: { kind: 'firefly', color: '#fff6c2', size: 0.022, drift: [0.15, -0.05], life: 7 },
  firefly: { kind: 'firefly', color: '#d8ff7a', size: 0.03, drift: [0.05, -0.04], life: 6 },
  dust: { kind: 'firefly', color: '#f6dcae', size: 0.02, drift: [0.45, 0.02], life: 5 },
  sparkle: { kind: 'sparkle', color: '#ffffff', size: 0.022, drift: [0.02, 0], life: 3 },
  ember: { kind: 'ember', color: '#ff8a3d', size: 0.028, drift: [0.06, -0.35], life: 4 },
  leaf: { kind: 'leaf', color: '#c46a2a', size: 0.05, drift: [0.25, 0.22], life: 7 },
  snow: { kind: 'leaf', color: '#f4f8ff', size: 0.03, drift: [0.08, 0.3], life: 8 },
  wisp: { kind: 'wisp', color: '#d9b2ff', size: 0.03, drift: [0.02, -0.18], life: 6 },
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
    this.theme = THEMES[level.theme] || THEMES.meadow;
    this.mode = 'light';
    this.reducedMotion = false;
    this.scale = 1; // device pixels per tile
    this.rotated = false;
    this.cssTile = 1; // CSS pixels per tile
    this._bg = null;
    this._vignette = null;
    this._light = null;
    this._sprites = new Map(); // colour → glow sprite
    this.particles = new Particles();
    this.clock = 0;
    this._lastNow = 0;
    this._shake = 0;
    this._leak = 0;
    this._drawList = [];
    this._ambientTimer = 0;
  }

  /**
   * Paints a static picture of a level (terrain, road, decor, gates) into any canvas:
   * used for level cards and the title screen, so menus show the real maps.
   * @param {HTMLCanvasElement} canvas
   * @param {import('../config/Level.js').Level} level
   * @param {'light'|'dark'} mode
   * @param {number} cssWidth displayed width in CSS pixels
   * @param {boolean} [showcase] also draw a few towers and a marching column (title screen)
   */
  static paintThumbnail(canvas, level, mode, cssWidth, showcase = false) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = (cssWidth / level.cols) * dpr;
    canvas.width = Math.round(level.cols * s);
    canvas.height = Math.round(level.rows * s);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const theme = THEMES[level.theme] || THEMES.meadow;
    const pal = mode === 'dark' ? theme.night : theme.day;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    const map = new GameMap(level);
    Terrain.paint(ctx, { cols: level.cols, rows: level.rows, map, theme, pal, id: level.id, up: 0 });
    if (showcase) Renderer._showcase(ctx, map);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.3, canvas.width / 2, canvas.height / 2, canvas.width * 0.65);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, pal.vignette);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  /** Static battle scene: towers aiming at a column of enemies on the road. */
  static _showcase(ctx, map) {
    const units = [];
    [['arrow', 2, 3, 3], ['cannon', 5, 4, 2], ['frost', 8, 5, 1], ['laser', 11, 5, 2], ['arrow', 9, 2, 1]].forEach(([type, col, row, level]) => {
      if (map.isBuildable(col, row)) units.push({ tower: true, type, level, x: col + 0.5, y: row + 0.5, recoil: 0, id: col * 31 + row });
    });
    const kinds = ['boss', 'tank', 'grunt', 'grunt', 'runner', 'healer', 'grunt', 'runner'];
    kinds.forEach((type, i) => {
      const d = 7.4 - i * 0.82;
      const p = map.path.pointAt(d);
      const radius = { boss: 0.42, tank: 0.34, runner: 0.2, healer: 0.27, grunt: 0.26 }[type];
      units.push({ type, x: p.x, y: p.y, angle: p.angle, radius, id: i, hitFlash: 0, isSlowed: i === 2 || i === 3, hp: 1, maxHp: 1 });
    });
    units.sort((a, b) => a.y - b.y);
    const target = units.find((u) => u.type === 'boss') || units[0];
    for (const u of units) {
      ctx.save();
      ctx.translate(u.x, u.y);
      if (u.tower) Sprites.tower(ctx, u, Math.atan2(target.y - u.y, target.x - u.x), 0.6);
      else Sprites.enemy(ctx, u, { time: u.id * 0.37, facing: Math.cos(u.angle) >= 0 ? 1 : -1, frozen: false, still: false });
      ctx.restore();
    }
  }

  get palette() {
    return this.mode === 'dark' ? this.theme.night : this.theme.day;
  }

  get isNight() {
    return this.mode === 'dark';
  }

  /** Rotation that keeps sprites upright on a rotated board. */
  get up() {
    return this.rotated ? -Math.PI / 2 : 0;
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this._bg = null;
    this._vignette = null;
    this.particles.clear();
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
    this._vignette = null;
    this._light = null;
    this.particles.clear();
  }

  /** World (tile units) → device pixels transform, as setTransform() arguments. */
  _worldTransform(ox = 0, oy = 0) {
    const s = this.scale;
    // Rotated: screen.x = (rows - y) * s, screen.y = x * s (90° clockwise).
    return this.rotated ? [0, s, -s, 0, this.rows * s + ox, oy] : [s, 0, 0, s, ox, oy];
  }

  /** World point → device pixels. */
  toScreen(x, y) {
    const s = this.scale;
    return this.rotated ? { x: (this.rows - y) * s, y: x * s } : { x: x * s, y: y * s };
  }

  /** Screen axes expressed in world units (for drifting particles and "height"). */
  get _upVec() {
    return this.rotated ? { x: -1, y: 0 } : { x: 0, y: -1 };
  }

  get _rightVec() {
    return this.rotated ? { x: 0, y: -1 } : { x: 1, y: 0 };
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

  // ------------------------------------------------------------- reactions to game events
  /**
   * Visual reaction to a game event (called by the UI, which listens to the Game).
   * @param {'shot'|'impact'|'kill'|'leak'|'build'|'upgrade'|'sell'|'power'} type
   * @param {any} data event payload
   */
  react(type, data) {
    const P = this.particles;
    const up = this._upVec;
    switch (type) {
      case 'shot': {
        const t = data;
        const k = TOWER_LOOK[t.type];
        if (t.type === 'cannon') {
          const x = t.x + Math.cos(t.angle) * 0.4;
          const y = t.y + Math.sin(t.angle) * 0.4;
          P.burst(x, y, 4, 'rgba(230,230,230,0.9)', 0.6, 0.5, 0.08, 'smoke', 0);
        } else if (t.type === 'frost') {
          P.burst(t.x + up.x * 0.5, t.y + up.y * 0.5, 3, `rgb(${k.light})`, 0.8, 0.3, 0.03, 'sparkle', 0);
        }
        break;
      }
      case 'impact': {
        const { x, y, splash, source } = data;
        if (source && source.type === 'frost') {
          P.burst(x, y, 8, '#e6f8ff', 1.6, 0.45, 0.05, 'shard', 0);
        } else {
          P.burst(x, y, 10, '#ffb347', 2.6, 0.35, 0.06, 'dot', 2);
          P.burst(x, y, 5, 'rgba(90,80,70,0.8)', 0.8, 0.8, 0.14, 'smoke', -0.3);
          P.burst(x, y, 4, '#4a3a2a', 2, 0.6, 0.04, 'shard', 6);
          this.shake(Math.min(0.6, splash * 0.35));
        }
        break;
      }
      case 'kill': {
        const e = data.enemy;
        const boss = e.type === 'boss';
        P.burst(e.x, e.y, boss ? 40 : 10, e.color, boss ? 3.2 : 2, 0.5, boss ? 0.09 : 0.06, 'dot', 4);
        P.burst(e.x, e.y, boss ? 8 : 3, 'rgba(255,255,255,0.7)', 0.6, 0.6, 0.1, 'smoke', -0.2);
        const coins = Math.min(5, 1 + Math.floor(data.reward / 8));
        for (let i = 0; i < coins; i++) {
          P.spawn('coin', e.x, e.y, (Math.random() - 0.5) * 1.4 + up.x * 1.8, (Math.random() - 0.5) * 0.4 + up.y * 1.8, 0.7, 0.07, '#ffd166', 0, 1.5);
        }
        if (boss) this.shake(1);
        break;
      }
      case 'leak':
        this._leak = 1;
        this.shake(0.7);
        break;
      case 'build':
      case 'upgrade': {
        const t = data;
        P.burst(t.x, t.y + 0.25, 10, type === 'build' ? 'rgba(200,180,140,0.9)' : '#ffd166', 1.4, 0.5, 0.07, type === 'build' ? 'smoke' : 'sparkle', 0);
        if (type === 'build') this.shake(0.2);
        break;
      }
      case 'sell':
        P.burst(data.x, data.y, 8, 'rgba(200,180,140,0.9)', 1.2, 0.6, 0.09, 'smoke', 0);
        break;
      default:
        break;
    }
  }

  /** Screen shake, 0..1. Disabled with reduced motion. */
  shake(amount) {
    if (this.reducedMotion) return;
    this._shake = Math.min(1, Math.max(this._shake, amount));
  }

  // ------------------------------------------------------------- caches
  _buildBackground(map) {
    const bg = document.createElement('canvas');
    bg.width = this.canvas.width;
    bg.height = this.canvas.height;
    const ctx = bg.getContext('2d');
    ctx.setTransform(...this._worldTransform());
    Terrain.paint(ctx, { cols: this.cols, rows: this.rows, map, theme: this.theme, pal: this.palette, id: this.level.id, up: this.up });
    this._bg = bg;
  }

  _buildVignette() {
    const v = document.createElement('canvas');
    v.width = this.canvas.width;
    v.height = this.canvas.height;
    const ctx = v.getContext('2d');
    const w = v.width;
    const h = v.height;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.58);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, this.palette.vignette);
    ctx.fillStyle = this.palette.fog;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    this._vignette = v;
  }

  /** Soft radial sprite of a given colour, cached (no gradient allocation per frame). */
  _glow(color) {
    let c = this._sprites.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${color},1)`);
    grad.addColorStop(0.4, `rgba(${color},0.45)`);
    grad.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    this._sprites.set(color, c);
    return c;
  }

  // ------------------------------------------------------------- frame
  /**
   * @param {import('../Game.js').Game} game
   * @param {{selectedCell?:{col:number,row:number}|null, selectedTower?:any, previewType?:any, hoverCell?:any, upgradePreview?:boolean, placing?:boolean}} ui
   */
  render(game, ui = {}) {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const dt = this._lastNow ? Math.min(0.1, (now - this._lastNow) / 1000) : 0;
    this._lastNow = now;
    const live = !game.paused && !game.isOver;
    if (live || game.isOver) this.clock += dt;

    const ctx = this.ctx;
    if (!this._bg) this._buildBackground(game.map);
    if (!this._vignette) this._buildVignette();

    // Shake offset (device pixels).
    let ox = 0;
    let oy = 0;
    if (this._shake > 0) {
      const a = this._shake * this._shake * this.scale * 0.12;
      ox = (Math.random() - 0.5) * a;
      oy = (Math.random() - 0.5) * a;
      this._shake = Math.max(0, this._shake - dt * 2.5);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.palette.ground;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this._bg, ox, oy);
    ctx.setTransform(...this._worldTransform(ox, oy));

    if (live) {
      this.particles.update(dt);
      this._ambient(dt);
    }

    this._drawAnimatedTerrain(game);
    if (game.state === 'building' && !game.isOver) this._drawRoadTelegraph(game);
    this._drawCells(game, ui);
    this._drawRanges(game, ui);
    this._drawUnits(game, ui);
    this._drawProjectiles(game);
    this._drawEffects(game.effects);
    this.particles.draw(ctx);
    if (this.isNight) this._drawLighting(game, ox, oy);
    this._drawBars(game);
    this._drawTexts(game.effects);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this._vignette, 0, 0);
    this._drawPowerOverlay(game);
    if (this._leak > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const w = this.canvas.width;
      const h = this.canvas.height;
      ctx.globalAlpha = this._leak * 0.5;
      ctx.strokeStyle = '#e5484d';
      ctx.lineWidth = this.scale * 0.5;
      ctx.strokeRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      this._leak = Math.max(0, this._leak - dt * 2);
    }
  }

  // ------------------------------------------------------------- terrain life
  /** Spawns ambient motes so the biome feels alive (fewer with reduced motion). */
  _ambient(dt) {
    const key = this.theme.ambient[this.isNight ? 'night' : 'day'];
    const a = AMBIENT[key];
    if (!a) return;
    const target = this.reducedMotion ? 6 : Math.round(this.cols * this.rows * 0.12);
    this._ambientTimer -= dt;
    if (this._ambientTimer > 0 || this.particles.countKind(a.kind) >= target) return;
    this._ambientTimer = 0.12;
    const up = this._upVec;
    const right = this._rightVec;
    const vx = right.x * a.drift[0] - up.x * a.drift[1];
    const vy = right.y * a.drift[0] - up.y * a.drift[1];
    const jitter = () => (Math.random() - 0.5) * 0.12;
    this.particles.spawn(a.kind, Math.random() * this.cols, Math.random() * this.rows, vx + jitter(), vy + jitter(), a.life * (0.6 + Math.random() * 0.6), a.size * (0.7 + Math.random() * 0.6), a.color);
  }

  /** Parts of the terrain that move: water shimmer, lava glow, torches at the gate. */
  _drawAnimatedTerrain(game) {
    const ctx = this.ctx;
    const decor = this.theme.decor;
    if (decor === 'pond' || decor === 'lava') {
      for (const key of game.map.rockCells) {
        const [c, r] = key.split(',').map(Number);
        const p = 0.5 + 0.5 * Math.sin(this.clock * (decor === 'lava' ? 3 : 1.6) + c * 1.7 + r);
        if (decor === 'pond') {
          ctx.strokeStyle = `rgba(255,255,255,${0.15 + 0.25 * p})`;
          ctx.lineWidth = 0.02;
          ctx.beginPath();
          ctx.ellipse(c + 0.45, r + 0.5, 0.1 + 0.12 * p, 0.04 + 0.05 * p, 0, 0, TAU);
          ctx.stroke();
        } else {
          ctx.globalAlpha = 0.25 + 0.35 * p;
          ctx.drawImage(this._glow('255,110,40'), c + 0.05, r + 0.05, 0.9, 0.9);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  /** Before a wave: chevrons flow along the road towards the gate (where enemies will go). */
  _drawRoadTelegraph(game) {
    if (this.reducedMotion) return;
    const ctx = this.ctx;
    const path = game.map.path;
    const gap = 1.1;
    const offset = (this.clock * 1.4) % gap;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.06;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let d = offset; d < path.length; d += gap) {
      const p = path.pointAt(d);
      if (p.x < 0 || p.y < 0 || p.x > this.cols || p.y > this.rows) continue;
      const fade = Math.min(1, d / 2, (path.length - d) / 2);
      ctx.globalAlpha = 0.6 * fade;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.moveTo(-0.08, -0.14);
      ctx.lineTo(0.06, 0);
      ctx.lineTo(-0.08, 0.14);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------- selection & placement
  _drawCells(game, ui) {
    const ctx = this.ctx;
    const map = game.map;
    // Placement mode: every buildable tile lights up, the hovered one shows a ghost tower.
    if (ui.placing) {
      const pulse = 0.07 + 0.04 * Math.sin(this.clock * 4);
      ctx.fillStyle = `rgba(255,255,255,${pulse})`;
      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          if (map.isBuildable(c, r)) ctx.fillRect(c + 0.06, r + 0.06, 0.88, 0.88);
        }
      }
    }
    const hc = ui.hoverCell;
    if (hc && map.inBounds(hc.col, hc.row) && (!ui.selectedCell || hc.col !== ui.selectedCell.col || hc.row !== ui.selectedCell.row)) {
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      this._roundRect(hc.col + 0.04, hc.row + 0.04, 0.92, 0.92, 0.14);
      ctx.fill();
      if (ui.placing && ui.previewType && map.isBuildable(hc.col, hc.row)) this._ghost(ui.previewType, hc.col, hc.row);
    }
    const sc = ui.selectedCell;
    if (sc) {
      const ok = map.isBuildable(sc.col, sc.row) || !!map.towerAt(sc.col, sc.row);
      ctx.strokeStyle = ok ? '#ffd166' : '#e5484d';
      ctx.lineWidth = 0.06;
      ctx.setLineDash([0.16, 0.1]);
      ctx.lineDashOffset = -this.clock * 0.6;
      this._roundRect(sc.col + 0.05, sc.row + 0.05, 0.9, 0.9, 0.16);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ok ? 'rgba(255,209,102,0.16)' : 'rgba(229,72,77,0.18)';
      ctx.fill();
    }
  }

  _ghost(T, col, row) {
    const ctx = this.ctx;
    ctx.globalAlpha = 0.55;
    ctx.save();
    ctx.translate(col + 0.5, row + 0.5);
    ctx.rotate(this.up);
    Sprites.tower(ctx, { type: T.type, level: 1, recoil: 0, id: 0 }, -Math.PI / 2 - this.up, this.clock);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawRanges(game, ui) {
    const ctx = this.ctx;
    const circle = (x, y, r, color, dashed) => {
      ctx.fillStyle = color + '1f';
      ctx.strokeStyle = color + 'cc';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      if (dashed) {
        ctx.setLineDash([0.22, 0.14]);
        ctx.lineDashOffset = -this.clock * 0.5;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    if (ui.selectedTower) {
      const t = ui.selectedTower;
      circle(t.x, t.y, t.range, t.constructor.color, true);
      if (ui.upgradePreview && t.canUpgrade) {
        ctx.setLineDash([0.1, 0.1]);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.constructor.levels[t.level].range, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (ui.previewType) {
      const c = ui.selectedCell && game.map.isBuildable(ui.selectedCell.col, ui.selectedCell.row) ? ui.selectedCell : ui.hoverCell;
      if (c && game.map.isBuildable(c.col, c.row)) circle(c.col + 0.5, c.row + 0.5, ui.previewType.levels[0].range, ui.previewType.color, true);
    }
  }

  // ------------------------------------------------------------- units
  _drawUnits(game) {
    const ctx = this.ctx;
    const list = this._drawList;
    list.length = 0;
    for (const t of game.towers) list.push(t);
    for (const e of game.enemies) list.push(e);
    // Depth sort by screen y so lower things overlap upper ones.
    const rot = this.rotated;
    list.sort((a, b) => (rot ? a.x - b.x : a.y - b.y));
    const frozen = game.powers.modifier('enemySpeed') === 0;
    const still = this.reducedMotion || frozen || game.paused;
    const up = this.up;
    for (const u of list) {
      ctx.save();
      ctx.translate(u.x, u.y);
      ctx.rotate(up);
      if (u.cooldown !== undefined) {
        Sprites.tower(ctx, u, u.angle - up, this.reducedMotion ? 0 : this.clock);
      } else {
        // Healer pulse ring, in world space around the unit.
        if (u.type === 'healer' && u.pulse > 0) {
          ctx.strokeStyle = `rgba(80,220,140,${u.pulse * 2})`;
          ctx.lineWidth = 0.05;
          ctx.beginPath();
          ctx.arc(0, 0, 1.6 * (1 - u.pulse / 0.4) + 0.2, 0, TAU);
          ctx.stroke();
        }
        const sx = rot ? -Math.sin(u.angle) : Math.cos(u.angle);
        if (Math.abs(sx) > 0.3) u._facing = sx > 0 ? 1 : -1;
        Sprites.enemy(ctx, u, { time: this.clock, facing: u._facing || 1, frozen, still });
      }
      ctx.restore();
    }
  }

  /** Health bars, in screen space so they stay horizontal on a rotated board. */
  _drawBars(game) {
    const ctx = this.ctx;
    const s = this.scale;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const e of game.enemies) {
      if (e.hp >= e.maxHp) continue;
      const boss = e.type === 'boss';
      const w = Math.max(0.5, e.radius * 2.2) * s;
      const hgt = (boss ? 0.12 : 0.085) * s;
      const c = this.toScreen(e.x, e.y);
      const top = c.y - (e.radius * 1.7 + 0.18) * s;
      ctx.fillStyle = 'rgba(20,12,10,0.75)';
      ctx.fillRect(c.x - w / 2 - 1, top - 1, w + 2, hgt + 2);
      const ratio = e.hpRatio;
      ctx.fillStyle = ratio > 0.5 ? '#46c46f' : ratio > 0.25 ? '#f5a524' : '#e5484d';
      ctx.fillRect(c.x - w / 2, top, w * ratio, hgt);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(c.x - w / 2, top, w * ratio, hgt * 0.35);
    }
    ctx.restore();
  }

  _drawProjectiles(game) {
    const ctx = this.ctx;
    const up = this._upVec;
    for (const p of game.projectiles) {
      const h = Sprites.projectile(ctx, p);
      if (p.kind === 'cannon') {
        const x = p.x + up.x * h;
        const y = p.y + up.y * h;
        ctx.fillStyle = '#2b2b2b';
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(x - p.size * 0.3, y - p.size * 0.3, p.size * 0.35, 0, TAU);
        ctx.fill();
      }
    }
  }

  _drawEffects(list) {
    const ctx = this.ctx;
    for (const fx of list) {
      const t = fx.t;
      if (fx.kind === 'ring') {
        ctx.globalAlpha = Math.max(0, 1 - t) * 0.9;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 0.12 * (1 - t) + 0.01;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.radius * (0.3 + 0.7 * Math.sqrt(t)), 0, TAU);
        ctx.stroke();
      } else if (fx.kind === 'beam') {
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.lineCap = 'round';
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha *= 0.35;
        ctx.lineWidth = 0.3 * (1 - t) + 0.04;
        this._beam(fx);
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.lineWidth = 0.12 * (1 - t) + 0.02;
        this._beam(fx);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.035;
        this._beam(fx);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Laser beam stroke: it leaves the obelisk's gem, above the tower on screen. */
  _beam(fx) {
    const ctx = this.ctx;
    const up = this._upVec;
    ctx.beginPath();
    ctx.moveTo(fx.x + up.x * 0.62, fx.y + up.y * 0.62);
    ctx.lineTo(fx.x2, fx.y2);
    ctx.stroke();
  }

  /** Floating numbers with an outline, popping in then rising. */
  _drawTexts(list) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const fx of list) {
      if (fx.kind !== 'text') continue;
      const t = fx.t;
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : 1.1 - Math.min(0.1, (t - 0.15) * 0.3);
      const size = Math.round(0.36 * this.scale * pop);
      ctx.globalAlpha = Math.max(0, Math.min(1, (1 - t) * 2.5));
      ctx.font = `800 ${size}px system-ui, sans-serif`;
      const p = this.toScreen(fx.x, fx.y);
      ctx.lineWidth = Math.max(2, size * 0.18);
      ctx.strokeStyle = 'rgba(40,20,0,0.85)';
      ctx.strokeText(fx.text, p.x, p.y);
      ctx.fillStyle = fx.color;
      ctx.fillText(fx.text, p.x, p.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------- lighting
  /** Night: darkness layer with holes punched by lights, then coloured glows added on top. */
  _drawLighting(game, ox, oy) {
    if (!this._light) {
      this._light = document.createElement('canvas');
      this._light.width = this.canvas.width;
      this._light.height = this.canvas.height;
    }
    const L = this._light.getContext('2d');
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.globalCompositeOperation = 'source-over';
    L.clearRect(0, 0, this._light.width, this._light.height);
    L.fillStyle = 'rgba(6,10,28,0.34)';
    L.fillRect(0, 0, this._light.width, this._light.height);
    L.globalCompositeOperation = 'destination-out';
    L.setTransform(...this._worldTransform(ox, oy));
    const hole = this._glow('255,255,255');
    const punch = (x, y, r, a = 1) => {
      L.globalAlpha = a;
      L.drawImage(hole, x - r, y - r, r * 2, r * 2);
    };
    const up = this._upVec;
    const flick = this.reducedMotion ? 1 : 0.9 + 0.1 * Math.sin(this.clock * 13);
    for (const t of game.towers) punch(t.x + up.x * 0.3, t.y + up.y * 0.3, 1.3 + t.level * 0.15, 0.9);
    for (const p of game.projectiles) punch(p.x, p.y, 0.7, 0.8);
    for (const fx of game.effects) if (fx.kind !== 'text') punch(fx.x, fx.y, fx.radius * 1.6 + 0.5, 1 - fx.t);
    const pts = game.map.path.points;
    const end = pts[pts.length - 1];
    const ex = Math.min(this.cols - 0.35, Math.max(0.35, end.x));
    const ey = Math.min(this.rows - 0.35, Math.max(0.35, end.y));
    punch(ex, ey, 1.8 * flick);
    if (this.theme.decor === 'lava' || this.theme.decor === 'crystal') {
      for (const key of game.map.rockCells) {
        const [c, r] = key.split(',').map(Number);
        punch(c + 0.5, r + 0.5, 1.1, 0.8);
      }
    }
    L.globalAlpha = 1;
    L.globalCompositeOperation = 'source-over';

    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this._light, 0, 0);
    ctx.restore();

    // Coloured glows (additive).
    ctx.globalCompositeOperation = 'lighter';
    for (const t of game.towers) {
      const k = TOWER_LOOK[t.type];
      const h = t.type === 'laser' ? 0.62 : t.type === 'frost' ? 0.52 : 0.3;
      ctx.globalAlpha = 0.28 * flick;
      const r = 0.55;
      ctx.drawImage(this._glow(k.light), t.x + up.x * h - r, t.y + up.y * h - r, r * 2, r * 2);
    }
    for (const p of game.projectiles) {
      const col = p.kind === 'frost' ? '120,220,255' : p.kind === 'cannon' ? '255,170,90' : '255,230,170';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this._glow(col), p.x - 0.25, p.y - 0.25, 0.5, 0.5);
    }
    ctx.globalAlpha = 0.45 * flick;
    ctx.drawImage(this._glow('255,180,90'), ex - 0.9, ey - 0.9, 1.8, 1.8);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  _drawPowerOverlay(game) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (game.powers.modifier('enemySpeed') === 0) {
      ctx.fillStyle = 'rgba(140,210,255,0.16)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(230,248,255,0.8)';
      ctx.lineWidth = this.scale * 0.12;
      ctx.strokeRect(0, 0, w, h);
    }
    const meteor = game.powers.get('meteor');
    if (meteor && meteor.isActive && !this.reducedMotion) {
      ctx.fillStyle = `rgba(255,120,40,${0.07 + 0.05 * Math.sin(this.clock * 20)})`;
      ctx.fillRect(0, 0, w, h);
    }
    const oc = game.powers.get('overclock');
    if (oc && oc.isActive) {
      ctx.strokeStyle = `rgba(255,209,102,${0.55 + 0.25 * Math.sin(this.clock * 10)})`;
      ctx.lineWidth = this.scale * 0.1;
      ctx.strokeRect(0, 0, w, h);
    }
    const gold = game.powers.get('goldRush');
    if (gold && gold.isActive) {
      ctx.fillStyle = 'rgba(255,209,102,0.08)';
      ctx.fillRect(0, 0, w, h);
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
