/**
 * @file Checks the translations (npm run check:i18n).
 *
 *  - every language has exactly the same keys as English;
 *  - every key written in the components exists;
 *  - every dynamic key (enemies, towers, powers, challenges, workshop,
 *    chapters, story episodes and lines) exists.
 * Exits with code 1 on the first problem list.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../src/locales/en.js';
import fr from '../src/locales/fr.js';
import id from '../src/locales/id.js';
import { EnemyFactory, TowerFactory, PowerManager, CHAPTERS } from '../src/core/index.js';
import { ACHIEVEMENTS } from '../src/core/progression/Achievements.js';
import { UPGRADES } from '../src/core/progression/UpgradeCatalog.js';
import { BEATS } from '../src/core/story/StoryRepository.js';
import { CHARACTERS } from '../src/core/story/Portraits.js';
import { LESSONS } from '../src/core/tutorial/Training.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = { en, fr, id };
const problems = [];

const get = (dict, key) => key.split('.').reduce((n, p) => (n && typeof n === 'object' ? n[p] : undefined), dict);
const flat = (o, prefix = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

// 1. Same keys in every language.
const ref = new Set(flat(en));
for (const [code, dict] of Object.entries(LOCALES)) {
  const keys = new Set(flat(dict));
  for (const k of ref) if (!keys.has(k)) problems.push(`${code}: missing ${k}`);
  for (const k of keys) if (!ref.has(k)) problems.push(`${code}: extra ${k}`);
}

// 2. Static keys used in components.
const files = [join(ROOT, 'src/App.vue'), ...readdirSync(join(ROOT, 'src/components')).map((f) => join(ROOT, 'src/components', f))];
const used = new Set();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\$t\(\s*'([a-zA-Z0-9_.]+)'\s*[,)]/g)) used.add(m[1]);
}

// 3. Dynamic keys.
for (const t of EnemyFactory.types()) used.add(`enemies.${t}.name`).add(`enemies.${t}.desc`);
for (const t of TowerFactory.types()) ['name', 'desc', 'elite', 'eliteDesc'].forEach((k) => used.add(`towers.${t}.${k}`));
for (const p of PowerManager.catalogue()) used.add(`powers.${p.id}.name`).add(`powers.${p.id}.desc`);
for (const id of Object.keys(ACHIEVEMENTS)) used.add(`achievements.list.${id}.name`).add(`achievements.list.${id}.desc`);
for (const f of ['style', 'feat', 'theme']) used.add(`achievements.families.${f}`);
for (const u of UPGRADES) if (u.group !== 'mastery') used.add(`workshop.list.${u.id}.name`).add(`workshop.list.${u.id}.desc`);
for (const g of ['defence', 'arsenal', 'command', 'mastery']) used.add(`workshop.groups.${g}`);
for (const c of CHAPTERS) ['name', 'desc', 'boss'].forEach((k) => used.add(`chapters.c${c.id}.${k}`));
for (const b of BEATS) {
  used.add(`story.${b.id}.title`);
  b.pages.forEach((_, i) => used.add(`story.${b.id}.p${i + 1}`));
}
for (let n = 1; n <= 100; n++) used.add(`story.lines.l${n}`);
for (const c of Object.keys(CHARACTERS)) used.add(`characters.${c}.name`);
for (const k of ['first', 'strongest', 'closest']) used.add(`tower.targets.${k}`);
for (const k of ['damage', 'range', 'dps', 'kills', 'soldiers', 'hp', 'buff', 'income']) used.add(`tower.stats.${k}`);
for (const k of ['firstWin', 'stars', 'challenges', 'allChallenges', 'replay', 'training']) used.add(`end.crowns.${k}`);
for (const d of ['easy', 'normal', 'hard']) used.add(`difficulty.${d}`).add(`difficulty.${d}Desc`);
for (const k of ['select', 'build', 'second', 'wave', 'upgrade', 'early', 'targeting', 'newTower', 'newPower']) used.add(`tutorial.${k}`);
for (const k of ['build', 'move', 'select', 'upgrade', 'wave', 'powers', 'pause', 'p2']) used.add(`settings.keyList.${k}.keys`).add(`settings.keyList.${k}.what`);
for (let i = 1; i <= 7; i++) used.add(`howTo.steps.${i}`);
for (const l of LESSONS) {
  ['title', 'desc', 'learned'].forEach((k) => used.add(`training.lessons.${l.id}.${k}`));
  for (const s of l.steps) used.add(`training.steps.${l.id}.${s.key}`);
}
for (const k of ['basics', 'towers', 'enemies', 'powers', 'two']) used.add(`learn.tabs.${k}`);
for (const k of ['goal', 'build', 'gold', 'waves', 'upgrade', 'powers', 'stars', 'workshop']) used.add(`learn.rules.${k}.title`).add(`learn.rules.${k}.text`);
const damage = new Set(['physical', 'fire', 'magic', 'true', ...TowerFactory.catalogue().map((t) => t.dtype).filter(Boolean)]);
for (const d of damage) used.add(`learn.damage.${d}.name`).add(`learn.damage.${d}.text`);
for (const k of ['boss', 'flying', 'stealth', 'armored', 'resistant', 'unslowable', 'unblockable', 'fast']) used.add(`learn.traits.${k}`);
for (const k of ['air', 'stealth', 'armor', 'golem', 'healer', 'warlock', 'ram', 'siege', 'necro', 'fast', 'berserker', 'boss']) used.add(`learn.tips.${k}`);

for (const key of used) {
  for (const [code, dict] of Object.entries(LOCALES)) {
    if (typeof get(dict, key) !== 'string') problems.push(`${code}: key used but missing: ${key}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log(`Translations OK: ${ref.size} keys, ${used.size} checked in ${Object.keys(LOCALES).length} languages.`);
