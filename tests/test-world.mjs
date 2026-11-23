// World integration: fixed-step determinism, HUD data, full mission flow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRandom } from '../game/src/random.js';
import { createWorld, districtStanding } from '../game/src/world.js';
import { startMission } from '../game/src/missions.js';
import { TUNE } from '../game/src/config.js';

globalThis.window = {
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] ?? null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
  },
};

const IDLE = { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false };
const DRIVE = { throttle: 1, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false };

function freshWorld(seed = 1) {
  return createWorld(createRandom(seed));
}

test('world: fresh world starts with the hero in a car in the Marina', () => {
  const w = freshWorld();
  const { state } = w;
  assert.equal(state.player.mode, 'car');
  assert.equal(state.district, 'MARINA');
  assert.equal(state.wanted, 0);
  assert.equal(state.money, 500);
  assert.equal(state.timeOfDay, 'golden');
});

test('world: step advances time and moves the car under throttle', () => {
  const w = freshWorld();
  const { state } = w;
  const z0 = state.car.z;
  w.step(TUNE.step, DRIVE);
  assert.ok(state.time > 0);
  assert.ok(state.car.z < z0); // heading PI drives north (-z)
  assert.ok(state.speedKmh > 0);
});

test('world: determinism — two worlds with the same seed step identically', () => {
  const a = freshWorld(99);
  const b = freshWorld(99);
  for (let i = 0; i < 600; i += 1) {
    a.step(TUNE.step, DRIVE);
    b.step(TUNE.step, DRIVE);
  }
  assert.equal(a.state.car.x, b.state.car.x);
  assert.equal(a.state.car.z, b.state.car.z);
  assert.equal(a.state.car.heading, b.state.car.heading);
  assert.equal(a.state.traffic[3].x, b.state.traffic[3].x);
  assert.equal(a.state.peds[5].z, b.state.peds[5].z);
});

test('world: determinism — different seeds diverge', () => {
  const a = freshWorld(1);
  const b = freshWorld(2);
  for (let i = 0; i < 600; i += 1) {
    a.step(TUNE.step, DRIVE);
    b.step(TUNE.step, DRIVE);
  }
  assert.notEqual(a.state.traffic[3].x, b.state.traffic[3].x);
});

test('world: district follows the hero across the map', () => {
  const w = freshWorld();
  const { state } = w;
  state.car.x = 200; state.car.z = -200;
  w.step(TUNE.step, IDLE);
  assert.equal(state.district, 'DOWNTOWN');
});

test('world: districtStanding returns six rows that sum sanely', () => {
  const w = freshWorld();
  const { state } = w;
  state.rep = 40;
  const rows = districtStanding(state);
  assert.equal(rows.length, 6);
  assert.ok(rows.every((r) => r.pct >= 0 && r.pct <= 100));
  assert.ok(rows[0].pct >= rows[5].pct); // Marina leads
});

test('world: reset restores the starting state', () => {
  const { state, reset } = freshWorld();
  state.money = 99999; state.wanted = 5; state.mission.index = 7;
  reset();
  assert.equal(state.money, 500);
  assert.equal(state.wanted, 0);
  assert.equal(state.mission.index, 0);
});

test('world: full mission 1 flow pays out and advances the story', () => {
  const w = freshWorld();
  const { state } = w;
  startMission(state);
  const t = state.mission.target;
  state.car.x = t.x; state.car.z = t.z;
  const money0 = state.money;
  w.step(TUNE.step, IDLE);
  assert.equal(state.mission.index, 1);
  assert.ok(state.money > money0);
  assert.ok(state.alerts.some((a) => a.includes('MISSION COMPLETE')));
});

test('world: HUD data is complete — speed, money, rep, wanted, district', () => {
  const w = freshWorld();
  const { state } = w;
  for (let i = 0; i < 120; i += 1) w.step(TUNE.step, DRIVE);
  assert.ok(typeof state.speedKmh === 'number');
  assert.ok(typeof state.money === 'number');
  assert.ok(typeof state.rep === 'number');
  assert.ok(typeof state.wanted === 'number');
  assert.ok(typeof state.district === 'string' && state.district.length > 0);
  assert.ok(state.camera.x !== undefined && state.camera.lx !== undefined);
});

test('world: 600 steps run without throwing and stay in bounds', () => {
  const w = freshWorld();
  const { state } = w;
  for (let i = 0; i < 600; i += 1) {
    w.step(TUNE.step, DRIVE);
    assert.ok(Math.abs(state.car.x) <= 270 && Math.abs(state.car.z) <= 270);
    assert.ok(state.player.health >= 0 && state.player.health <= 100);
  }
});
