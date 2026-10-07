/**
 * @file Canvas 2D renderer of the board. Pure presentation: never changes the game state.
 *
 * Layers, back to front:
 *   1. painted terrain (cached, see Terrain.js) and ground stains;
 *   2. ground marks: fire, selection, warlock auras;
 *   3. buildings, units, corpses and gates, sorted by depth (screen y);
 *   4. projectiles, flyers, effects and particles;
 *   5. night tint with lights (dark mode), weather;
 *   6. interface marks: ranges, cursors, aiming circle.
 *
 * Ground things are drawn in world space (tiles, possibly rotated on tall
 * screens); buildings and figures are drawn in "sprite space", always upright
 * on screen, so a rotated board never shows lying towers.
 */

import { TAU, rgba, starPath, shadow, INK } from './paint.js';
import { PLAYER_COLORS } from '../Game.js';
import { LANDSCAPES, NIGHT_TINT } from './palettes.js';
import { paintTerrain } from './Terrain.js';
import { BuildingCache, drawLive, levelPips, lightsOf, topOf, flames } from './Buildings.js';
import { drawUnit, unitHeight } from './Units.js';
import { Particles } from './Particles.js';
import { enemyCamp, gatehouse, waterShimmer, banner } from './props.js';

const MATERIAL_OF = { ram: 'wood', siege: 'wood', golem: 'ice', skeleton: 'bone' };

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
    this.landscape = LANDSCAPES[level.theme] || LANDSCAPES.meadow;
    this.buildings = new BuildingCache();
    this.fx = new Particles();
    this.fx.setWeather(this.landscape.weather);
    this.corpses = [];
    this._unsub = [];
    this._last = null;
    this._faces = new WeakMap();
    this._walk = new WeakMap();
    this._gates = null;
    this._clock = 0;
  }

  /** Visual options from the settings: blood and particles. */
  setOptions({ gore = true, particles = true } = {}) {
    this.fx.configure({ gore, particles, reduced: this.reducedMotion });
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this._bg = null;
  }

  get night() {
    return this.mode === 'dark';
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
    this._gates = null;
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

  /** World direction angle → screen angle. */
  screenAngle(a) {
    return this.rotated ? Math.atan2(Math.cos(a), -Math.sin(a)) : a;
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

  /** Sets "sprite space" at a world point: upright on screen, 1 unit = 1 tile. */
  _sprite(x, y) {
    const p = this.toScreen(x, y);
    this.ctx.setTransform(this.scale, 0, 0, this.scale, p.x + this._ox, p.y + this._oy);
  }

  // ------------------------------------------------------------- game events
  /** Listens to the game to spawn blood, debris and corpses. */
  attach(game) {
    this.detach();
    this.fx.clear();
    this.corpses.length = 0;
    this._last = null;
    const fx = this.fx;
    this._unsub.push(
      game.on('kill', (e) => this._onKill(e)),
      game.on('hit', (h) => this._onHit(h)),
      game.on('build', (t) => {
        fx.dust(t.x, t.y + 0.3, 8);
        fx.debris(t.x, t.y + 0.2, t.level > 1 ? 'stone' : 'wood', 5, 0.4, 0.6);
      }),
      game.on('upgrade', (t) => {
        fx.sparks(t.x, t.y, '#ffe08a', 10, 0.6);
        fx.dust(t.x, t.y + 0.3, 5);
      }),
      game.on('sell', (t) => {
        fx.debris(t.x, t.y + 0.2, t.type === 'barracks' || t.level === 1 ? 'wood' : 'stone', 12, 0.4, 1);
        fx.smoke(t.x, t.y, 5, 0.3, false);
        for (let i = 0; i < 3; i++) fx.coin(t.x, t.y);
      }),
    );
  }

  detach() {
    for (const u of this._unsub) u();
    this._unsub.length = 0;
  }

  _onHit({ kind, x, y, splash, target, dtype }) {
    const fx = this.fx;
    if (x === undefined) return;
    if (splash > 0) {
      if (kind === 'frost') {
        fx.shards(x, y, 8, 0.2);
      } else if (kind === 'fire') {
        fx.embers(x, y, 6, 0.2);
        fx.smoke(x, y, 3, 0.2, true);
      } else {
        fx.explosion(x, y, Math.max(0.5, splash));
      }
    }
    if (!target) return;
    const h = unitHeight(target.type, target.radius) * 0.55;
    const look = MATERIAL_OF[target.type];
    if (kind === 'frost') fx.shards(target.x, target.y, 3, h);
    else if (kind === 'storm' || dtype === 'magic') fx.sparks(target.x, target.y, '#d6c8ff', 4, h);
    else if (look === 'wood' || look === 'ice' || look === 'bone') fx.debris(target.x, target.y, look, 2, h, 0.6);
    else if (target.armor >= 0.3 && Math.random() < 0.6) fx.sparks(target.x, target.y, '#fff1b0', 3, h);
    else {
      const a = Math.random() * TAU;
      fx.blood(target.x, target.y, Math.cos(a), Math.sin(a), 3, h);
    }
  }

  _onKill(e) {
    const fx = this.fx;
    const h = unitHeight(e.type, e.radius);
    const mat = MATERIAL_OF[e.type];
    if (e.type === 'ram' || e.type === 'siege') {
      fx.debris(e.x, e.y, 'wood', 18, h * 0.5, 1.3);
      fx.smoke(e.x, e.y, 6, h * 0.4, true);
      fx.dust(e.x, e.y, 6);
      return;
    }
    if (e.type === 'golem') {
      fx.debris(e.x, e.y, 'ice', 14, h * 0.5, 1.1);
      fx.shards(e.x, e.y, 8, h * 0.6);
      return;
    }
    if (e.type === 'skeleton') {
      fx.debris(e.x, e.y, 'bone', 10, h * 0.5, 0.9);
      return;
    }
    if (e.type === 'sapper') fx.explosion(e.x, e.y, 0.7);
    if (mat !== 'wood') {
      fx.blood(e.x, e.y, Math.cos(e.angle), Math.sin(e.angle), e.boss ? 18 : 8, h * 0.5);
      fx.pool(e.x, e.y + 0.05, e.radius * (e.boss ? 1.3 : 0.75));
      if (!fx.gore) fx.puff(e.x, e.y, '#f2ead6', h * 0.5);
    }
    if (e.flying) {
      fx.puff(e.x, e.y - 0.35, '#3a3f4b', 0.4);
      return;
    }
    if (this.corpses.length > 40) this.corpses.shift();
    this.corpses.push({ type: e.type, r: e.radius, x: e.x, y: e.y, face: this._faces.get(e) || 1, t: 0, ttl: e.boss ? 3.5 : 1.8 });
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
    if (!this._bg) this._bg = paintTerrain(this, game.map);
    if (!this._gates) this._gates = this._buildGates(game.map);

    // Visual clock follows the game (pauses with it).
    const now = game.time;
    let dt = this._last === null ? 0 : now - this._last;
    if (dt < 0 || dt > 0.25) dt = 0;
    this._last = now;
    this._clock += dt;
    this.fx.update(dt);
    for (const c of this.corpses) c.t += dt;
    if (this.corpses.length && this.corpses[0].t > this.corpses[0].ttl) this.corpses = this.corpses.filter((c) => c.t < c.ttl);
    const t = this._clock;

    let ox = 0;
    let oy = 0;
    if (game.shakeTimer > 0 && !this.reducedMotion) {
      ox = (Math.random() - 0.5) * this.scale * 0.15;
      oy = (Math.random() - 0.5) * this.scale * 0.15;
    }
    this._ox = ox;
    this._oy = oy;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this._bg, ox, oy);

    // --- ground layer (world space)
    ctx.setTransform(...this._worldTransform(ox, oy));
    if (!this.reducedMotion) for (const key of game.map.waterCells) {
      const [c, r] = key.split(',').map(Number);
      waterShimmer(ctx, c, r, t, this.landscape.waterLight);
    }
    if (this.showAirLanes) this._airLanes(game.map);
    this.fx.drawDecals(ctx);
    this._drawZones(game.zones, t);
    this._drawGroundEffects(game.effects, t);
    this._drawCells(game, ui);
    for (const e of game.enemies) {
      if (e.type === 'warlock' && e.alive) {
        ctx.strokeStyle = 'rgba(170,90,220,0.35)';
        ctx.lineWidth = 0.03;
        ctx.setLineDash([0.12, 0.1]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, 1.8, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (e.healPulse > 0) {
        ctx.strokeStyle = `rgba(80,220,140,${Math.min(1, e.healPulse * 2)})`;
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 1.6 * (1 - e.healPulse / 0.4) + 0.2, 0, TAU);
        ctx.stroke();
      }
    }
    if (ui.selectedTower) this._drawRange(ui.selectedTower, ui);
    else if (ui.selectedCell && ui.previewType && game.map.isBuildable(ui.selectedCell.col, ui.selectedCell.row)) {
      const T = ui.previewType;
      const r = T.levels[0].range || 0;
      if (r) this._circle(ui.selectedCell.col + 0.5, ui.selectedCell.row + 0.5, r, T.color);
    }

    // --- sprites sorted by depth
    const list = [];
    const depth = (x, y) => this.toScreen(x, y).y;
    for (const g of this._gates) list.push({ d: depth(g.x, g.y) + 0.3 * this.scale, draw: () => this._drawGate(g, t) });
    for (const tw of game.towers) list.push({ d: depth(tw.x, tw.y) + 0.34 * this.scale, draw: () => this._drawTower(tw, tw === ui.selectedTower, ui.coop, t) });
    for (const s of game.soldiers) if (s.alive) list.push({ d: depth(s.x, s.y), draw: () => this._drawSoldier(s, t) });
    for (const e of game.enemies) if (!e.flying && e.alive) list.push({ d: depth(e.x, e.y), draw: () => this._drawEnemy(e, game, t) });
    for (const c of this.corpses) list.push({ d: depth(c.x, c.y) - 0.2 * this.scale, draw: () => this._drawCorpse(c) });
    list.sort((a, b) => a.d - b.d);
    for (const item of list) item.draw();

    // --- air layer
    ctx.setTransform(...this._worldTransform(ox, oy));
    this._drawProjectiles(game.projectiles, t);
    const flyers = game.enemies.filter((e) => e.flying && e.alive).sort((a, b) => depth(a.x, a.y) - depth(b.x, b.y));
    for (const e of flyers) this._drawEnemy(e, game, t);
    ctx.setTransform(...this._worldTransform(ox, oy));
    this._drawEffects(game.effects);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.fx.draw(ctx, (x, y) => {
      const p = this.toScreen(x, y);
      p.x += ox;
      p.y += oy;
      return p;
    }, this.scale);

    // --- night and weather
    if (this.night) this._drawNight(game, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.fx.drawWeather(ctx, this.canvas.width, this.canvas.height, this.scale, this.night);
    this._drawPowerOverlay(game, t);

    // --- interface marks
    ctx.setTransform(...this._worldTransform(ox, oy));
    this._drawCursors(ui.cursors || []);
    if (ui.aim) this._drawAim(ui.aim, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const e of game.enemies) {
      if (e.alive && e.hp < e.maxHp && (!e.stealth || e.revealed)) {
        const lift = e.flying ? 0.35 : 0;
        this._hpBar(e.x, e.y, unitHeight(e.type, e.radius) + lift + 0.08, Math.max(0.5, e.radius * 2.2) * (e.boss ? 1.8 : 1), e.hpRatio);
      }
    }
    for (const s of game.soldiers) if (s.alive && s.hp < s.maxHp) this._hpBar(s.x, s.y, 0.62, 0.34, s.hpRatio, '#6bd06b');
    this._drawTexts(game.effects);
  }

  // ------------------------------------------------------------- ground
  _airLanes(map) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(40,40,60,0.18)';
    ctx.lineWidth = 0.035;
    ctx.setLineDash([0.06, 0.18]);
    for (const p of map.airPaths) {
      ctx.beginPath();
      p.points.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  _buildGates(map) {
    const gates = [];
    const clampX = (v) => Math.min(this.cols - 0.5, Math.max(0.5, v));
    const clampY = (v) => Math.min(this.rows - 0.5, Math.max(0.5, v));
    for (const p of map.paths) {
      const pts = p.points;
      for (const exit of [false, true]) {
        const a = exit ? pts[pts.length - 2] : pts[1];
        const b = exit ? pts[pts.length - 1] : pts[0];
        const x = clampX(b.x);
        const y = clampY(b.y);
        const sa = this.toScreen(a.x, a.y);
        const sb = this.toScreen(x, y);
        const len = Math.hypot(sb.x - sa.x, sb.y - sa.y) || 1;
        const dx = (sb.x - sa.x) / len;
        const dy = (sb.y - sa.y) / len;
        gates.push({ x, y, exit, side: { x: -dy, y: dx }, dir: { x: dx, y: dy } });
      }
    }
    return gates;
  }

  _drawGate(g, t) {
    this._sprite(g.x, g.y);
    // Pushed half off the board so they never cover a building spot.
    this.ctx.translate(g.dir.x * 0.38, g.dir.y * 0.38);
    if (g.exit) gatehouse(this.ctx, g.side, t, this.night);
    else enemyCamp(this.ctx, g.side, t);
  }

  _drawCells(game, ui) {
    const ctx = this.ctx;
    const hc = ui.hoverCell;
    if (hc && game.map.inBounds(hc.col, hc.row) && (!ui.selectedCell || hc.col !== ui.selectedCell.col || hc.row !== ui.selectedCell.row)) {
      ctx.fillStyle = 'rgba(255,250,230,0.18)';
      ctx.fillRect(hc.col + 0.04, hc.row + 0.04, 0.92, 0.92);
    }
    const sc = ui.selectedCell;
    if (sc && !ui.selectedTower) {
      const ok = game.map.isBuildable(sc.col, sc.row);
      ctx.fillStyle = ok ? 'rgba(233,195,95,0.25)' : 'rgba(229,72,77,0.2)';
      ctx.fillRect(sc.col + 0.06, sc.row + 0.06, 0.88, 0.88);
      ctx.strokeStyle = ok ? '#e9c35f' : '#e5484d';
      ctx.lineWidth = 0.06;
      ctx.strokeRect(sc.col + 0.06, sc.row + 0.06, 0.88, 0.88);
    }
  }

  _circle(x, y, r, color, alpha = 0.12) {
    const ctx = this.ctx;
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.75);
    ctx.lineWidth = 0.04;
    ctx.setLineDash([0.16, 0.08]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawRange(tw, ui) {
    const ctx = this.ctx;
    if (tw.range > 0) this._circle(tw.x, tw.y, tw.range, tw.constructor.color);
    if (tw.minRange) {
      ctx.strokeStyle = 'rgba(229,72,77,0.6)';
      ctx.lineWidth = 0.035;
      ctx.setLineDash([0.08, 0.08]);
      ctx.beginPath();
      ctx.arc(tw.x, tw.y, tw.minRange, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (ui.upgradePreview && tw.canUpgrade) {
      const next = tw.level >= tw.baseLevels ? tw.constructor.elite : tw.constructor.levels[tw.level];
      if (next.range) {
        ctx.setLineDash([0.1, 0.1]);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 0.04;
        ctx.beginPath();
        ctx.arc(tw.x, tw.y, next.range * (1 + tw.rangeBuff), 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  _drawZones(zones, t) {
    const ctx = this.ctx;
    for (const z of zones) {
      const a = Math.min(1, z.ttl / 1.5);
      const grad = ctx.createRadialGradient(z.x, z.y, 0.05, z.x, z.y, z.radius);
      grad.addColorStop(0, `rgba(255,150,40,${0.45 * a})`);
      grad.addColorStop(0.7, `rgba(150,40,10,${0.3 * a})`);
      grad.addColorStop(1, 'rgba(60,20,10,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, TAU);
      ctx.fill();
    }
    // Flames on burning ground (sprite space).
    for (const z of zones) {
      const n = Math.max(3, Math.round(z.radius * 5));
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU + z.x;
        const d = z.radius * (0.25 + ((i * 37) % 10) / 16);
        this._sprite(z.x + Math.cos(ang) * d, z.y + Math.sin(ang) * d);
        flames(this.ctx, 0, 0, 0.07 * Math.min(1, z.ttl), t + i, this.reducedMotion);
      }
      if (Math.random() < 0.15) this.fx.embers(z.x, z.y, 1, 0.1);
    }
    ctx.setTransform(...this._worldTransform(this._ox, this._oy));
  }

  /** Arrow rain and other area effects that live on the ground. */
  _drawGroundEffects(effects, t) {
    const ctx = this.ctx;
    for (const fx of effects) {
      if (fx.kind !== 'zone') continue;
      const life = Math.max(0, 1 - fx.t);
      if (fx.color === '#cfd8e3') {
        // Arrow rain: shadowed circle plus falling arrows.
        ctx.fillStyle = `rgba(30,25,20,${0.18 * life})`;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.radius, 0, TAU);
        ctx.fill();
        if (!this.reducedMotion) {
          for (let i = 0; i < 14; i++) {
            const k = ((t * 2.2 + i * 0.137) % 1);
            const a = i * 2.39996;
            const d = fx.radius * Math.sqrt(((i * 0.618) % 1));
            const x = fx.x + Math.cos(a) * d;
            const y = fx.y + Math.sin(a) * d;
            this._sprite(x, y);
            const h = (1 - k) * 1.2;
            ctx.strokeStyle = `rgba(60,45,30,${life})`;
            ctx.lineWidth = 0.02;
            ctx.beginPath();
            ctx.moveTo(-0.03, -h - 0.22);
            ctx.lineTo(0, -h);
            ctx.stroke();
            ctx.setTransform(...this._worldTransform(this._ox, this._oy));
          }
        }
      } else {
        ctx.globalAlpha = Math.max(0, 0.35 * life);
        ctx.fillStyle = fx.color;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.radius, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  // ------------------------------------------------------------- towers
  _drawTower(tw, selected, coop, t) {
    const ctx = this.ctx;
    const p = this.toScreen(tw.x, tw.y);
    const px = p.x + this._ox;
    const py = p.y + this._oy;
    const s = this.scale;
    const color = tw.constructor.color;
    // Selection / owner ring on the ground.
    if (selected || coop) {
      this._sprite(tw.x, tw.y);
      ctx.strokeStyle = selected ? '#ffd166' : PLAYER_COLORS[tw.owner - 1];
      ctx.lineWidth = selected ? 0.06 : 0.045;
      ctx.beginPath();
      ctx.ellipse(0, 0.33, 0.46, 0.17, 0, 0, TAU);
      ctx.stroke();
    }
    const body = this.buildings.get(tw.type, tw.level, tw.isElite, color, s);
    const { W, TOP } = BuildingCache;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(body, Math.round(px - (W / 2) * s), Math.round(py - TOP * s));
    this._sprite(tw.x, tw.y);
    const owner = coop ? PLAYER_COLORS[tw.owner - 1] : null;
    drawLive(ctx, tw, t, this.screenAngle(tw.angle), { reduced: this.reducedMotion, banner: owner });
    if (tw.type === 'archer' && tw.level > 1) {
      const front = this.buildings.get(tw.type, tw.level, tw.isElite, color, s, 'front');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(front, Math.round(px - (W / 2) * s), Math.round(py - TOP * s));
      this._sprite(tw.x, tw.y);
    }
    levelPips(ctx, tw.level > tw.baseLevels ? tw.baseLevels : tw.level, tw.isElite);
    if (coop) this._playerMarkSprite(0.34, -0.1, tw.owner, 0.07);
    // Muzzle smoke and embers.
    if (tw.recoil > 0.95) {
      const top = topOf(tw.type, tw.level);
      if (tw.type === 'cannon') this.fx.smoke(tw.x + Math.cos(tw.angle) * 0.3, tw.y + Math.sin(tw.angle) * 0.3, 2, -top, false);
    }
    if (tw.type === 'fire' && Math.random() < 0.12) this.fx.embers(tw.x, tw.y, 1, -topOf('fire', tw.level) + 0.1);
    // Rally flag of the barracks.
    if (selected && tw.rally) {
      this._sprite(tw.rally.x, tw.rally.y);
      banner(ctx, 0, 0, 0.45, color, t, { width: 0.2, still: this.reducedMotion });
    }
  }

  // ------------------------------------------------------------- units
  _face(entity, angle) {
    const dx = this.rotated ? -Math.sin(angle) : Math.cos(angle);
    let f = this._faces.get(entity) || 1;
    if (dx > 0.15) f = 1;
    else if (dx < -0.15) f = -1;
    this._faces.set(entity, f);
    return f;
  }

  _drawEnemy(e, game, t) {
    const ctx = this.ctx;
    const frozen = game.enemySpeedModifier(e) === 0;
    const r = e.radius;
    const H = unitHeight(e.type, r);
    const lift = e.flying ? 0.35 + Math.sin(t * 2 + e.id) * 0.03 : 0;
    const moving = !frozen && !e.isStunned && !e.blockedBy;
    const face = this._face(e, e.angle);
    const ghost = e.stealth && !e.revealed;

    this._sprite(e.x, e.y + r * 0.45);
    // Shadow on the ground.
    shadow(ctx, 0, 0, r * (e.flying ? 0.7 : 1.05), r * 0.38, e.flying ? 0.18 : 0.3);
    if (ghost) ctx.globalAlpha = 0.28;
    ctx.translate(0, -lift);
    if (e.boss) {
      const g = ctx.createRadialGradient(0, -H * 0.5, 0, 0, -H * 0.5, H * 0.9);
      g.addColorStop(0, e.type === 'mordrac' ? 'rgba(160,20,30,0.28)' : 'rgba(255,200,80,0.2)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-H, -H * 1.4, H * 2, H * 1.6);
    }
    ctx.save();
    ctx.scale(face, 1);
    drawUnit(ctx, e.type, r, {
      phase: e.distance * 12,
      moving: moving || e.flying,
      attack: e.blockedBy && e.melee > 0 ? (t * 1.6 + e.id * 0.3) % 1 : 0,
      flash: e.hitFlash > 0,
      t: t + e.id,
      seed: e.id,
      enraged: e.type === 'berserker' && e.enraged,
    });
    ctx.restore();

    // Status effects.
    if (e.isSlowed || frozen) {
      ctx.fillStyle = frozen ? 'rgba(170,230,255,0.45)' : 'rgba(120,210,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.45, r * 1.1, H * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8fbff';
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + e.id;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.9, -0.02);
        ctx.lineTo(Math.cos(a) * r * 0.9 + 0.025, -0.1);
        ctx.lineTo(Math.cos(a) * r * 0.9 + 0.05, -0.02);
        ctx.fill();
      }
    }
    if (e.burnTimer > 0) {
      flames(ctx, 0, -H * 0.35, r * 0.45, t * 1.3 + e.id, this.reducedMotion);
      if (Math.random() < 0.1) this.fx.embers(e.x, e.y, 1, H * 0.6);
    }
    if (e.isStunned) {
      ctx.fillStyle = '#ffe066';
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + (i * TAU) / 3;
        starPath(ctx, Math.cos(a) * r * 0.8, -H - 0.06 + Math.sin(a) * 0.04, 0.045);
        ctx.fill();
      }
    }
    if (e.invulnerable) {
      ctx.strokeStyle = 'rgba(190,150,255,0.9)';
      ctx.fillStyle = 'rgba(190,150,255,0.15)';
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.5, r * 1.3, H * 0.65, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    if (e.boss && !ghost) {
      ctx.fillStyle = '#ffd166';
      starPath(ctx, 0, -H - 0.14, 0.07);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.012;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawCorpse(c) {
    const ctx = this.ctx;
    const k = c.t / c.ttl;
    this._sprite(c.x, c.y + c.r * 0.45);
    ctx.globalAlpha = Math.max(0, Math.min(1, (1 - k) * 2.2));
    ctx.translate(0, k * 0.05);
    ctx.save();
    ctx.scale(c.face, 1);
    drawUnit(ctx, c.type, c.r, { phase: 0, moving: false, attack: 0, flash: false, t: 0, dead: Math.min(1, c.t * 1.6) });
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawSoldier(s, t) {
    const ctx = this.ctx;
    // Walking animation from the distance actually travelled.
    let w = this._walk.get(s);
    if (!w) {
      w = { x: s.x, y: s.y, phase: 0, moving: false };
      this._walk.set(s, w);
    }
    const d = Math.hypot(s.x - w.x, s.y - w.y);
    w.moving = d > 0.002;
    w.phase += d * 14;
    const angle = d > 0.002 ? Math.atan2(s.y - w.y, s.x - w.x) : s.engaged ? Math.atan2(s.engaged.y - s.y, s.engaged.x - s.x) : 0;
    w.x = s.x;
    w.y = s.y;
    const face = d > 0.002 || s.engaged ? this._face(s, angle) : this._faces.get(s) || 1;
    if (!this._faces.has(s)) this._faces.set(s, face);
    this._sprite(s.x, s.y + 0.12);
    shadow(ctx, 0, 0, 0.16, 0.06, 0.28);
    ctx.save();
    ctx.scale(face, 1);
    const kind = s.kind === 'knight' ? 'knightAlly' : s.kind === 'militia' ? 'militia' : 'footman';
    drawUnit(ctx, kind, s.kind === 'knight' ? 0.25 : 0.23, {
      phase: w.phase,
      moving: w.moving,
      attack: s.engaged ? (t * 2 + s.id * 0.37) % 1 : 0,
      flash: false,
      t: t + s.id,
    });
    ctx.restore();
    if (s.lifetime !== null && s.lifetime !== undefined && s.lifetime < 2) {
      ctx.globalAlpha = 1;
    }
  }

  /** Health bar above a figure, in device pixels (always horizontal). */
  _hpBar(x, y, height, width, ratio, color) {
    const ctx = this.ctx;
    const s = this.scale;
    const c = this.toScreen(x, y);
    const w = width * s;
    const h = Math.max(3, 0.08 * s);
    const bx = c.x + this._ox - w / 2;
    const by = c.y + this._oy - height * s - h;
    ctx.fillStyle = 'rgba(20,14,10,0.75)';
    ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
    ctx.fillStyle = color || (ratio > 0.5 ? '#4cbf6a' : ratio > 0.25 ? '#f5a524' : '#e5484d');
    ctx.fillRect(bx, by, w * ratio, h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(bx, by, w * ratio, Math.max(1, h * 0.35));
  }

  // ------------------------------------------------------------- projectiles
  _drawProjectiles(list, t) {
    const ctx = this.ctx;
    for (const p of list) {
      const traveled = Math.hypot(p.x - p.sx, p.y - p.sy);
      const remaining = Math.hypot(p.tx - p.x, p.ty - p.y);
      const k = traveled / (traveled + remaining || 1);
      const lift = p.homing ? 0.55 * (1 - k) + 0.28 * k : p.height + 0.15;
      // Ground shadow.
      ctx.setTransform(...this._worldTransform(this._ox, this._oy));
      ctx.fillStyle = 'rgba(20,14,8,0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 0.9, p.size * 0.5, 0, 0, TAU);
      ctx.fill();
      this._sprite(p.x, p.y);
      ctx.translate(0, -lift);
      const ang = this.screenAngle(p.angle);
      switch (p.kind) {
        case 'arrow':
        case 'bolt': {
          const len = p.kind === 'bolt' ? 0.42 : 0.28;
          ctx.rotate(ang);
          ctx.strokeStyle = '#6a4a2a';
          ctx.lineWidth = p.kind === 'bolt' ? 0.04 : 0.02;
          ctx.beginPath();
          ctx.moveTo(-len, 0);
          ctx.lineTo(0, 0);
          ctx.stroke();
          ctx.fillStyle = '#d8dde5';
          ctx.beginPath();
          ctx.moveTo(0.05, 0);
          ctx.lineTo(-0.02, -0.025);
          ctx.lineTo(-0.02, 0.025);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = p.kind === 'bolt' ? '#c0508a' : '#f2ead6';
          ctx.beginPath();
          ctx.moveTo(-len, 0);
          ctx.lineTo(-len - 0.05, -0.03);
          ctx.lineTo(-len + 0.05, 0);
          ctx.lineTo(-len - 0.05, 0.03);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'rock': {
          ctx.rotate(t * 8);
          ctx.fillStyle = '#7a6a58';
          ctx.beginPath();
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * TAU;
            const rr = p.size * (0.8 + ((i * 7) % 3) * 0.12);
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.015;
          ctx.stroke();
          break;
        }
        case 'fire': {
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 1.8);
          g.addColorStop(0, 'rgba(255,240,180,1)');
          g.addColorStop(0.4, 'rgba(255,150,40,0.95)');
          g.addColorStop(1, 'rgba(255,60,10,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 1.8, 0, TAU);
          ctx.fill();
          if (Math.random() < 0.35) this.fx.embers(p.x, p.y, 1, lift);
          break;
        }
        case 'orb': {
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
          g.addColorStop(0, 'rgba(255,255,255,1)');
          g.addColorStop(0.35, 'rgba(140,230,255,0.95)');
          g.addColorStop(1, 'rgba(80,180,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 2, 0, TAU);
          ctx.fill();
          break;
        }
        default: {
          // Cannonball.
          const g = ctx.createRadialGradient(-p.size * 0.3, -p.size * 0.3, 0, 0, 0, p.size);
          g.addColorStop(0, '#8a919c');
          g.addColorStop(1, '#14161a');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.8, 0, TAU);
          ctx.fill();
          if (Math.random() < 0.25) this.fx.smoke(p.x, p.y, 1, lift, false);
        }
      }
    }
  }

  // ------------------------------------------------------------- effects
  _drawEffects(list) {
    const ctx = this.ctx;
    for (const fx of list) {
      const t = fx.t;
      if (fx.kind === 'ring') {
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 0.1 * (1 - t) + 0.01;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.radius * (0.3 + 0.7 * t), 0, TAU);
        ctx.stroke();
        ctx.lineWidth = 0.25 * (1 - t);
        ctx.globalAlpha = Math.max(0, 0.25 * (1 - t));
        ctx.stroke();
      } else if (fx.kind === 'beam') {
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(fx.color, 0.4);
        ctx.lineWidth = 0.16 * (1 - t) + 0.02;
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
        ctx.strokeStyle = '#fff6e0';
        ctx.lineWidth = 0.03;
        ctx.stroke();
      } else if (fx.kind === 'bolt') {
        ctx.globalAlpha = Math.max(0, 1 - t);
        const n = 6;
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(fx.x, fx.y);
          for (let i = 1; i < n; i++) {
            const k = i / n;
            const jitter = Math.sin(fx.seed + i * 7.3 + t * 30) * 0.18;
            ctx.lineTo(fx.x + (fx.x2 - fx.x) * k + jitter, fx.y + (fx.y2 - fx.y) * k - jitter);
          }
          ctx.lineTo(fx.x2, fx.y2);
        };
        path();
        ctx.strokeStyle = rgba(fx.color, 0.45);
        ctx.lineWidth = 0.14;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.035;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Floating numbers, in device pixels with an outline. */
  _drawTexts(list) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `800 ${Math.round(0.32 * this.scale)}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const fx of list) {
      if (fx.kind !== 'text') continue;
      ctx.globalAlpha = Math.max(0, 1 - fx.t * fx.t);
      const p = this.toScreen(fx.x, fx.y);
      const y = p.y - 0.5 * this.scale;
      ctx.lineWidth = Math.max(2, this.scale * 0.07);
      ctx.strokeStyle = 'rgba(30,20,10,0.85)';
      ctx.strokeText(fx.text, p.x, y);
      ctx.fillStyle = fx.color;
      ctx.fillText(fx.text, p.x, y);
    }
    ctx.restore();
  }

  _drawNight(game, t) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = NIGHT_TINT;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    const s = this.scale;
    const glow = (x, y, r, color, a = 0.5) => {
      const px = x;
      const py = y;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * s);
      g.addColorStop(0, `rgba(${color},${a})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(px - r * s, py - r * s, r * s * 2, r * s * 2);
    };
    const flick = this.reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 13);
    for (const tw of game.towers) {
      const p = this.toScreen(tw.x, tw.y);
      for (const l of lightsOf(tw)) glow(p.x + l.x * s, p.y + l.y * s, l.r, l.color, 0.45 * flick);
    }
    for (const g of this._gates) {
      const p = this.toScreen(g.x, g.y);
      glow(p.x, p.y - 0.3 * s, 0.9, g.exit ? '255,200,110' : '255,90,60', 0.35 * flick);
    }
    for (const z of game.zones) {
      const p = this.toScreen(z.x, z.y);
      glow(p.x, p.y, z.radius * 1.6, '255,130,40', 0.5 * flick);
    }
    for (const e of game.enemies) {
      if (e.burnTimer > 0 || e.type === 'warlock' || e.type === 'necromancer' || e.type === 'sapper') {
        const p = this.toScreen(e.x, e.y);
        const color = e.type === 'warlock' ? '200,110,255' : e.type === 'necromancer' ? '110,255,150' : '255,150,60';
        glow(p.x, p.y - 0.4 * s, 0.6, color, 0.35);
      }
    }
    for (const p of game.projectiles) {
      if (p.kind === 'fire' || p.kind === 'orb') {
        const q = this.toScreen(p.x, p.y);
        glow(q.x, q.y - 0.4 * s, 0.5, p.kind === 'fire' ? '255,150,50' : '140,220,255', 0.5);
      }
    }
    for (const part of this.fx.parts) {
      if (part.k === 'ember' || part.k === 'blast') {
        const q = this.toScreen(part.x, part.y);
        glow(q.x, q.y - part.z * s, part.k === 'blast' ? part.size * 2 : 0.15, '255,150,60', 0.4 * (part.life / part.max));
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  _drawPowerOverlay(game, t) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (game.powers.modifier('enemySpeed') === 0) {
      // Frost creeping in from the edges.
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(180,230,255,0.05)');
      g.addColorStop(1, 'rgba(200,240,255,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    const meteor = game.powers.get('meteor');
    if (meteor && meteor.isActive && !this.reducedMotion) {
      ctx.fillStyle = `rgba(255,110,40,${0.07 + 0.05 * Math.sin(t * 20)})`;
      ctx.fillRect(0, 0, w, h);
    }
    const rally = game.powers.get('rally');
    if (rally && rally.isActive) {
      ctx.strokeStyle = 'rgba(255,209,102,0.75)';
      ctx.lineWidth = this.scale * 0.12;
      ctx.strokeRect(this.scale * 0.06, this.scale * 0.06, w - this.scale * 0.12, h - this.scale * 0.12);
    }
  }

  // ------------------------------------------------------------- interface marks
  _drawCursors(cursors) {
    const ctx = this.ctx;
    for (const c of cursors) {
      const color = PLAYER_COLORS[c.player - 1];
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.08;
      const pad = 0.04;
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

  _playerMarkSprite(x, y, player, r) {
    this._playerMark(x, y, player, r);
  }

  _drawAim(aim, t) {
    const ctx = this.ctx;
    const r = aim.radius || 0.6;
    ctx.fillStyle = 'rgba(255,209,102,0.16)';
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.9)';
    ctx.lineWidth = 0.05;
    ctx.setLineDash([0.14, 0.09]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }
}
