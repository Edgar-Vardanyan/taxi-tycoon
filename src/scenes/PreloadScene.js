import { Scene } from 'phaser';
import { GameSDK } from '../game/GameSDK.js';

/** Progress bar and load all game assets. */
export default class PreloadScene extends Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    const w = this.scale.width;
    const h = this.scale.height;
    const barW = Math.min(400, w * 0.6);
    const barH = 24;
    const x = (w - barW) / 2;
    const y = h / 2 - barH / 2;

    const border = this.add.rectangle(
      x + barW / 2, y + barH / 2, barW + 4, barH + 4, 0x333333
    );
    const fill = this.add.rectangle(x + 2, y + 2, 0, barH, 0x4ade80);
    fill.setOrigin(0, 0);

    this.load.on('progress', (p) => {
      fill.width = (barW - 4) * p;
    });

    const loadingText = this.add
      .text(w / 2, y - 30, 'Loading...', {
        fontSize: 22,
        color: '#e2e8f0',
      })
      .setOrigin(0.5, 0);

    this.load.on('complete', () => {
      loadingText.setText('Ready!');
    });

    this.load.on('loaderror', () => {
      loadingText.setText('Loading...');
    });

    // If loader hangs (e.g. network), start Main after 3s
    this.loadTimeout = this.time.delayedCall(3000, () => {
      if (this.scene.isActive('Preload')) {
        this.scene.start('Main');
      }
    });

    // Tiny placeholder so loader runs; particles use generateTexture('particle_coin') in create
    this.load.image(
      'coin',
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    );

    this.load.audio('bg_music', '/audio/bg_music.mp3');
    this.load.audio('sfx_click', '/audio/sfx_click.mp3');
    this.load.audio('sfx_buy', '/audio/sfx_buy.mp3');
    this.load.audio('sfx_milestone', '/audio/sfx_milestone.mp3');
  }

  create() {
    if (this.loadTimeout) this.loadTimeout.remove();
    try {
      const g = this.add.graphics();
      g.fillStyle(0xffb347, 1);
      g.fillCircle(8, 8, 6);
      g.generateTexture('particle_coin', 16, 16);
      g.destroy();
    } catch (_) {
      // Non-fatal: particles will be skipped in Main
    }
    GameSDK.gameLoadingFinished();
    this.scene.start('Main');
  }
}
