/**
 * Layer 1: Purple-to-blue gradient (far sky).
 * Uses canvas texture; sprite covers full area, scrollFactor 0.
 */
function createSkyGradientTexture(scene, w, h) {
  const key = 'sky_gradient';
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a0a2e');
  g.addColorStop(0.4, '#2d0b5a');
  g.addColorStop(1, '#0d1b2a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  scene.textures.addCanvas(key, canvas);
  return key;
}

/**
 * Layer 2: Faint dark-blue skyscraper silhouettes. scrollFactor 0.1.
 */
function createDistantBuildings(scene, w, h) {
  const container = scene.add.container(0, 0);
  container.setScrollFactor(0.1);
  const g = scene.add.graphics();
  const heights = [h * 0.5, h * 0.6, h * 0.45, h * 0.55, h * 0.4];
  const widths = [50, 70, 45, 80, 55];
  let x = -30;
  const step = 95;
  for (let i = 0; i < 12; i++) {
    const idx = i % heights.length;
    const bw = widths[idx];
    const bh = heights[idx];
    const y = h - bh;
    g.fillStyle(0x1e3a5f, 0.3);
    g.fillRect(x, y, bw, bh);
    x += step + (bw * 0.3);
  }
  container.add(g);
  return container;
}

/**
 * Layer 3: Darker silhouettes with yellow window lights. scrollFactor 0.3.
 */
function createNearBuildings(scene, w, h) {
  const container = scene.add.container(0, 0);
  container.setScrollFactor(0.3);
  const g = scene.add.graphics();
  const buildings = [
    { x: 0, w: 120, h: h * 0.65 },
    { x: 130, w: 90, h: h * 0.5 },
    { x: 240, w: 150, h: h * 0.7 },
    { x: 410, w: 80, h: h * 0.45 },
    { x: 510, w: 140, h: h * 0.6 },
    { x: 670, w: 100, h: h * 0.55 },
    { x: 790, w: 180, h: h * 0.75 },
    { x: 1000, w: 130, h: h * 0.5 },
    { x: 1150, w: 140, h: h * 0.65 },
  ];
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const y = h - b.h;
    g.fillStyle(0x0d1b2a, 0.85);
    g.fillRect(b.x, y, b.w, b.h);
    const rows = Math.floor(b.h / 28);
    const cols = Math.max(2, Math.floor(b.w / 18));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (Math.random() > 0.35) continue;
        const wx = b.x + 8 + col * 20;
        const wy = y + 12 + row * 26;
        g.fillStyle(0xffeb3b, 0.7);
        g.fillRect(wx, wy, 6, 8);
      }
    }
  }
  container.add(g);
  return container;
}

/**
 * Assembles Background container: sky gradient, distant buildings, near buildings.
 */
export function createLayeredBackground(scene, w, h) {
  const container = scene.add.container(0, 0);
  const skyKey = createSkyGradientTexture(scene, w, h);
  const sky = scene.add.image(0, 0, skyKey).setOrigin(0, 0);
  container.add(sky);
  container.add(createDistantBuildings(scene, w, h));
  container.add(createNearBuildings(scene, w, h));
  return container;
}
