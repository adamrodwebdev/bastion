/**
 * @file Procedural sprites: towers, enemies and projectiles, drawn with canvas paths
 * (no image files). Everything is drawn around (0, 0) in tile units, "upright": the
 * Renderer rotates the frame so sprites stay upright when the board is rotated.
 *
 * Shape language: towers are warm, blocky, built of stone; enemies are round,
 * organic and cool/menacing. Upgrades visibly change each tower.
 */

import { TAU } from '../utils/math.js';
import { TOWER_LOOK, ENEMY_LOOK } from './themes.js';

const shadow = (ctx, w, h, y = 0.3) => {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0.04, y, w, h, 0, 0, TAU);
  ctx.fill();
};

const rect = (ctx, x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

const disc = (ctx, x, y, r, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
};

export const Sprites = {
  // ------------------------------------------------------------------ towers
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} t tower (type, level, recoil)
   * @param {number} aim aim angle in the local (upright) frame
   * @param {number} time seconds, for idle animation
   */
  tower(ctx, t, aim, time) {
    const k = TOWER_LOOK[t.type] || TOWER_LOOK.arrow;
    const lvl = t.level;
    const kick = t.recoil * 0.05;
    shadow(ctx, 0.4, 0.14, 0.32);

    // Stone plinth: front face (darker) + top, gives the 3/4 view.
    rect(ctx, -0.36, 0.06, 0.72, 0.26, k.stoneDark);
    rect(ctx, -0.36, -0.02, 0.72, 0.1, k.stone);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 3; i++) ctx.fillRect(-0.36 + i * 0.25, 0.17, 0.2, 0.015);

    switch (t.type) {
      case 'cannon': {
        // Squat bunker, barrel aims at the target; tier 3 = double barrel.
        rect(ctx, -0.3, -0.24, 0.6, 0.3, k.stoneDark);
        rect(ctx, -0.3, -0.3, 0.6, 0.1, k.stone);
        for (let i = 0; i < 3; i++) rect(ctx, -0.3 + i * 0.24, -0.38, 0.12, 0.08, k.stone);
        if (lvl >= 2) rect(ctx, -0.3, -0.16, 0.6, 0.05, k.roof);
        ctx.save();
        ctx.translate(0, -0.2);
        disc(ctx, 0, 0, 0.17, '#3a3836');
        ctx.rotate(aim);
        const barrels = lvl >= 3 ? [-0.07, 0.07] : [0];
        for (const by of barrels) {
          rect(ctx, 0.02 - kick, by - 0.065, 0.32, 0.13, '#2b2b2b');
          rect(ctx, 0.28 - kick, by - 0.08, 0.07, 0.16, k.roof);
        }
        ctx.restore();
        disc(ctx, -0.05, -0.25, 0.04, 'rgba(255,255,255,0.25)');
        break;
      }
      case 'frost': {
        // Pale spire with a floating, bobbing crystal; tiers add orbiting shards.
        ctx.fillStyle = k.stoneDark;
        ctx.beginPath();
        ctx.moveTo(-0.22, 0.04);
        ctx.lineTo(-0.14, -0.32);
        ctx.lineTo(0.14, -0.32);
        ctx.lineTo(0.22, 0.04);
        ctx.fill();
        ctx.fillStyle = k.stone;
        ctx.beginPath();
        ctx.moveTo(-0.22, 0.04);
        ctx.lineTo(-0.14, -0.32);
        ctx.lineTo(0.02, -0.32);
        ctx.lineTo(0.0, 0.04);
        ctx.fill();
        const bob = Math.sin(time * 2.4 + t.id) * 0.03;
        const cy = -0.52 + bob - kick;
        ctx.fillStyle = k.roofDark;
        ctx.beginPath();
        ctx.moveTo(0, cy - 0.2);
        ctx.lineTo(0.12, cy);
        ctx.lineTo(0, cy + 0.16);
        ctx.lineTo(-0.12, cy);
        ctx.fill();
        ctx.fillStyle = k.roof;
        ctx.beginPath();
        ctx.moveTo(0, cy - 0.2);
        ctx.lineTo(0, cy + 0.16);
        ctx.lineTo(-0.12, cy);
        ctx.fill();
        disc(ctx, -0.03, cy - 0.06, 0.025, '#fff');
        for (let i = 0; i < lvl - 1; i++) {
          const a = time * 1.8 + (i / Math.max(1, lvl - 1)) * TAU;
          ctx.fillStyle = k.roof;
          ctx.beginPath();
          const sx = Math.cos(a) * 0.24;
          const sy = cy + Math.sin(a) * 0.08;
          ctx.moveTo(sx, sy - 0.06);
          ctx.lineTo(sx + 0.035, sy);
          ctx.lineTo(sx, sy + 0.05);
          ctx.lineTo(sx - 0.035, sy);
          ctx.fill();
        }
        break;
      }
      case 'laser': {
        // Arcane obelisk with a glowing gem; tiers add rings.
        ctx.fillStyle = k.stoneDark;
        ctx.beginPath();
        ctx.moveTo(-0.2, 0.04);
        ctx.lineTo(-0.1, -0.5);
        ctx.lineTo(0.1, -0.5);
        ctx.lineTo(0.2, 0.04);
        ctx.fill();
        ctx.fillStyle = k.stone;
        ctx.beginPath();
        ctx.moveTo(-0.2, 0.04);
        ctx.lineTo(-0.1, -0.5);
        ctx.lineTo(0, -0.5);
        ctx.lineTo(0, 0.04);
        ctx.fill();
        rect(ctx, -0.16, -0.18, 0.32, 0.04, k.trim);
        const pulse = 0.5 + 0.5 * Math.sin(time * 4 + t.id);
        const gy = -0.62;
        ctx.fillStyle = `rgba(233,61,130,${0.25 + 0.25 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, gy, 0.16 + t.recoil * 0.06, 0, TAU);
        ctx.fill();
        ctx.fillStyle = k.roof;
        ctx.beginPath();
        ctx.moveTo(0, gy - 0.13);
        ctx.lineTo(0.09, gy);
        ctx.lineTo(0, gy + 0.13);
        ctx.lineTo(-0.09, gy);
        ctx.fill();
        disc(ctx, -0.02, gy - 0.04, 0.025, '#fff');
        ctx.strokeStyle = k.trim;
        ctx.lineWidth = 0.025;
        for (let i = 1; i < lvl; i++) {
          ctx.beginPath();
          ctx.ellipse(0, gy, 0.14 + i * 0.05, 0.05 + i * 0.015, Math.sin(time + i) * 0.3, 0, TAU);
          ctx.stroke();
        }
        break;
      }
      default: {
        // Archer: round keep with crenellations, a crossbow on top and a banner.
        const wood = lvl >= 2;
        rect(ctx, -0.25, -0.3, 0.5, 0.34, wood ? k.stoneDark : '#8a6a44');
        rect(ctx, -0.25, -0.3, 0.32, 0.34, wood ? k.stone : '#a8845a');
        for (let i = 0; i < 4; i++) rect(ctx, -0.25 + i * 0.135, -0.38, 0.09, 0.09, wood ? k.stone : '#a8845a');
        rect(ctx, -0.06, -0.14, 0.12, 0.18, '#3a2a1c');
        // Banner (tier 3: golden roof spike).
        ctx.fillStyle = k.roof;
        ctx.beginPath();
        ctx.moveTo(0.18, -0.3);
        ctx.lineTo(0.3, -0.3);
        ctx.lineTo(0.3, -0.08);
        ctx.lineTo(0.24, -0.13);
        ctx.lineTo(0.18, -0.08);
        ctx.fill();
        if (lvl >= 3) {
          ctx.fillStyle = k.trim;
          ctx.beginPath();
          ctx.moveTo(-0.08, -0.42);
          ctx.lineTo(0, -0.62);
          ctx.lineTo(0.08, -0.42);
          ctx.fill();
        }
        ctx.save();
        ctx.translate(0, -0.42);
        ctx.rotate(aim);
        rect(ctx, -0.04 - kick, -0.03, 0.26, 0.06, '#5b3a1e');
        ctx.strokeStyle = '#5b3a1e';
        ctx.lineWidth = 0.035;
        ctx.beginPath();
        ctx.arc(0.12 - kick, 0, 0.13, -1.2, 1.2);
        ctx.stroke();
        ctx.restore();
        break;
      }
    }
    // Level pips on the plinth.
    for (let i = 0; i < lvl; i++) disc(ctx, -0.16 + i * 0.16, 0.2, 0.045, i === 0 ? 'rgba(255,255,255,0.55)' : '#ffd166');
  },

  // ------------------------------------------------------------------ enemies
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} e enemy
   * @param {{time:number, facing:number, frozen:boolean, still:boolean}} o facing = ±1 (screen left/right)
   */
  enemy(ctx, e, { time, facing, frozen, still }) {
    const look = ENEMY_LOOK[e.type] || ENEMY_LOOK.grunt;
    const r = e.radius;
    const phase = still ? 0 : time * (e.type === 'runner' ? 18 : 10) + e.id;
    const step = Math.sin(phase);
    const bounce = Math.abs(step) * 0.04 * r * 4;
    const flash = e.hitFlash > 0;
    const body = flash ? '#ffffff' : look.body;
    const dark = flash ? '#f2f2f2' : look.dark;

    shadow(ctx, r * 0.95, r * 0.32, r * 0.8);
    ctx.save();
    ctx.scale(facing, 1);

    // Feet.
    if (e.type !== 'tank') {
      disc(ctx, -r * 0.35 + step * r * 0.25, r * 0.72, r * 0.2, dark);
      disc(ctx, r * 0.35 - step * r * 0.25, r * 0.72, r * 0.2, dark);
    }
    ctx.translate(0, -bounce);

    switch (e.type) {
      case 'tank': {
        // Armoured beetle: shell plates with rivets, stubby legs.
        for (let i = -1; i <= 1; i++) disc(ctx, i * r * 0.6 + step * 0.02, r * 0.7, r * 0.16, '#2b2140');
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(0, 0.02, r * 1.15, r * 0.9, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(-r * 0.05, -r * 0.08, r * 1.05, r * 0.78, 0, Math.PI, 0);
        ctx.lineTo(r, r * 0.05);
        ctx.lineTo(-r * 1.1, r * 0.05);
        ctx.fill();
        ctx.strokeStyle = look.detail;
        ctx.lineWidth = 0.025;
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, -r * 0.8);
        ctx.lineTo(-r * 0.35, r * 0.05);
        ctx.moveTo(r * 0.35, -r * 0.8);
        ctx.lineTo(r * 0.35, r * 0.05);
        ctx.stroke();
        for (const rx of [-0.7, 0, 0.7]) disc(ctx, rx * r, -r * 0.25, r * 0.07, look.detail);
        disc(ctx, r * 0.95, r * 0.15, r * 0.3, dark);
        disc(ctx, r * 1.05, r * 0.08, r * 0.08, '#ffd166');
        break;
      }
      case 'runner': {
        // Lean, leaning forward, long ears and speed streaks.
        ctx.rotate(0.25);
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.95, r * 0.8, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(-r * 0.2, -r * 0.6);
        ctx.lineTo(-r * 0.8, -r * 1.5);
        ctx.lineTo(r * 0.1, -r * 0.7);
        ctx.fill();
        disc(ctx, r * 0.35, -r * 0.15, r * 0.24, '#fff');
        disc(ctx, r * 0.45, -r * 0.15, r * 0.12, '#1a1a1a');
        if (!still) {
          ctx.strokeStyle = look.detail;
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 0.02;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            ctx.moveTo(-r * 1.2, -r * 0.3 + i * r * 0.3);
            ctx.lineTo(-r * 1.9, -r * 0.3 + i * r * 0.3);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        break;
      }
      case 'healer': {
        // Robed shaman with a glowing staff.
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, r * 0.7);
        ctx.quadraticCurveTo(0, -r * 1.6, r * 0.9, r * 0.7);
        ctx.fill();
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(-r * 0.75, r * 0.6);
        ctx.quadraticCurveTo(0, -r * 1.4, r * 0.75, r * 0.6);
        ctx.fill();
        disc(ctx, r * 0.2, -r * 0.35, r * 0.13, '#fff');
        rect(ctx, r * 0.85, -r * 1.3, 0.03, r * 2, '#6b4a2a');
        disc(ctx, r * 0.87, -r * 1.35, r * 0.25, look.detail);
        rect(ctx, r * 0.87 - 0.012, -r * 1.5, 0.024, r * 0.3, look.body);
        rect(ctx, r * 0.87 - r * 0.15, -r * 1.36, r * 0.3, 0.024, look.body);
        break;
      }
      case 'boss': {
        // Big horned brute with a golden crown.
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.05, r * 0.98, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(-r * 0.05, -r * 0.05, r * 0.95, r * 0.88, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#f3e3c3';
        for (const hx of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(hx * r * 0.55, -r * 0.6);
          ctx.quadraticCurveTo(hx * r * 1.2, -r * 1.0, hx * r * 0.95, -r * 1.45);
          ctx.lineTo(hx * r * 0.75, -r * 0.75);
          ctx.fill();
        }
        ctx.fillStyle = look.detail;
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, -r * 0.72);
        ctx.lineTo(-r * 0.4, -r * 1.05);
        ctx.lineTo(-r * 0.2, -r * 0.88);
        ctx.lineTo(0, -r * 1.12);
        ctx.lineTo(r * 0.2, -r * 0.88);
        ctx.lineTo(r * 0.4, -r * 1.05);
        ctx.lineTo(r * 0.4, -r * 0.72);
        ctx.fill();
        disc(ctx, r * 0.15, -r * 0.2, r * 0.17, '#fff');
        disc(ctx, r * 0.5, -r * 0.2, r * 0.15, '#fff');
        disc(ctx, r * 0.2, -r * 0.18, r * 0.08, '#1a1a1a');
        disc(ctx, r * 0.54, -r * 0.18, r * 0.07, '#1a1a1a');
        ctx.fillStyle = '#3a0f2a';
        ctx.fillRect(r * 0.05, r * 0.25, r * 0.6, r * 0.14);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) ctx.fillRect(r * 0.1 + i * r * 0.2, r * 0.25, r * 0.08, r * 0.1);
        break;
      }
      default: {
        // Grunt: round goblin with little horns and an angry brow.
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.92, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(-r * 0.06, -r * 0.06, r * 0.9, r * 0.82, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = look.detail;
        for (const hx of [-0.45, 0.35]) {
          ctx.beginPath();
          ctx.moveTo(hx * r - r * 0.12, -r * 0.7);
          ctx.lineTo(hx * r, -r * 1.15);
          ctx.lineTo(hx * r + r * 0.12, -r * 0.7);
          ctx.fill();
        }
        disc(ctx, r * 0.15, -r * 0.15, r * 0.2, '#fff');
        disc(ctx, r * 0.55, -r * 0.15, r * 0.18, '#fff');
        disc(ctx, r * 0.22, -r * 0.13, r * 0.09, '#1a1a1a');
        disc(ctx, r * 0.6, -r * 0.13, r * 0.08, '#1a1a1a');
        ctx.strokeStyle = '#3a0f12';
        ctx.lineWidth = 0.025;
        ctx.beginPath();
        ctx.moveTo(r * 0.0, -r * 0.42);
        ctx.lineTo(r * 0.75, -r * 0.3);
        ctx.stroke();
        break;
      }
    }

    // Slowed: icy rim; frozen solid: ice block.
    if (frozen) {
      ctx.fillStyle = 'rgba(170,230,255,0.55)';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.rect(-r * 1.15, -r * 1.15, r * 2.3, r * 2.1);
      ctx.fill();
      ctx.stroke();
    } else if (e.isSlowed) {
      ctx.strokeStyle = 'rgba(120,220,255,0.95)';
      ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.arc(0, 0, r + 0.04, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + e.id;
        disc(ctx, Math.cos(a) * r, Math.sin(a) * r, 0.025, '#e6f8ff');
      }
    }
    ctx.restore();
  },

  // ------------------------------------------------------------------ projectiles
  /** Projectile in world frame (direction matters, not uprightness). */
  projectile(ctx, p) {
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const a = Math.atan2(dy, dx);
    switch (p.kind) {
      case 'cannon': {
        // Arc: height from the progress between launch and target.
        const total = Math.hypot(p.tx - p.sx, p.ty - p.sy) || 1;
        const t = 1 - Math.min(1, Math.hypot(dx, dy) / total);
        const h = Math.sin(t * Math.PI) * 0.45 * Math.min(1, total / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 0.05, p.size * 0.9, p.size * 0.4, 0, 0, TAU);
        ctx.fill();
        return h;
      }
      case 'frost': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(a);
        ctx.fillStyle = 'rgba(120,220,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(-0.1, 0, 0.18, 0.06, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#e6f8ff';
        ctx.beginPath();
        ctx.moveTo(0.1, 0);
        ctx.lineTo(0, 0.05);
        ctx.lineTo(-0.08, 0);
        ctx.lineTo(0, -0.05);
        ctx.fill();
        ctx.restore();
        return 0;
      }
      default: {
        // Arrow with fletching.
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(a);
        ctx.strokeStyle = '#5b3a1e';
        ctx.lineWidth = 0.025;
        ctx.beginPath();
        ctx.moveTo(-0.16, 0);
        ctx.lineTo(0.1, 0);
        ctx.stroke();
        ctx.fillStyle = '#d8d8d8';
        ctx.beginPath();
        ctx.moveTo(0.16, 0);
        ctx.lineTo(0.09, 0.035);
        ctx.lineTo(0.09, -0.035);
        ctx.fill();
        ctx.fillStyle = '#e8574a';
        ctx.fillRect(-0.17, -0.03, 0.05, 0.06);
        ctx.restore();
        return 0;
      }
    }
  },
};
