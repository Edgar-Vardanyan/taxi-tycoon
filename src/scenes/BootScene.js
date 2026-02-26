import { Scene } from 'phaser';
import { loadSave } from '../game/GameState.js';
import { GameSDK } from '../game/GameSDK.js';

/** Minimal assets + SDK init. */
export default class BootScene extends Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    loadSave();
  }

  create() {
    let started = false;
    const startPreload = () => {
      if (started) return;
      started = true;
      this.scene.start('Preload');
    };
    GameSDK.init().then(startPreload).catch(startPreload);
    this.time.delayedCall(4000, startPreload);
  }
}
