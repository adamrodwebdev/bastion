/**
 * @file Saves read back from storage (SaveManager): a size limit before parsing, field by field,
 * every format the game ever wrote still loading, and a save the game cannot read never
 * replaced by what the game notes by itself.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager } from '../src/services/SaveManager.js';
import { StorageService } from '../src/services/StorageService.js';
import { BridgeStorage, SAVE_KEYS } from '../src/services/ads/PlaygamaAdService.js';
import { MemoryBackend, playedSnapshot } from './helpers.mjs';

const PROGRESS = 'bastion-td:progress';
const SETTINGS = 'bastion-td:settings';
const CURRENT = 'bastion-td:currentGame';

/** A SaveManager over a backend holding these stored texts. */
function savesOver(items) {
  const backend = new MemoryBackend(items);
  return { backend, saves: new SaveManager(new StorageService('bastion-td', backend)) };
}

/** A full version 2 progress, as the game writes it. */
const V2_PROGRESS = JSON.stringify({
  version: 2,
  campaigns: {
    solo: {
      completed: 12,
      levels: {
        l1: { stars: { easy: 0, normal: 3, hard: 0 }, ach: 5, best: 4210, wins: 2 },
        l12: { stars: { easy: 0, normal: 2, hard: 0 }, ach: 1, best: 9800, wins: 1 },
      },
    },
    coop: { completed: 0, levels: {} },
  },
  crowns: 140,
  crownsEarned: 640,
  crownsSpent: 500,
  ranks: { ramparts: 1, steel: 1 },
  loadout: ['arrowRain', 'freeze'],
  episodes: ['prologue', 'ch2'],
  tutorials: ['basics', 'early', 'tower-barracks', 'power-freeze'],
  training: ['t1', 't2'],
  duel: { played: 3, wins: [2, 1] },
});

describe('SaveManager: saves the game cannot read are kept (regressions)', () => {
  test('a progress of another version is not wiped by a story marked as read', () => {
    const stored = V2_PROGRESS.replace('"version":2', '"version":3');
    const { backend, saves } = savesOver({ [PROGRESS]: stored });
    saves.markSeen('episodes', 'ch3');
    assert.equal(backend.items.get(PROGRESS), stored);
  });

  test('a progress that is not JSON (a cut write) is not replaced by a tutorial seen', () => {
    const stored = V2_PROGRESS.slice(0, 120);
    const { backend, saves } = savesOver({ [PROGRESS]: stored });
    saves.markSeen('tutorials', 'basics');
    assert.equal(backend.items.get(PROGRESS), stored);
  });

  test('a game in progress without its waves is no game to continue (the home screen read its waves)', () => {
    const { saves } = savesOver({ [CURRENT]: JSON.stringify({ version: 2, levelNumber: 3 }) });
    assert.equal(saves.loadGame(), null);
  });

  test('player names are text: an object or a number is not turned into one', () => {
    const { saves } = savesOver({ [SETTINGS]: JSON.stringify({ names: [{ toString: 'x' }, 12] }) });
    assert.deepEqual(saves.settings.names, ['', '']);
  });

  test('player names lose the invisible characters that turn text around', () => {
    const { saves } = savesOver({ [SETTINGS]: JSON.stringify({ names: ['\u202EAna', 'Lu\u200Bc'] }) });
    assert.deepEqual(saves.settings.names, ['Ana', 'Luc']);
  });

  test('a tutorial name of a thousand characters is not carried from save to save', () => {
    const stored = V2_PROGRESS.replace('"basics"', `"${'b'.repeat(1000)}"`);
    const { saves } = savesOver({ [PROGRESS]: stored });
    assert.ok(saves.progress.tutorials.every((id) => id.length <= 40));
  });

  test('Playgama: saves that could not be loaded are not replaced by a tutorial seen', async () => {
    const sets = [];
    const bridge = {
      storage: {
        get: () => Promise.reject(new Error('network')),
        set: (keys, values) => {
          sets.push(keys);
          return Promise.resolve();
        },
        delete: () => Promise.resolve(),
      },
    };
    const cloud = new BridgeStorage(bridge);
    await cloud.load(SAVE_KEYS);
    const saves = new SaveManager(new StorageService('bastion-td', cloud));
    saves.markSeen('tutorials', 'basics');
    assert.deepEqual(sets, []);
  });
});

describe('SaveManager: every format the game wrote still loads', () => {
  test('version 2 progress, field by field', () => {
    const { saves } = savesOver({ [PROGRESS]: V2_PROGRESS });
    assert.equal(saves.campaign('solo').completed, 12);
    assert.equal(saves.starsFor(1, 'normal'), 3);
    assert.equal(saves.achievementsFor(1), 5);
    assert.equal(saves.progress.crowns, 140);
    assert.deepEqual(saves.ranks, { ramparts: 1, steel: 1 });
    assert.deepEqual(saves.progress.loadout, ['arrowRain', 'freeze']);
    assert.deepEqual(saves.progress.training, ['t1', 't2']);
    assert.deepEqual(saves.progress.duel, { played: 3, wins: [2, 1] });
  });

  test('a game in progress written by the game screen', () => {
    const snapshot = playedSnapshot(7, 40);
    const { saves } = savesOver({ [CURRENT]: JSON.stringify(snapshot) });
    const loaded = saves.loadGame();
    assert.ok(loaded);
    assert.equal(loaded.levelNumber, 7);
  });
});

describe('SaveManager: settings read field by field, every format the game wrote', () => {
  const settingsOf = (stored) => savesOver({ [SETTINGS]: JSON.stringify(stored) }).saves.settings;

  test('version 1.0 (locale, theme, difficulty and one sound switch)', () => {
    const s = settingsOf({ locale: 'fr', theme: 'dark', difficulty: 'hard', sound: true });
    assert.deepEqual([s.locale, s.theme, s.difficulty, s.music, s.sfx], ['fr', 'dark', 'hard', 0.6, 0.8]);
  });

  test('a preview that saved the music as a switch keeps the default volume', () => {
    const s = settingsOf({ locale: 'en', theme: 'light', difficulty: 'easy', sound: true, music: true });
    assert.equal(s.music, 0.6);
    assert.equal(s.difficulty, 'easy');
  });

  test('version 2.0 (volumes, story, tutorials, names)', () => {
    const s = settingsOf({ locale: 'id', theme: 'system', difficulty: 'normal', music: 0.35, sfx: 0.5, story: false, tutorials: false, names: ['Ana', 'Luc'] });
    assert.deepEqual([s.locale, s.music, s.sfx, s.story, s.tutorials, s.names], ['id', 0.35, 0.5, false, false, ['Ana', 'Luc']]);
  });

  test('the current settings, every field', () => {
    const stored = {
      locale: null,
      theme: 'light',
      difficulty: 'hard',
      music: 0,
      sfx: 1,
      story: true,
      tutorials: true,
      names: ['', 'Zoé'],
      gore: false,
      particles: false,
      muted: true,
      haptics: false,
      motion: false,
    };
    assert.deepEqual(settingsOf(stored), stored);
  });

  const DEFAULTS = savesOver({}).saves.settings;
  for (const [field, value] of [
    ['locale', 'de'],
    ['locale', 'FR'],
    ['locale', '__proto__'],
    ['locale', ['fr']],
    ['theme', 'blue'],
    ['theme', 'constructor'],
    ['difficulty', 'HARD'],
    ['music', '0.5'],
    ['music', 2],
    ['music', -0.1],
    ['music', true],
    ['sfx', null],
    ['story', 'true'],
    ['muted', 1],
    ['motion', null],
    ['names', 'Ana'],
    ['names', ['Ana', 'Luc', 'Zoé']],
  ]) {
    test(`a ${field} of ${JSON.stringify(value)} keeps its default, and the other fields stay`, () => {
      const s = settingsOf({ [field]: value, sfx: field === 'sfx' ? value : 0.3 });
      assert.deepEqual(s[field], DEFAULTS[field]);
      if (field !== 'sfx') assert.equal(s.sfx, 0.3);
    });
  }

  test('one name too long is left blank, the other stays', () => {
    assert.deepEqual(settingsOf({ names: ['a'.repeat(17), 'Luc'] }).names, ['', 'Luc']);
  });

  test('a change from the interface is read at the door too', () => {
    const { saves } = savesOver({});
    saves.updateSettings({ music: '0.2', sfx: Number.NaN, names: ['\u202EAna', { toString: () => 'x' }], theme: 'dark' });
    const s = saves.settings;
    assert.deepEqual([s.music, s.sfx, s.names, s.theme], [0.6, 0.8, ['Ana', ''], 'dark']);
  });
});

describe('SaveManager: progress read field by field', () => {
  const progressOf = (edit) => {
    const stored = JSON.parse(V2_PROGRESS);
    edit(stored);
    return savesOver({ [PROGRESS]: JSON.stringify(stored) }).saves;
  };

  test('version 1 (six levels): how far the player went', () => {
    const stored = { version: 1, completed: 4, stars: { l1: { normal: 3 } }, best: { l1: 900 } };
    assert.equal(savesOver({ [PROGRESS]: JSON.stringify(stored) }).saves.campaign('solo').completed, 4);
  });

  test('version 1 beyond its six levels counts nothing', () => {
    assert.equal(savesOver({ [PROGRESS]: JSON.stringify({ version: 1, completed: 9 }) }).saves.campaign('solo').completed, 0);
  });

  test('version 2 before the lessons existed (no training list)', () => {
    const saves = progressOf((p) => delete p.training);
    assert.deepEqual(saves.training, []);
    assert.equal(saves.campaign('solo').completed, 12);
  });

  const levels = (s) => Object.keys(s.campaign('solo').levels).join();
  for (const [what, edit, check] of [
    ['crowns written as text', (p) => (p.crownsEarned = '640'), (s) => s.progress.crownsEarned === 0],
    ['crowns beyond any campaign', (p) => (p.crownsEarned = 1e308), (s) => s.progress.crownsEarned === 0],
    ['more crowns spent than earned', (p) => (p.crownsSpent = 9999), (s) => s.progress.crownsSpent === 0 && s.progress.crowns === 640],
    ['a rank beyond the upgrade', (p) => (p.ranks.ramparts = 99), (s) => !('ramparts' in s.ranks) && s.ranks.steel === 1],
    ['a rank named __proto__', (p) => (p.ranks = JSON.parse('{"__proto__": 3, "steel": 1}')), (s) => Object.keys(s.ranks).join() === 'steel'],
    ['an unknown power in the loadout', (p) => (p.loadout = ['nuke']), (s) => s.progress.loadout.length === 0],
    ['a loadout longer than any', (p) => (p.loadout = Array(17).fill('freeze')), (s) => s.progress.loadout.length === 0],
    ['an episode that is a number', (p) => (p.episodes = [12]), (s) => s.progress.episodes.length === 0],
    ['more episodes than the story has, many times over', (p) => (p.episodes = Array(51).fill('ch2')), (s) => s.progress.episodes.length === 0],
    ['an episode with an invisible character', (p) => (p.episodes = ['ch\u202E2']), (s) => s.progress.episodes[0] === 'ch2'],
    ['a lesson that does not exist', (p) => (p.training = ['t10']), (s) => s.training.length === 0],
    ['a level written with zeros', (p) => (p.campaigns.solo.levels.l001 = p.campaigns.solo.levels.l1), (s) => levels(s) === 'l1,l12'],
    ['level 101', (p) => (p.campaigns.solo.levels.l101 = p.campaigns.solo.levels.l1), (s) => levels(s) === 'l1,l12'],
    ['a level beyond the campaign', (p) => (p.campaigns.solo.levels.l50 = p.campaigns.solo.levels.l1), (s) => levels(s) === 'l1,l12'],
    ['stars written as text', (p) => (p.campaigns.solo.levels.l1.stars.normal = '3'), (s) => s.starsFor(1, 'normal') === 0 && s.achievementsFor(1) === 5],
    ['four stars', (p) => (p.campaigns.solo.levels.l1.stars.normal = 4), (s) => s.starsFor(1, 'normal') === 0],
    ['a level record named __proto__', (p) => (p.campaigns.solo.levels = JSON.parse('{"__proto__": {"ach": 7}, "l1": {"ach": 1}}')), (s) => s.achievementsFor(1) === 1 && levels(s) === 'l1'],
    ['more level records than levels', (p) => Object.assign(p.campaigns.solo.levels, Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`x${i}`, {}]))), (s) => levels(s) === '' && s.campaign('solo').completed === 12],
    ['campaigns that are a list', (p) => (p.campaigns = []), (s) => s.campaign('solo').completed === 0 && s.progress.crowns === 140],
    ['duel wins beyond any count', (p) => (p.duel.wins = [1e9, 1]), (s) => s.progress.duel.wins.join() === '0,0' && s.progress.duel.played === 3],
  ]) {
    test(`${what}: that field falls back, the rest survives`, () => assert.ok(check(progressOf(edit))));
  }
});

describe('SaveManager: what cannot be read is kept, and only progress replaces it', () => {
  for (const [what, items, prepare] of [
    ['a progress longer than its limit', { [PROGRESS]: JSON.stringify({ version: 2, pad: 'x'.repeat(65_536) }) }],
    ['a progress that is a list', { [PROGRESS]: '[2]' }],
    ['a progress that is a number', { [PROGRESS]: '2' }],
    ['a progress without a version', { [PROGRESS]: '{"campaigns":{}}' }],
    ['a storage that throws when read', { [PROGRESS]: V2_PROGRESS }, (backend) => (backend.failReads = true)],
  ]) {
    test(`${what}: a tutorial seen does not replace it, a level won does`, () => {
      const backend = new MemoryBackend(items);
      prepare?.(backend);
      const saves = new SaveManager(new StorageService('bastion-td', backend));
      backend.failReads = false;
      const before = backend.items.get(PROGRESS);
      saves.markSeen('tutorials', 'basics');
      assert.equal(backend.items.get(PROGRESS), before);
      assert.equal(backend.writes, 0);
      saves.completeLevel({ level: { id: 'l1', number: 1 }, difficulty: 'normal', won: true, stars: 3, score: 100, mask: 0 });
      const written = JSON.parse(backend.items.get(PROGRESS));
      assert.equal(written.campaigns.solo.completed, 1);
      // What the game noted while the save was kept comes along.
      assert.deepEqual(written.tutorials, ['basics']);
    });
  }

  test('a storage that gives something other than text keeps it', () => {
    const backend = new MemoryBackend();
    backend.getItem = () => 42;
    const saves = new SaveManager(new StorageService('bastion-td', backend));
    saves.markSeen('episodes', 'prologue');
    assert.equal(backend.writes, 0);
  });

  test('readable settings take what the game notes (the portal language)', () => {
    const { backend, saves } = savesOver({ [SETTINGS]: '{"music":0.3}' });
    saves.noteSettings({ locale: 'fr' });
    assert.equal(JSON.parse(backend.items.get(SETTINGS)).locale, 'fr');
  });

  test('a game in progress the game would not read back is not saved', () => {
    const snapshot = playedSnapshot(7, 40);
    const { backend, saves } = savesOver({ [CURRENT]: JSON.stringify(snapshot) });
    assert.equal(saves.saveGame({ ...snapshot, lives: Number.POSITIVE_INFINITY }), false);
    assert.equal(backend.items.get(CURRENT), JSON.stringify(snapshot));
    assert.equal(saves.loadGame().lives, snapshot.lives);
  });

  test('a game in progress is saved, loaded frozen, and cleared', () => {
    const snapshot = playedSnapshot(9, 30);
    const { backend, saves } = savesOver({});
    assert.equal(saves.saveGame(snapshot), true);
    assert.equal(JSON.parse(backend.items.get(CURRENT)).levelNumber, 9);
    assert.ok(Object.isFrozen(saves.loadGame()));
    saves.clearGame();
    assert.equal(saves.loadGame(), null);
    assert.equal(backend.items.has(CURRENT), false);
  });

  test('a game in progress the storage refuses (quota) is resumed as it was saved last (regression)', () => {
    const older = playedSnapshot(7, 40);
    const newer = playedSnapshot(9, 30);
    const backend = new MemoryBackend({ [CURRENT]: JSON.stringify(older) });
    const saves = new SaveManager(new StorageService('bastion-td', backend));
    backend.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    saves.saveGame(newer);
    assert.equal(saves.loadGame()?.levelNumber, 9);
  });

  test('a write the storage refuses (quota) is read back from memory, not from the older copy', () => {
    const backend = new MemoryBackend({ [SETTINGS]: '{"music":0.3}' });
    const storage = new StorageService('bastion-td', backend);
    backend.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    assert.equal(storage.writeText('settings', '{"music":0.9}'), false);
    assert.equal(storage.readText('settings'), '{"music":0.9}');
  });
});

describe('BridgeStorage: what Playgama gives is read at the door', () => {
  const bridgeGiving = (values) => ({ storage: { get: () => Promise.resolve(values), set: () => Promise.resolve(), delete: () => Promise.resolve() } });

  test('text is a save and nothing is no save', async () => {
    const cloud = new BridgeStorage(bridgeGiving([V2_PROGRESS, null, undefined]));
    await cloud.load(SAVE_KEYS);
    assert.equal(cloud.getItem(PROGRESS), V2_PROGRESS);
    assert.equal(cloud.getItem(SETTINGS), null);
    assert.equal(cloud.getItem(CURRENT), null);
  });

  test('a value that is not text is a save that could not be read', async () => {
    const cloud = new BridgeStorage(bridgeGiving([{ version: 2 }, 12, null]));
    await cloud.load(SAVE_KEYS);
    assert.throws(() => cloud.getItem(PROGRESS));
    assert.throws(() => cloud.getItem(SETTINGS));
    assert.equal(cloud.getItem(CURRENT), null);
  });

  test('an answer that is not a list leaves every save unread, not empty', async () => {
    const cloud = new BridgeStorage(bridgeGiving({ 0: V2_PROGRESS }));
    await cloud.load(SAVE_KEYS);
    for (const key of SAVE_KEYS) assert.throws(() => cloud.getItem(key));
  });

  test('the progress written over a save that could not be read is read back', async () => {
    const cloud = new BridgeStorage(bridgeGiving(null));
    await cloud.load(SAVE_KEYS);
    cloud.setItem(PROGRESS, '{"version":2}');
    assert.equal(cloud.getItem(PROGRESS), '{"version":2}');
  });
});
