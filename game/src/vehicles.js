// Car physics (arcade: accel, brake, steering scaled by speed) and the
// traffic system: cars that follow the road grid, stop for nothing, and keep
// the streets alive. All movement is fixed-step and seeded.
import { CITY, TUNE } from './config.js';
import { clampToCity, hitsBuilding, resolveBuilding } from './city.js';

const TRAFFIC_COLORS = [0x3a6fd8, 0xe0a030, 0x2f8f5a, 0xd8d8d8, 0x8a4fd0, 0x30343a, 0xc0c8d0];

// Arcade car step. `drive` = { throttle: -1..1, steer: -1..1, nitro: bool }.
// Returns true when the car hit a building or the map edge this step.
export function stepCar(car, drive, dt, city) {
  const max = TUNE.carMaxSpeed * (car.engineMul || 1);
  const accel = drive.throttle > 0 ? TUNE.carAccel : 0;
  const brake = drive.throttle < 0 ? TUNE.carBrake : 0;
  let speed = car.speed + (accel - brake) * dt;
  if (drive.nitro && car.nitroLeft > 0 && speed > 5) {
    speed += 22 * dt;
    car.nitroLeft = Math.max(0, car.nitroLeft - dt);
  }
  // Drag + rolling resistance so a coasting car slows down.
  speed -= speed * 0.35 * dt;
  speed = Math.max(-TUNE.carReverseMax, Math.min(max, speed));
  const spd = Math.abs(speed);
  car.heading += drive.steer * TUNE.carTurn * (spd / max) * Math.sign(speed || 1) * dt;
  car.x += Math.sin(car.heading) * speed * dt;
  car.z += Math.cos(car.heading) * speed * dt;
  car.speed = speed;
  let hit = false;
  if (resolveBuilding(city, car, 2.4)) { car.speed *= 0.4; hit = true; }
  if (clampToCity(car)) { car.speed *= 0.3; hit = true; }
  return hit;
}

// Spawn traffic cars on road centrelines, facing along a road.
export function spawnTraffic(state) {
  const rng = state.rng;
  state.traffic = [];
  for (let i = 0; i < TUNE.trafficCount; i += 1) {
    const along = rng.int(-8, 8) * 30;
    const cross = rng.int(-8, 8) * 30;
    const eastWest = rng.chance(0.5);
    const t = {
      id: `t${i}`,
      x: eastWest ? along : cross + (rng.chance(0.5) ? 2 : -2),
      z: eastWest ? cross + (rng.chance(0.5) ? 2 : -2) : along,
      heading: eastWest ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI),
      speed: rng.range(7, 13),
      color: TRAFFIC_COLORS[i % TRAFFIC_COLORS.length],
      kind: rng.chance(0.08) ? 'taxi' : 'civil',
      active: true,
    };
    state.traffic.push(t);
  }
}

// Traffic step: drive straight along the road, turn at intersections, wrap
// around the map edge instead of leaving it.
export function stepTraffic(state, dt) {
  for (const t of state.traffic) {
    if (!t.active) continue;
    t.x += Math.sin(t.heading) * t.speed * dt;
    t.z += Math.cos(t.heading) * t.speed * dt;
    // At an intersection (both coords near a road line), sometimes turn.
    const nearX = Math.abs(((t.x % 30) + 30) % 30 - 15) > 12;
    const nearZ = Math.abs(((t.z % 30) + 30) % 30 - 15) > 12;
    if (nearX && nearZ && state.rng.chance(0.02)) {
      t.heading += state.rng.pick([-Math.PI / 2, Math.PI / 2]);
    }
    if (t.x > 272 || t.x < -272 || t.z > 272 || t.z < -272) {
      t.x = -t.x * 0.9;
      t.z = -t.z * 0.9;
    }
    // Don't drive through buildings (traffic stays on roads, but a turn can
    // clip a corner): nudge back onto the road.
    if (hitsBuilding(state.city, t.x, t.z, 2)) {
      t.heading += Math.PI / 2;
      t.x -= Math.sin(t.heading) * t.speed * dt * 2;
      t.z -= Math.cos(t.heading) * t.speed * dt * 2;
    }
  }
}

// Nearest traffic car within `dist` of a point (for carjacking).
export function nearestTrafficCar(state, x, z, dist) {
  let best = null;
  let bestD = dist;
  for (const t of state.traffic) {
    if (!t.active) continue;
    const d = Math.hypot(t.x - x, t.z - z);
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}
