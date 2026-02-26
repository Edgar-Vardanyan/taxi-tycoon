/**
 * Dynamic font scaling based on window width for responsive UI.
 * On mobile portrait (width < height), multiplies by 1.5 for readability.
 * @param {number} [scale=0.05] - Factor of innerWidth (e.g. 0.05 = 5% of width).
 * @param {number} [max=24] - Cap in pixels.
 * @param {{ width?: number, height?: number }} [dimensions] - Optional game size for portrait check.
 * @returns {number} Font size in pixels.
 */
export function getScaledFontSize(scale = 0.05, max = 24, dimensions = null) {
  const w = dimensions?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const h = dimensions?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 720);
  const portrait = w < h;
  const mult = portrait ? 1.5 : 1;
  const base = Math.min(Math.max(10, Math.floor(w * scale)), max);
  return Math.min(Math.max(10, Math.floor(base * mult)), Math.ceil(max * mult));
}

/**
 * Same as getScaledFontSize but returns string with 'px' for inline styles.
 */
export function getScaledFontSizePx(scale = 0.05, max = 24, dimensions = null) {
  return getScaledFontSize(scale, max, dimensions) + 'px';
}
