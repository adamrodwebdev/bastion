/**
 * @file Art direction of each level: palettes (day = light mode, dusk = dark mode),
 * decor style and ambient particles. Pure data, read by the Terrain and the Renderer.
 */

/**
 * One entry per level theme.
 * - `day` / `night`: ground, road and decor colours. Night is a cool, darker take of the
 *   same place, lit by lanterns, so both modes keep the same identity.
 * - `decor`: what obstacles (rock cells) look like: trees, mesas, ponds, lava rocks, ruins, crystals.
 * - `ambient`: floating particles that bring the place to life.
 * - `scatter`: small decorations painted on the grass (never on the road).
 */
export const THEMES = {
  meadow: {
    decor: 'tree',
    scatter: ['tuft', 'tuft', 'flower', 'flower', 'pebble'],
    ambient: { day: 'pollen', night: 'firefly' },
    day: {
      ground: '#8cc66b', groundDark: '#6fae55', groundLight: '#a7d87f', tuft: '#5b9a45',
      road: '#e2c48f', roadDark: '#c49f66', roadEdge: '#8f6f42', pebble: '#b38e5c',
      flower: ['#fff4d6', '#ffd166', '#ff8fab'], decorA: '#3f8a3a', decorB: '#2e6e2f', decorC: '#7a4f2a',
      accent: '#ffd166', fog: 'rgba(255,248,220,0.10)', vignette: 'rgba(40,60,20,0.32)',
    },
    night: {
      ground: '#2c4a36', groundDark: '#223c2c', groundLight: '#36593f', tuft: '#1c3324',
      road: '#5e5240', roadDark: '#4a4033', roadEdge: '#2b2419', pebble: '#6d5f4a',
      flower: ['#c9d4ff', '#ffe08a', '#e7a3c4'], decorA: '#2f6b3c', decorB: '#1f4d2b', decorC: '#4a3420',
      accent: '#ffd166', fog: 'rgba(120,150,255,0.06)', vignette: 'rgba(5,10,25,0.5)',
    },
  },
  canyon: {
    decor: 'mesa',
    scatter: ['pebble', 'pebble', 'cactus', 'crack', 'tuft'],
    ambient: { day: 'dust', night: 'dust' },
    day: {
      ground: '#e2a868', groundDark: '#cf8f52', groundLight: '#efc084', tuft: '#a8823e',
      road: '#f6dfb4', roadDark: '#dcbd86', roadEdge: '#a5713c', pebble: '#b97a43',
      flower: ['#e8574a', '#ffd166', '#fff'], decorA: '#c06a3a', decorB: '#93492a', decorC: '#e8935a',
      accent: '#ffb347', fog: 'rgba(255,220,170,0.12)', vignette: 'rgba(90,40,10,0.30)',
    },
    night: {
      ground: '#5a3a2a', groundDark: '#4a2f22', groundLight: '#6a4632', tuft: '#3e2a1a',
      road: '#7a6046', roadDark: '#634d38', roadEdge: '#33231a', pebble: '#7d5638',
      flower: ['#e8574a', '#ffd166', '#ddd'], decorA: '#6e3b25', decorB: '#4c2718', decorC: '#8a5232',
      accent: '#ffb347', fog: 'rgba(255,150,90,0.05)', vignette: 'rgba(20,8,10,0.62)',
    },
  },
  lagoon: {
    decor: 'pond',
    scatter: ['tuft', 'shell', 'flower', 'tuft', 'pebble'],
    ambient: { day: 'sparkle', night: 'firefly' },
    day: {
      ground: '#9fd8a0', groundDark: '#84c58c', groundLight: '#bde6ad', tuft: '#5fae78',
      road: '#f4e2b4', roadDark: '#dcc48c', roadEdge: '#a68c58', pebble: '#c9b07c',
      flower: ['#ff9eb5', '#fff', '#ffd166'], decorA: '#2fa8c8', decorB: '#1f86a8', decorC: '#7fe3f0',
      accent: '#7fe3f0', fog: 'rgba(220,255,250,0.10)', vignette: 'rgba(10,60,70,0.28)',
    },
    night: {
      ground: '#1f4a45', groundDark: '#183d39', groundLight: '#275752', tuft: '#12322e',
      road: '#5a5844', roadDark: '#474635', roadEdge: '#25241b', pebble: '#68664f',
      flower: ['#e7a3c4', '#c9d4ff', '#ffe08a'], decorA: '#145a72', decorB: '#0d4256', decorC: '#4fc4d8',
      accent: '#7fe3f0', fog: 'rgba(90,200,255,0.06)', vignette: 'rgba(0,12,25,0.62)',
    },
  },
  volcano: {
    decor: 'lava',
    scatter: ['crack', 'pebble', 'ash', 'crack', 'pebble'],
    ambient: { day: 'ember', night: 'ember' },
    day: {
      ground: '#6b5552', groundDark: '#584543', groundLight: '#7d6460', tuft: '#4a3a38',
      road: '#9a8a80', roadDark: '#7e6f66', roadEdge: '#3c302d', pebble: '#4c3d3a',
      flower: ['#ff7a3e', '#ffb347', '#ffd166'], decorA: '#3f302e', decorB: '#2b201f', decorC: '#ff6a2a',
      accent: '#ff7a3e', fog: 'rgba(255,120,60,0.08)', vignette: 'rgba(60,10,0,0.42)',
    },
    night: {
      ground: '#2e2120', groundDark: '#241918', groundLight: '#3a2a28', tuft: '#1c1312',
      road: '#4a3f3b', roadDark: '#3b322e', roadEdge: '#140e0d', pebble: '#2a201e',
      flower: ['#ff7a3e', '#ffb347', '#ffd166'], decorA: '#1f1716', decorB: '#140e0d', decorC: '#ff5a1a',
      accent: '#ff7a3e', fog: 'rgba(255,80,30,0.07)', vignette: 'rgba(15,0,0,0.66)',
    },
  },
  fortress: {
    decor: 'ruin',
    scatter: ['flagstone', 'tuft', 'pebble', 'flagstone', 'flower'],
    ambient: { day: 'leaf', night: 'snow' },
    day: {
      ground: '#a3b39a', groundDark: '#8d9e86', groundLight: '#b8c6ae', tuft: '#6f8466',
      road: '#d8d2c2', roadDark: '#b9b19c', roadEdge: '#6f6858', pebble: '#9a9384',
      flower: ['#e8574a', '#fff', '#ffd166'], decorA: '#8b8f99', decorB: '#62666f', decorC: '#a8323c',
      accent: '#e8574a', fog: 'rgba(240,240,255,0.12)', vignette: 'rgba(20,25,40,0.30)',
    },
    night: {
      ground: '#2f3a36', groundDark: '#26302c', groundLight: '#384540', tuft: '#1d2622',
      road: '#4e4c46', roadDark: '#3f3d38', roadEdge: '#1b1a17', pebble: '#5b5850',
      flower: ['#a8323c', '#c9d4ff', '#ffe08a'], decorA: '#4b505b', decorB: '#33373f', decorC: '#a8323c',
      accent: '#e8574a', fog: 'rgba(170,190,255,0.07)', vignette: 'rgba(5,8,18,0.66)',
    },
  },
  abyss: {
    decor: 'crystal',
    scatter: ['crack', 'pebble', 'mushroom', 'tuft', 'pebble'],
    ambient: { day: 'wisp', night: 'wisp' },
    day: {
      ground: '#8a7bb8', groundDark: '#7666a5', groundLight: '#9d8fc8', tuft: '#5e4f8e',
      road: '#d9cfe6', roadDark: '#bdb0d0', roadEdge: '#5b4c80', pebble: '#7a6aa6',
      flower: ['#7fe3f0', '#ff8fd8', '#fff'], decorA: '#b06cff', decorB: '#6a3fc2', decorC: '#e9c8ff',
      accent: '#c48bff', fog: 'rgba(220,200,255,0.10)', vignette: 'rgba(30,10,60,0.38)',
    },
    night: {
      ground: '#221a3a', groundDark: '#1b1430', groundLight: '#2a2146', tuft: '#140f26',
      road: '#3f3858', roadDark: '#322c48', roadEdge: '#0f0b1c', pebble: '#2e2648',
      flower: ['#7fe3f0', '#ff8fd8', '#c9d4ff'], decorA: '#8a4fe0', decorB: '#4f2a9e', decorC: '#d9b2ff',
      accent: '#c48bff', fog: 'rgba(160,110,255,0.08)', vignette: 'rgba(5,0,15,0.70)',
    },
  },
};

/** Visual identity of each tower type (body materials, glow), shared by sprites and lights. */
export const TOWER_LOOK = {
  arrow: { stone: '#b9a98c', stoneDark: '#8c7b61', roof: '#3e7fd1', roofDark: '#2a5ea3', trim: '#ffd166', light: '255,210,130' },
  cannon: { stone: '#8d8a86', stoneDark: '#615e5a', roof: '#e2621b', roofDark: '#a8440f', trim: '#2b2b2b', light: '255,150,80' },
  frost: { stone: '#cfe6f2', stoneDark: '#8fb4c9', roof: '#4ccce6', roofDark: '#2496b3', trim: '#ffffff', light: '120,220,255' },
  laser: { stone: '#5a4a72', stoneDark: '#3b2f4d', roof: '#e93d82', roofDark: '#a3225a', trim: '#ffd166', light: '255,90,170' },
};

/** Look of each enemy type: body, belly/detail and outline colours. */
export const ENEMY_LOOK = {
  grunt: { body: '#d9434a', dark: '#93242b', detail: '#f6c7a0' },
  runner: { body: '#f5a524', dark: '#b06d0c', detail: '#fff1c9' },
  tank: { body: '#7d63c9', dark: '#4b3790', detail: '#c9c2e6' },
  healer: { body: '#2e9e66', dark: '#1b6b43', detail: '#d6ffe8' },
  boss: { body: '#c23a8f', dark: '#7a1d58', detail: '#ffd166' },
};
