/**
 * Spawns simple car shapes that drive across the top or bottom of the screen.
 * Cars are rect + 2 circles. Different speeds. Added to the given container.
 */
const CAR_WIDTH = 24;
const CAR_HEIGHT = 12;
const WHEEL_R = 4;
const SPEED_MIN = 45;
const SPEED_MAX = 95;
const SPAWN_INTERVAL_MIN = 2200;
const SPAWN_INTERVAL_MAX = 4500;
const CAR_COLORS = [0x455a64, 0x546e7a, 0x78909c, 0x37474f];

export default class TrafficManager {
  constructor(scene, container, width, height) {
    this.scene = scene;
    this.container = container;
    this.width = width;
    this.height = height;
    this.cars = [];
    this.spawnTimer = null;
  }

  start() {
    const delay =
      SPAWN_INTERVAL_MIN +
      Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
    this.spawnTimer = this.scene.time.delayedCall(delay, () => {
      this.spawnCar();
      this.start();
    });
  }

  spawnCar() {
    const top = Math.random() > 0.5;
    const y = top ? 28 : this.height - 28;
    const goingRight = Math.random() > 0.5;
    const speed =
      (goingRight ? 1 : -1) *
      (SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN));
    const color =
      CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    const car = this.createCar(goingRight ? -40 : this.width + 40, y, color);
    car.speed = speed;
    car.top = top;
    this.container.add(car);
    this.cars.push(car);
  }

  createCar(x, y, color) {
    const container = this.scene.add.container(x, y);
    const g = this.scene.add.graphics();
    const hw = CAR_WIDTH / 2;
    const hh = CAR_HEIGHT / 2;
    g.fillStyle(color, 1);
    g.fillRoundedRect(-hw, -hh, CAR_WIDTH, CAR_HEIGHT, 2);
    g.fillStyle(0x263238, 1);
    g.fillCircle(-hw + 4, hh, WHEEL_R);
    g.fillCircle(hw - 4, hh, WHEEL_R);
    container.add(g);
    container.setDepth(1);
    return container;
  }

  update(time, delta) {
    const dt = delta / 1000;
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      car.x += car.speed * dt;
      if (car.speed > 0 && car.x > this.width + 50) {
        car.destroy();
        this.cars.splice(i, 1);
      } else if (car.speed < 0 && car.x < -50) {
        car.destroy();
        this.cars.splice(i, 1);
      }
    }
  }

  destroy() {
    if (this.spawnTimer) this.spawnTimer.remove();
    this.cars.forEach((c) => c.destroy());
    this.cars.length = 0;
  }
}
