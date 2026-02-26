/**
 * City background: subtle pattern texture for tiled background.
 */
export function createPatternTexture(scene, key = 'bg_pattern') {
  const size = 32;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0xffffff, 0.25);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x = col * size + size / 2;
      const y = row * size + size / 2;
      g.fillCircle(x, y, 1);
    }
  }
  g.fillStyle(0xffffff, 0.15);
  for (let i = 0; i <= 2; i++) {
    g.fillRect(i * size, 0, 1, size * 2);
    g.fillRect(0, i * size, size * 2, 1);
  }
  g.generateTexture(key, size * 2, size * 2);
  g.destroy();
}
