/**
 * @file Pooled particle system for purely visual effects (debris, smoke, coins,
 * ambient pollen, fireflies, embers…). Lives in the renderer, never touches the game state.
 */

import { TAU } from '../utils/math.js';

/**
 * Fixed-size pool: particles are recycled, so bursts never allocate during play.
 * Positions are in tile units (world frame).
 */
export class Particles {
  constructor(capacity = 420) {
    this.pool = Array.from({ length: capacity }, () => ({
      alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 0.05, color: '#fff', kind: 'dot', gravity: 0, drag: 0, phase: 0,
    }));
    this.count = 0;
  }

  /** @returns {object|null} a free particle, or null when the pool is full (effect skipped). */
  spawn(kind, x, y, vx, vy, life, size, color, gravity = 0, drag = 0) {
    for (const p of this.pool) {
      if (p.alive) continue;
      p.alive = true;
      p.kind = kind;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.max = life;
      p.size = size;
      p.color = color;
      p.gravity = gravity;
      p.drag = drag;
      p.phase = Math.random() * TAU;
      this.count++;
      return p;
    }
    return null;
  }

  /** Radial burst (kills, explosions). */
  burst(x, y, n, color, speed = 2, life = 0.5, size = 0.06, kind = 'dot', gravity = 3) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.spawn(kind, x, y, Math.cos(a) * s, Math.sin(a) * s - speed * 0.4, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), color, gravity, 2);
    }
  }

  countKind(kind) {
    let n = 0;
    for (const p of this.pool) if (p.alive && p.kind === kind) n++;
    return n;
  }

  update(dt) {
    if (!this.count) return;
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        this.count--;
        continue;
      }
      p.phase += dt;
      p.vy += p.gravity * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx world transform set
   * @param {(kind:string)=>boolean} [filter] draw only some kinds (e.g. ambient behind units)
   */
  draw(ctx, filter) {
    if (!this.count) return;
    for (const p of this.pool) {
      if (!p.alive || (filter && !filter(p.kind))) continue;
      const t = p.life / p.max; // 1 → 0
      switch (p.kind) {
        case 'smoke':
          ctx.globalAlpha = t * 0.45;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (2 - t), 0, TAU);
          ctx.fill();
          break;
        case 'coin':
          ctx.globalAlpha = Math.min(1, t * 2);
          ctx.fillStyle = '#b8860b';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * Math.abs(Math.cos(p.phase * 9)) + 0.01, p.size, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, (p.size * 0.75) * Math.abs(Math.cos(p.phase * 9)) + 0.005, p.size * 0.75, 0, 0, TAU);
          ctx.fill();
          break;
        case 'firefly':
        case 'wisp':
        case 'ember':
        case 'sparkle': {
          // Soft glowing motes that blink.
          const blink = 0.5 + 0.5 * Math.sin(p.phase * (p.kind === 'sparkle' ? 6 : 2.2));
          const fade = Math.min(1, t * 3, (1 - t) * 3);
          ctx.globalAlpha = fade * (0.35 + 0.65 * blink);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.4, 0, TAU);
          ctx.globalAlpha *= 0.25;
          ctx.fill();
          ctx.globalAlpha = fade * (0.35 + 0.65 * blink);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          break;
        }
        case 'leaf':
          ctx.globalAlpha = Math.min(1, t * 3, (1 - t) * 3);
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.phase * 2);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        case 'shard':
          ctx.globalAlpha = t;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.phase * 8);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
          break;
        default:
          ctx.globalAlpha = Math.min(1, t * 1.5);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * t), 0, TAU);
          ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    for (const p of this.pool) p.alive = false;
    this.count = 0;
  }
}
