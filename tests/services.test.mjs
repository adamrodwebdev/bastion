/**
 * @file The service container's wiring: what the game notes by itself (a portal's language, the
 * system's colour scheme) never replaces settings it could not read; the player's own choice does.
 */

import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryBackend } from './helpers.mjs';

/** The system's colour scheme, which the theme follows in "system" mode. */
const scheme = {
  matches: false,
  listeners: [],
  addEventListener(type, fn) {
    this.listeners.push(fn);
  },
  turnDark() {
    this.matches = true;
    for (const fn of this.listeners) fn();
  },
};

let services;
let SaveManager;
let StorageService;

before(async () => {
  const other = { matches: false, addEventListener() {} };
  globalThis.matchMedia = (query) => (query.includes('color-scheme') ? scheme : other);
  ({ services } = await import('../src/services/index.js'));
  ({ SaveManager } = await import('../src/services/SaveManager.js'));
  ({ StorageService } = await import('../src/services/StorageService.js'));
});

/** Settings the game cannot read: a write cut short. */
const UNREADABLE = '{"music":0.3,"sfx":0.4,"names":["Ana","Lu';

/** The container over a backend holding unreadable settings, started as main.js starts it. */
async function startedOverUnreadableSettings() {
  const backend = new MemoryBackend({ 'bastion-td:settings': UNREADABLE });
  services.storage = new StorageService('bastion-td', backend);
  services.saves = new SaveManager(services.storage);
  await services.bootstrap();
  return backend;
}

/** A portal that gives its language, without owning it (CrazyGames, Poki). */
const portal = {
  id: 'test-portal',
  locale: 'fr-FR',
  localeAuthoritative: false,
  portalMuted: false,
  portalPaused: false,
  on() {},
  loadingFinished() {},
};

describe('Service container: automatic writes keep unreadable settings (regressions)', () => {
  test("the portal's language is not written over them", async () => {
    const backend = await startedOverUnreadableSettings();
    services.ads = portal;
    await services.connectPortal();
    while (services.i18n.locale !== 'fr') await new Promise((resolve) => setTimeout(resolve, 5));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(backend.items.get('bastion-td:settings'), UNREADABLE);
  });

  test('the system turning dark is not written over them', async () => {
    const backend = await startedOverUnreadableSettings();
    assert.equal(backend.items.get('bastion-td:settings'), UNREADABLE, 'starting writes nothing');
    scheme.turnDark();
    assert.equal(backend.items.get('bastion-td:settings'), UNREADABLE);
  });

  test("the player's own choice replaces them", async () => {
    const backend = await startedOverUnreadableSettings();
    services.saves.updateSettings({ music: 0.5 });
    assert.equal(JSON.parse(backend.items.get('bastion-td:settings')).music, 0.5);
  });
});
