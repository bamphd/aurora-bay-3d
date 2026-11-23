// Pedestrians: walkers on the sidewalks who keep the city alive. They stroll
// along road edges, pause at corners, and scatter when a car comes at them.
import { TUNE } from './config.js';
import { clampToCity, hitsBuilding } from './city.js';

const SHIRTS = [0xe05a5a, 0x5a7de0, 0x5ad08a, 0xe0c95a, 0xc95ad0, 0x5ad0c9, 0xe08a3a, 0x8a5ad0];

export function spawnPedestrians(state) {
  const rng = state.rng;
  state.peds = [];
  for (let i = 0; i < TUNE.pedCount; i += 1) {
    const along = rng.int(-8, 8) * 30 + rng.range(-6, 6);
    const cross = rng.int(-8, 8) * 30 + rng.range(6, 9) * (rng.chance(0.5) ? 1 : -1);
    state.peds.push({
      id: `p${i}`,
      x: along,
      z: cross,
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(0.8, 1.6),
      shirt: SHIRTS[i % SHIRTS.length],
      pause: 0,
    });
  }
}

export function stepPedestrians(state, dt) {
  const hero = state.player.mode === 'car' ? state.car : state.player;
  for (const p of state.peds) {
    if (p.pause > 0) { p.pause -= dt; continue; }
    // Scatter from a fast car heading at them.
    const dx = p.x - hero.x, dz = p.z - hero.z;
    const d = Math.hypot(dx, dz);
    if (d < 7 && Math.abs(hero.speed || 0) > 6) {
      p.heading = Math.atan2(dx, dz);
      p.speed = 3.2;
    } else {
      p.speed = 1.2;
    }
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    if (hitsBuilding(state.city, p.x, p.z, 0.6)) {
      p.heading += Math.PI / 2;
      p.x -= Math.sin(p.heading) * p.speed * dt;
      p.z -= Math.cos(p.heading) * p.speed * dt;
    }
    clampToCity(p);
    if (state.rng.chance(0.002)) p.pause = state.rng.range(1, 4);
    // Drift back toward a road edge so they don't wander into the void.
    if (Math.abs(p.x) > 260 || Math.abs(p.z) > 260) p.heading = Math.atan2(-p.x, -p.z);
  }
}
