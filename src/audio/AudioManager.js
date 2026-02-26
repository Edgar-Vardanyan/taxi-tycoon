/**
 * Global audio: SFX, looping music, unlock on first user gesture, mute toggle.
 * Init from MainScene with scene reference (uses scene.sound).
 */
const MUSIC_KEY = 'bg_music';
const MUSIC_VOLUME = 0.4;
const VOLUME_STORAGE_KEY = 'yerevan_taxi_volume';

let sceneRef = null;
let musicSound = null;
let unlocked = false;
let muted = false;
let volumeBeforeMute = 1;

/**
 * @param {Phaser.Scene} scene - Main scene (has sound manager).
 * @param {number} [savedVolume] - Optional 0..1 from save; overrides localStorage.
 */
export function init(scene, savedVolume) {
  sceneRef = scene;
  musicSound = null;
  unlocked = false;
  muted = false;
  if (typeof savedVolume === 'number' && savedVolume >= 0 && savedVolume <= 1) {
    volumeBeforeMute = savedVolume;
  } else if (typeof localStorage !== 'undefined') {
    try {
      const v = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY));
      if (!Number.isNaN(v) && v >= 0 && v <= 1) volumeBeforeMute = v;
    } catch (_) {}
  }
}

/**
 * Call on first click or Spacebar. Resumes AudioContext and starts bg_music.
 */
export function unlock() {
  if (!sceneRef) return;
  if (!unlocked) {
    unlocked = true;
    const startMusic = () => {
      try {
        musicSound = sceneRef.sound.add(MUSIC_KEY, {
          loop: true,
          volume: muted ? 0 : MUSIC_VOLUME * volumeBeforeMute,
        });
        musicSound.play();
      } catch (_) {
        // Key not in cache or sound error
      }
    };
    try {
      const ctx = sceneRef.sound.context;
      if (ctx && ctx.state === 'suspended') {
        const p = ctx.resume();
        if (p && typeof p.then === 'function') {
          p.then(startMusic).catch(() => {});
        } else {
          startMusic();
        }
      } else {
        startMusic();
      }
    } catch (_) {
      startMusic();
    }
  }
}

/**
 * @param {string} key - Sound key (e.g. 'sfx_click', 'sfx_buy').
 */
export function playSFX(key) {
  if (!sceneRef || !sceneRef.sound || muted) return;
  try {
    sceneRef.sound.play(key, { volume: volumeBeforeMute });
  } catch (_) {
    // Key not in cache or sound error
  }
}

/**
 * Pause or resume background music.
 */
export function toggleMusic() {
  if (!musicSound) return;
  if (musicSound.isPlaying) {
    musicSound.pause();
  } else {
    musicSound.resume();
  }
}

/** Pause background music (e.g. tab blur). */
export function pauseMusic() {
  if (musicSound && musicSound.isPlaying) {
    musicSound.pause();
  }
}

/** Resume background music (e.g. tab focus). */
export function resumeMusic() {
  if (musicSound && !musicSound.isPlaying) {
    musicSound.resume();
  }
}

/**
 * @param {number} value - Master volume 0..1.
 */
export function setVolume(value) {
  const v = Math.max(0, Math.min(1, value));
  volumeBeforeMute = v;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(v));
    } catch (_) {}
  }
  if (muted) return;
  if (musicSound) {
    musicSound.setVolume(MUSIC_VOLUME * v);
  }
}

/** @returns {number} Master volume 0..1. */
export function getVolume() {
  return volumeBeforeMute;
}

/**
 * Toggle all sound (music + SFX). Used by mute button.
 */
export function toggleMute() {
  muted = !muted;
  if (musicSound) {
    musicSound.setVolume(muted ? 0 : MUSIC_VOLUME * volumeBeforeMute);
  }
  return muted;
}

export function isMuted() {
  return muted;
}
