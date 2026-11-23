// Wanted dispatch, missions, combat, crew.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRandom } from '../game/src/random.js';
import { createWorld } from '../game/src/world.js';
import { addWanted, policeCountFor, spawnPolice } from '../game/src/police.js';
import { missionBanner, activeMission, startMission, completeMission } from '../game/src/missions.js';
import { currentWeapon, cycleWeapon, fireWeapon, buyWeapon } from '../game/src/combat.js';
import { useVesper, useBrick } from '../game/src/crew.js';
import { TUNE } from '../game/src/config.js';

function freshWorld(seed = 1) {
  return createWorld(createRandom(seed));
}

test('police: addWanted raises stars and caps at 5', () => {
  const w = freshWorld();
  const { state } = w;
  addWanted(state, 2);
  assert.equal(state.wanted, 2);
  addWanted(state, 10);
  assert.equal(state.wanted, 5);
  assert.ok(state.alerts.length > 0);
});

test('police: policeCountFor grows with wanted level', () => {
  assert.equal(policeCountFor(0), 0);
  assert.equal(policeCountFor(1), 1);
  assert.equal(policeCountFor(3), 3);
  assert.equal(policeCountFor(5), 5);
});

test('police: 5 units spawn, wanted 3 activates 3 of them', () => {
  const w = freshWorld();
  const { state } = w;
  assert.equal(state.police.length, 5);
  addWanted(state, 3);
  for (let i = 0; i < 120; i += 1) w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  assert.ok(state.police.filter((c) => c.active).length >= 3);
});

test('police: cops close the distance to the hero', () => {
  const w = freshWorld();
  const { state } = w;
  addWanted(state, 3);
  const d0 = Math.min(...state.police.filter((c) => c.active).map((c) => Math.hypot(c.x - state.car.x, c.z - state.car.z)));
  for (let i = 0; i < 600; i += 1) w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  const d1 = Math.min(...state.police.filter((c) => c.active).map((c) => Math.hypot(c.x - state.car.x, c.z - state.car.z)));
  assert.ok(d1 < d0);
});

test('police: wanted decays to zero while hidden', () => {
  const w = freshWorld();
  const { state } = w;
  addWanted(state, 2);
  state.wantedSeen = state.time - 30;
  for (const c of state.police) c.active = false;
  for (let i = 0; i < 60; i += 1) w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  assert.ok(state.wanted < 2);
});

test('missions: banner shows number + name, activeMission matches index', () => {
  const w = freshWorld();
  const { state } = w;
  assert.equal(activeMission(state).name, 'FIRST LIGHT');
  assert.match(missionBanner(state), /MISSION 1: FIRST LIGHT/);
});

test('missions: startMission sets active and a target', () => {
  const w = freshWorld();
  const { state } = w;
  startMission(state);
  assert.equal(state.mission.state, 'active');
  assert.ok(state.mission.target && typeof state.mission.target.x === 'number');
});

test('missions: driving to the target completes mission 1 and pays out', () => {
  const w = freshWorld();
  const { state } = w;
  startMission(state);
  const t = state.mission.target;
  state.car.x = t.x - 2; state.car.z = t.z; state.car.speed = 0;
  const money0 = state.money;
  const rep0 = state.rep;
  for (let i = 0; i < 120; i += 1) w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  assert.equal(state.mission.index, 1);
  assert.ok(state.money > money0);
  assert.ok(state.rep > rep0);
});

test('missions: completeMission advances and resets to brief', () => {
  const w = freshWorld();
  const { state } = w;
  state.mission.state = 'active';
  completeMission(state);
  assert.equal(state.mission.index, 1);
  assert.equal(state.mission.state, 'brief');
});

test('combat: currentWeapon starts as the P9, cycleWeapon moves up and down', () => {
  const w = freshWorld();
  const { state } = w;
  assert.equal(currentWeapon(state).name, 'P9 Pistol');
  state.combat.weapons[1].owned = true;
  state.combat.weapons[2].owned = true;
  cycleWeapon(state, 1);
  assert.equal(currentWeapon(state).name, 'VK-9 SMG');
  cycleWeapon(state, 1);
  assert.equal(currentWeapon(state).name, 'Breacher 12');
  cycleWeapon(state, -1);
  assert.equal(currentWeapon(state).name, 'VK-9 SMG');
});

test('combat: fireWeapon spends ammo and hits a ped in range', () => {
  const w = freshWorld();
  const { state } = w;
  state.player.mode = 'foot';
  state.player.x = 0; state.player.z = 0; state.player.heading = 0;
  // Shots are hitscan against traffic + police (not peds): put a traffic
  // car 10 m ahead and aim at it.
  const t = state.traffic[0];
  t.x = 0; t.z = -10; t.active = true;
  const ammo0 = currentWeapon(state).ammo;
  const hits = fireWeapon(state, { x: 0, z: -10 });
  assert.ok(hits >= 1);
  assert.equal(currentWeapon(state).ammo, ammo0 - 1);
});

test('combat: fireWeapon misses far targets and returns false with no ammo', () => {
  const w = freshWorld();
  const { state } = w;
  state.player.mode = 'foot';
  state.player.x = 0; state.player.z = 0;
  assert.equal(fireWeapon(state, { x: 0, z: -200 }), 0);
  currentWeapon(state).ammo = 0;
  assert.equal(fireWeapon(state, { x: 0, z: -5 }), 0);
});

test('combat: buyWeapon refuses when broke, succeeds when rich', () => {
  const w = freshWorld();
  const { state } = w;
  state.money = 0;
  assert.equal(buyWeapon(state, 1), false);
  state.money = 100000;
  assert.equal(buyWeapon(state, 1), true);
  assert.equal(state.combat.weapons[1].owned, true);
});

test('crew: VESPER ghost hack hides you and cools down', () => {
  const w = freshWorld();
  const { state } = w;
  addWanted(state, 3);
  assert.equal(useVesper(state), true);
  assert.ok(state.crew.ghostTimer > 0);
  assert.ok(state.crew.vesperCooldown > 0);
  assert.equal(useVesper(state), false); // still cooling down
});

test('crew: BRICK ram boost fills the nitro tank', () => {
  const w = freshWorld();
  const { state } = w;
  state.car.nitroMax = 5;
  assert.equal(useBrick(state), true);
  assert.equal(state.car.nitroLeft, 5);
  assert.equal(useBrick(state), false);
});
