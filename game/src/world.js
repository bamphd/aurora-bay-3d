// Aurora Bay's rules and state, with no drawing and no browser in it: the
// player, the car, traffic, pedestrians, police, missions, activities and
// the economy. step() advances one fixed 1/60 s step. The camera follows the
// hero from behind; the HUD reads this state, and the renderer paints it.
import { CITY, DISTRICTS, MISSIONS, TUNE, WEAPONS } from './config.js';
import { generateCity, districtAt, clampToCity } from './city.js';
import { stepCar, spawnTraffic, stepTraffic } from './vehicles.js';
import { spawnPedestrians, stepPedestrians } from './pedestrians.js';
import { stepPlayerOnFoot } from './player.js';
import { spawnPolice, stepPolice } from './police.js';
import { createMissionState, stepMissions, completeMission } from './missions.js';
import { createActivityState, stepActivities, checkActivityMission } from './activities.js';
import { createCombatState, stepCombat } from './combat.js';
import { createCrewState, stepCrew } from './crew.js';
import { createGarageState } from './garage.js';
import { createRadioState, stepRadio } from './radio.js';
import { createFxState, stepFx } from './fx.js';

export function createWorld(random) {
  const city = generateCity(1);
  const state = {
    rng: random,
    city,
    time: 0,
    timeOfDay: 'golden',
    player: {
      mode: 'car', x: 24, z: 150, heading: Math.PI, speed: 0,
      health: 100, armor: 0, armorMax: 100,
    },
    car: {
      x: 24, z: 150, heading: Math.PI, speed: 0, color: 0xef2a1e,
      engineMul: 1, nitroLeft: 0, nitroMax: 0,
    },
    traffic: [],
    peds: [],
    police: [],
    roadblocks: [],
    spikes: [],
    heli: { active: false, x: 0, z: 0, angle: 0 },
    roadblockTimer: 20,
    spikeTimer: 30,
    wanted: 0,
    wantedSeen: -999,
    money: 500,
    rep: 0,
    missionsDone: 0,
    mission: createMissionState(),
    combat: createCombatState(),
    crew: createCrewState(),
    activities: createActivityState(),
    garage: createGarageState(),
    radio: createRadioState(),
    fx: createFxState(),
    carsStolen: 0,
    best: 0,
    alerts: [],
    cameraHeading: Math.PI,
    camera: { x: 30, y: 12, z: 172, lx: 30, ly: 2, lz: 130 },
    district: 'MARINA',
    speedKmh: 0,
  };

  function reset() {
    state.time = 0;
    state.timeOfDay = 'golden';
    state.player.mode = 'car';
    state.player.x = 30; state.player.z = 150; state.player.heading = Math.PI;
    state.player.health = 100; state.player.armor = 0; state.player.speed = 0;
    state.car.x = 30; state.car.z = 150; state.car.heading = Math.PI; state.car.speed = 0;
    state.car.color = 0xef2a1e; state.car.engineMul = 1; state.car.nitroLeft = 0; state.car.nitroMax = 0;
    state.wanted = 0;
    state.money = 500;
    state.rep = 0;
    state.missionsDone = 0;
    state.mission = createMissionState();
    state.combat = createCombatState();
    state.crew = createCrewState();
    state.activities = createActivityState();
    state.garage = createGarageState();
    state.radio = createRadioState();
    state.fx = createFxState();
    state.carsStolen = 0;
    state.alerts = [];
    state.roadblockTimer = 20;
    state.spikeTimer = 30;
    spawnTraffic(state);
    spawnPedestrians(state);
    spawnPolice(state);
    updateDistrict(state);
  }

  function updateDistrict(s) {
    const hero = s.player.mode === 'car' ? s.car : s.player;
    s.district = districtAt(hero.x, hero.z).name;
  }

  function updateCamera(s) {
    const hero = s.player.mode === 'car' ? s.car : s.player;
    const back = s.player.mode === 'car' ? 13 : 8;
    const height = s.player.mode === 'car' ? 5.5 : 4.2;
    const h = hero.heading;
    const cx = hero.x - Math.sin(h) * back;
    const cz = hero.z - Math.cos(h) * back;
    // Keep the camera out of buildings: lift it if the spot is inside one.
    let cy = height;
    for (const b of s.city.buildings) {
      if (cx > b.x - b.w / 2 - 1 && cx < b.x + b.w / 2 + 1 && cz > b.z - b.d / 2 - 1 && cz < b.z + b.d / 2 + 1) {
        cy = Math.max(cy, b.h + 4);
      }
    }
    s.camera.x += (cx - s.camera.x) * 0.12;
    s.camera.y += (cy - s.camera.y) * 0.12;
    s.camera.z += (cz - s.camera.z) * 0.12;
    s.camera.lx = hero.x + Math.sin(h) * 18;
    s.camera.ly = 2;
    s.camera.lz = hero.z + Math.cos(h) * 18;
    s.cameraHeading = h;
  }

  // One fixed step. `input` is { throttle, steer, nitro, moveX, moveZ, sprint }.
  function step(dt, input) {
    state.time += dt;
    const s = state;
    if (s.player.mode === 'car') {
      stepCar(s.car, { throttle: input.throttle, steer: input.steer, nitro: input.nitro }, dt, s.city);
      s.player.x = s.car.x; s.player.z = s.car.z; s.player.heading = s.car.heading;
      s.player.speed = s.car.speed;
    } else {
      stepPlayerOnFoot(s, { x: input.moveX, z: input.moveZ, sprint: input.sprint }, dt);
    }
    stepTraffic(s, dt);
    stepPedestrians(s, dt);
    stepPolice(s, dt);
    stepCombat(s, dt);
    stepCrew(s, dt);
    stepRadio(s, dt);
    stepFx(s.fx, dt);
    stepActivities(s, dt);
    stepMissions(s, dt);
    if (checkActivityMission(s)) completeMission(s);
    if (s.alerts.length > 6) s.alerts.splice(0, s.alerts.length - 6);
    updateDistrict(s);
    updateCamera(s);
    s.speedKmh = Math.round(Math.abs(s.player.mode === 'car' ? s.car.speed : s.player.speed) * 3.6);
  }

  reset();
  return { state, reset, step, updateDistrict };
}

export function districtStanding(state) {
  // Standing per district: REP spread evenly, Marina leads (home turf).
  const base = Math.min(100, Math.floor(state.rep / 4));
  return DISTRICTS.map((d, i) => ({
    name: d.name,
    pct: d.name === 'MARINA' ? Math.min(100, base + 10) : Math.max(0, base - i * 3),
  }));
}
