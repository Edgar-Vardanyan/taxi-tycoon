/**
 * Wrapper for game SDK (Poki). Uses window.PokiSDK when available.
 * Interstitial: when Shop is closed, max once every 120s.
 * Uses freezeGame/unfreezeGame for 100% input freeze during ads.
 */
const INTERSTITIAL_COOLDOWN_MS = 120 * 1000; // 120 seconds
const INIT_TIMEOUT_MS = 2500;
let lastInterstitialTime = 0;
let initPromise = null;

/** Global: true while any ad is playing. Check this before handling click/spacebar. */
let isAdPlaying = false;

/** Full-screen block layer created during freeze; destroyed in unfreeze. */
let _adBlockLayer = null;

function getPoki() {
  return typeof window !== 'undefined' && window.PokiSDK
    ? window.PokiSDK
    : null;
}

function getMainScene() {
  return typeof window !== 'undefined' && window.__YEREVAN_MAIN_SCENE__
    ? window.__YEREVAN_MAIN_SCENE__
    : null;
}

/**
 * Full input freeze: disable input, pause scene and sound, add block layer.
 * Call before requesting any ad.
 */
export function freezeGame() {
  const scene = getMainScene();
  if (!scene) return;
  isAdPlaying = true;
  const Poki = getPoki();
  if (Poki && Poki.gameplayStop) Poki.gameplayStop();

  if (scene.input) scene.input.enabled = false;
  if (scene.scene && typeof scene.scene.pause === 'function') {
    scene.scene.pause('Main');
  }
  if (scene.sound && typeof scene.sound.pauseAll === 'function') {
    scene.sound.pauseAll();
  }

  const w = scene.cameras.main.width;
  const h = scene.cameras.main.height;
  const block = scene.add
    .rectangle(w / 2, h / 2, w, h, 0x000000, 0)
    .setDepth(9999)
    .setScrollFactor(0);
  block.setInteractive({ useHandCursor: false });
  block.on('pointerdown', () => {});
  block.on('pointerup', () => {});
  _adBlockLayer = block;

  const canvas = scene.sys && scene.sys.game && scene.sys.game.canvas;
  if (canvas) canvas.style.pointerEvents = 'none';
}

/**
 * Restore input and gameplay. Call only when ad promise resolves.
 * Resets pointer state to prevent "pointer-stay-down" after ad.
 */
export function unfreezeGame() {
  const scene = getMainScene();
  if (!scene) return;
  isAdPlaying = false;

  if (_adBlockLayer) {
    _adBlockLayer.destroy();
    _adBlockLayer = null;
  }

  if (scene.input) {
    scene.input.enabled = true;
    const ap = scene.input.activePointer;
    if (ap && typeof ap.reset === 'function') ap.reset();
    const mp = scene.input.mousePointer;
    if (mp && mp !== ap && typeof mp.reset === 'function') mp.reset();
  }
  if (scene.sound && typeof scene.sound.resumeAll === 'function') {
    scene.sound.resumeAll();
  }
  if (scene.scene && typeof scene.scene.resume === 'function') {
    scene.scene.resume('Main');
  }

  const canvas = scene.sys && scene.sys.game && scene.sys.game.canvas;
  if (canvas) canvas.style.pointerEvents = '';

  const Poki = getPoki();
  if (Poki && Poki.gameplayStart) Poki.gameplayStart();
}

const SHIELD_UNFREEZE_DELAY_MS = 200;

function showAdGuardDOM() {
  if (typeof window !== 'undefined' && window.showAdGuard) {
    window.showAdGuard();
  }
}

function hideAdGuardDOM() {
  if (typeof window !== 'undefined' && window.hideAdGuard) {
    window.hideAdGuard();
  }
}

/**
 * Activate shield, disable input, mute, run ad, then after resolve wait 200ms
 * and deactivate. gameplayStop before ad; gameplayStart inside delayed callback.
 * DOM ad-guard is shown first to block clicks at browser level.
 */
function runWithShield(adPromiseFn) {
  const scene = getMainScene();
  const Poki = getPoki();
  if (!scene || !scene.inputShield) return Promise.resolve(false);

  isAdPlaying = true;
  showAdGuardDOM();
  if (Poki && Poki.gameplayStop) Poki.gameplayStop();

  scene.inputShield.setVisible(true);
  if (scene.input) scene.input.enabled = false;
  if (scene.sound) scene.sound.mute = true;

  return adPromiseFn().then(
    (result) => {
      if (typeof console !== 'undefined' && console.log) {
        console.log('Ad finished');
      }
      return new Promise((resolve) => {
        scene.time.delayedCall(SHIELD_UNFREEZE_DELAY_MS, () => {
          scene.inputShield.setVisible(false);
          if (scene.input) scene.input.enabled = true;
          if (scene.sound) scene.sound.mute = false;
          hideAdGuardDOM();
          if (Poki && Poki.gameplayStart) Poki.gameplayStart();
          isAdPlaying = false;
          resolve(result);
        });
      });
    },
    (err) => {
      scene.inputShield.setVisible(false);
      if (scene.input) scene.input.enabled = true;
      if (scene.sound) scene.sound.mute = false;
      hideAdGuardDOM();
      if (Poki && Poki.gameplayStart) Poki.gameplayStart();
      isAdPlaying = false;
      throw err;
    }
  );
}

export const GameSDK = {
  get isAdPlaying() {
    return isAdPlaying;
  },

  /**
   * Call from MainScene create so ads can pause/resume/mute.
   * @param {Phaser.Scene} scene - Main gameplay scene.
   */
  setMainScene(scene) {
    if (typeof window !== 'undefined') {
      window.__YEREVAN_MAIN_SCENE__ = scene || null;
    }
  },

  init() {
    const Poki = getPoki();
    if (Poki && !initPromise) {
      initPromise = Promise.race([
        Poki.init().catch(() => null),
        new Promise((r) => setTimeout(r, INIT_TIMEOUT_MS)),
      ]);
    }
    return initPromise || Promise.resolve();
  },

  gameLoadingFinished() {
    const Poki = getPoki();
    if (Poki) Poki.gameLoadingFinished();
  },

  gameplayStart() {
    const Poki = getPoki();
    if (Poki) Poki.gameplayStart();
  },

  gameplayStop() {
    const Poki = getPoki();
    if (Poki) Poki.gameplayStop();
  },

  /**
   * Interstitial – call when Shop is closed. Throttled to every 120s.
   * Uses input shield + 200ms buffer. gameplayStop before; gameplayStart after.
   */
  showAd() {
    const now = Date.now();
    if (now - lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) {
      return Promise.resolve();
    }
    lastInterstitialTime = now;
    const Poki = getPoki();
    if (Poki && typeof Poki.commercialBreak === 'function') {
      return runWithShield(() => Poki.commercialBreak().catch(() => {}));
    }
    return Promise.resolve();
  },

  /** Alias for compatibility. */
  showInterstitial() {
    return this.showAd();
  },

  /**
   * Rewarded video. Resolves with true if user earned reward.
   * Uses input shield + 200ms buffer. gameplayStop before; gameplayStart after.
   */
  rewardedAd() {
    const Poki = getPoki();
    if (Poki && typeof Poki.rewardedBreak === 'function') {
      return runWithShield(() =>
        Poki.rewardedBreak().then((withReward) => !!withReward)
      );
    }
    return Promise.resolve(false);
  },

  showRewarded() {
    return this.rewardedAd();
  },
};
