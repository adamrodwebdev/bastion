/**
 * @file The land of a chapter for the campaign map, painted by the board's own
 * painter: the grass, water, trees and rocks of several of the chapter's levels laid
 * together (one level alone is a sparse field), without their roads: the map draws
 * its own route between the levels. The stylesheet ages it into an old map (sepia,
 * parchment wash, vignette).
 */

import { Renderer } from './Renderer.js';
import { paintTerrain } from './Terrain.js';
import { NIGHT_TINT } from './palettes.js';
import { GameMap } from '../world/GameMap.js';

/**
 * Paints the land on the canvas so that it covers a box of the given CSS size: the
 * board is turned upright in a tall box, as on the phones' board.
 * @param {HTMLCanvasElement} canvas
 * @param {import('../config/Level.js').Level[]} levels levels of the chapter, the first one giving its look
 * @param {{ width: number, height: number, night: boolean }} box CSS size of the map
 */
export function paintChapterLand(canvas, levels, { width, height, night }) {
  const [level] = levels;
  const renderer = new Renderer(canvas, level);
  renderer.setMode(night ? 'dark' : 'light');
  const tall = height > width;
  const [across, down] = tall ? [level.rows, level.cols] : [level.cols, level.rows];
  // The smallest board that still covers the box (the stylesheet crops the rest).
  const tile = Math.ceil(Math.max(width / across, height / down));
  renderer.resize(tile * across, tile * down, tall);
  canvas.style.width = '';
  canvas.style.height = '';
  const water = levels.flatMap((l) => l.water);
  const wet = new Set(water.map(([c, r]) => `${c},${r}`));
  const rocks = levels.flatMap((l) => l.rocks).filter(([c, r]) => !wet.has(`${c},${r}`));
  const land = new GameMap({ cols: level.cols, rows: level.rows, paths: [], rocks, water });
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(paintTerrain(renderer, land), 0, 0);
  if (night) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = NIGHT_TINT;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
}
