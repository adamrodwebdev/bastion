/**
 * @file Playgama covers of Bastion Tower Defense, painted by the game's own engine
 * (see ../kit/scene.js). `window.kit.cover(width, height)` returns a PNG data URL
 * (used by a render script); the page itself shows the three covers with a save link each.
 */

import { paint, ready } from '../kit/scene.js';

/** Exact sizes asked by Playgama (PNG or JPEG, under 10 MB each). */
export const COVERS = [
  { name: 'cover-landscape-1920x1080', width: 1920, height: 1080 },
  { name: 'cover-portrait-1080x1920', width: 1080, height: 1920 },
  { name: 'cover-square-800x800', width: 800, height: 800 },
];

window.kit = {
  ready,
  /** @returns {Promise<string>} PNG data URL of a cover */
  async cover(width, height) {
    await ready;
    return paint(width, height).toDataURL('image/png');
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
  document.body.dataset.ready = 'true';
});
