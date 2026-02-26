/**
 * Vignette: darkened corners via radial gradient. Focus on center (taxi).
 */
export function createVignetteTexture(scene, w, h) {
  const key = 'vignette';
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(w, h) * 0.72;
  const g = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.15)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  scene.textures.addCanvas(key, canvas);
  return key;
}

/**
 * Returns a sprite for the vignette. Add to UI container, setScrollFactor(0), depth on top.
 */
export function createVignetteSprite(scene, w, h) {
  createVignetteTexture(scene, w, h);
  const sprite = scene.add.image(0, 0, 'vignette').setOrigin(0, 0);
  sprite.setScrollFactor(0);
  sprite.setAlpha(1);
  sprite.setDepth(0);
  return sprite;
}
