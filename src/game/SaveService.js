/**
 * Auto-save every 20 seconds. Triggers GameState.saveNow() and optional
 * callback for UI (e.g. "Saving..." icon).
 */
import { saveNow } from './GameState.js';

const AUTO_SAVE_INTERVAL_MS = 20 * 1000;

let intervalId = null;

/**
 * Start auto-save. Call once from MainScene create.
 * @param {function} [onSave] - Called after each save (e.g. show disk icon).
 */
export function startAutoSave(onSave) {
  if (intervalId != null) return;
  intervalId = setInterval(() => {
    saveNow();
    if (typeof onSave === 'function') onSave();
  }, AUTO_SAVE_INTERVAL_MS);
}

export function stopAutoSave() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
