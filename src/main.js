import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MainScene from './scenes/MainScene.js';
import ShopScene from './scenes/ShopScene.js';
import AchievementScene from './scenes/AchievementScene.js';

/**
 * DOM-level ad guard: blocks all clicks from reaching the game canvas during ads.
 * Used by GameSDK before/after commercialBreak and rewardedBreak.
 */
function showAdGuard() {
  const el = document.getElementById('ad-guard');
  if (el) el.style.display = 'block';
}

function hideAdGuard() {
  const el = document.getElementById('ad-guard');
  if (el) el.style.display = 'none';
}

if (typeof window !== 'undefined') {
  window.showAdGuard = showAdGuard;
  window.hideAdGuard = hideAdGuard;
}

function preventContextMenu(e) {
  e.preventDefault();
}

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#2D0B5A',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: false,
    antialias: true,
    powerPreference: 'high-performance',
  },
  scene: [BootScene, PreloadScene, MainScene, ShopScene, AchievementScene],
};

function launch() {
  const game = new Phaser.Game(config);
  const canvas = game.canvas;
  if (canvas) {
    canvas.addEventListener('contextmenu', preventContextMenu);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('contextmenu', preventContextMenu);
  }
  return game;
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => launch());
} else {
  launch();
}
