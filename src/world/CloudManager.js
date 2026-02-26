/**
 * Soft white ovals drifting across top of screen. 4-5 clouds, wrap when off-screen.
 */
const CLOUD_SPEED = 12;
const CLOUD_COUNT = 5;

function makeCloud(scene) {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 0.22);
  g.fillEllipse(0, 0, 42, 18);
  g.fillEllipse(28, -4, 28, 14);
  g.fillEllipse(50, 2, 22, 12);
  c.add(g);
  return c;
}

export function createCloudManager(scene, w, h) {
  const container = scene.add.container(0, 0);
  const clouds = [];
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const cloud = makeCloud(scene);
    cloud.x = (w / (CLOUD_COUNT + 1)) * (i + 1) - 30 + i * 20;
    cloud.y = 50 + i * 22;
    container.add(cloud);
    clouds.push(cloud);
  }
  container.clouds = clouds;
  container.cloudSpeed = CLOUD_SPEED;
  container.camW = w;
  return container;
}

/**
 * Call from scene update. Moves clouds and wraps.
 */
export function updateClouds(cloudContainer, delta) {
  if (!cloudContainer || !cloudContainer.clouds) return;
  const dt = (delta || 16) / 1000;
  const w = cloudContainer.camW || 1280;
  for (let i = 0; i < cloudContainer.clouds.length; i++) {
    const c = cloudContainer.clouds[i];
    c.x += cloudContainer.cloudSpeed * dt;
    if (c.x > w + 80) c.x = -80;
  }
}
