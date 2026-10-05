/**
 * @file Road layouts used to build the 100 campaign maps.
 *
 * Every layout is drawn on a 16 × 9 grid (columns 0-15, rows 0-8). Waypoints
 * outside the grid (-1, 16 or row 9) are entrances and exits. Roads only go
 * horizontally or vertically. Each layout can be mirrored horizontally and/or
 * vertically, which gives four different maps per layout.
 *
 * `roads` is the number of entrances; `length` is filled in at load time and
 * helps pick harder (shorter) layouts later in the campaign.
 */

export const GRID = Object.freeze({ cols: 16, rows: 9 });

/** @type {Record<string, Array<Array<[number,number]>>>} */
const LAYOUTS = {
  // ---- one road
  snake: [[[-1, 2], [4, 2], [4, 6], [10, 6], [10, 2], [16, 2]]],
  zig: [[[-1, 7], [3, 7], [3, 2], [7, 2], [7, 7], [12, 7], [12, 3], [16, 3]]],
  topdown: [[[7, -1], [7, 2], [2, 2], [2, 6], [9, 6], [9, 2], [13, 2], [13, 9]]],
  longS: [[[-1, 1], [14, 1], [14, 4], [1, 4], [1, 7], [16, 7]]],
  castle: [[[-1, 4], [2, 4], [2, 1], [6, 1], [6, 7], [9, 7], [9, 1], [13, 1], [13, 6], [16, 6]]],
  diag: [[[-1, 7], [5, 7], [5, 4], [9, 4], [9, 1], [16, 1]]],
  bigU: [[[-1, 1], [3, 1], [3, 7], [12, 7], [12, 1], [16, 1]]],
  spiral: [[[-1, 1], [13, 1], [13, 7], [2, 7], [2, 4], [10, 4], [10, 9]]],
  zigzag: [[[-1, 1], [2, 1], [2, 7], [5, 7], [5, 1], [8, 1], [8, 7], [11, 7], [11, 1], [14, 1], [14, 9]]],
  valley: [[[2, 9], [2, 2], [7, 2], [7, 6], [11, 6], [11, 2], [14, 2], [14, 9]]],
  short: [[[-1, 4], [5, 4], [5, 2], [11, 2], [11, 6], [16, 6]]],
  stairs: [[[-1, 1], [3, 1], [3, 3], [6, 3], [6, 5], [9, 5], [9, 7], [16, 7]]],
  hook: [[[16, 1], [2, 1], [2, 7], [11, 7], [11, 4], [6, 4], [6, 9]]],
  serpent: [[[1, -1], [1, 6], [4, 6], [4, 2], [7, 2], [7, 6], [10, 6], [10, 2], [13, 2], [13, 9]]],
  zed: [[[-1, 1], [10, 1], [10, 4], [5, 4], [5, 7], [16, 7]]],
  cup: [[[16, 1], [3, 1], [3, 7], [16, 7]]],
  longC: [[[-1, 7], [13, 7], [13, 1], [2, 1], [2, 4], [9, 4], [9, -1]]],
  doubleU: [[[-1, 4], [2, 4], [2, 1], [6, 1], [6, 7], [10, 7], [10, 1], [14, 1], [14, 9]]],
  maze: [[[-1, 1], [14, 1], [14, 3], [1, 3], [1, 5], [14, 5], [14, 7], [-1, 7]]],
  arrow: [[[-1, 4], [4, 4], [4, 1], [9, 1], [9, 7], [13, 7], [13, 4], [16, 4]]],

  // ---- two roads
  merge: [
    [[-1, 1], [5, 1], [5, 4], [16, 4]],
    [[-1, 7], [5, 7], [5, 4], [16, 4]],
  ],
  fork: [
    [[-1, 4], [6, 4], [6, 1], [16, 1]],
    [[-1, 4], [6, 4], [6, 7], [16, 7]],
  ],
  crossing: [
    [[-1, 2], [10, 2], [10, 7], [16, 7]],
    [[3, 9], [3, 5], [13, 5], [13, -1]],
  ],
  parallel: [
    [[-1, 1], [7, 1], [7, 3], [16, 3]],
    [[-1, 7], [9, 7], [9, 5], [16, 5]],
  ],
  pincer: [
    [[-1, 2], [6, 2], [6, 6], [8, 6], [8, 9]],
    [[16, 2], [10, 2], [10, 6], [8, 6], [8, 9]],
  ],
  longMerge: [
    [[-1, 1], [12, 1], [12, 4], [16, 4]],
    [[-1, 7], [12, 7], [12, 4], [16, 4]],
  ],
  twinCross: [
    [[-1, 1], [8, 1], [8, 7], [16, 7]],
    [[-1, 7], [5, 7], [5, 4], [11, 4], [11, 1], [16, 1]],
  ],
  opposite: [
    [[-1, 1], [6, 1], [6, 3], [16, 3]],
    [[16, 7], [10, 7], [10, 5], [-1, 5]],
  ],
  gate: [
    [[3, -1], [3, 4], [8, 4], [8, 9]],
    [[12, -1], [12, 6], [8, 6], [8, 9]],
  ],

  // ---- three roads
  trident: [
    [[-1, 1], [6, 1], [6, 4], [16, 4]],
    [[-1, 7], [6, 7], [6, 4], [16, 4]],
    [[11, -1], [11, 4], [16, 4]],
  ],
  siege: [
    [[-1, 2], [5, 2], [5, 4], [16, 4]],
    [[-1, 6], [5, 6], [5, 4], [16, 4]],
    [[9, -1], [9, 4], [16, 4]],
  ],
  storm: [
    [[-1, 1], [4, 1], [4, 4], [16, 4]],
    [[8, 9], [8, 6], [12, 6], [12, 4], [16, 4]],
    [[8, -1], [8, 2], [12, 2], [12, 4], [16, 4]],
  ],
};

/**
 * Layout catalogue with metadata.
 * @type {Record<string, {paths: Array<Array<[number,number]>>, roads:number, length:number}>}
 */
export const TEMPLATES = Object.freeze(
  Object.fromEntries(
    Object.entries(LAYOUTS).map(([id, paths]) => {
      const lengths = paths.map((wp) => wp.slice(1).reduce((s, p, i) => s + Math.abs(p[0] - wp[i][0]) + Math.abs(p[1] - wp[i][1]), 0));
      return [id, { paths, roads: paths.length, length: Math.min(...lengths) }];
    }),
  ),
);

/**
 * Mirrors a layout.
 * @param {Array<Array<[number,number]>>} paths
 * @param {{x?:boolean, y?:boolean}} flip
 */
export function transform(paths, { x = false, y = false } = {}) {
  const { cols, rows } = GRID;
  return paths.map((wp) => wp.map(([c, r]) => [x ? cols - 1 - c : c, y ? rows - 1 - r : r]));
}
