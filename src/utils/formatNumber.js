/**
 * Format large numbers for display (e.g. 1000 -> 1k, 1000000 -> 1M).
 * @param {number} n - Value to format.
 * @returns {string} Formatted string.
 */
export function formatNumber(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2).replace(/\.?0+$/, '') + 'k';
  return Math.floor(n).toString();
}
