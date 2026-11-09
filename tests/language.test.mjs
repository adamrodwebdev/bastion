/**
 * @file The language comes from outside four ways (the address, the browser, a portal, the
 * language list): each is read as a language tag and matched against the languages the game
 * has, never looked up in a plain object.
 */

import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { I18nService, readLanguageTag } from '../src/services/I18nService.js';
import { LOADERS, LANGUAGE_NAMES } from '../src/locales/index.js';
import { TEXT_LIMITS } from '../src/core/limits.js';

describe('readLanguageTag: a language tag from the address, the browser or a portal', () => {
  for (const tag of ['fr', 'en-US', 'pt_BR', 'zh-Hant-TW', 'fil']) {
    test(`reads "${tag}"`, () => assert.equal(readLanguageTag(tag), tag));
  }

  test('cleans what is around it', () => {
    assert.equal(readLanguageTag(' fr\u200B '), 'fr');
  });

  for (const [name, value] of [
    ['a number', 12],
    ['null', null],
    ['an object', { toString: () => 'fr' }],
    ['a list', ['fr']],
    ['an empty text', ''],
    ['one letter', 'f'],
    ['markup', '<b>fr</b>'],
    ['a script', 'fr";alert(1);//'],
    ['a tag longer than any', `en${'-abcdefgh'.repeat(4)}`],
    ['a prototype name', '__proto__'],
  ]) {
    test(`refuses ${name}`, () => assert.equal(readLanguageTag(value), null));
  }

  test('its limit is the one of the table: 35 characters read, 36 refused', () => {
    const longest = `en${'-abcdefgh'.repeat(3)}-abcde`;
    assert.equal(longest.length, TEXT_LIMITS.languageTag);
    assert.equal(readLanguageTag(longest), longest);
    assert.equal(readLanguageTag(`${longest}f`), null);
  });
});

describe('I18nService#match: the language the game has for a tag', () => {
  const i18n = new I18nService(LOADERS, LANGUAGE_NAMES, 'en');
  for (const [tag, code] of [
    ['fr-CA', 'fr'],
    ['EN_gb', 'en'],
    ['id', 'id'],
    ['de-DE', null],
    ['constructor', null],
    [42, null],
  ]) {
    test(`${JSON.stringify(tag)} gives ${code}`, () => assert.equal(i18n.match(tag), code));
  }

  test('a browser listing languages that are not text is passed over', () => {
    const real = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: { languages: [12, null, 'id-ID'] }, configurable: true });
    try {
      assert.equal(i18n.detect(null), 'id');
    } finally {
      if (real) Object.defineProperty(globalThis, 'navigator', real);
    }
  });
});

const realLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');

/** Pretends the page was opened at this query string. */
function openedAt(search) {
  Object.defineProperty(globalThis, 'location', { value: { search }, configurable: true, writable: true });
}

afterEach(() => {
  if (realLocation) Object.defineProperty(globalThis, 'location', realLocation);
  else delete globalThis.location;
});

describe('I18nService: names that are not languages (regressions)', () => {
  for (const name of ['constructor', '__proto__']) {
    test(`?lang=${name} keeps every text translated`, async () => {
      openedAt(`?lang=${name}`);
      const i18n = new I18nService(LOADERS, LANGUAGE_NAMES, 'en');
      const code = i18n.detect(null);
      assert.ok(Object.keys(LANGUAGE_NAMES).includes(code), `detected ${code}`);
      await i18n.setLocale(code);
      assert.notEqual(i18n.t('settings.title'), 'settings.title');
    });

    test(`a language list offering "${name}" changes nothing`, async () => {
      const i18n = new I18nService(LOADERS, LANGUAGE_NAMES, 'en');
      await i18n.setLocale('fr');
      await i18n.setLocale(name);
      assert.equal(i18n.locale, 'fr');
      assert.notEqual(i18n.t('settings.title'), 'settings.title');
    });
  }
});
