/**
 * @file Builds a no-bundler demo version (npm run build:standalone).
 */

/**
 * Builds a no-bundler, standalone version of the game in ./standalone
 * (used for the online demo). Each .vue file is turned into an ES module
 * whose template is compiled at runtime by Vue's browser build.
 *
 * The real production build is `npm run build` (Vite), which precompiles
 * templates and minifies everything — prefer it for deployment.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'standalone');
const VUE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/vue/3.5.13/vue.esm-browser.prod.min.js';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function rewriteImports(code) {
  return code
    .replace(/from\s+'vue'/g, `from '${VUE_CDN}'`)
    .replace(/from\s+'(\.[^']+)\.vue'/g, "from '$1.vue.js'")
    .replace(/import\('(\.[^']+)\.vue'\)/g, "import('$1.vue.js')")
    .replace(/^import\s+'[^']+\.css';\s*$/gm, '');
}

export function convertSfc(source, file = 'component.vue') {
  const scriptStart = source.indexOf('<script>');
  const scriptEnd = source.lastIndexOf('</script>');
  const tplStart = source.indexOf('<template>');
  const tplEnd = source.lastIndexOf('</template>', scriptStart);
  if (scriptStart < 0 || tplStart < 0 || tplEnd < 0) throw new Error(`Unsupported SFC layout: ${file}`);
  const template = source.slice(tplStart + '<template>'.length, tplEnd).trim();
  let script = source.slice(scriptStart + '<script>'.length, scriptEnd);
  if (!/export default \{/.test(script)) throw new Error(`No "export default {" in ${file}`);
  script = script.replace('export default {', 'const __sfc__ = {');
  return `${rewriteImports(script).trim()}\n__sfc__.template = ${JSON.stringify(template)};\nexport default __sfc__;\n`;
}

function build() {
  rmSync(OUT, { recursive: true, force: true });
  for (const file of walk(join(ROOT, 'src'))) {
    const rel = relative(ROOT, file);
    let target = join(OUT, rel);
    mkdirSync(dirname(target), { recursive: true });
    // Binary assets (fonts, images) are copied as-is: reading them as text would corrupt them.
    if (!/\.(vue|js|css)$/.test(file)) {
      copyFileSync(file, target);
      continue;
    }
    const src = readFileSync(file, 'utf8');
    let out = src;
    if (file.endsWith('.vue')) {
      target += '.js';
      out = convertSfc(src, rel);
    } else if (file.endsWith('.js')) {
      out = rewriteImports(src);
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, out);
  }
  for (const file of walk(join(ROOT, 'public'))) {
    const target = join(OUT, relative(join(ROOT, 'public'), file));
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(file, target);
  }
  let html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  html = html
    .replace('<script type="module" src="/src/main.js"></script>', '<script type="module" src="./src/main.js"></script>')
    .replace('</head>', '    <link rel="stylesheet" href="./src/styles/main.css" />\n  </head>')
    .replace(/(href|src)="\/(?!\/)/g, '$1="./');
  writeFileSync(join(OUT, 'index.html'), html);

  // Fragment version (no <html>/<head>/<body>, CSS inlined) for hosts that wrap the page themselves.
  const css = readFileSync(join(ROOT, 'src/styles/main.css'), 'utf8');
  const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
  const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  const title = '<title>Bastion</title>';
  const scripts = [...head.matchAll(/<script[\s\S]*?<\/script>/g)].map((m) => m[0]).join('\n');
  const metaDesc = head.match(/<meta\s+name="description"[\s\S]*?\/>/)[0];
  writeFileSync(join(OUT, 'artifact.html'), `${title}\n${metaDesc}\n<style>\n${css}\n</style>\n${scripts}\n${body}`);
  console.log(`Standalone build written to ${relative(process.cwd(), OUT) || OUT}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
