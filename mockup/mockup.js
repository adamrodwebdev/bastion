/**
 * @file Living mockup of Bastion's next iteration: the real engine and renderer run two
 * battles (desktop and phone) under the proposed UI (radial build menu, early-call flag,
 * boss bar, plaque HUD). Bundled into one HTML file by scripts/build-mockup.mjs.
 */

import { Game } from '../src/core/Game.js';
import { Renderer } from '../src/core/rendering/Renderer.js';
import { Sprites } from '../src/core/rendering/Sprites.js';
import { LevelCatalog } from '../src/core/config/LevelCatalog.js';
import { Difficulty } from '../src/core/config/Difficulty.js';
import { EnemyFactory } from '../src/core/entities/enemies/EnemyFactory.js';
import { AudioService } from '../src/services/AudioService.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const audio = new AudioService({ sound: true, music: true });

/**
 * One looping battle: towers pre-built, enemies streamed in a fixed rhythm with an
 * immortal boss so the boss bar always has something to show. Lives never run out.
 */
class Showcase {
  constructor({ canvas, levelIndex, towers, mix, allowRotate, sound = false }) {
    this.level = LevelCatalog.get(levelIndex);
    this.game = new Game({ level: this.level, difficulty: Difficulty.get('normal'), unlockedPowers: [] });
    this.game.gold = 99999;
    for (const [type, col, row, lvl] of towers) {
      const t = this.game.buildTower(type, col, row);
      for (let i = 1; t && i < lvl; i++) this.game.upgradeTower(t);
    }
    this.game.effects.length = 0;
    this.game.state = 'wave';
    this.renderer = new Renderer(canvas, this.level);
    this.renderer.reducedMotion = reduced;
    this.allowRotate = allowRotate;
    this.mix = mix;
    this.spawnTimer = 0;
    this.spawnIndex = 0;
    this.boss = null;
    const r = this.renderer;
    const g = this.game;
    g.on('shot', (t) => {
      r.react('shot', t);
      if (sound) audio.play(t.type);
    });
    g.on('impact', (d) => {
      r.react('impact', d);
      if (sound && (!d.source || d.source.type !== 'frost')) audio.play('impact');
    });
    g.on('kill', (d) => {
      r.react('kill', d);
      if (sound) audio.play('coin');
    });
  }

  fit(width, height) {
    this.renderer.resize(width, height, this.allowRotate);
    this.renderer.particles.clear();
  }

  step(dt) {
    const g = this.game;
    g.lives = g.maxLives;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const type = this.mix[this.spawnIndex++ % this.mix.length];
      this.spawnTimer = type === 'runner' ? 0.45 : 0.9;
      g.enemies.push(EnemyFactory.create(type, g.map.path, { hpMult: 1.6 }));
    }
    if (!this.boss || !this.boss.alive) {
      this.boss = EnemyFactory.create('boss', g.map.path, { hpMult: 6, speedMult: 0.55 });
      g.enemies.push(this.boss);
    }
    // The boss heals slowly and never leaks, so the bar keeps telling its story.
    this.boss.heal(dt * 12);
    if (this.boss.distance > g.map.path.length * 0.8) this.boss.distance = g.map.path.length * 0.2;
    g.state = 'wave';
    g.update(dt);
  }

  draw(ui) {
    this.renderer.render(this.game, ui);
  }

  /** Grid cell centre → percentage of the canvas box (handles the rotated phone board). */
  cellPct(col, row) {
    const r = this.renderer;
    const L = this.level;
    return r.rotated ? { x: ((L.rows - (row + 0.5)) / L.rows) * 100, y: ((col + 0.5) / L.cols) * 100 } : { x: ((col + 0.5) / L.cols) * 100, y: ((row + 0.5) / L.rows) * 100 };
  }
}

// ------------------------------------------------------------------ desktop battle (Volcano, dusk)
const desk = new Showcase({
  canvas: document.getElementById('desk-canvas'),
  levelIndex: 3,
  towers: [['cannon', 6, 2, 3], ['arrow', 3, 2, 2], ['frost', 9, 3, 2], ['laser', 11, 2, 3], ['arrow', 4, 5, 1], ['cannon', 9, 5, 2], ['frost', 12, 7, 1], ['laser', 5, 7, 2], ['arrow', 8, 7, 1]],
  mix: ['grunt', 'grunt', 'runner', 'runner', 'tank', 'grunt', 'healer', 'runner', 'grunt', 'tank'],
  allowRotate: false,
  sound: true,
});
const BUILD_CELL = { col: 12, row: 6 };

// ------------------------------------------------------------------ phone battle (Lagoon, day)
const phone = new Showcase({
  canvas: document.getElementById('phone-canvas'),
  levelIndex: 2,
  towers: [['arrow', 3, 3, 2], ['frost', 5, 5, 2], ['cannon', 8, 7, 3], ['laser', 11, 4, 2], ['arrow', 4, 7, 1], ['cannon', 1, 4, 1]],
  mix: ['grunt', 'runner', 'grunt', 'healer', 'tank', 'runner'],
  allowRotate: true,
});

/** Paints tower portraits into the radial menus and shop bars. */
function paintIcons() {
  for (const c of document.querySelectorAll('canvas[data-tower]')) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const size = c.clientWidth || 40;
    c.width = c.height = Math.round(size * dpr);
    const ctx = c.getContext('2d');
    const s = c.width;
    ctx.setTransform(s * 0.68, 0, 0, s * 0.68, s / 2, s * 0.62);
    Sprites.tower(ctx, { type: c.dataset.tower, level: Number(c.dataset.level || 1), recoil: 0, id: 0 }, -Math.PI / 4, 0);
  }
}

/** Level thumbnails of the campaign strip. */
function paintMaps(mode) {
  for (const c of document.querySelectorAll('canvas[data-level]')) {
    Renderer.paintThumbnail(c, LevelCatalog.get(Number(c.dataset.level)), mode, c.clientWidth || 200, c.dataset.showcase === '1');
  }
}

// ------------------------------------------------------------------ layout
const deskBox = document.getElementById('desk-board');
const phoneBox = document.getElementById('phone-board');

function layout() {
  desk.fit(deskBox.clientWidth, deskBox.clientWidth * (10 / 15));
  phone.fit(phoneBox.clientWidth, phoneBox.clientHeight);
  placeOverlays();
  paintIcons();
  paintMaps(mode);
}

function place(el, show, col, row) {
  const p = show.cellPct(col, row);
  el.style.left = `${p.x}%`;
  el.style.top = `${p.y}%`;
}

function placeOverlays() {
  place(document.getElementById('desk-radial'), desk, BUILD_CELL.col, BUILD_CELL.row);
  const start = desk.level.waypoints[0];
  place(document.getElementById('desk-flag'), desk, Math.max(0, start[0]) + 0.6, start[1]);
  place(document.getElementById('phone-radial'), phone, 9, 4);
  const ps = phone.level.waypoints[0];
  place(document.getElementById('phone-flag'), phone, ps[0], Math.max(0, ps[1]) + 0.7);
}

// ------------------------------------------------------------------ theme toggle (day / dusk)
let mode = 'dark';
for (const btn of document.querySelectorAll('[data-mode]')) {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    desk.renderer.setMode(mode);
    phone.renderer.setMode(mode === 'dark' ? 'light' : 'dark');
    paintMaps(mode);
  });
}
desk.renderer.setMode('dark');
phone.renderer.setMode('light');

// ------------------------------------------------------------------ sound toggle
const soundBtn = document.getElementById('sound');
let soundOn = false;
audio.setSound(false);
audio.setMusic(false);
soundBtn.addEventListener('click', () => {
  audio.unlock();
  soundOn = !soundOn;
  audio.setSound(soundOn);
  audio.setMusic(soundOn);
  audio.playMood('volcano');
  if (soundOn) audio.play('wave');
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  soundBtn.querySelector('span').textContent = soundOn ? soundBtn.dataset.on : soundBtn.dataset.off;
});

// ------------------------------------------------------------------ loop
const deskBoss = document.getElementById('boss-fill');
const deskBossHp = document.getElementById('boss-hp');
const ring = document.getElementById('flag-ring');
const ringBonus = document.getElementById('flag-bonus');
const goldEl = document.getElementById('hud-gold');
const scoreEl = document.getElementById('hud-score');
let last = 0;
let flagT = 0;
let gold = 412;

function frame(now) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  desk.step(dt);
  phone.step(dt);
  desk.draw({ selectedCell: BUILD_CELL, previewType: { type: 'laser', color: '#e93d82', levels: [{ range: 4 }] }, hoverCell: null, nextWave: [] });
  phone.draw({ selectedCell: { col: 9, row: 4 }, previewType: { type: 'frost', color: '#4ccce6', levels: [{ range: 2.2 }] }, hoverCell: null, nextWave: [] });

  const b = desk.boss;
  if (b) {
    const ratio = b.hp / b.maxHp;
    deskBoss.style.transform = `scaleX(${ratio})`;
    deskBossHp.textContent = `${Math.ceil(b.hp)} / ${b.maxHp}`;
  }
  // Early-call flag: an 18 s countdown ring with a bonus that shrinks with it.
  flagT = (flagT + dt) % 18;
  const left = 1 - flagT / 18;
  ring.style.setProperty('--p', String(left));
  ringBonus.textContent = `+${Math.round(22 * left)}`;
  gold = 300 + (desk.game.kills * 6) % 700;
  goldEl.textContent = String(gold);
  scoreEl.textContent = desk.game.score.toLocaleString('en-US');
  requestAnimationFrame(frame);
}

if (typeof ResizeObserver === 'function') new ResizeObserver(layout).observe(document.body);
layout();
requestAnimationFrame(frame);
