// Garage economy, activities, radio, fx, saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRandom } from '../game/src/random.js';
import { createWorld } from '../game/src/world.js';
import { buyUpgrade, engineMul, armorBonus, nitroMax } from '../game/src/garage.js';
import { startRace, startTaxi } from '../game/src/activities.js';
import { currentTrack } from '../game/src/radio.js';
import { createFxState, spawnSparks, stepFx } from '../game/src/fx.js';
import { saveGame, loadGame, readBest, writeBest } from '../game/src/save.js';
import { TUNE } from '../game/src/config.js';

// save.js reads window.localStorage — stub it once for the whole file.
globalThis.window = {
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] ?? null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
  },
};

function freshWorld(seed = 1) {
  return createWorld(createRandom(seed));
}

test('garage: buyUpgrade levels up the engine and charges money', () => {
  const w = freshWorld();
  const { state } = w;
  state.money = 100000;
  assert.equal(buyUpgrade(state, 'engine'), true);
  assert.equal(state.garage.engine, 1);
  assert.ok(state.money < 100000);
  assert.ok(engineMul(state) > 1);
});

test('garage: buyUpgrade refuses when broke and caps at MAX', () => {
  const w = freshWorld();
  const { state } = w;
  state.money = 0;
  assert.equal(buyUpgrade(state, 'engine'), false);
  state.money = 1000000;
  for (let i = 0; i < 10; i += 1) buyUpgrade(state, 'armor');
  assert.equal(state.garage.armor, 2); // 3 levels: 0, 1, 2
  assert.ok(armorBonus(state) > 0);
  assert.ok(nitroMax(state) >= 0);
});

test('garage: nitroMax grows with the nitro level', () => {
  const w = freshWorld();
  const { state } = w;
  state.money = 100000;
  const base = nitroMax(state);
  buyUpgrade(state, 'nitro');
  assert.ok(nitroMax(state) > base);
});

test('activities: startRace arms a race with gates, startTaxi arms a fare', () => {
  const w = freshWorld();
  const { state } = w;
  startRace(state);
  assert.equal(state.activities.race.active, true);
  assert.ok(state.activities.race.gate >= 0);
  startTaxi(state);
  assert.equal(state.activities.taxi.active, true);
  assert.ok(state.activities.taxi.pickup);
  assert.equal(state.activities.taxi.dropoff, null); // dropoff set at pickup
});

test('activities: driving through race gates advances the race', () => {
  const w = freshWorld();
  const { state } = w;
  startRace(state);
  const gate = state.city.raceGates[state.activities.race.gate];
  state.car.x = gate.x; state.car.z = gate.z;
  const g0 = state.activities.race.gate;
  w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  assert.notEqual(state.activities.race.gate, g0);
});

test('activities: reaching the taxi pickup starts the fare', () => {
  const w = freshWorld();
  const { state } = w;
  startTaxi(state);
  const p = state.activities.taxi.pickup;
  state.car.x = p.x; state.car.z = p.z;
  w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  assert.ok(state.activities.taxi.dropoff); // fare aboard, dropoff assigned
});

test('activities: crates are collected by driving over them', () => {
  const w = freshWorld();
  const { state } = w;
  const c = state.city.crates[0];
  state.car.x = c.x; state.car.z = c.z;
  w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  assert.ok(state.activities.cratesGot >= 1);
});

test('radio: currentTrack names a track, and 45 s rotates it', () => {
  const w = freshWorld();
  const { state } = w;
  const t0 = currentTrack(state);
  assert.ok(typeof t0 === 'string' && t0.length > 0);
  state.radio.timer = 44.99;
  w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  assert.notEqual(currentTrack(state), t0);
});

test('fx: spawnSparks adds particles and stepFx decays them', () => {
  const fx = createFxState();
  spawnSparks(fx, 0, 0, 10);
  assert.equal(fx.sparks.length, 10);
  for (let i = 0; i < 120; i += 1) stepFx(fx, TUNE.step);
  assert.equal(fx.sparks.length, 0);
});

test('save: saveGame + loadGame round-trips money, rep and mission index', () => {
  const w = freshWorld();
  const { state } = w;
  state.money = 4242; state.rep = 77; state.mission.index = 4;
  saveGame(state);
  state.money = 0; state.rep = 0; state.mission.index = 0;
  loadGame(state);
  assert.equal(state.money, 4242);
  assert.equal(state.rep, 77);
  assert.equal(state.mission.index, 4);
});

test('save: best score persists across reads', () => {
  writeBest(123);
  assert.equal(readBest(), 123);
  writeBest(50);
  assert.equal(readBest(), 50); // writeBest stores what it is given; the
  // never-goes-down guard lives in main.js, which only writes a new best
});
