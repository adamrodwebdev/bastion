/**
 * @file CrazyGames covers and preview videos of Bastion Tower Defense, painted and
 * filmed by the game's own engine (see ../kit/scene.js). Covers: title only, no
 * border, the three sizes CrazyGames asks for. Videos: 18 s, silent, landscape 1080p
 * 16:9 and portrait 1080p 2:3, opening on the cover. `window.kit.cover(width, height)`
 * returns a PNG data URL and `window.kit.film(width, height, seconds, name)` saves a
 * video (used by a render script); the page shows the covers and a button per video.
 */

import { paint, film, ready } from '../kit/scene.js';

/** Exact cover sizes asked by CrazyGames. */
export const COVERS = [
  { name: 'cover-landscape-1920x1080', width: 1920, height: 1080 },
  { name: 'cover-portrait-800x1200', width: 800, height: 1200 },
  { name: 'cover-square-800x800', width: 800, height: 800 },
];

/** Both preview videos are mandatory: 15 to 20 s, no sound. */
export const VIDEOS = [
  { name: 'preview-landscape-1920x1080', width: 1920, height: 1080 },
  { name: 'preview-portrait-1080x1620', width: 1080, height: 1620 },
];

/** Offers a recorded video as a file (a download the render script catches). */
function save(blob, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
  document.body.append(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 60_000);
  return { type: blob.type, size: blob.size, file: link.download };
}

window.kit = {
  ready,
  /** @returns {Promise<string>} PNG data URL of a cover */
  async cover(width, height) {
    await ready;
    return paint(width, height).toDataURL('image/png');
  },
  /** Films a preview and offers it as a file. */
  async film(width, height, seconds = 18, name = 'preview') {
    return save(await film(width, height, seconds), name);
  },
};

ready.then(() => {
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
  for (const { name, width, height } of VIDEOS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Film ${name} (18 s)`;
    button.addEventListener('click', async () => {
      button.disabled = true;
      await window.kit.film(width, height, 18, name);
      button.disabled = false;
    });
    root.append(button);
  }
  document.body.dataset.ready = 'true';
});
