/**
 * @file Portal media of Bastion Tower Defense, painted and filmed by the game's own
 * engine (no image or video file is drawn by hand): a staged battle on a real level,
 * zoomed in and cropped on the action, with the title. Covers are `paint`ed; preview
 * videos are `film`ed: they open on the cover itself, then the battle runs in real
 * time while the title fades away and fresh columns keep marching into the towers.
 * Used by the kit pages of each portal (never shipped in the game).
 */

import { Game, Renderer, LevelCatalog, Difficulty, TowerFactory } from '../../src/core/index.js';

/** Level whose landscape frames the battle (chapter 1, the meadow: bright and readable). */
const LEVEL = 7;
/** Towers shown, elite and fully upgraded, from the back of the column to its front. */
const TOWERS = ['frost', 'catapult', 'barracks', 'ballista', 'cannon', 'storm', 'archer', 'fire'];
/** Mordrac's column on the road, front first: the chapter's champion leads it. */
const ARMY = ['champion', 'knight', 'shield', 'grunt', 'berserker', 'grunt', 'runner', 'wolf', 'grunt', 'shield'];

// Media are painted at exact pixel sizes, whatever the screen.
Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });

/** Fonts the title needs, loaded before anything is painted. */
export const ready = document.fonts.load('700 64px Cinzel').then(() => document.fonts.ready);

/** Builds the staged battle and lets it run until arrows, frost and fire fly. */
function stage() {
  const level = LevelCatalog.byNumber(LEVEL);
  level.towers = TowerFactory.types();
  const all = TowerFactory.types();
  const game = new Game({ level, difficulty: Difficulty.get('normal'), loadout: [], mods: { elite: all }, seed: 'cover' });
  game.players[0].gold = 1e9;
  const path = game.map.paths[0];

  // The army marches up the road, its champion in front; towers line the road around it.
  const front = path.length * 0.56;
  const placed = [];
  for (let d = front - 6.5, i = 0; d < front + 1.5 && i < TOWERS.length; d += 0.8) {
    const p = path.pointAt(d);
    const normal = { x: -Math.sin(p.angle), y: Math.cos(p.angle) };
    for (const side of i % 2 ? [1, -1] : [-1, 1]) {
      const col = Math.floor(p.x + normal.x * side * 1.05);
      const row = Math.floor(p.y + normal.y * side * 1.05);
      if (!game.map.isBuildable(col, row) || placed.some((t) => Math.abs(t.col - col) + Math.abs(t.row - row) < 2)) continue;
      const tower = game.buildTower(TOWERS[i], col, row);
      if (!tower) continue;
      while (tower.canUpgrade) game.upgradeTower(tower);
      placed.push(tower);
      i++;
      break;
    }
  }
  game.startWave();
  ARMY.forEach((type, i) => game.spawnEnemy(type, { distance: Math.max(0.5, front - i * 0.55) }));
  for (let i = 0; i < 60 * 2.2; i++) game.update(1 / 60);
  // Frame: the middle of the towers and of the army.
  const points = [...placed, ...game.enemies.filter((e) => e.alive)];
  const focus = {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  };
  // The champion leading the column: square covers frame it too.
  const champion = game.enemies.find((e) => e.alive && e.type === 'champion');
  const lead = champion ? { x: champion.x, y: champion.y } : focus;
  return { game, focus, lead, front };
}

/** Title: "BASTION" in the game's display face, "TOWER DEFENSE" under it. */
function title(ctx, width, height, landscape) {
  const size = Math.round(landscape ? height * 0.2 : width * 0.17);
  const top = Math.round(height * (landscape ? 0.06 : 0.05));
  const band = ctx.createLinearGradient(0, 0, 0, top + size * 2.4);
  band.addColorStop(0, 'rgba(18, 14, 30, 0.82)');
  band.addColorStop(0.65, 'rgba(18, 14, 30, 0.45)');
  band.addColorStop(1, 'rgba(18, 14, 30, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, width, top + size * 2.4);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `700 ${size}px Cinzel`;
  ctx.letterSpacing = `${Math.round(size * 0.06)}px`;
  const gold = ctx.createLinearGradient(0, top, 0, top + size);
  gold.addColorStop(0, '#fff3cc');
  gold.addColorStop(0.55, '#e9c35f');
  gold.addColorStop(1, '#a8771c');
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineWidth = size * 0.1;
  ctx.strokeStyle = '#1e1a2b';
  ctx.strokeText('BASTION', width / 2, top);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = gold;
  ctx.fillText('BASTION', width / 2, top);

  const sub = Math.round(size * 0.3);
  ctx.font = `700 ${sub}px Cinzel`;
  ctx.letterSpacing = `${Math.round(sub * 0.35)}px`;
  ctx.lineWidth = sub * 0.22;
  ctx.strokeText('TOWER DEFENSE', width / 2, top + size * 1.08);
  ctx.fillStyle = '#f6efe0';
  ctx.fillText('TOWER DEFENSE', width / 2, top + size * 1.08);
  ctx.letterSpacing = '0px';
}

/**
 * The staged battle on a board zoomed in for this size (rotated for portrait), a few
 * frames in, so particles, flags and flames are under way: the moment of the cover.
 */
function shoot(width, height) {
  const { game, focus: middle, lead, front } = stage();
  const portrait = height > width;
  const square = width === height;
  const focus = square ? { x: (middle.x + lead.x) / 2, y: (middle.y + lead.y) / 2 } : middle;
  const zoom = portrait ? 1.5 : square ? 1.6 : 1.35;
  const tile = Math.round(((portrait ? width : height) * zoom) / 9);
  const board = document.createElement('canvas');
  const renderer = new Renderer(board, game.level);
  renderer.setMode('light');
  renderer.setOptions({ gore: false, particles: true });
  renderer.attach(game);
  renderer.resize(portrait ? tile * 9 : tile * 16, portrait ? tile * 16 : tile * 9, portrait);
  for (let i = 0; i < 24; i++) {
    game.update(1 / 60);
    // Floating gold numbers would read as noise on a cover.
    game.effects = game.effects.filter((e) => e.kind !== 'text');
    if (i === 23) {
      // Last frame: no white hit flash nor frost tint, the figures in their own colours.
      for (const e of game.enemies) {
        e.hitFlash = 0;
        e.slowTimer = 0;
        e.slowFactor = 1;
      }
    }
    renderer.render(game, {});
  }
  return { game, renderer, board, focus, lead, front, portrait, width, height };
}

/** Copies the part of the board around `focus` onto the output. */
function frame(ctx, shot, focus) {
  const { board, renderer, portrait, width, height } = shot;
  const c = renderer.toScreen(focus.x, focus.y);
  const sx = Math.max(0, Math.min(board.width - width, Math.round(c.x - width / 2)));
  const sy = Math.max(0, Math.min(board.height - height, Math.round(c.y - height * (portrait ? 0.58 : 0.55))));
  ctx.drawImage(board, sx, sy, width, height, 0, 0, width, height);
}

/**
 * Paints one cover: the battle zoomed in, cropped on the action, then the title.
 * @returns {HTMLCanvasElement}
 */
export function paint(width, height) {
  const shot = shoot(width, height);
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  frame(ctx, shot, shot.focus);
  title(ctx, width, height, width > height);
  shot.renderer.detach();
  return out;
}

/** Video formats, best first: MP4 (H.264) where the browser records it, else WebM. */
const FORMATS = ['video/mp4;codecs=avc1.640033', 'video/mp4;codecs=avc1.4d0033', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];

/**
 * Films a silent preview video in real time (no fast-forward): the cover as its
 * first frame, then the battle. The title fades away, the camera drifts slowly
 * towards the head of the column, and a fresh column marches in every few seconds.
 * @returns {Promise<Blob>}
 */
export async function film(width, height, seconds = 18) {
  await ready;
  const still = paint(width, height);
  const shot = shoot(width, height);
  const { game, renderer, focus, lead, front } = shot;
  // The battle never ends while filming.
  game.lives = 1e6;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  ctx.drawImage(still, 0, 0);

  const type = FORMATS.find((t) => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(out.captureStream(30), { mimeType: type, videoBitsPerSecond: 12_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });
  recorder.start(1000);

  const HOLD = 0.8;
  const FADE = 1.4;
  const ease = (k) => k * k * (3 - 2 * k);
  const column = () => ARMY.forEach((type, i) => game.spawnEnemy(type, { distance: Math.max(0.5, front - 7 - i * 0.55) }));
  const start = performance.now();
  let last = start;
  let spare = 0;
  let nextColumn = 1.6;
  await new Promise((resolve) => {
    const tick = (now) => {
      const t = (now - start) / 1000;
      if (t >= seconds) {
        resolve();
        return;
      }
      if (t < HOLD) ctx.drawImage(still, 0, 0);
      else {
        spare += Math.min(0.1, (now - last) / 1000);
        while (spare >= 1 / 60) {
          game.update(1 / 60);
          spare -= 1 / 60;
        }
        if (t - HOLD > nextColumn) {
          column();
          nextColumn += 2.6;
        }
        renderer.render(game, {});
        const k = ease(Math.min(1, (t - HOLD) / (seconds - HOLD)));
        frame(ctx, shot, { x: focus.x + (lead.x - focus.x) * 0.45 * k, y: focus.y + (lead.y - focus.y) * 0.45 * k });
        const fade = 1 - Math.min(1, (t - HOLD) / FADE);
        if (fade > 0) {
          ctx.save();
          ctx.globalAlpha = fade;
          title(ctx, width, height, width > height);
          ctx.restore();
        }
      }
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await stopped;
  renderer.detach();
  return new Blob(chunks, { type });
}
