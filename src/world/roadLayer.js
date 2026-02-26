/**
 * Road layer: bottom 30% of screen.
 * Dark grey asphalt + scrolling dashed white center line (TileSprite).
 */
const ASPHALT_COLOR = 0x263238;
const ROAD_SCROLL_SPEED = 45;
const DASH_TILE_WIDTH = 80;
const DASH_LEN = 24;

function createDashTexture(scene) {
  const key = 'road_dash';
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, DASH_LEN, 4);
  g.generateTexture(key, DASH_TILE_WIDTH, 4);
  g.destroy();
  return key;
}

/**
 * Returns container with asphalt rect and scrolling dash TileSprite.
 * Call updateRoadScroll(delta) each frame to scroll dashes.
 */
export function createRoadLayer(scene, w, h) {
  const container = scene.add.container(0, 0);
  const roadH = h * 0.3;
  const roadY = h - roadH;
  const asphalt = scene.add.graphics();
  asphalt.fillStyle(ASPHALT_COLOR, 1);
  asphalt.fillRect(0, roadY, w + 50, roadH + 20);
  container.add(asphalt);
  createDashTexture(scene);
  const dashStrip = scene.add.tileSprite(
    0,
    roadY + roadH / 2 - 2,
    w + DASH_TILE_WIDTH * 2,
    4,
    'road_dash'
  );
  dashStrip.setOrigin(0, 0.5);
  container.add(dashStrip);
  container.dashStrip = dashStrip;
  container.roadScrollSpeed = ROAD_SCROLL_SPEED;
  return container;
}

/**
 * Call from scene update. Scrolls dash to the left.
 */
export function updateRoadScroll(roadContainer, delta) {
  if (!roadContainer || !roadContainer.dashStrip) return;
  const dt = (delta || 16) / 1000;
  roadContainer.dashStrip.tilePositionX -=
    (roadContainer.roadScrollSpeed || ROAD_SCROLL_SPEED) * dt;
}
