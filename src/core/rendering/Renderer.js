/**
 * @file Canvas 2D renderer of the board. Pure presentation: never changes the game state.
 */

import { TAU } from '../utils/math.js';
import { PLAYER_COLORS } from '../Game.js';

/** Board colours per landscape and colour scheme. */
const PALETTES = {
  meadow: {
    light: { ground: '#bfe3a5', groundAlt: '#b4dc98', road: '#ead7ac', roadEdge: '#c9ad78', rock: '#8f9a8a', water: '#8cc8e8', tree: '#4f8a3c' },
    dark: { ground: '#1f3a24', groundAlt: '#1c3521', road: '#4a412f', roadEdge: '#5e5138', rock: '#56615a', water: '#1d4a66', tree: '#2c5a2a' },
  },
  swamp: {
    light: { ground: '#a8c99a', groundAlt: '#9ebf90', road: '#cdbf95', roadEdge: '#a3925f', rock: '#6f7f6a', water: '#7aa39a', tree: '#4c6e3b' },
    dark: { ground: '#1d2f22', groundAlt: '#1a2a1f', road: '#423b2a', roadEdge: '#574c34', rock: '#465448', water: '#1c3d3a', tree: '#2a4528' },
  },
  desert: {
    light: { ground: '#f0d4a0', groundAlt: '#e9ca90', road: '#fbeacc', roadEdge: '#d6ae78', rock: '#b07e52', water: '#7cc4d8', tree: '#7a9a3a' },
    dark: { ground: '#3b2c1d', groundAlt: '#36281a', road: '#5c4730', roadEdge: '#6f5538', rock: '#7a5a3f', water: '#1f4a5a', tree: '#4a5a22' },
  },
  mountain: {
    light: { ground: '#c9cfbd', groundAlt: '#bec5b1', road: '#e6dfcc', roadEdge: '#b3a684', rock: '#7d8590', water: '#8cbcd8', tree: '#4f7a4a' },
    dark: { ground: '#262b26', groundAlt: '#222722', road: '#45413a', roadEdge: '#5a5448', rock: '#5a616b', water: '#1f3f55', tree: '#2c4a2b' },
  },
  winter: {
    light: { ground: '#e8f0f5', groundAlt: '#dde8ef', road: '#cfd6dc', roadEdge: '#a9b4be', rock: '#8a99a8', water: '#bfe1f2', tree: '#3f6b5a' },
    dark: { ground: '#20283a', groundAlt: '#1d2535', road: '#3b4252', roadEdge: '#4c5568', rock: '#58627a', water: '#2a4a66', tree: '#264a42' },
  },
  forest: {
    light: { ground: '#98c08a', groundAlt: '#8db680', road: '#d6c49a', roadEdge: '#a8915f', rock: '#6a7a62', water: '#7fb0a8', tree: '#2f5e2c' },
    dark: { ground: '#152619', groundAlt: '#132216', road: '#3b3424', roadEdge: '#4f4530', rock: '#3e4a40', water: '#173a36', tree: '#1c3a1c' },
  },
  storm: {
    light: { ground: '#a9b8a8', groundAlt: '#9fae9e', road: '#d2cbb8', roadEdge: '#9e957c', rock: '#6f7480', water: '#8aa3b8', tree: '#45604a' },
    dark: { ground: '#1b2024', groundAlt: '#181c20', road: '#3a3833', roadEdge: '#4e4a42', rock: '#4a4f5a', water: '#1d3040', tree: '#22352a' },
  },
  ashlands: {
    light: { ground: '#d8b3a3', groundAlt: '#cfa797', road: '#6b5753', roadEdge: '#4a3b38', rock: '#7d4b41', water: '#e38b4a', tree: '#5a3a30' },
    dark: { ground: '#2e1714', groundAlt: '#291412', road: '#4b3330', roadEdge: '#663f37', rock: '#6a2f26', water: '#8a3a1a', tree: '#3a2420' },
  },
  ramparts: {
    light: { ground: '#c9ced6', groundAlt: '#bec4cd', road: '#e8e3d6', roadEdge: '#b8ae97', rock: '#7c8594', water: '#86b3d4', tree: '#55745a' },
    dark: { ground: '#222730', groundAlt: '#1e222a', road: '#3c3b37', roadEdge: '#514f48', rock: '#4b5261', water: '#1f3a55', tree: '#2a3f30' },
  },
  capital: {
    light: { ground: '#d9cfe9', groundAlt: '#cfc3e2', road: '#efe6d2', roadEdge: '#c5b38e', rock: '#8a7aa8', water: '#88aee0', tree: '#4f6e4a' },
    dark: { ground: '#1e1733', groundAlt: '#1a142d', road: '#3c3550', roadEdge: '#524871', rock: '#4c3f72', water: '#203a66', tree: '#263f2e' },
  },
};

/**
 * Draws in tile units (1 unit = 1 tile) by scaling the context, and caches the
 * static background. On tall screens the whole board can be rotated by 90°.
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
    this.showAirLanes = level.enemyTypes ? level.enemyTypes.some((t) => t === 'crow' || t === 'wyvern') : false;
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
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const normal = Math.min(maxWidth / this.cols, maxHeight / this.rows);
    const rotated = Math.min(maxWidth / this.rows, maxHeight / this.cols);
    this.rotated = allowRotate && rotated > normal * 1.15;
    const tile = Math.max(10, Math.floor(this.rotated ? rotated : normal));
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

  /** Pointer position → world coordinates (tiles). */
  worldFromEvent(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const u = (evt.clientX - rect.left) / rect.width;
    const v = (evt.clientY - rect.top) / rect.height;
    return this.rotated ? { x: v * this.cols, y: (1 - u) * this.rows } : { x: u * this.cols, y: v * this.rows };
  }

  /** Pointer position → grid cell. */
  cellFromEvent(evt) {
    const p = this.worldFromEvent(evt);
    return { col: Math.floor(p.x), row: Math.floor(p.y) };
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
        ctx.fillStyle = (r + c) % 2 ? pal.groundAlt : pal.ground;
        ctx.fillRect(c, r, 1.02, 1.02);
      }
    }

    // Water.
    for (const key of map.waterCells) {
      const [c, r] = key.split(',').map(Number);
      ctx.fillStyle = pal.water;
      ctx.fillRect(c, r, 1.02, 1.02);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.moveTo(c + 0.2, r + 0.4);
      ctx.quadraticCurveTo(c + 0.35, r + 0.3, c + 0.5, r + 0.4);
      ctx.moveTo(c + 0.45, r + 0.7);
      ctx.quadraticCurveTo(c + 0.6, r + 0.6, c + 0.75, r + 0.7);
      ctx.stroke();
    }

    // Roads: thick rounded poly-lines, edge then fill.
    const road = (pts, width, color, dash) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.restore();
    };
    for (const p of map.paths) road(p.points, 0.92, pal.roadEdge);
    for (const p of map.paths) road(p.points, 0.76, pal.road);
    for (const p of map.paths) road(p.points, 0.04, pal.roadEdge, [0.12, 0.28]);

    // Flight lanes (only when flyers come): faint dotted lines.
    if (this.showAirLanes) {
      for (const p of map.airPaths) road(p.points, 0.05, 'rgba(60,70,90,0.35)', [0.05, 0.2]);
    }

    // Rocks (trees in forests).
    const forest = this.level.theme === 'forest' || this.level.theme === 'swamp';
    for (const key of map.rockCells) {
      const [c, r] = key.split(',').map(Number);
      if (forest) this._tree(ctx, c, r, pal);
      else this._rock(ctx, c, r, pal);
    }

    // Entrances and exits.
    for (const p of map.paths) {
      const pts = p.points;
      this._gate(ctx, pts[0], pts[1], '#3f8a4a', false);
      this._gate(ctx, pts[pts.length - 1], pts[pts.length - 2], '#d9534f', true);
    }
    this._bg = bg;
  }

  _rock(ctx, c, r, pal) {
    ctx.fillStyle = pal.rock;
    ctx.beginPath();
    ctx.ellipse(c + 0.5, r + 0.58, 0.34, 0.26, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(c + 0.42, r + 0.48, 0.14, 0.08, -0.4, 0, TAU);
    ctx.fill();
  }

  _tree(ctx, c, r, pal) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(c + 0.5, r + 0.78, 0.3, 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(c + 0.45, r + 0.55, 0.1, 0.25);
    ctx.fillStyle = pal.tree;
    ctx.beginPath();
    ctx.moveTo(c + 0.5, r + 0.1);
    ctx.lineTo(c + 0.82, r + 0.62);
    ctx.lineTo(c + 0.18, r + 0.62);
    ctx.closePath();
    ctx.fill();
  }

  _gate(ctx, end, prev, color, exit) {
    const ex = Math.min(this.cols - 0.45, Math.max(0.45, end.x));
    const ey = Math.min(this.rows - 0.45, Math.max(0.45, end.y));
    const ang = exit ? Math.atan2(end.y - prev.y, end.x - prev.x) : Math.atan2(prev.y - end.y, prev.x - end.x);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ex, ey, 0.3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    ctx.moveTo(ex - ca * 0.14 - sa * 0.11, ey - sa * 0.14 + ca * 0.11);
    ctx.lineTo(ex + ca * 0.14, ey + sa * 0.14);
    ctx.lineTo(ex - ca * 0.14 + sa * 0.11, ey - sa * 0.14 - ca * 0.11);
    ctx.stroke();
  }

  // ------------------------------------------------------------- frame
  /**
   * @param {import('../Game.js').Game} game
   * @param {object} [ui]
   * @param {{col:number,row:number}|null} [ui.selectedCell]
   * @param {object|null} [ui.selectedTower]
   * @param {object|null} [ui.previewType] tower class to preview on the selected cell
   * @param {{col:number,row:number}|null} [ui.hoverCell]
   * @param {boolean} [ui.upgradePreview]
   * @param {{x:number,y:number,radius:number}|null} [ui.aim] targeted power being aimed
   * @param {Array<{col:number,row:number,player:number}>} [ui.cursors] keyboard cursors (two players)
   * @param {boolean} [ui.coop] draw tower owners
   */
  render(game, ui = {}) {
    const ctx = this.ctx;
    if (!this._bg) this._buildBackground(game.map);
    let ox = 0;
    let oy = 0;
    if (game.shakeTimer > 0 && !this.reducedMotion) {
      ox = (Math.random() - 0.5) * this.scale * 0.15;
      oy = (Math.random() - 0.5) * this.scale * 0.15;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this._bg, ox, oy);
    ctx.setTransform(...this._worldTransform(ox, oy));

    this._drawZones(game.zones);
    this._drawCells(game, ui);
    for (const t of game.towers) this._drawTower(t, t === ui.selectedTower, ui.coop);
    for (const s of game.soldiers) if (s.alive) this._drawSoldier(s);
    for (const e of game.enemies) if (!e.flying) this._drawEnemy(e, game);
    this._drawProjectiles(game.projectiles);
    for (const e of game.enemies) if (e.flying) this._drawEnemy(e, game);
    this._drawEffects(game.effects);
    this._drawRanges(game, ui);
    this._drawCursors(ui.cursors || []);
    this._drawPowerOverlay(game);
    if (ui.aim) this._drawAim(ui.aim);
  }

  _drawCells(game, ui) {
    const ctx = this.ctx;
    const hc = ui.hoverCell;
    if (hc && game.map.inBounds(hc.col, hc.row) && (!ui.selectedCell || hc.col !== ui.selectedCell.col || hc.row !== ui.selectedCell.row)) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(hc.col, hc.row, 1, 1);
    }
    const sc = ui.selectedCell;
    if (sc && !ui.selectedTower) {
      const ok = game.map.isBuildable(sc.col, sc.row);
      ctx.strokeStyle = ok ? '#30a46c' : '#e5484d';
      ctx.lineWidth = 0.07;
      ctx.strokeRect(sc.col + 0.06, sc.row + 0.06, 0.88, 0.88);
      ctx.fillStyle = ok ? 'rgba(48,164,108,0.22)' : 'rgba(229,72,77,0.18)';
      ctx.fillRect(sc.col + 0.06, sc.row + 0.06, 0.88, 0.88);
    }
  }

  _circle(x, y, r, color, alpha = '22') {
    const ctx = this.ctx;
    ctx.fillStyle = color + alpha;
    ctx.strokeStyle = color + 'aa';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  _drawRanges(game, ui) {
    const ctx = this.ctx;
    if (ui.selectedTower) {
      const t = ui.selectedTower;
      if (t.range > 0) this._circle(t.x, t.y, t.range, t.constructor.color);
      if (t.minRange) {
        ctx.strokeStyle = 'rgba(229,72,77,0.6)';
        ctx.setLineDash([0.08, 0.08]);
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.minRange, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (ui.upgradePreview && t.canUpgrade) {
        const next = t.level >= t.baseLevels ? t.constructor.elite : t.constructor.levels[t.level];
        if (next.range) {
          ctx.setLineDash([0.1, 0.1]);
          ctx.strokeStyle = '#ffd166';
          ctx.lineWidth = 0.04;
          ctx.beginPath();
          ctx.arc(t.x, t.y, next.range * (1 + t.rangeBuff), 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      if (t.rally) {
        ctx.fillStyle = t.constructor.color;
        ctx.fillRect(t.rally.x - 0.02, t.rally.y - 0.45, 0.04, 0.4);
        ctx.beginPath();
        ctx.moveTo(t.rally.x + 0.02, t.rally.y - 0.45);
        ctx.lineTo(t.rally.x + 0.25, t.rally.y - 0.37);
        ctx.lineTo(t.rally.x + 0.02, t.rally.y - 0.29);
        ctx.fill();
      }
    } else if (ui.selectedCell && ui.previewType && game.map.isBuildable(ui.selectedCell.col, ui.selectedCell.row)) {
      const T = ui.previewType;
      const r = T.levels[0].range || 0;
      if (r) this._circle(ui.selectedCell.col + 0.5, ui.selectedCell.row + 0.5, r, T.color);
    }
  }

  _drawCursors(cursors) {
    const ctx = this.ctx;
    for (const c of cursors) {
      const color = PLAYER_COLORS[c.player - 1];
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.08;
      const pad = 0.04;
      // Corners only, so the cell stays readable.
      const x0 = c.col + pad;
      const y0 = c.row + pad;
      const x1 = c.col + 1 - pad;
      const y1 = c.row + 1 - pad;
      const k = 0.25;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + k);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x0 + k, y0);
      ctx.moveTo(x1 - k, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1, y0 + k);
      ctx.moveTo(x1, y1 - k);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 - k, y1);
      ctx.moveTo(x0 + k, y1);
      ctx.lineTo(x0, y1);
      ctx.lineTo(x0, y1 - k);
      ctx.stroke();
      this._playerMark(c.col + 0.85, c.row + 0.15, c.player, 0.1);
    }
  }

  /** Player marker: P1 round, P2 square (readable without colours). */
  _playerMark(x, y, player, r) {
    const ctx = this.ctx;
    ctx.fillStyle = PLAYER_COLORS[player - 1];
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    if (player === 1) ctx.arc(x, y, r, 0, TAU);
    else ctx.rect(x - r, y - r, r * 2, r * 2);
    ctx.fill();
    ctx.stroke();
  }

  _drawAim(aim) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([0.12, 0.08]);
    this._circle(aim.x, aim.y, aim.radius || 0.6, '#ffd166', '33');
    ctx.restore();
  }

  _drawZones(zones) {
    const ctx = this.ctx;
    for (const z of zones) {
      const a = Math.min(1, z.ttl / 1.5);
      const grad = ctx.createRadialGradient(z.x, z.y, 0.05, z.x, z.y, z.radius);
      grad.addColorStop(0, `rgba(255,170,60,${0.55 * a})`);
      grad.addColorStop(1, `rgba(255,90,20,${0.1 * a})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, TAU);
      ctx.fill();
    }
  }

  // ------------------------------------------------------------- towers
  _drawTower(t, selected, coop) {
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
    } else if (coop) {
      ctx.strokeStyle = PLAYER_COLORS[t.owner - 1];
      ctx.lineWidth = 0.06;
      ctx.stroke();
    } else if (this.mode === 'dark') {
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 0.035;
      ctx.stroke();
    }

    // Level pips (a star for the mastery).
    if (t.isElite) {
      this._star(x, y + 0.29, 0.1, '#ffd166');
    } else {
      for (let i = 0; i < t.level; i++) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(x - 0.2 + i * 0.2, y + 0.3, 0.05, 0, TAU);
        ctx.fill();
      }
    }

    const kick = t.recoil * 0.06;
    switch (t.type) {
      case 'barracks':
        this._barracks(x, y, color);
        break;
      case 'watch':
        this._watch(x, y, color, t);
        break;
      case 'treasury':
        this._treasury(x, y, color);
        break;
      case 'storm':
        this._stormTower(x, y, color, t);
        break;
      default:
        this._turret(t, x, y, color, kick);
    }
    if (coop) this._playerMark(x + 0.3, y - 0.3, t.owner, 0.08);
  }

  _turret(t, x, y, color, kick) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y - 0.04);
    ctx.rotate(t.angle);
    ctx.fillStyle = color;
    switch (t.type) {
      case 'cannon':
        ctx.fillRect(0.05 - kick, -0.1, 0.36, 0.2);
        break;
      case 'ballista':
        ctx.fillRect(0.05 - kick, -0.04, 0.42, 0.08);
        ctx.fillRect(0.12, -0.24, 0.05, 0.48);
        break;
      case 'frost':
        ctx.fillRect(0.05 - kick, -0.07, 0.28, 0.14);
        break;
      case 'catapult':
        ctx.fillStyle = '#6b4a2b';
        ctx.fillRect(-0.05, -0.04, 0.4 - kick * 2, 0.08);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0.36 - kick * 2, 0, 0.09, 0, TAU);
        ctx.fill();
        break;
      case 'fire':
        ctx.fillRect(0.05 - kick, -0.08, 0.26, 0.16);
        break;
      default:
        ctx.fillRect(0.05 - kick, -0.05, 0.32, 0.1);
    }
    ctx.restore();

    ctx.fillStyle = color;
    ctx.beginPath();
    if (t.type === 'frost') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.lineTo(x + Math.cos(a) * 0.23, y - 0.04 + Math.sin(a) * 0.23);
      }
      ctx.closePath();
    } else if (t.type === 'ballista') {
      ctx.moveTo(x, y - 0.3);
      ctx.lineTo(x + 0.24, y - 0.04);
      ctx.lineTo(x, y + 0.22);
      ctx.lineTo(x - 0.24, y - 0.04);
      ctx.closePath();
    } else if (t.type === 'catapult') {
      ctx.rect(x - 0.22, y - 0.2, 0.44, 0.34);
    } else if (t.type === 'fire') {
      ctx.moveTo(x, y - 0.3);
      ctx.quadraticCurveTo(x + 0.28, y - 0.05, x + 0.15, y + 0.18);
      ctx.lineTo(x - 0.15, y + 0.18);
      ctx.quadraticCurveTo(x - 0.28, y - 0.05, x, y - 0.3);
    } else {
      ctx.arc(x, y - 0.04, t.type === 'cannon' ? 0.25 : 0.2, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(x - 0.06, y - 0.1, 0.06, 0, TAU);
    ctx.fill();
  }

  _barracks(x, y, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 0.28, y + 0.15);
    ctx.lineTo(x - 0.28, y - 0.1);
    ctx.lineTo(x, y - 0.32);
    ctx.lineTo(x + 0.28, y - 0.1);
    ctx.lineTo(x + 0.28, y + 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this._roundRect(x - 0.08, y - 0.04, 0.16, 0.19, 0.06);
    ctx.fill();
  }

  _watch(x, y, color, t) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(x - 0.12, y - 0.2, 0.24, 0.38);
    ctx.beginPath();
    ctx.moveTo(x - 0.22, y - 0.18);
    ctx.lineTo(x, y - 0.38);
    ctx.lineTo(x + 0.22, y - 0.18);
    ctx.closePath();
    ctx.fill();
    // Eye.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x, y - 0.03, 0.09, 0.055, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + Math.cos(t.angle) * 0.02, y - 0.03, 0.035, 0, TAU);
    ctx.fill();
  }

  _treasury(x, y, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    this._roundRect(x - 0.26, y - 0.18, 0.52, 0.34, 0.08);
    ctx.fill();
    ctx.fillStyle = '#8a6a10';
    ctx.fillRect(x - 0.26, y - 0.06, 0.52, 0.06);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(x, y - 0.03, 0.07, 0, TAU);
    ctx.fill();
  }

  _stormTower(x, y, color, t) {
    const ctx = this.ctx;
    ctx.fillStyle = '#6a6f80';
    ctx.fillRect(x - 0.05, y - 0.2, 0.1, 0.34);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y - 0.24, 0.15 + t.recoil * 0.04, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x - 0.04, y - 0.28, 0.05, 0, TAU);
    ctx.fill();
  }

  _star(x, y, r, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ------------------------------------------------------------- units
  _drawSoldier(s) {
    const ctx = this.ctx;
    const swing = s.swing > 0 && !this.reducedMotion ? Math.sin(s.swing * 14) * 0.06 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 0.15, 0.14, 0.05, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = s.kind === 'knight' ? '#c0c6d0' : s.kind === 'militia' ? '#c9a46a' : '#6b8e23';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 0.13, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#1d1d1d';
    ctx.lineWidth = 0.025;
    ctx.stroke();
    // Sword.
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(s.x + 0.1, s.y);
    ctx.lineTo(s.x + 0.24 + swing, s.y - 0.14);
    ctx.stroke();
    if (s.hp < s.maxHp) this._hpBar(s.x, s.y - 0.24, 0.3, s.hpRatio, '#6bd06b');
  }

  _drawEnemy(e, game) {
    const ctx = this.ctx;
    const frozen = game.enemySpeedModifier(e) === 0;
    const r = e.radius;
    const t = game.time;
    const bob = this.reducedMotion || frozen || e.isStunned ? 0 : Math.sin(t * 10 + e.id) * 0.025;
    const lift = e.flying ? 0.35 : 0;

    ctx.save();
    if (e.stealth && !e.revealed) ctx.globalAlpha = 0.22;

    // Shadow (far below flyers).
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + r * 0.75, r * 0.9, r * 0.35, 0, 0, TAU);
    ctx.fill();

    const x = e.x;
    const y = e.y - lift + bob;

    if (e.healPulse > 0) {
      ctx.strokeStyle = `rgba(48,164,108,${e.healPulse * 2})`;
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.arc(x, y, 1.6 * (1 - e.healPulse / 0.4) + 0.2, 0, TAU);
      ctx.stroke();
    }
    if (e.type === 'warlock') {
      ctx.strokeStyle = 'rgba(160,80,200,0.35)';
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, TAU);
      ctx.stroke();
    }

    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
    this._enemyShape(e, x, y, r, t);

    if (e.boss) this._star(x, y - r - 0.12, 0.12, '#ffd166');
    if (e.invulnerable) {
      ctx.strokeStyle = 'rgba(180,140,255,0.9)';
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      ctx.arc(x, y, r + 0.12, 0, TAU);
      ctx.stroke();
    }
    if (e.isSlowed || frozen) {
      ctx.strokeStyle = 'rgba(76,204,230,0.95)';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.arc(x, y, r + 0.04, 0, TAU);
      ctx.stroke();
    }
    if (e.burnTimer > 0 && !this.reducedMotion) {
      ctx.fillStyle = `rgba(255,${120 + Math.floor(Math.sin(t * 30) * 60)},40,0.85)`;
      ctx.beginPath();
      ctx.moveTo(x - 0.08, y - r * 0.3);
      ctx.quadraticCurveTo(x, y - r - 0.22, x + 0.08, y - r * 0.3);
      ctx.fill();
    }
    if (e.isStunned) {
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + (i * TAU) / 3;
        this._star(x + Math.cos(a) * r, y - r - 0.06 + Math.sin(a) * 0.05, 0.05, '#ffe066');
      }
    }
    ctx.restore();

    if (e.hp < e.maxHp && (!e.stealth || e.revealed)) {
      this._hpBar(x, y - r - (e.boss ? 0.3 : 0.2), Math.max(0.5, r * 2.2) * (e.boss ? 1.8 : 1), e.hpRatio);
    }
  }

  _enemyShape(e, x, y, r, t) {
    const ctx = this.ctx;
    const eyes = () => {
      const ex = Math.cos(e.angle) * r * 0.35;
      const ey = Math.sin(e.angle) * r * 0.35;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + ex - ey * 0.6, y + ey + ex * 0.6, r * 0.2, 0, TAU);
      ctx.arc(x + ex + ey * 0.6, y + ey - ex * 0.6, r * 0.2, 0, TAU);
      ctx.fill();
    };
    switch (e.type) {
      case 'runner':
      case 'wolf': {
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(e.angle) * r * 1.3, y + Math.sin(e.angle) * r * 1.3);
        ctx.lineTo(x + Math.cos(e.angle + 2.4) * r, y + Math.sin(e.angle + 2.4) * r);
        ctx.lineTo(x + Math.cos(e.angle - 2.4) * r, y + Math.sin(e.angle - 2.4) * r);
        ctx.closePath();
        ctx.fill();
        if (e.type === 'wolf') {
          ctx.fillStyle = '#ffdd55';
          ctx.beginPath();
          ctx.arc(x + Math.cos(e.angle) * r * 0.5, y + Math.sin(e.angle) * r * 0.5, 0.03, 0, TAU);
          ctx.fill();
        }
        return;
      }
      case 'knight':
      case 'golem':
      case 'shield': {
        this._roundRect(x - r, y - r, r * 2, r * 2, r * 0.4);
        ctx.fill();
        if (e.type === 'shield') {
          ctx.fillStyle = '#d9c38a';
          ctx.beginPath();
          ctx.arc(x + Math.cos(e.angle) * r * 0.6, y + Math.sin(e.angle) * r * 0.6, r * 0.55, 0, TAU);
          ctx.fill();
        } else if (e.type === 'knight') {
          ctx.fillStyle = '#e6e0ff';
          ctx.fillRect(x - r * 0.6, y - r * 0.15, r * 1.2, r * 0.18);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillRect(x - r * 0.5, y - r * 0.5, r * 0.35, r * 0.35);
        }
        return;
      }
      case 'crow':
      case 'wyvern': {
        const flap = this.reducedMotion ? 0.5 : (Math.sin(t * 14 + e.id) + 1) / 2;
        const span = r * (1.6 + flap * 0.6);
        ctx.beginPath();
        ctx.moveTo(x - span, y - r * 0.3 * flap);
        ctx.quadraticCurveTo(x, y + r * 0.5, x + span, y - r * 0.3 * flap);
        ctx.quadraticCurveTo(x, y - r * 0.2, x - span, y - r * 0.3 * flap);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, r * 0.55, 0, TAU);
        ctx.fill();
        return;
      }
      case 'ram':
      case 'siege': {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(e.angle);
        if (e.type === 'ram') {
          ctx.fillRect(-r, -r * 0.6, r * 2, r * 1.2);
          ctx.fillStyle = '#5a5a5a';
          ctx.fillRect(r * 0.6, -r * 0.25, r * 0.7, r * 0.5);
        } else {
          ctx.fillRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          for (let i = -1; i <= 1; i++) ctx.fillRect(-r * 0.9, i * r * 0.5 - 0.02, r * 1.8, 0.04);
        }
        ctx.restore();
        return;
      }
      case 'priest':
      case 'necromancer':
      case 'warlock': {
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.15);
        ctx.lineTo(x + r, y + r * 0.9);
        ctx.lineTo(x - r, y + r * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        if (e.type === 'priest') {
          ctx.fillRect(x - 0.03, y - r * 0.4, 0.06, r * 0.9);
          ctx.fillRect(x - r * 0.35, y - r * 0.1, r * 0.7, 0.06);
        } else {
          ctx.beginPath();
          ctx.arc(x, y - r * 0.1, r * 0.22, 0, TAU);
          ctx.fill();
        }
        return;
      }
      case 'skeleton': {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.22, 0, TAU);
        ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.22, 0, TAU);
        ctx.fill();
        return;
      }
      case 'mordrac': {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.moveTo(x - r * 0.7, y - r * 0.6);
        ctx.lineTo(x - r * 0.4, y - r * 1.2);
        ctx.lineTo(x, y - r * 0.8);
        ctx.lineTo(x + r * 0.4, y - r * 1.2);
        ctx.lineTo(x + r * 0.7, y - r * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff3b3b';
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.05, r * 0.12, 0, TAU);
        ctx.arc(x + r * 0.3, y - r * 0.05, r * 0.12, 0, TAU);
        ctx.fill();
        return;
      }
      default: {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        if (e.type === 'berserker' && e.enraged) {
          ctx.strokeStyle = '#ff2d2d';
          ctx.lineWidth = 0.05;
          ctx.stroke();
        }
        eyes();
      }
    }
  }

  /** Health bar, drawn in screen space so it stays horizontal on a rotated board. */
  _hpBar(x, y, width, ratio, color) {
    const ctx = this.ctx;
    const s = this.scale;
    const c = this.toScreen(x, y);
    const w = width * s;
    const h = Math.max(2, 0.09 * s);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(c.x - w / 2, c.y, w, h);
    ctx.fillStyle = color || (ratio > 0.5 ? '#30a46c' : ratio > 0.25 ? '#f5a524' : '#e5484d');
    ctx.fillRect(c.x - w / 2, c.y, w * ratio, h);
    ctx.restore();
  }

  _drawProjectiles(list) {
    const ctx = this.ctx;
    for (const p of list) {
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      switch (p.kind) {
        case 'arrow':
        case 'bolt': {
          const len = p.kind === 'bolt' ? 0.4 : 0.26;
          ctx.lineWidth = p.kind === 'bolt' ? 0.06 : 0.035;
          ctx.beginPath();
          ctx.moveTo(p.x - Math.cos(p.angle) * len, p.y - Math.sin(p.angle) * len);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          break;
        }
        case 'rock': {
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.8, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#7a6a58';
          ctx.beginPath();
          ctx.arc(p.x, p.y - p.height, p.size, 0, TAU);
          ctx.fill();
          break;
        }
        case 'fire': {
          ctx.fillStyle = '#ffb347';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#ff6a00';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.55, 0, TAU);
          ctx.fill();
          break;
        }
        default:
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
      }
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
          const a = (i / 6) * TAU + fx.seed;
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
      } else if (fx.kind === 'bolt') {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 0.07 * (1 - t) + 0.02;
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        const n = 5;
        for (let i = 1; i < n; i++) {
          const k = i / n;
          const jitter = Math.sin(fx.seed + i * 7.3) * 0.18;
          ctx.lineTo(fx.x + (fx.x2 - fx.x) * k + jitter, fx.y + (fx.y2 - fx.y) * k - jitter);
        }
        ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
      } else if (fx.kind === 'zone') {
        ctx.globalAlpha = Math.max(0, 0.35 * (1 - t));
        ctx.fillStyle = fx.color;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.radius, 0, TAU);
        ctx.fill();
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
    const rally = game.powers.get('rally');
    if (rally && rally.isActive) {
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
