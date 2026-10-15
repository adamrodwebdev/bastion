/**
 * @file Builds the living mockup (npm run mockup): bundles mockup/mockup.js and the engine
 * into one self-contained HTML file, mockup/dist/bastion-mockup.html.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = await build({
  entryPoints: [join(ROOT, 'mockup/mockup.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\/script');
const html = readFileSync(join(ROOT, 'mockup/template.html'), 'utf8').replace('/*__SCRIPT__*/', () => js);
mkdirSync(join(ROOT, 'mockup/dist'), { recursive: true });
writeFileSync(join(ROOT, 'mockup/dist/bastion-mockup.html'), html);
console.log(`mockup/dist/bastion-mockup.html (${(html.length / 1024).toFixed(1)} kB)`);
