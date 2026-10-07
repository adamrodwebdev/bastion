/**
 * @file Landscape of each chapter: ground, road, water and vegetation colours,
 * the kind of trees and rocks, and the weather that animates it.
 *
 * Colours are daylight colours: the night look (dark mode) is a tint applied on
 * top of the whole scene, with torches and braziers lighting it back up.
 */

export const LANDSCAPES = {
  meadow: {
    ground: '#8fbf5a', groundDark: '#6f9f45', groundLight: '#b4d878',
    dirt: '#a8865a', road: '#c9b48c', roadDark: '#9c8662', stone: '#d8ccb0',
    water: '#3f8fc0', waterLight: '#7cc3e6',
    leaf: '#4e8a36', leafLight: '#79b24a', trunk: '#6b4a2b',
    rock: '#9a9890', rockDark: '#6c6a64',
    flowers: ['#f4f0e6', '#f2c84b', '#e07a9a', '#9fb7ff'],
    tree: 'oak', weather: 'pollen',
  },
  swamp: {
    ground: '#76925a', groundDark: '#5a7444', groundLight: '#94ab6c',
    dirt: '#76664a', road: '#a99a76', roadDark: '#7f7256', stone: '#b9ad8c',
    water: '#3d6b5e', waterLight: '#6f9a86',
    leaf: '#46613a', leafLight: '#6a8a4a', trunk: '#4d3a28',
    rock: '#7c8072', rockDark: '#585c50',
    flowers: ['#d9e3a0', '#c7a6d9'],
    tree: 'willow', weather: 'fireflies',
  },
  desert: {
    ground: '#e3c27f', groundDark: '#cfa765', groundLight: '#f1d99e',
    dirt: '#c49b62', road: '#efdcb4', roadDark: '#c8a676', stone: '#f4e6c6',
    water: '#3aa3b8', waterLight: '#86d4dc',
    leaf: '#5f8a34', leafLight: '#8db04a', trunk: '#8a6239',
    rock: '#c08a5a', rockDark: '#8e5f3a',
    flowers: ['#e86a4a', '#f4e6c6'],
    tree: 'palm', weather: 'dust',
  },
  mountain: {
    ground: '#9fae84', groundDark: '#7f8f68', groundLight: '#bcc89e',
    dirt: '#8a7a62', road: '#cfc6b0', roadDark: '#a19883', stone: '#dcd5c4',
    water: '#4f8fb8', waterLight: '#8cc3e0',
    leaf: '#3f6a44', leafLight: '#5b8a56', trunk: '#5a4230',
    rock: '#8e939c', rockDark: '#62666e',
    flowers: ['#f4f0e6', '#b8a6e6'],
    tree: 'pine', weather: 'mist',
  },
  winter: {
    ground: '#e9f0f4', groundDark: '#c9d8e2', groundLight: '#ffffff',
    dirt: '#9fa9b0', road: '#bfc6cc', roadDark: '#949ca4', stone: '#d6dce0',
    water: '#7fb6d6', waterLight: '#cfe9f6',
    leaf: '#2f5a4a', leafLight: '#4a7a62', trunk: '#4a3a2c',
    rock: '#8f9cab', rockDark: '#66707e',
    flowers: ['#ffffff'],
    tree: 'snowpine', weather: 'snow',
  },
  forest: {
    ground: '#6f9e4c', groundDark: '#557f3a', groundLight: '#8db866',
    dirt: '#7a5f3e', road: '#b8a37c', roadDark: '#8c7856', stone: '#c9b994',
    water: '#3b7a74', waterLight: '#6fae9e',
    leaf: '#2e5a2a', leafLight: '#4f8a3a', trunk: '#4f3622',
    rock: '#7e8478', rockDark: '#5a6056',
    flowers: ['#f2c84b', '#e8e2d0', '#c0392b'],
    tree: 'forest', weather: 'leaves',
  },
  storm: {
    ground: '#7f9476', groundDark: '#647a5e', groundLight: '#9aae8e',
    dirt: '#6f6656', road: '#b4ad9a', roadDark: '#888170', stone: '#c4bdaa',
    water: '#4a6a82', waterLight: '#7d9cb4',
    leaf: '#3c5440', leafLight: '#56705a', trunk: '#4a3c30',
    rock: '#7a7f8a', rockDark: '#555963',
    flowers: ['#d9d4c4'],
    tree: 'bare', weather: 'rain',
  },
  ashlands: {
    ground: '#8a6a5a', groundDark: '#6a4c40', groundLight: '#a3836f',
    dirt: '#4e3a33', road: '#6e5c56', roadDark: '#4a3c38', stone: '#857069',
    water: '#e0702a', waterLight: '#ffc24a',
    leaf: '#3a2a24', leafLight: '#5a4036', trunk: '#2e2220',
    rock: '#4a3a38', rockDark: '#2c2220',
    flowers: ['#ff8a3a'],
    tree: 'dead', weather: 'ash',
  },
  ramparts: {
    ground: '#8fa88a', groundDark: '#73906e', groundLight: '#adc4a4',
    dirt: '#8a7f6a', road: '#d8d1c0', roadDark: '#aaa290', stone: '#e6e0d0',
    water: '#4a86b0', waterLight: '#8cbedc',
    leaf: '#3f6248', leafLight: '#5c8463', trunk: '#4f3c2c',
    rock: '#8c929e', rockDark: '#626872',
    flowers: ['#f4f0e6', '#e0b84a'],
    tree: 'cypress', weather: 'birds',
  },
  capital: {
    ground: '#9cbc78', groundDark: '#7ea05e', groundLight: '#bdd696',
    dirt: '#a08a6a', road: '#e6dcc4', roadDark: '#b8aa8a', stone: '#f2ead6',
    water: '#4a8ad0', waterLight: '#92c4ee',
    leaf: '#3f7044', leafLight: '#62985a', trunk: '#5a4230',
    rock: '#a49ab8', rockDark: '#766c8c',
    flowers: ['#f4f0e6', '#e07a9a', '#f2c84b', '#9fb7ff'],
    tree: 'cypress', weather: 'petals',
  },
};

/** Night tint (dark mode), applied with the "multiply" blend over the whole board. */
export const NIGHT_TINT = '#8090c0';

/** Shared materials of buildings and props. */
export const MATERIALS = {
  stone: '#d6cdb8',
  stoneMid: '#b2a68c',
  stoneDark: '#7a6f5a',
  mortar: '#8e8370',
  wood: '#a8784a',
  woodDark: '#6e4a2c',
  woodLight: '#c99a64',
  iron: '#4a4f58',
  ironLight: '#8a919c',
  roofRed: '#b5452f',
  roofRedDark: '#7e2a1c',
  roofBlue: '#4f6a8f',
  roofBlueDark: '#2f4462',
  thatch: '#c9a35a',
  thatchDark: '#9a7838',
  gold: '#e9c35f',
  goldDark: '#a8822a',
  woad: '#2f4b7c',
  madder: '#a3322b',
};
