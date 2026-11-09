/**
 * @file The campaign bot's command line (scripts/simulate.mjs): a mistyped argument stops it
 * with an error, instead of checking no level at all and passing.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../scripts/simulate.mjs', import.meta.url));

/** Runs the bot with these arguments; a mistake must stop it before it plays. */
function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', timeout: 60_000 });
}

describe('simulate.mjs: arguments read strictly (regressions)', () => {
  for (const args of [
    ['--from=abc', '--to=abc'],
    ['--from=1e1', '--to=1e1'],
    ['--from=0', '--to=0'],
    ['--from=3', '--to=2'],
    ['--diff=hrad', '--from=1', '--to=1'],
    ['--from=101', '--to=101'],
    ['--save=yes', '--from=1', '--to=1'],
    ['--speed=2', '--from=1', '--to=1'],
    ['--from=1', '--from=2', '--to=2'],
    // The README's old examples: the value apart from its name played level 1 only, in Normal.
    ['--from', '40', '--to', '60'],
    ['--diff', 'hard', '--from=1', '--to=1'],
  ]) {
    test(`${args.join(' ')} is refused`, () => {
      const result = run(...args);
      assert.notEqual(result.status, 0, result.stdout);
      assert.doesNotMatch(result.stdout, /won, /);
    });
  }

  test('a valid range plays its levels', () => {
    const result = run('--from=1', '--to=1');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /normal: 1 won, 0 lost, 0 errors/);
  });
});
