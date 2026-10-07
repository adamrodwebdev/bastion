/**
 * @file Purely visual particles: blood, debris, smoke, embers, sparks, dust,
 * ground stains and weather. Lives in the renderer and never touches the game.
 *
 * Two player settings control it (hosts such as game portals may require it):
 *  - `gore`      : blood drops and stains; without it hits and deaths raise dust
 *                  and a soft puff instead;
 *  - `particles` : debris, smoke, embers and weather; without it only the
 *                  essential feedback remains.
 * Reduced motion (system setting) also turns weather and screen flashes off.
 */

import { TAU, rgba } from './paint.js';

const MAX_PARTS = 360;
const MAX_DECALS = 90;
const GRAVITY = 7;

const rand = (a, b) => a + Math.random() * (b - a);

export class Particles {
  constructor() {
    this.parts = [];
    this.decals = [];
    this.weather = [];
    this.weatherKind = null;
    this.gore = true;
    this.enabled = true;
    this.reduced = false;
    this.flash = 0; // lightning
    this._nextBolt = 6;
  }

  configure({ gore, particles, reduced }) {
    if (gore !== undefined) this.gore = gore;
    if (particles !== undefined) this.enabled = particles;
    if (reduced !== undefined) this.reduced = reduced;
    if (!this.enabled || this.reduced) this.weather.length = 0;
  }

  clear() {
    this.parts.length = 0;
    this.decals.length = 0;
  }

  _add(p) {
    if (this.parts.length >= MAX_PARTS) this.parts.shift();
    p.life = p.max;
    this.parts.push(p);
  }

  // ------------------------------------------------------------- emitters

  /** Blood drops thrown away from the hit (gore setting) or dust otherwise. */
  blood(x, y, dirX, dirY, amount = 6, z = 0.3) {
    if (!this.gore) return this.dust(x, y, Math.ceil(amount / 3), z * 0.5);
    for (let i = 0; i < amount; i++) {
      const sp = rand(0.6, 2.2);
      const a = Math.atan2(dirY, dirX) + rand(-0.9, 0.9);
      this._add({ k: 'blood', x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(0.5, 2.2), max: 1.2, size: rand(0.02, 0.045), color: Math.random() < 0.5 ? '#a3121a' : '#7a0c12' });
    }
  }

  /** Blood pool under a body, or a scorch/dust mark. */
  pool(x, y, size = 0.3) {
    if (this.gore) this._decal({ x, y, r: size, color: '#6e0b10', alpha: 0.5, life: 8, grow: 0.5 });
  }

  /** Chunks of stone, wood or ice that bounce and settle. */
  debris(x, y, material = 'wood', count = 8, z = 0.3, power = 1) {
    if (!this.enabled) count = Math.min(count, 2);
    const colors = {
      wood: ['#8a5a2b', '#6a4426', '#b07d4a'],
      stone: ['#9a948a', '#6e6a62', '#c9c2b4'],
      ice: ['#cfeefc', '#9fd0ee', '#ffffff'],
      bone: ['#e6e0cc', '#c9c2a8'],
      iron: ['#5a5f68', '#8a919c'],
    }[material] || ['#888'];
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const sp = rand(0.5, 2.4) * power;
      this._add({ k: 'chunk', x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(1.2, 3.2) * power, max: rand(1.4, 2.4), size: rand(0.03, 0.075), color: colors[i % colors.length], rot: rand(0, TAU), vr: rand(-12, 12) });
    }
  }

  smoke(x, y, count = 4, z = 0.2, dark = false) {
    if (!this.enabled) return;
    for (let i = 0; i < count; i++) {
      this._add({ k: 'smoke', x: x + rand(-0.1, 0.1), y: y + rand(-0.1, 0.1), z, vx: rand(-0.2, 0.2), vy: rand(-0.15, 0.15), vz: rand(0.3, 0.8), max: rand(0.8, 1.6), size: rand(0.12, 0.22), color: dark ? '#3a3632' : '#d8d2c8' });
    }
  }

  embers(x, y, count = 3, z = 0.5) {
    if (!this.enabled) return;
    for (let i = 0; i < count; i++) {
      this._add({ k: 'ember', x: x + rand(-0.12, 0.12), y, z, vx: rand(-0.3, 0.3), vy: rand(-0.1, 0.1), vz: rand(0.6, 1.4), max: rand(0.6, 1.3), size: rand(0.015, 0.03), color: Math.random() < 0.5 ? '#ffb347' : '#ff6a1a' });
    }
  }

  sparks(x, y, color = '#ffe08a', count = 6, z = 0.3) {
    for (let i = 0; i < (this.enabled ? count : 2); i++) {
      const a = rand(0, TAU);
      const sp = rand(1.5, 3.5);
      this._add({ k: 'spark', x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(0, 2), max: rand(0.18, 0.35), size: 0.02, color });
    }
  }

  dust(x, y, count = 4, z = 0.05) {
    for (let i = 0; i < (this.enabled ? count : 1); i++) {
      this._add({ k: 'smoke', x: x + rand(-0.15, 0.15), y: y + rand(-0.08, 0.08), z, vx: rand(-0.4, 0.4), vy: rand(-0.2, 0.2), vz: rand(0.05, 0.3), max: rand(0.4, 0.8), size: rand(0.08, 0.14), color: '#cbb994' });
    }
  }

  shards(x, y, count = 5, z = 0.3) {
    for (let i = 0; i < (this.enabled ? count : 2); i++) {
      const a = rand(0, TAU);
      const sp = rand(0.6, 1.8);
      this._add({ k: 'shard', x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(0.6, 1.8), max: rand(0.4, 0.7), size: rand(0.025, 0.045), color: '#bff0ff', rot: rand(0, TAU), vr: rand(-10, 10) });
    }
  }

  /** Soft puff of a vanishing body (used when gore is off, and for magic deaths). */
  puff(x, y, color = '#ffffff', z = 0.25) {
    for (let i = 0; i < (this.enabled ? 7 : 3); i++) {
      const a = (i / 7) * TAU;
      this._add({ k: 'puff', x, y, z, vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.6, vz: rand(0.2, 0.6), max: 0.5, size: 0.09, color });
    }
  }

  /** Big blast: flash, fire ball, smoke and debris. */
  explosion(x, y, radius = 0.8) {
    this._add({ k: 'blast', x, y, z: 0.1, vx: 0, vy: 0, vz: 0, max: 0.35, size: radius, color: '#ffcf6a' });
    this._decal({ x, y, r: radius * 0.5, color: '#1e1610', alpha: 0.22, life: 6, grow: 0 });
    this.smoke(x, y, 6, 0.2, true);
    this.debris(x, y, 'stone', 6, 0.1, 1.2);
    this.embers(x, y, 4, 0.2);
  }

  /** Floating gold coin popping out (treasury, kill reward). */
  coin(x, y) {
    if (!this.enabled) return;
    this._add({ k: 'coin', x, y, z: 0.4, vx: rand(-0.3, 0.3), vy: 0, vz: 2, max: 0.7, size: 0.05, color: '#f2c84b' });
  }

  _decal(d) {
    if (this.decals.length >= MAX_DECALS) this.decals.shift();
    d.age = 0;
    this.decals.push(d);
  }

  // ------------------------------------------------------------- weather

  setWeather(kind) {
    this.weatherKind = kind;
    this.weather.length = 0;
    this._fresh = true;
  }

  _weatherCount() {
    return { snow: 70, rain: 90, ash: 55, leaves: 14, pollen: 26, fireflies: 18, dust: 34, mist: 7, birds: 0, petals: 20 }[this.weatherKind] || 0;
  }

  _spawnWeather(initial) {
    const k = this.weatherKind;
    const p = { x: Math.random(), y: initial ? Math.random() : -0.05, ph: Math.random() * TAU, s: Math.random() };
    if (k === 'dust') {
      p.x = initial ? Math.random() : -0.05;
      p.y = Math.random();
    }
    if (k === 'ash' && Math.random() < 0.35) p.ember = true;
    if (k === 'ash' && p.ember) p.y = initial ? Math.random() : 1.05;
    if (k === 'fireflies' || k === 'pollen' || k === 'mist') p.y = Math.random();
    this.weather.push(p);
  }

  // ------------------------------------------------------------- simulation

  update(dt) {
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.k === 'smoke' || p.k === 'puff') {
        p.z += p.vz * dt;
        p.size += dt * 0.25;
        p.vx *= 0.96;
        p.vy *= 0.96;
      } else if (p.k === 'ember') {
        p.z += p.vz * dt;
        p.vx += Math.sin(p.life * 9) * dt * 0.8;
      } else if (p.k === 'blast') {
        // Expands in draw.
      } else {
        p.vz -= GRAVITY * dt;
        p.z += p.vz * dt;
        if (p.rot !== undefined) p.rot += p.vr * dt;
        if (p.z <= 0) {
          p.z = 0;
          if (p.k === 'blood') {
            this._decal({ x: p.x, y: p.y, r: p.size * 1.2, color: p.color, alpha: 0.6, life: 6, grow: 0 });
            p.life = 0;
          } else if (p.k === 'chunk' && Math.abs(p.vz) > 0.8) {
            p.vz = -p.vz * 0.35;
            p.vx *= 0.5;
            p.vy *= 0.5;
            p.vr *= 0.5;
          } else {
            p.vz = 0;
            p.vx *= 0.8;
            p.vy *= 0.8;
            if (p.vr) p.vr *= 0.8;
          }
        }
      }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const d of this.decals) d.age += dt;
    this.decals = this.decals.filter((d) => d.age < d.life);

    // Weather.
    const want = this.enabled && !this.reduced ? this._weatherCount() : 0;
    while (this.weather.length < want) this._spawnWeather(this.weather.length < want * 0.9 && this._fresh !== false);
    this._fresh = false;
    if (this.weather.length > want) this.weather.length = want;
    const k = this.weatherKind;
    for (const w of this.weather) {
      w.ph += dt;
      switch (k) {
        case 'snow': w.y += dt * (0.05 + w.s * 0.04); w.x += Math.sin(w.ph * 1.3) * dt * 0.02; break;
        case 'rain': w.y += dt * 1.4; w.x -= dt * 0.25; break;
        case 'ash':
          if (w.ember) { w.y -= dt * (0.05 + w.s * 0.05); w.x += Math.sin(w.ph * 2) * dt * 0.02; }
          else { w.y += dt * 0.04; w.x += dt * 0.02; }
          break;
        case 'leaves': case 'petals': w.y += dt * (0.05 + w.s * 0.03); w.x += Math.sin(w.ph) * dt * 0.05; break;
        case 'pollen': w.x += Math.sin(w.ph * 0.7) * dt * 0.01; w.y += Math.cos(w.ph * 0.5) * dt * 0.01 - dt * 0.005; break;
        case 'fireflies': w.x += Math.sin(w.ph * 0.9 + w.s * 9) * dt * 0.025; w.y += Math.cos(w.ph * 1.1) * dt * 0.02; break;
        case 'dust': w.x += dt * (0.12 + w.s * 0.1); w.y += Math.sin(w.ph * 3) * dt * 0.01; break;
        case 'mist': w.x += dt * 0.012; break;
        default:
      }
      if (w.y > 1.08 || w.x < -0.1 || w.x > 1.1 || w.y < -0.1) w.dead = true;
    }
    if (this.weather.some((w) => w.dead)) this.weather = this.weather.filter((w) => !w.dead);
    if (k === 'rain' && this.enabled && !this.reduced) {
      this._nextBolt -= dt;
      if (this._nextBolt <= 0) {
        this.flash = 1;
        this._nextBolt = rand(8, 16);
      }
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
  }

  // ------------------------------------------------------------- drawing

  /** Stains on the ground (world transform active). */
  drawDecals(ctx) {
    for (const d of this.decals) {
      const fade = Math.min(1, (d.life - d.age) / 2);
      const r = d.r * (1 + Math.min(1, d.age * 2) * d.grow);
      ctx.fillStyle = rgba(d.color, d.alpha * fade);
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, r, r * 0.6, 0, 0, TAU);
      ctx.fill();
    }
  }

  /**
   * Airborne particles, in device pixels (identity transform).
   * @param {(x:number,y:number)=>{x:number,y:number}} toScreen world → device pixels
   */
  draw(ctx, toScreen, scale) {
    for (const p of this.parts) {
      const s = toScreen(p.x, p.y);
      const sx = s.x;
      const sy = s.y - p.z * scale;
      const k = Math.max(0, p.life / p.max);
      switch (p.k) {
        case 'blood':
        case 'spark':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.k === 'spark' ? k : 1;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size * scale, 0, TAU);
          ctx.fill();
          break;
        case 'chunk':
        case 'shard':
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * scale, -p.size * scale * 0.6, p.size * 2 * scale, p.size * 1.2 * scale);
          ctx.restore();
          break;
        case 'smoke':
        case 'puff':
          ctx.globalAlpha = k * (p.k === 'puff' ? 0.8 : 0.45);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size * scale, 0, TAU);
          ctx.fill();
          break;
        case 'ember':
          ctx.globalAlpha = k;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size * scale, 0, TAU);
          ctx.fill();
          break;
        case 'blast': {
          const t = 1 - k;
          const r = p.size * scale * (0.4 + t * 0.8);
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
          g.addColorStop(0, `rgba(255,250,220,${k})`);
          g.addColorStop(0.4, `rgba(255,170,60,${k * 0.9})`);
          g.addColorStop(1, 'rgba(200,60,20,0)');
          ctx.globalAlpha = 1;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, TAU);
          ctx.fill();
          break;
        }
        case 'coin':
          ctx.globalAlpha = k;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(sx, sy, p.size * scale * Math.abs(Math.cos(p.life * 12)) + 1, p.size * scale, 0, 0, TAU);
          ctx.fill();
          break;
        default:
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Weather over the whole board, in device pixels. */
  drawWeather(ctx, w, h, scale, night) {
    const k = this.weatherKind;
    if (!this.weather.length && this.flash <= 0) return;
    for (const p of this.weather) {
      const x = p.x * w;
      const y = p.y * h;
      switch (k) {
        case 'snow':
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(x, y, (0.02 + p.s * 0.02) * scale, 0, TAU);
          ctx.fill();
          break;
        case 'rain':
          ctx.strokeStyle = 'rgba(200,215,235,0.45)';
          ctx.lineWidth = Math.max(1, scale * 0.012);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - scale * 0.06, y + scale * 0.3);
          ctx.stroke();
          break;
        case 'ash':
          ctx.fillStyle = p.ember ? `rgba(255,${120 + Math.round(p.s * 80)},40,${0.6 + 0.4 * Math.sin(p.ph * 6)})` : 'rgba(90,85,80,0.6)';
          ctx.beginPath();
          ctx.arc(x, y, (p.ember ? 0.018 : 0.025) * scale, 0, TAU);
          ctx.fill();
          break;
        case 'leaves':
        case 'petals': {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(p.ph * 2 + p.s * 6);
          ctx.scale(1, Math.abs(Math.cos(p.ph * 3)));
          ctx.fillStyle = k === 'petals' ? (p.s < 0.5 ? '#f6c6d6' : '#fff5f8') : p.s < 0.33 ? '#d98a2b' : p.s < 0.66 ? '#b8562a' : '#8aa83a';
          ctx.beginPath();
          ctx.ellipse(0, 0, scale * 0.05, scale * 0.025, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'pollen':
          ctx.fillStyle = `rgba(255,250,200,${0.35 + 0.35 * Math.sin(p.ph * 2 + p.s * 9)})`;
          ctx.beginPath();
          ctx.arc(x, y, scale * 0.015, 0, TAU);
          ctx.fill();
          break;
        case 'fireflies': {
          const a = (0.35 + 0.65 * Math.max(0, Math.sin(p.ph * 2.2 + p.s * 20))) * (night ? 1 : 0.55);
          const g = ctx.createRadialGradient(x, y, 0, x, y, scale * 0.12);
          g.addColorStop(0, `rgba(220,255,140,${a})`);
          g.addColorStop(1, 'rgba(220,255,140,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - scale * 0.12, y - scale * 0.12, scale * 0.24, scale * 0.24);
          break;
        }
        case 'dust':
          ctx.fillStyle = 'rgba(240,220,170,0.45)';
          ctx.fillRect(x, y, scale * 0.12, Math.max(1, scale * 0.012));
          break;
        case 'mist': {
          const g = ctx.createRadialGradient(x, y, 0, x, y, scale * 2.2);
          g.addColorStop(0, 'rgba(240,245,250,0.18)');
          g.addColorStop(1, 'rgba(240,245,250,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - scale * 2.2, y - scale * 2.2, scale * 4.4, scale * 4.4);
          break;
        }
        default:
      }
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(235,240,255,${this.flash * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
