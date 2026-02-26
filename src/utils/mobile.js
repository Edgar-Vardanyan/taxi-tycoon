/**
 * Mobile detection and haptics for one-handed portrait play.
 */

export function isMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    || touch;
}

export function isPortrait() {
  if (typeof window === 'undefined') return true;
  return window.innerHeight >= window.innerWidth;
}

/**
 * Light haptic when supported (e.g. button press).
 * @param {number} [ms=10]
 */
export function vibrate(ms = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch (_) {}
  }
}
