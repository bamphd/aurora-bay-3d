// The wanted system and the ABPD response: patrol cars that chase and PIT,
// roadblocks ahead of the player, spike strips at 4+ stars, and KESTREL-1,
// the police helicopter with a spotlight. Wanted decays while hidden.
import { POLICE, TUNE } from './config.js';
import { clampToCity, hitsBuilding } from './city.js';

export function addWanted(state, stars) {
  state.wanted = Math.max(0, Math.min(5, state.wanted + stars));
  state.wantedSeen = state.time;
  if (state.wanted >= 3) state.alerts.push(`${POLICE.airCallsign} AIR SUPPORT ON STATION`);
  if (state.wanted >= 4) state.alerts.push('SWAT VAN DEPLOYED — 4 STARS');
}

export function policeCountFor(wanted) {
  return [0, 1, 2, 3, 4, 5][Math.max(0, Math.min(5, Math.round(wanted)))];
}

export function spawnPolice(state) {
  state.police = [];
  for (let i = 0; i < 5; i += 1) {
    state.police.push({
      id: `cop${i}`, x: 0, z: 0, heading: 0, speed: 0,
      kind: i === 4 ? 'van' : 'car', active: false, stuck: 0,
    });
  }
  state.roadblocks = [];
  state.spikes = [];
  state.heli = { active: false, x: 0, z: 0, angle: 0 };
}

function nearestRoadAhead(state, dist) {
  // A point `dist` ahead of the hero, snapped to the nearest road centreline.
  const hero = state.player.mode === 'car' ? state.car : state.player;
  const ax = hero.x + Math.sin(hero.heading) * dist;
  const az = hero.z + Math.cos(hero.heading) * dist;
  const snap = (v) => Math.round(v / 30) * 30;
  return { x: Math.max(-270, Math.min(270, snap(ax))), z: Math.max(-270, Math.min(270, snap(az))) };
}

export function stepPolice(state, dt) {
  const hero = state.player.mode === 'car' ? state.car : state.player;
  const heroSpeed = Math.abs(hero.speed || 0);
  // Wanted decays when the player is slow and far from any cop.
  let nearestCop = 999;
  for (const c of state.police) {
    if (!c.active) continue;
    nearestCop = Math.min(nearestCop, Math.hypot(c.x - hero.x, c.z - hero.z));
  }
  if (state.wanted > 0 && heroSpeed < 3 && nearestCop > 60 && state.time - state.wantedSeen > 6) {
    state.wanted = Math.max(0, state.wanted - TUNE.wantedDecay * dt);
  }

  const want = policeCountFor(state.wanted);
  let active = 0;
  for (const c of state.police) {
    if (active < want) {
      if (!c.active) {
        // Spawn behind the player, on a road.
        const back = 40 + active * 15;
        c.x = hero.x - Math.sin(hero.heading) * back + (active % 2 === 0 ? 12 : -12);
        c.z = hero.z - Math.cos(hero.heading) * back;
        c.heading = hero.heading;
        c.speed = 0;
        c.active = true;
        c.stuck = 0;
      }
      active += 1;
      // Chase: steer toward the hero, faster than the hero's cruise speed.
      const dx = hero.x - c.x, dz = hero.z - c.z;
      const wantH = Math.atan2(dx, dz);
      let dh = wantH - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      const target = Math.min(34 + state.wanted * 2, 44);
      c.speed += (target - c.speed) * 0.8 * dt;
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += Math.cos(c.heading) * c.speed * dt;
      if (hitsBuilding(state.city, c.x, c.z, 2)) {
        c.heading += Math.PI / 3;
        c.stuck += dt;
        if (c.stuck > 2) { c.active = false; c.stuck = 0; }
      } else {
        c.stuck = 0;
      }
      clampToCity(c);
      // PIT: a close cop rams the hero car and spins it.
      const d = Math.hypot(hero.x - c.x, hero.z - c.z);
      if (d < 3.4 && state.player.mode === 'car' && state.car.speed > 4) {
        state.car.heading += 0.9 * dt * 4;
        state.car.speed *= 0.82;
        state.fx.shake = Math.min(1, state.fx.shake + 0.5);
      }
    } else {
      c.active = false;
    }
  }

  // Roadblocks: at 2+ stars, a block forms ahead of the hero every ~25s.
  state.roadblockTimer -= dt;
  if (state.wanted >= 2 && state.roadblockTimer <= 0) {
    const p = nearestRoadAhead(state, 90);
    state.roadblocks.push({ x: p.x, z: p.z, ttl: 20 });
    state.alerts.push('ABPD ROADBLOCK AHEAD');
    state.roadblockTimer = 25;
  }
  state.roadblocks = state.roadblocks.filter((r) => (r.ttl -= dt) > 0);
  // Hitting a roadblock car stops the hero hard.
  for (const r of state.roadblocks) {
    if (Math.hypot(hero.x - r.x, hero.z - r.z) < 5 && state.player.mode === 'car') {
      state.car.speed *= 0.3;
      state.fx.shake = 1;
    }
  }

  // Spike strips at 4+ stars: a strip across the road ahead.
  state.spikeTimer -= dt;
  if (state.wanted >= 4 && state.spikeTimer <= 0) {
    const p = nearestRoadAhead(state, 70);
    state.spikes.push({ x: p.x, z: p.z, ttl: 18 });
    state.alerts.push('SPIKE STRIP DEPLOYED');
    state.spikeTimer = 30;
  }
  state.spikes = state.spikes.filter((s) => (s.ttl -= dt) > 0);
  for (const s of state.spikes) {
    if (Math.hypot(hero.x - s.x, hero.z - s.z) < 4 && state.player.mode === 'car') {
      state.car.speed = Math.min(state.car.speed, 6);
    }
  }

  // KESTREL-1 circles the hero at 3+ stars.
  state.heli.active = state.wanted >= 3;
  if (state.heli.active) {
    state.heli.angle += dt * 0.45;
    state.heli.x = hero.x + Math.cos(state.heli.angle) * 32;
    state.heli.z = hero.z + Math.sin(state.heli.angle) * 32;
  }
}
