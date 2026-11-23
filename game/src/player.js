// The player on foot: WASD walking, sprint, and getting in and out of cars.
// Carjacking (E near a traffic car) is a crime — it raises the wanted level.
import { TUNE } from './config.js';
import { clampToCity, resolveBuilding } from './city.js';
import { nearestTrafficCar } from './vehicles.js';

export function stepPlayerOnFoot(state, move, dt) {
  const p = state.player;
  const sprint = move.sprint ? TUNE.footSprint : TUNE.footSpeed;
  // move.x = strafe, move.z = forward, relative to the camera heading.
  const camH = state.cameraHeading;
  const fx = Math.sin(camH), fz = Math.cos(camH);
  const rx = Math.cos(camH), rz = -Math.sin(camH);
  const mx = fx * move.z + rx * move.x;
  const mz = fz * move.z + rz * move.x;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    p.heading = Math.atan2(mx, mz);
    p.x += (mx / len) * sprint * dt;
    p.z += (mz / len) * sprint * dt;
  }
  resolveBuilding(state.city, p, 0.7);
  clampToCity(p);
  p.speed = len > 0.01 ? sprint : 0;
}

// Try to enter the nearest car (own car, or a traffic car = carjacking).
// Returns 'own' | 'jacked' | null.
export function tryEnterCar(state) {
  const p = state.player;
  const dOwn = Math.hypot(state.car.x - p.x, state.car.z - p.z);
  if (dOwn < 5) {
    state.player.mode = 'car';
    return 'own';
  }
  const t = nearestTrafficCar(state, p.x, p.z, 5);
  if (t) {
    t.active = false; // the car is now the player's
    state.car.x = t.x; state.car.z = t.z; state.car.heading = t.heading;
    state.car.color = t.color;
    state.car.speed = 0;
    state.player.mode = 'car';
    state.carsStolen += 1;
    return 'jacked';
  }
  return null;
}

// Step out of the car onto the street beside it.
export function exitCar(state) {
  const p = state.player;
  p.mode = 'foot';
  p.x = state.car.x + Math.cos(state.car.heading) * 3;
  p.z = state.car.z - Math.sin(state.car.heading) * 3;
  p.heading = state.car.heading;
  p.speed = 0;
  clampToCity(p);
}
