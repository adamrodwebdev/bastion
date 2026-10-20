/**
 * @file Builds the CrazyGames version, checks it against the platform's measurable
 * requirements, and zips it for upload (npm run package:crazygames).
 *
 * Output: release/bastion-tower-defense-crazygames-<version>.zip, with index.html at
 * its root and "/" separators (bsdtar). Requirements read on docs.crazygames.com
 * (technical, gameplay, ads and quality requirements). The build is for Basic Launch:
 * ads stay off (the portal refuses them there) unless VITE_CRAZYGAMES_ADS=on.
 * `--check` builds and checks without zipping (continuous integration).
 */
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const OUT = 'dist-crazygames';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const ZIP = join('release', `bastion-tower-defense-crazygames-${version}.zip`);
const MB = 1024 * 1024;
/** The only external file the CrazyGames build may load. */
const SDK = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const ADS = process.env.VITE_CRAZYGAMES_ADS === 'on';

/** Files our own site needs, not the portal (its page has its own tags and icons). */
const SITE_ONLY = ['og-image.png', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

execSync('npx vite build --mode crazygames', { stdio: 'inherit' });
for (const file of SITE_ONLY) rmSync(join(OUT, file), { force: true });

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
};
walk(OUT);
const names = files.map((file) => relative(OUT, file).split(sep).join('/'));
const total = files.reduce((sum, file) => sum + statSync(file).size, 0);
const html = readFileSync(join(OUT, 'index.html'), 'utf8');
const code = files
  .filter((file) => /\.(js|css|html)$/.test(file))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

/** URLs that are text, never requested: XML namespaces and Vue's error reference link. */
const TEXT_ONLY = ['http://www.w3.org/', 'https://vuejs.org/error-reference/'];
// Every other absolute URL in the code, except the SDK, would be a request or a link.
const urls = [...new Set(code.match(/https?:\/\/[^\s"'`)<>\\]+/g) ?? [])].filter(
  (url) => url !== SDK && url !== 'https://sdk.crazygames.com' && !TEXT_ONLY.some((prefix) => url.startsWith(prefix)),
);

const checks = [
  ['index.html at the root', names.includes('index.html'), 'archive root'],
  ['Total size ≤ 250 MB', total <= 250 * MB, `${(total / MB).toFixed(2)} MB`],
  ['File count ≤ 1500', files.length <= 1500, `${files.length} files`],
  // Everything loads before the first gameplayStart, so the whole build is the initial download.
  ['Initial download ≤ 20 MB (mobile home)', total <= 20 * MB, `${(total / MB).toFixed(2)} MB`],
  ['Relative paths only', !/(src|href)="\/(?!\/)/.test(html) && !/["'(]\/assets\//.test(code), 'no absolute asset path'],
  ['SDK v3 first in <head>', /<head>\s*<script src="https:\/\/sdk\.crazygames\.com\/crazygames-sdk-v3\.js"><\/script>/.test(html), 'before the game code'],
  ['No other external request or link', urls.length === 0, urls.join(' ') || 'SDK only'],
  ['No other portal\'s SDK in the build', !/bridge\.playgama\.com|playgama-bridge|poki-sdk|game-cdn\.poki|gamedistribution\.com/i.test(code), 'Playgama, Poki, GameDistribution'],
  ['No external analytics', !/googletagmanager|google-analytics|gtag\(|youtube\.com/.test(code), 'GA4, gtag, YouTube'],
  ['No in-game fullscreen button', !/requestFullscreen|webkitRequestFullscreen/.test(code), 'the portal provides it'],
  ['No social or search tags', !/og:|twitter:|ld\+json|rel="manifest"/.test(html), 'the portal page has its own'],
  ['Ads off for Basic Launch', !ADS, ADS ? 'VITE_CRAZYGAMES_ADS=on (Full Launch build)' : 'no ad offer'],
];
let failed = false;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name.padEnd(40)} ${detail}`);
  // The ads line only reports which launch the build is for.
  if (name !== 'Ads off for Basic Launch') failed ||= !ok;
}
if (failed) process.exit(1);
if (process.argv.includes('--check')) process.exit(0);

// bsdtar (Windows 10+, macOS) writes ZIP entries with "/" separators, which
// Compress-Archive on Windows PowerShell 5.1 does not.
mkdirSync('release', { recursive: true });
rmSync(ZIP, { force: true });
const tar = process.platform === 'win32' ? 'C:\\Windows\\System32\\tar.exe' : 'bsdtar';
execFileSync(tar, ['-a', '-c', '-f', ZIP, '-C', OUT, ...readdirSync(OUT)], { stdio: 'inherit' });
const listed = execFileSync(tar, ['-t', '-f', ZIP], { encoding: 'utf8' }).trim().split(/\r?\n/);
if (!listed.includes('index.html') || listed.some((entry) => entry.includes('\\'))) {
  console.error('✗ The archive does not have index.html at its root with "/" paths');
  process.exit(1);
}
console.log(`\n${ZIP} (${(statSync(ZIP).size / MB).toFixed(2)} MB, ${listed.length} entries)`);
