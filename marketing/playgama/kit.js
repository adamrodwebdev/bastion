/**
 * @file Playgama covers of Bastion Tower Defense, painted by the game's own engine:
 * a staged battle on a real level, zoomed in and cropped on the action, with the
 * title on top. `window.kit.cover(width, height)` returns a PNG data URL (used by
 * a render script); the page itself shows the three covers with a save link each.
 */

import { Game, Renderer, LevelCatalog, Difficulty, TowerFactory } from '../../src/core/index.js';

/** Exact sizes asked by Playgama (PNG or JPEG, under 10 MB each). */
export const COVERS = [
  { name: 'cover-landscape-1920x1080', width: 1920, height: 1080 },
  { name: 'cover-portrait-1080x1920', width: 1080, height: 1920 },
  { name: 'cover-square-800x800', width: 800, height: 800 },
];

/** Level whose landscape frames the battle (chapter 1, the meadow: bright and readable). */
const LEVEL = 7;
/** Towers shown, elite and fully upgraded, from the back of the column to its front. */
const TOWERS = ['frost', 'catapult', 'barracks', 'ballista', 'cannon', 'storm', 'archer', 'fire'];
/** Mordrac's column on the road, front first: the chapter's champion leads it. */
const ARMY = ['champion', 'knight', 'shield', 'grunt', 'berserker', 'grunt', 'runner', 'wolf', 'grunt', 'shield'];

// Covers are painted at exact pixel sizes, whatever the screen.
Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });

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
  const lead = game.enemies.find((e) => e.alive && e.type === 'champion') || focus;
  return { game, focus, lead };
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
 * Paints one cover: the battle zoomed in (rotated board for portrait), cropped on
 * the action, then the title.
 * @returns {HTMLCanvasElement}
 */
export function paint(width, height) {
  const { game, focus: middle, lead } = stage();
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
  // A few frames so particles, flags and flames are under way.
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

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  const c = renderer.toScreen(focus.x, focus.y);
  const sx = Math.max(0, Math.min(board.width - width, Math.round(c.x - width / 2)));
  const sy = Math.max(0, Math.min(board.height - height, Math.round(c.y - height * (portrait ? 0.58 : 0.55))));
  ctx.drawImage(board, sx, sy, width, height, 0, 0, width, height);
  title(ctx, width, height, width > height);
  renderer.detach();
  return out;
}

window.kit = {
  ready: document.fonts.load('700 64px Cinzel').then(() => document.fonts.ready),
  /** @returns {Promise<string>} PNG data URL of a cover */
  async cover(width, height) {
    await window.kit.ready;
    return paint(width, height).toDataURL('image/png');
  },
};

window.kit.ready.then(() => {
  const root = document.getElementById('covers');
  for (const { name, width, height } of COVERS) {
    const canvas = paint(width, height);
    const figure = document.createElement('figure');
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${name}.png`;
    link.textContent = `${name}.png`;
    figure.append(canvas, link);
    root.append(figure);
  }
  document.body.dataset.ready = 'true';
});
