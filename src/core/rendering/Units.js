/**
 * @file Enemies and soldiers as small animated figures, drawn in "sprite space"
 * (screen-aligned, 1 unit = 1 tile, origin at the feet, facing right; the caller
 * mirrors the context to face left).
 *
 * Humanoids share one rig (legs, torso or robe, arms, head, helmet, weapon,
 * shield, cape) configured per type; beasts and machines have their own drawing.
 * Every colour goes through `C()`, which turns the figure white for a hit flash.
 */

import { TAU, shade, rgba, INK } from './paint.js';

const SKIN = '#e0aa82';

/** Look of every unit. Humanoid unless `body` says otherwise. */
export const UNIT_LOOKS = {
  grunt: { tunic: '#b03a2e', pants: '#4a3a2c', helmet: 'kettle', weapon: 'spear' },
  runner: { tunic: '#d9822b', pants: '#5a4632', helmet: 'hood', hood: '#8a5220', weapon: 'dagger', lean: 0.18 },
  wolf: { body: 'wolf', fur: '#7d838e' },
  shield: { tunic: '#8a5a2a', pants: '#4a3a2c', helmet: 'kettle', weapon: 'spear', shield: 'tower', shieldColor: '#b07d3a' },
  knight: { tunic: '#4b3b7a', armor: '#5d6270', helmet: 'great', weapon: 'sword', shield: 'kite', shieldColor: '#3a2f5f', bulk: 1.15 },
  priest: { robe: '#2f8a5e', helmet: 'hood', hood: '#1f6a44', weapon: 'censer' },
  warlock: { robe: '#6a2a80', helmet: 'wizard', hood: '#4a1a5c', weapon: 'staff', orb: '#d27bff' },
  crow: { body: 'crow', fur: '#2e323c' },
  wyvern: { body: 'wyvern', fur: '#2f7a6e' },
  sapper: { tunic: '#6e5a3c', pants: '#3c3024', helmet: 'cap', weapon: 'bomb' },
  berserker: { bare: true, pants: '#5a3a2a', helmet: 'horned', weapon: 'axe2', bulk: 1.12 },
  golem: { body: 'golem', fur: '#9fd0ee' },
  ram: { body: 'ram' },
  necromancer: { robe: '#2b1b38', helmet: 'hood', hood: '#1a1024', weapon: 'skullstaff', orb: '#7dff9a' },
  skeleton: { skeleton: true, weapon: 'sword' },
  siege: { body: 'siege' },
  champion: { armor: '#a0a5ae', tunic: '#a32020', helmet: 'great', plume: '#d23c2c', weapon: 'greatsword', cape: '#7e1a1a', bulk: 1.3 },
  mordrac: { armor: '#2a2733', tunic: '#3e1014', helmet: 'crown', weapon: 'greatsword', cape: '#5c0d14', bulk: 1.35, eyes: '#ff4040' },
  // Allies.
  footman: { tunic: '#2f4b7c', trim: '#e9c35f', helmet: 'kettle', weapon: 'sword', shield: 'round', shieldColor: '#2f4b7c' },
  knightAlly: { armor: '#c8ccd4', tunic: '#2f4b7c', helmet: 'great', plume: '#4a9ee0', weapon: 'sword', shield: 'kite', shieldColor: '#e9c35f', bulk: 1.1 },
  militia: { tunic: '#8a6a3e', pants: '#4a3a2a', helmet: 'cap', weapon: 'pitchfork' },
};

/** Visual height (tiles) of a unit of radius r, used to place bars and effects. */
export function unitHeight(type, r) {
  const look = UNIT_LOOKS[type] || {};
  if (look.body === 'ram') return r * 1.4;
  if (look.body === 'siege') return r * 4;
  if (look.body === 'wolf') return r * 1.6;
  if (look.body === 'crow' || look.body === 'wyvern') return r * 1.4;
  return r * 2.35 * (look.body === 'golem' ? 1.05 : 1);
}

/**
 * Draws a unit.
 * @param {CanvasRenderingContext2D} ctx sprite space, origin at the feet
 * @param {string} type key of UNIT_LOOKS
 * @param {number} r radius of the unit (tiles), sets its size
 * @param {object} a animation: { phase, moving, attack (0..1), flash, t, enraged, dead (0..1) }
 */
export function drawUnit(ctx, type, r, a) {
  const look = UNIT_LOOKS[type] || UNIT_LOOKS.grunt;
  const C = a.flash ? () => '#ffffff' : (c) => c;
  switch (look.body) {
    case 'wolf': return wolf(ctx, look, r, a, C);
    case 'crow': return bird(ctx, look, r, a, C, false);
    case 'wyvern': return bird(ctx, look, r, a, C, true);
    case 'golem': return golem(ctx, look, r, a, C);
    case 'ram': return ram(ctx, r, a, C);
    case 'siege': return siege(ctx, r, a, C);
    default: return humanoid(ctx, look, r * 2.35, a, C);
  }
}

// ---------------------------------------------------------------- humanoids

function humanoid(ctx, L, size, a, C) {
  const bulk = L.bulk || 1;
  ctx.save();
  ctx.scale(size, size);
  if (a.dead) {
    const k = Math.min(1, a.dead * 3);
    ctx.rotate(-k * 1.45);
    ctx.translate(0, k * 0.05);
  }
  const walk = a.moving ? Math.sin(a.phase) : 0;
  const bob = a.moving ? Math.abs(Math.cos(a.phase)) * 0.03 : 0;
  if (L.lean) ctx.rotate(L.lean * (a.moving ? 1 : 0.3));
  ctx.translate(0, -bob);
  const lw = 0.05;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const skin = L.skeleton ? '#e6e0cc' : SKIN;
  const tunic = L.tunic || '#777';
  const armor = L.armor;

  // Cape (behind everything).
  if (L.cape) {
    const flow = a.moving ? Math.sin(a.t * 6) * 0.04 : 0;
    ctx.fillStyle = C(L.cape);
    ctx.beginPath();
    ctx.moveTo(-0.1 * bulk, -0.72);
    ctx.quadraticCurveTo(-0.28 * bulk, -0.45, -0.3 * bulk - flow, -0.08);
    ctx.lineTo(-0.02, -0.12);
    ctx.lineTo(0.08 * bulk, -0.72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C(INK);
    ctx.lineWidth = 0.02;
    ctx.stroke();
  }

  // Legs (back leg darker) or robe.
  const hip = -0.42;
  const legLen = 0.42;
  const leg = (dx, swing, dark) => {
    const ang = swing * 0.55;
    const fx = dx + Math.sin(ang) * legLen;
    const fy = hip + Math.cos(ang) * legLen;
    const kx = dx + Math.sin(ang * 0.5) * legLen * 0.5 + (ang < 0 ? 0.02 : 0);
    const ky = hip + legLen * 0.5;
    ctx.strokeStyle = C(L.skeleton ? skin : shade(armor || L.pants || '#3a3a3a', dark ? -0.25 : 0));
    ctx.lineWidth = L.skeleton ? 0.035 : 0.085 * bulk;
    ctx.beginPath();
    ctx.moveTo(dx, hip);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.fillStyle = C(shade(armor || '#2a2018', dark ? -0.2 : 0));
    ctx.beginPath();
    ctx.ellipse(fx + 0.03, fy - 0.015, 0.055 * bulk, 0.03, 0, 0, TAU);
    ctx.fill();
  };
  if (L.robe) {
    const sway = walk * 0.04;
    ctx.fillStyle = C(shade(L.robe, -0.3));
    ctx.beginPath();
    ctx.ellipse(0.04 + walk * 0.05, -0.02, 0.06, 0.03, 0, 0, TAU);
    ctx.ellipse(-0.04 - walk * 0.05, -0.02, 0.06, 0.03, 0, 0, TAU);
    ctx.fill();
    const g = ctx.createLinearGradient(-0.2, 0, 0.2, 0);
    g.addColorStop(0, C(shade(L.robe, 0.15)));
    g.addColorStop(1, C(shade(L.robe, -0.2)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-0.15, -0.72);
    ctx.lineTo(0.15, -0.72);
    ctx.lineTo(0.22 + sway, -0.03);
    ctx.quadraticCurveTo(0, 0.01, -0.22 + sway, -0.03);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C(INK);
    ctx.lineWidth = 0.022;
    ctx.stroke();
    ctx.strokeStyle = C(rgba(shade(L.robe, -0.4), 0.7));
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    ctx.moveTo(0.02, -0.5);
    ctx.lineTo(0.05 + sway, -0.05);
    ctx.stroke();
  } else {
    leg(-0.05 * bulk, -walk, true);
    leg(0.05 * bulk, walk, false);
  }

  // Back arm.
  const shoulder = -0.68;
  const armSwing = a.moving ? -walk * 0.5 : 0;
  ctx.strokeStyle = C(L.skeleton ? skin : shade(armor || (L.bare ? skin : tunic), -0.28));
  ctx.lineWidth = L.skeleton ? 0.03 : 0.065 * bulk;
  ctx.beginPath();
  ctx.moveTo(-0.08 * bulk, shoulder);
  ctx.lineTo(-0.08 * bulk + Math.sin(armSwing) * 0.25, shoulder + Math.cos(armSwing) * 0.25);
  ctx.stroke();

  // Torso.
  if (!L.robe) {
    const w = 0.15 * bulk;
    if (L.skeleton) {
      ctx.strokeStyle = C(skin);
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.moveTo(0, shoulder - 0.02);
      ctx.lineTo(0, hip);
      for (let i = 0; i < 3; i++) {
        const y = shoulder + 0.05 + i * 0.07;
        ctx.moveTo(-0.08, y);
        ctx.quadraticCurveTo(0, y + 0.03, 0.08, y);
      }
      ctx.stroke();
    } else {
      const body = armor || (L.bare ? skin : tunic);
      const g = ctx.createLinearGradient(-w, 0, w, 0);
      g.addColorStop(0, C(shade(body, 0.18)));
      g.addColorStop(1, C(shade(body, -0.22)));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w, shoulder - 0.02);
      ctx.quadraticCurveTo(0, shoulder - 0.07, w, shoulder - 0.02);
      ctx.lineTo(w * 0.85, hip + 0.02);
      ctx.lineTo(-w * 0.85, hip + 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C(INK);
      ctx.lineWidth = 0.022;
      ctx.stroke();
      // Tabard over armour.
      if (armor && L.tunic) {
        ctx.fillStyle = C(L.tunic);
        ctx.beginPath();
        ctx.moveTo(-w * 0.55, shoulder + 0.02);
        ctx.lineTo(w * 0.55, shoulder + 0.02);
        ctx.lineTo(w * 0.5, hip + 0.1);
        ctx.lineTo(-w * 0.5, hip + 0.1);
        ctx.closePath();
        ctx.fill();
      }
      if (L.bare) {
        ctx.strokeStyle = C('#a8613f');
        ctx.lineWidth = 0.012;
        ctx.beginPath();
        ctx.moveTo(-0.05, shoulder + 0.08);
        ctx.lineTo(0.05, shoulder + 0.12);
        ctx.stroke();
      }
      // Belt.
      ctx.fillStyle = C(L.trim || '#3a2a1a');
      ctx.fillRect(-w * 0.9, hip - 0.03, w * 1.8, 0.04);
    }
  }

  // Head.
  const hy = -0.84;
  const hr = 0.1 * (L.bulk ? 1 + (L.bulk - 1) * 0.4 : 1);
  ctx.fillStyle = C(skin);
  ctx.beginPath();
  ctx.arc(0.01, hy, hr, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = C(INK);
  ctx.lineWidth = 0.02;
  ctx.stroke();
  if (L.skeleton) {
    ctx.fillStyle = C('#1a1a1a');
    ctx.beginPath();
    ctx.arc(0.045, hy - 0.01, 0.022, 0, TAU);
    ctx.arc(-0.01, hy - 0.01, 0.022, 0, TAU);
    ctx.fill();
  } else if (L.helmet !== 'great' && L.helmet !== 'crown') {
    ctx.fillStyle = C('#2a1d14');
    ctx.fillRect(0.05, hy - 0.02, 0.022, 0.025);
  }
  helmet(ctx, L, hy, hr, C, a);

  // Front arm and weapon.
  const attack = a.attack || 0;
  const swingAng = attack > 0 ? -2.3 + attack * 3.0 : 0.35 + (a.moving ? walk * 0.35 : 0);
  const hx = 0.08 * bulk + Math.sin(swingAng + Math.PI / 2) * 0.24;
  const hyy = shoulder - Math.cos(swingAng + Math.PI / 2) * 0.24;
  ctx.strokeStyle = C(L.skeleton ? skin : armor || (L.bare ? skin : shade(tunic, -0.05)));
  ctx.lineWidth = L.skeleton ? 0.03 : 0.065 * bulk;
  ctx.beginPath();
  ctx.moveTo(0.08 * bulk, shoulder);
  ctx.lineTo(hx, hyy);
  ctx.stroke();
  weapon(ctx, L, hx, hyy, swingAng, C, a, bulk);
  ctx.fillStyle = C(L.skeleton ? skin : armor ? shade(armor, -0.1) : SKIN);
  ctx.beginPath();
  ctx.arc(hx, hyy, 0.035 * bulk, 0, TAU);
  ctx.fill();

  // Shield (near side).
  if (L.shield) shieldDraw(ctx, L, C, bulk);

  // Glowing eyes (Mordrac).
  if (L.eyes) {
    ctx.fillStyle = L.eyes;
    ctx.beginPath();
    ctx.arc(0.05, hy - 0.005, 0.018, 0, TAU);
    ctx.arc(0.0, hy - 0.005, 0.018, 0, TAU);
    ctx.fill();
  }
  if (a.enraged) {
    ctx.strokeStyle = 'rgba(255,40,40,0.7)';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.arc(0, -0.5, 0.5, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function helmet(ctx, L, hy, hr, C, a) {
  const metal = C('#8f95a0');
  ctx.strokeStyle = C(INK);
  ctx.lineWidth = 0.018;
  switch (L.helmet) {
    case 'kettle':
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.arc(0.01, hy - 0.01, hr * 1.02, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0.01, hy - 0.01, hr * 1.55, hr * 0.28, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    case 'great':
      ctx.fillStyle = C(L.armor ? shade(L.armor, 0.1) : '#9aa0aa');
      ctx.beginPath();
      ctx.moveTo(-hr, hy + hr * 0.9);
      ctx.lineTo(-hr, hy - hr * 0.6);
      ctx.quadraticCurveTo(0, hy - hr * 1.5, hr * 1.1, hy - hr * 0.6);
      ctx.lineTo(hr * 1.1, hy + hr * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C('#14121a');
      ctx.fillRect(-hr * 0.2, hy - hr * 0.15, hr * 1.25, hr * 0.18);
      if (L.plume) {
        const sway = a.moving ? Math.sin(a.t * 7) * 0.02 : 0;
        ctx.fillStyle = C(L.plume);
        ctx.beginPath();
        ctx.moveTo(0, hy - hr * 1.15);
        ctx.quadraticCurveTo(-0.12 + sway, hy - hr * 2.2, -0.2 + sway, hy - hr * 0.9);
        ctx.quadraticCurveTo(-0.08, hy - hr * 1.4, 0, hy - hr * 1.15);
        ctx.fill();
      }
      break;
    case 'hood':
      ctx.fillStyle = C(L.hood || '#444');
      ctx.beginPath();
      ctx.moveTo(-hr * 1.2, hy + hr * 1.1);
      ctx.quadraticCurveTo(-hr * 1.3, hy - hr * 1.5, hr * 0.4, hy - hr * 1.25);
      ctx.quadraticCurveTo(hr * 1.4, hy - hr * 0.6, hr * 0.9, hy - hr * 0.05);
      ctx.quadraticCurveTo(hr * 0.3, hy - hr * 0.7, -hr * 0.2, hy + hr * 0.2);
      ctx.lineTo(-hr * 0.3, hy + hr * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'wizard':
      ctx.fillStyle = C(L.hood || '#444');
      ctx.beginPath();
      ctx.ellipse(0.01, hy - hr * 0.55, hr * 1.6, hr * 0.32, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-hr * 0.85, hy - hr * 0.6);
      ctx.quadraticCurveTo(-hr * 0.2, hy - hr * 2.6, -hr * 1.4, hy - hr * 3.1);
      ctx.quadraticCurveTo(hr * 0.6, hy - hr * 2.2, hr * 0.85, hy - hr * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'cap':
      ctx.fillStyle = C('#6a4a2a');
      ctx.beginPath();
      ctx.arc(0.01, hy - 0.015, hr * 1.02, Math.PI * 1.05, -0.05);
      ctx.lineTo(hr * 1.6, hy - 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'horned':
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.arc(0.01, hy - 0.01, hr * 1.02, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C('#efe6d0');
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0.01 + s * hr * 0.8, hy - hr * 0.3);
        ctx.quadraticCurveTo(0.01 + s * hr * 1.8, hy - hr * 0.6, 0.01 + s * hr * 1.6, hy - hr * 1.7);
        ctx.quadraticCurveTo(0.01 + s * hr * 1.2, hy - hr * 0.8, 0.01 + s * hr * 0.4, hy - hr * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'crown':
      ctx.fillStyle = C(L.armor || '#222');
      ctx.beginPath();
      ctx.arc(0.01, hy, hr * 1.08, Math.PI * 0.9, Math.PI * 2.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C('#9a1a1a');
      ctx.beginPath();
      ctx.moveTo(-hr * 1.1, hy - hr * 0.6);
      for (let i = 0; i < 5; i++) {
        const x = -hr * 1.1 + (i + 0.5) * ((hr * 2.3) / 5);
        ctx.lineTo(x, hy - hr * (i % 2 ? 1.4 : 2.0));
        ctx.lineTo(x + (hr * 2.3) / 10, hy - hr * 0.9);
      }
      ctx.lineTo(hr * 1.2, hy - hr * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    default:
  }
}

function weapon(ctx, L, hx, hy, ang, C, a, bulk) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.lineCap = 'round';
  const steel = C(L.skeleton ? '#8a7a5a' : '#d8dde5');
  switch (L.weapon) {
    case 'spear':
      ctx.rotate(-0.25);
      ctx.strokeStyle = C('#7a5230');
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      ctx.moveTo(-0.05, 0.3);
      ctx.lineTo(0.08, -0.62);
      ctx.stroke();
      ctx.fillStyle = steel;
      ctx.beginPath();
      ctx.moveTo(0.08, -0.62);
      ctx.lineTo(0.12, -0.52);
      ctx.lineTo(0.05, -0.54);
      ctx.closePath();
      ctx.fill();
      break;
    case 'sword':
    case 'greatsword': {
      const len = L.weapon === 'greatsword' ? 0.62 : 0.4;
      ctx.rotate(ang - 0.6);
      ctx.strokeStyle = steel;
      ctx.lineWidth = L.weapon === 'greatsword' ? 0.05 : 0.035;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -len);
      ctx.stroke();
      ctx.strokeStyle = C('#8a6a2a');
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.moveTo(-0.06, -0.02);
      ctx.lineTo(0.06, -0.02);
      ctx.stroke();
      if (a.attack > 0.2 && a.attack < 0.8 && !a.flash) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.arc(0, 0, len * 0.9, -Math.PI / 2 - 0.8, -Math.PI / 2);
        ctx.stroke();
      }
      break;
    }
    case 'dagger':
      ctx.rotate(ang - 0.4);
      ctx.strokeStyle = steel;
      ctx.lineWidth = 0.028;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -0.18);
      ctx.stroke();
      break;
    case 'axe2':
      for (const off of [0, -0.12]) {
        ctx.save();
        ctx.translate(off, off * 0.3);
        ctx.rotate(ang - 0.5 + off * 3);
        ctx.strokeStyle = C('#6a4a2a');
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.moveTo(0, 0.05);
        ctx.lineTo(0, -0.34);
        ctx.stroke();
        ctx.fillStyle = steel;
        ctx.beginPath();
        ctx.moveTo(0, -0.34);
        ctx.quadraticCurveTo(0.16, -0.32, 0.14, -0.18);
        ctx.lineTo(0, -0.22);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    case 'staff':
    case 'skullstaff': {
      ctx.strokeStyle = C('#4a3020');
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.moveTo(0, 0.35);
      ctx.lineTo(0.02, -0.5);
      ctx.stroke();
      const pulse = 0.6 + 0.4 * Math.sin(a.t * 4);
      const g = ctx.createRadialGradient(0.02, -0.55, 0, 0.02, -0.55, 0.16);
      g.addColorStop(0, rgba(L.orb, 0.8 * pulse));
      g.addColorStop(1, rgba(L.orb, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-0.15, -0.72, 0.34, 0.34);
      if (L.weapon === 'skullstaff') {
        ctx.fillStyle = C('#e6e0cc');
        ctx.beginPath();
        ctx.arc(0.02, -0.56, 0.055, 0, TAU);
        ctx.fill();
        ctx.fillStyle = L.orb;
        ctx.fillRect(0.0, -0.57, 0.016, 0.016);
        ctx.fillRect(0.03, -0.57, 0.016, 0.016);
      } else {
        ctx.fillStyle = C(L.orb);
        ctx.beginPath();
        ctx.arc(0.02, -0.55, 0.05, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'censer': {
      const sw = Math.sin(a.t * 3) * 0.5;
      ctx.strokeStyle = C('#b8a060');
      ctx.lineWidth = 0.012;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(sw) * 0.2, Math.cos(sw) * 0.2);
      ctx.stroke();
      ctx.fillStyle = C('#d4b45a');
      ctx.beginPath();
      ctx.arc(Math.sin(sw) * 0.22, Math.cos(sw) * 0.22, 0.045, 0, TAU);
      ctx.fill();
      break;
    }
    case 'bomb': {
      ctx.fillStyle = C('#5a3a20');
      ctx.beginPath();
      ctx.ellipse(0.06, 0.02, 0.1, 0.12, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = C(INK);
      ctx.lineWidth = 0.015;
      ctx.stroke();
      ctx.strokeStyle = C('#2a2a2a');
      ctx.beginPath();
      ctx.moveTo(-0.04, -0.03);
      ctx.lineTo(0.16, -0.03);
      ctx.moveTo(-0.04, 0.07);
      ctx.lineTo(0.16, 0.07);
      ctx.stroke();
      // Lit fuse.
      ctx.strokeStyle = C('#ddd');
      ctx.lineWidth = 0.01;
      ctx.beginPath();
      ctx.moveTo(0.06, -0.1);
      ctx.quadraticCurveTo(0.1, -0.18, 0.06, -0.22);
      ctx.stroke();
      if (!a.flash) {
        ctx.fillStyle = Math.sin(a.t * 30) > 0 ? '#ffd23a' : '#ff6a1a';
        ctx.beginPath();
        ctx.arc(0.06, -0.23, 0.025, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'pitchfork':
      ctx.rotate(-0.3);
      ctx.strokeStyle = C('#8a6038');
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      ctx.moveTo(-0.04, 0.25);
      ctx.lineTo(0.06, -0.5);
      ctx.stroke();
      ctx.strokeStyle = steel;
      ctx.lineWidth = 0.014;
      ctx.beginPath();
      for (const d of [-0.04, 0, 0.04]) {
        ctx.moveTo(0.06 + d, -0.5);
        ctx.lineTo(0.065 + d * 1.1, -0.62);
      }
      ctx.moveTo(0.02, -0.5);
      ctx.lineTo(0.1, -0.5);
      ctx.stroke();
      break;
    default:
  }
  ctx.restore();
}

function shieldDraw(ctx, L, C, bulk) {
  const color = C(L.shieldColor || '#8a5a2a');
  ctx.strokeStyle = C(INK);
  ctx.lineWidth = 0.022;
  const x = 0.16 * bulk;
  const y = -0.5;
  if (L.shield === 'tower') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 0.06, y - 0.28);
    ctx.lineTo(x + 0.08, y - 0.3);
    ctx.lineTo(x + 0.09, y + 0.3);
    ctx.lineTo(x - 0.05, y + 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = C('#5a5f68');
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(x - 0.055, y);
    ctx.lineTo(x + 0.085, y - 0.01);
    ctx.stroke();
  } else if (L.shield === 'kite') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 0.08, y - 0.15);
    ctx.quadraticCurveTo(x + 0.01, y - 0.2, x + 0.1, y - 0.15);
    ctx.quadraticCurveTo(x + 0.08, y + 0.08, x + 0.01, y + 0.22);
    ctx.quadraticCurveTo(x - 0.06, y + 0.08, x - 0.08, y - 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = C('#e9c35f');
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    ctx.moveTo(x + 0.01, y - 0.15);
    ctx.lineTo(x + 0.01, y + 0.15);
    ctx.moveTo(x - 0.05, y - 0.06);
    ctx.lineTo(x + 0.07, y - 0.06);
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 0.01, y, 0.13, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C('#e9c35f');
    ctx.beginPath();
    ctx.arc(x + 0.01, y, 0.035, 0, TAU);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- beasts & machines

function wolf(ctx, L, r, a, C) {
  const s = r * 2.4;
  ctx.save();
  ctx.scale(s, s);
  if (a.dead) ctx.scale(1, 1 - Math.min(0.5, a.dead));
  const gait = a.moving ? a.phase : 0;
  const bob = a.moving ? Math.abs(Math.sin(gait)) * 0.04 : 0;
  ctx.translate(0, -bob);
  ctx.lineCap = 'round';
  const fur = L.fur;
  // Legs.
  const legPair = (x, ph, dark) => {
    ctx.strokeStyle = C(shade(fur, dark ? -0.3 : -0.1));
    ctx.lineWidth = 0.06;
    for (const k of [0, Math.PI]) {
      const sw = Math.sin(gait + ph + k) * 0.35;
      ctx.beginPath();
      ctx.moveTo(x, -0.28);
      ctx.lineTo(x + Math.sin(sw) * 0.26, -0.28 + Math.cos(sw) * 0.27);
      ctx.stroke();
    }
  };
  legPair(-0.2, 0, true);
  legPair(0.18, Math.PI / 2, true);
  // Tail.
  const wag = a.moving ? Math.sin(a.t * 10) * 0.1 : 0;
  ctx.strokeStyle = C(fur);
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  ctx.moveTo(-0.3, -0.36);
  ctx.quadraticCurveTo(-0.48, -0.4 + wag, -0.55, -0.28 + wag);
  ctx.stroke();
  // Body.
  const g = ctx.createLinearGradient(0, -0.5, 0, -0.2);
  g.addColorStop(0, C(shade(fur, 0.2)));
  g.addColorStop(1, C(shade(fur, -0.25)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(-0.02, -0.35, 0.32, 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = C(INK);
  ctx.lineWidth = 0.02;
  ctx.stroke();
  // Head.
  ctx.fillStyle = C(fur);
  ctx.beginPath();
  ctx.moveTo(0.22, -0.45);
  ctx.lineTo(0.48, -0.36);
  ctx.lineTo(0.45, -0.31);
  ctx.lineTo(0.25, -0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.27, -0.42, 0.09, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.22, -0.48);
  ctx.lineTo(0.24, -0.6);
  ctx.lineTo(0.3, -0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C('#ffd23a');
  ctx.beginPath();
  ctx.arc(0.31, -0.43, 0.018, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C('#111');
  ctx.beginPath();
  ctx.arc(0.475, -0.355, 0.02, 0, TAU);
  ctx.fill();
  legPair(-0.16, 0.6, false);
  legPair(0.22, Math.PI / 2 + 0.6, false);
  ctx.restore();
}

function bird(ctx, L, r, a, C, dragon) {
  const s = r * (dragon ? 2.2 : 2.4);
  ctx.save();
  ctx.scale(s, s);
  const flap = Math.sin(a.t * (dragon ? 7 : 13) + (a.seed || 0));
  const fur = L.fur;
  ctx.strokeStyle = C(INK);
  ctx.lineWidth = 0.02;
  ctx.lineJoin = 'round';
  const wing = (back) => {
    const lift = flap * 0.35 * (back ? 0.8 : 1);
    ctx.fillStyle = C(back ? shade(fur, -0.3) : shade(fur, 0.05));
    ctx.beginPath();
    ctx.moveTo(-0.05, -0.05);
    if (dragon) {
      ctx.lineTo(-0.15, -0.3 - lift);
      ctx.lineTo(-0.55, -0.45 - lift * 1.4);
      ctx.quadraticCurveTo(-0.5, -0.2 - lift * 0.5, -0.62, -0.05 - lift * 0.3);
      ctx.quadraticCurveTo(-0.4, -0.08, -0.35, 0.02);
      ctx.quadraticCurveTo(-0.2, -0.02, -0.05, 0.05);
    } else {
      ctx.quadraticCurveTo(-0.25, -0.25 - lift, -0.5, -0.18 - lift * 1.3);
      ctx.quadraticCurveTo(-0.3, -0.05 - lift * 0.3, -0.05, 0.05);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  ctx.translate(0, flap * 0.03);
  wing(true);
  // Tail.
  ctx.fillStyle = C(shade(fur, -0.15));
  ctx.beginPath();
  if (dragon) {
    ctx.moveTo(-0.15, 0.0);
    ctx.quadraticCurveTo(-0.45, 0.12, -0.6, 0.02);
    ctx.lineTo(-0.66, 0.08);
    ctx.lineTo(-0.56, 0.06);
    ctx.quadraticCurveTo(-0.4, 0.2, -0.1, 0.06);
  } else {
    ctx.moveTo(-0.15, 0);
    ctx.lineTo(-0.35, -0.06);
    ctx.lineTo(-0.35, 0.08);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  // Body and head.
  const g = ctx.createLinearGradient(0, -0.12, 0, 0.12);
  g.addColorStop(0, C(shade(fur, 0.2)));
  g.addColorStop(1, C(shade(fur, -0.2)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.22, 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (dragon) {
    ctx.beginPath();
    ctx.moveTo(0.15, -0.04);
    ctx.quadraticCurveTo(0.3, -0.2, 0.38, -0.18);
    ctx.lineTo(0.5, -0.14);
    ctx.lineTo(0.38, -0.1);
    ctx.quadraticCurveTo(0.3, -0.08, 0.18, 0.05);
    ctx.closePath();
    ctx.fillStyle = C(fur);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C('#ffd23a');
    ctx.beginPath();
    ctx.arc(0.4, -0.16, 0.015, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = C(fur);
    ctx.beginPath();
    ctx.arc(0.2, -0.04, 0.08, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C('#e0b040');
    ctx.beginPath();
    ctx.moveTo(0.27, -0.06);
    ctx.lineTo(0.36, -0.03);
    ctx.lineTo(0.27, -0.01);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C('#fff');
    ctx.beginPath();
    ctx.arc(0.22, -0.06, 0.014, 0, TAU);
    ctx.fill();
  }
  wing(false);
  ctx.restore();
}

function golem(ctx, L, r, a, C) {
  const s = r * 2.3;
  ctx.save();
  ctx.scale(s, s);
  if (a.dead) ctx.scale(1, 1 - Math.min(0.6, a.dead));
  const step = a.moving ? Math.sin(a.phase) : 0;
  const stomp = a.moving ? Math.abs(Math.sin(a.phase)) * 0.025 : 0;
  ctx.translate(0, -stomp);
  const ice = L.fur;
  const chunk = (pts, tone) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = C(shade(ice, tone));
    ctx.fill();
    ctx.strokeStyle = C('#3c5a74');
    ctx.lineWidth = 0.022;
    ctx.stroke();
  };
  // Legs.
  chunk([[-0.2 + step * 0.06, 0], [-0.04 + step * 0.06, 0], [-0.06, -0.3], [-0.2, -0.3]], -0.25);
  chunk([[0.04 - step * 0.06, 0], [0.2 - step * 0.06, 0], [0.2, -0.3], [0.06, -0.3]], -0.15);
  // Back arm.
  chunk([[-0.32, -0.72], [-0.2, -0.75], [-0.24 - step * 0.05, -0.32], [-0.38 - step * 0.05, -0.36]], -0.3);
  // Torso.
  chunk([[-0.26, -0.28], [0.26, -0.3], [0.32, -0.66], [0.1, -0.82], [-0.22, -0.78], [-0.3, -0.55]], 0.05);
  ctx.fillStyle = C('rgba(255,255,255,0.45)');
  ctx.beginPath();
  ctx.moveTo(-0.18, -0.72);
  ctx.lineTo(0.0, -0.76);
  ctx.lineTo(-0.1, -0.58);
  ctx.closePath();
  ctx.fill();
  // Head.
  chunk([[-0.1, -0.8], [0.12, -0.82], [0.14, -0.98], [-0.06, -1.0]], 0.15);
  if (!a.flash) {
    ctx.fillStyle = '#7ff3ff';
    ctx.fillRect(0.02, -0.93, 0.04, 0.025);
    ctx.fillRect(0.08, -0.93, 0.03, 0.025);
  }
  // Front arm (boulder fist).
  chunk([[0.24, -0.7], [0.36, -0.66], [0.38 + step * 0.05, -0.3], [0.22 + step * 0.05, -0.32]], 0);
  ctx.restore();
}

function wheel(ctx, x, y, rad, rot, C) {
  ctx.fillStyle = C('#4a3220');
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = C('#2a2a30');
  ctx.lineWidth = rad * 0.25;
  ctx.stroke();
  ctx.strokeStyle = C('#8a6038');
  ctx.lineWidth = rad * 0.15;
  for (let i = 0; i < 3; i++) {
    const ang = rot + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(ang) * rad * 0.8, y - Math.sin(ang) * rad * 0.8);
    ctx.lineTo(x + Math.cos(ang) * rad * 0.8, y + Math.sin(ang) * rad * 0.8);
    ctx.stroke();
  }
}

function ram(ctx, r, a, C) {
  const s = r * 2.2;
  ctx.save();
  ctx.scale(s, s);
  const rot = a.phase * 0.8;
  const thrust = Math.max(0, Math.sin(a.t * 2.5)) * 0.05;
  // Log with iron head.
  ctx.fillStyle = C('#6a4426');
  ctx.fillRect(-0.3 + thrust, -0.3, 0.7, 0.09);
  ctx.fillStyle = C('#4a4f58');
  ctx.beginPath();
  ctx.moveTo(0.4 + thrust, -0.33);
  ctx.lineTo(0.52 + thrust, -0.3);
  ctx.lineTo(0.52 + thrust, -0.18);
  ctx.lineTo(0.4 + thrust, -0.18);
  ctx.closePath();
  ctx.fill();
  // Roofed frame.
  ctx.fillStyle = C('#8a5a2b');
  ctx.beginPath();
  ctx.moveTo(-0.42, -0.14);
  ctx.lineTo(-0.36, -0.48);
  ctx.lineTo(0.32, -0.48);
  ctx.lineTo(0.4, -0.14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C(INK);
  ctx.lineWidth = 0.022;
  ctx.stroke();
  ctx.strokeStyle = C('rgba(60,35,15,0.6)');
  ctx.lineWidth = 0.014;
  for (let y = -0.42; y < -0.14; y += 0.07) {
    ctx.beginPath();
    ctx.moveTo(-0.4, y);
    ctx.lineTo(0.38, y);
    ctx.stroke();
  }
  // Hide (skins) on the roof.
  ctx.fillStyle = C('#a07a4a');
  ctx.beginPath();
  ctx.moveTo(-0.38, -0.47);
  ctx.quadraticCurveTo(-0.02, -0.6, 0.34, -0.47);
  ctx.lineTo(0.3, -0.42);
  ctx.quadraticCurveTo(-0.02, -0.52, -0.34, -0.42);
  ctx.closePath();
  ctx.fill();
  wheel(ctx, -0.26, -0.08, 0.09, rot, C);
  wheel(ctx, 0.24, -0.08, 0.09, rot, C);
  ctx.restore();
}

function siege(ctx, r, a, C) {
  const s = r * 2.2;
  ctx.save();
  ctx.scale(s, s);
  const sway = a.moving ? Math.sin(a.t * 2) * 0.02 : 0;
  const rot = a.phase * 0.8;
  ctx.save();
  ctx.rotate(sway);
  const g = ctx.createLinearGradient(-0.3, 0, 0.3, 0);
  g.addColorStop(0, C('#a07448'));
  g.addColorStop(1, C('#5e3e22'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-0.32, -0.12);
  ctx.lineTo(-0.26, -1.25);
  ctx.lineTo(0.26, -1.25);
  ctx.lineTo(0.32, -0.12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C(INK);
  ctx.lineWidth = 0.022;
  ctx.stroke();
  ctx.strokeStyle = C('rgba(50,30,15,0.6)');
  ctx.lineWidth = 0.014;
  for (let y = -1.15; y < -0.12; y += 0.12) {
    ctx.beginPath();
    ctx.moveTo(-0.32, y);
    ctx.lineTo(0.32, y);
    ctx.stroke();
  }
  // Drawbridge and battlement.
  ctx.fillStyle = C('#6a4426');
  ctx.fillRect(-0.3, -1.38, 0.6, 0.14);
  ctx.fillStyle = C('#4a2f1a');
  for (let i = 0; i < 4; i++) ctx.fillRect(-0.3 + i * 0.17, -1.46, 0.09, 0.09);
  ctx.fillStyle = C('#2a1d14');
  ctx.fillRect(-0.1, -1.1, 0.2, 0.2);
  // Mordrac's banner.
  ctx.strokeStyle = C('#2a1d14');
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(0.25, -1.46);
  ctx.lineTo(0.25, -1.8);
  ctx.stroke();
  ctx.fillStyle = C('#1e1a22');
  const wave = Math.sin(a.t * 6) * 0.03;
  ctx.beginPath();
  ctx.moveTo(0.25, -1.8);
  ctx.lineTo(0.5, -1.76 + wave);
  ctx.lineTo(0.25, -1.66);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  wheel(ctx, -0.22, -0.08, 0.1, rot, C);
  wheel(ctx, 0.22, -0.08, 0.1, rot, C);
  ctx.restore();
}
