// The screenshot scenes behind ?shot=cover|onfoot|night|garage. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, with the HUD forced into its densest state (wanted stars filled,
// mission banner, police alerts, money + REP, district standing), so the
// frame is what a real chase really looks like — and the same seed always
// gives the same frame. Density beats beauty: every shot shows 8+ systems.
import { TUNE } from './config.js';

function setHudDense(state, opts) {
  state.wanted = opts.wanted;
  state.wantedSeen = state.time;
  state.money = opts.money;
  state.rep = opts.rep;
  state.mission.index = opts.mission;
  state.mission.state = 'active';
  state.mission.progress = 0;
  state.alerts = opts.alerts.slice();
  if (opts.ghost) state.crew.ghostTimer = 0;
}

function placeTrafficAhead(state, xs, zs, heading, speed) {
  // Place the first N traffic cars at fixed road spots ahead of the hero.
  for (let i = 0; i < Math.min(xs.length, state.traffic.length); i += 1) {
    const t = state.traffic[i];
    t.x = xs[i]; t.z = zs[i]; t.heading = heading; t.speed = speed; t.active = true;
  }
}

function placePedsNear(state, spots) {
  for (let i = 0; i < Math.min(spots.length, state.peds.length); i += 1) {
    const p = state.peds[i];
    p.x = spots[i][0]; p.z = spots[i][1];
    p.heading = spots[i][2] || 0;
    p.speed = 1.2;
  }
}

function activatePolice(state, spots) {
  for (let i = 0; i < Math.min(spots.length, state.police.length); i += 1) {
    const c = state.police[i];
    c.x = spots[i][0]; c.z = spots[i][1]; c.heading = spots[i][2] || 0;
    c.speed = 20; c.active = true;
  }
}

function setCamera(state, x, y, z, lx, ly, lz) {
  state.camera.x = x; state.camera.y = y; state.camera.z = z;
  state.camera.lx = lx; state.camera.ly = ly; state.camera.lz = lz;
}

function heroCamera(state, back, height, ahead, side = 0) {
  // Chase framing from the hero's actual position after the settle steps:
  // `back` metres behind, `height` up, looking `ahead` metres forward.
  // `side` shifts the look target sideways so the hero sits off-centre
  // (used by the garage shot, where the panel covers the middle).
  const hero = state.player.mode === 'car' ? state.car : state.player;
  const h = hero.heading;
  const rx = -Math.cos(h), rz = Math.sin(h); // right of the heading
  setCamera(
    state,
    hero.x - Math.sin(h) * back, height, hero.z - Math.cos(h) * back,
    hero.x + Math.sin(h) * ahead + rx * side, 2, hero.z + Math.cos(h) * ahead + rz * side,
  );
}

function settle(world, steps, input) {
  for (let i = 0; i < steps; i += 1) world.step(TUNE.step, input);
}

export function stageShot(name, world, renderer) {
  const state = world.state;
  world.reset();
  const idle = { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false };
  const drive = { throttle: 0.9, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false };

  if (name === 'onfoot') {
    // ON FOOT in the Marina plaza: weapon wheel open, wanted 2, mission 3.
    renderer.setTimeOfDay('golden');
    state.player.mode = 'foot';
    state.player.x = 0; state.player.z = 12; state.player.heading = Math.PI;
    state.car.x = 18; state.car.z = 30; state.car.heading = Math.PI / 2;
    setHudDense(state, {
      wanted: 2, money: 3280, rep: 18, mission: 2,
      alerts: ['WANTED LEVEL 2 — GRAND THEFT AUTO', 'ABPD UNITS RESPONDING — OLD TOWN'],
    });
    state.combat.wheelOpen = true;
    state.combat.weapons[1].owned = true;
    state.combat.weapons[2].owned = true;
    state.combat.weapons[3].owned = true;
    placePedsNear(state, [[-8, 4, 0], [10, -2, Math.PI], [-14, 20, 1.5], [6, 26, 0.5], [-4, -14, 2.5]]);
    activatePolice(state, [[-30, 40, Math.PI], [30, 48, Math.PI]]);
    settle(world, 20, idle);
    heroCamera(state, 13, 3.8, 14);
    return { timeOfDay: 'golden' };
  }

  if (name === 'night') {
    // NIGHT in Downtown: neon, 4-star chase, KESTREL-1 overhead, mission 6.
    renderer.setTimeOfDay('night');
    state.timeOfDay = 'night'; // the HUD clock follows the light, not the sim
    state.player.mode = 'car';
    state.car.x = 180; state.car.z = -120; state.car.heading = Math.PI;
    state.car.speed = 30;
    setHudDense(state, {
      wanted: 4, money: 12480, rep: 42, mission: 5,
      alerts: ['SWAT VAN DEPLOYED — 4 STARS', 'KESTREL-1 AIR SUPPORT ON STATION', 'ABPD ROADBLOCK AHEAD', 'MISSION 6: GOLDEN GETAWAY'],
    });
    state.heli.active = true;
    state.heli.x = 180; state.heli.z = -150;
    placeTrafficAhead(state, [178, 182, 178, 212], [-150, -180, -90, -150], Math.PI, 10);
    placePedsNear(state, [[168, -100, 0], [192, -140, 3], [174, -170, 1]]);
    activatePolice(state, [[180, -80, Math.PI], [156, -90, Math.PI], [204, -90, 0], [180, -60, Math.PI]]);
    state.roadblocks.push({ x: 180, z: -210, ttl: 20 });
    settle(world, 25, drive);
    heroCamera(state, 22, 9, 30);
    return { timeOfDay: 'night' };
  }

  if (name === 'garage') {
    // GARAGE: the shop panel open, hero car parked on the road facing the
    // garage, money + REP on show. Camera on the road behind the car.
    renderer.setTimeOfDay('golden');
    state.player.mode = 'car';
    state.car.x = -30; state.car.z = 48; state.car.heading = Math.PI;
    state.car.speed = 0;
    state.garage.open = true;
    setHudDense(state, {
      wanted: 0, money: 24800, rep: 86, mission: 4,
      alerts: ['GARAGE: AURORA GT INSTALLED — $12,000', 'MISSION 5: STREET KINGS — WIN THE SPRINT'],
    });
    state.combat.weapons[1].owned = true;
    state.combat.weapons[2].owned = true;
    state.combat.weapons[3].owned = true;
    state.garage.engine = 2; state.garage.armor = 1; state.garage.nitro = 1;
    placeTrafficAhead(state, [-60, -90, 0], [30, 60, 90], Math.PI / 2, 8);
    placePedsNear(state, [[-26, 20, 0], [-26, 60, 2], [-34, 66, 1]]);
    settle(world, 15, idle);
    // side=-22 puts the hero car right of the garage panel (measured: the
    // car projects to NDC x 0.31 at side=-14, still behind the panel;
    // -22 pushes it past the panel's right edge).
    heroCamera(state, 20, 7, 25, -22);
    return { timeOfDay: 'golden' };
  }

  // Default: COVER — golden-hour chase across the open Marina plaza, hero
  // car big in frame, sun + skyline ahead, police behind, mission 6. The
  // plaza keeps the camera off the building faces: the old x=30 canyon
  // wedged it against a flat orange wall, and the pale plaza ground reads
  // bright instead of near-black.
  renderer.setTimeOfDay('golden');
  state.player.mode = 'car';
  state.car.x = 0; state.car.z = 38; state.car.heading = Math.PI;
  state.car.speed = 30;
  setHudDense(state, {
    wanted: 4, money: 12480, rep: 42, mission: 5,
    alerts: ['SWAT VAN DEPLOYED — 4 STARS', 'KESTREL-1 AIR SUPPORT ON STATION', 'ABPD ROADBLOCK AHEAD', 'MISSION 6: GOLDEN GETAWAY'],
  });
  state.heli.active = true;
  state.heli.x = 30; state.heli.z = 0;
  placeTrafficAhead(state, [0, 3, -3, 0, 2], [18, -2, -22, -38, 8], Math.PI, 11);
  // Two more cars crossing on the z=0 road for density (east/westbound).
  state.traffic[5].x = -24; state.traffic[5].z = 0; state.traffic[5].heading = Math.PI / 2; state.traffic[5].speed = 10; state.traffic[5].active = true;
  state.traffic[6].x = 24; state.traffic[6].z = 0; state.traffic[6].heading = -Math.PI / 2; state.traffic[6].speed = 10; state.traffic[6].active = true;
  placePedsNear(state, [[-8, 24, 0], [10, 12, 3], [-14, -6, 1], [8, -18, 2], [-6, -32, 0], [16, 30, 1.5]]);
  activatePolice(state, [[0, 70, Math.PI], [-6, 82, Math.PI], [6, 96, 0]]);
  state.roadblocks.push({ x: 0, z: -30, ttl: 20 });
  settle(world, 30, drive);
  heroCamera(state, 12, 5.5, 26);
  return { timeOfDay: 'golden' };
}
