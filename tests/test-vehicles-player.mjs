// Car physics, traffic, pedestrians, on-foot play: the driving loop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRandom } from '../game/src/random.js';
import { createWorld } from '../game/src/world.js';
import { stepCar } from '../game/src/vehicles.js';
import { stepPlayerOnFoot, tryEnterCar, exitCar } from '../game/src/player.js';
import { TUNE } from '../game/src/config.js';

function freshWorld(seed = 1) {
  return createWorld(createRandom(seed));
}

test('car: throttle accelerates, release coasts down', () => {
  const w = freshWorld();
  const { state } = w;
  const c = state.car;
  for (let i = 0; i < 60; i += 1) stepCar(c, { throttle: 1, steer: 0, nitro: false }, TUNE.step, state.city);
  assert.ok(c.speed > 10);
  const v = c.speed;
  for (let i = 0; i < 60; i += 1) stepCar(c, { throttle: 0, steer: 0, nitro: false }, TUNE.step, state.city);
  assert.ok(c.speed < v);
});

test('car: reverse works and is slower than forward', () => {
  const w = freshWorld();
  const { state } = w;
  const c = state.car;
  for (let i = 0; i < 60; i += 1) stepCar(c, { throttle: -1, steer: 0, nitro: false }, TUNE.step, state.city);
  assert.ok(c.speed < 0 && c.speed >= -14);
});

test('car: steering turns the heading', () => {
  const w = freshWorld();
  const { state } = w;
  const c = state.car;
  const h0 = c.heading;
  for (let i = 0; i < 60; i += 1) stepCar(c, { throttle: 1, steer: 1, nitro: false }, TUNE.step, state.city);
  assert.notEqual(c.heading, h0);
});

test('car: nitro adds speed and burns nitro', () => {
  const w = freshWorld();
  const { state } = w;
  const c = state.car;
  c.nitroLeft = 5; c.nitroMax = 5;
  for (let i = 0; i < 60; i += 1) stepCar(c, { throttle: 1, steer: 0, nitro: true }, TUNE.step, state.city);
  assert.ok(c.speed > 30);
  assert.ok(c.nitroLeft < 5);
});

test('car: the map-edge clamp holds — no driving into the void', () => {
  const w = freshWorld();
  const { state } = w;
  const c = state.car;
  c.x = 268; c.z = 0; c.heading = Math.PI / 2; // facing +x, the edge
  for (let i = 0; i < 120; i += 1) stepCar(c, { throttle: 1, steer: 0, nitro: false }, TUNE.step, state.city);
  assert.ok(c.x <= 270);
  assert.ok(c.z >= -270 && c.z <= 270);
});

test('car: buildings block the car (no ghosting through walls)', () => {
  const w = freshWorld();
  const { state } = w;
  const c = state.car;
  const b = state.city.buildings[0];
  c.x = b.x - b.w / 2 - 8; c.z = b.z; c.heading = Math.PI / 2; c.speed = 20;
  for (let i = 0; i < 60; i += 1) stepCar(c, { throttle: 1, steer: 0, nitro: false }, TUNE.step, state.city);
  assert.ok(c.x < b.x - b.w / 2 + 0.5);
});

test('traffic: 26 cars spawn on roads, and stepTraffic moves them', () => {
  const w = freshWorld();
  const { state } = w;
  assert.equal(state.traffic.length, 26);
  assert.ok(state.traffic.every((t) => t.active));
  const x0 = state.traffic[0].x;
  const z0 = state.traffic[0].z;
  for (let i = 0; i < 60; i += 1) w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  assert.ok(state.traffic[0].x !== x0 || state.traffic[0].z !== z0);
});

test('peds: 34 walkers spawn and stepPedestrians moves them', () => {
  const w = freshWorld();
  const { state } = w;
  assert.equal(state.peds.length, 34);
  const x0 = state.peds[0].x;
  for (let i = 0; i < 60; i += 1) w.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
  assert.notEqual(state.peds[0].x, x0);
});

test('foot: WASD moves the player and sprint is faster', () => {
  const w = freshWorld();
  const { state } = w;
  state.player.mode = 'foot';
  state.cameraHeading = 0; // walk forward = +z
  state.player.x = 0; state.player.z = 0; state.player.heading = 0;
  stepPlayerOnFoot(state, { x: 0, z: 1, sprint: false }, 1);
  assert.ok(state.player.z > 3);
  const walk = state.player.z;
  state.player.z = 0;
  stepPlayerOnFoot(state, { x: 0, z: 1, sprint: true }, 1);
  assert.ok(state.player.z > walk);
});

test('foot: exitCar puts the player beside the car, tryEnterCar gets back in', () => {
  const w = freshWorld();
  const { state } = w;
  state.player.mode = 'car';
  exitCar(state);
  assert.equal(state.player.mode, 'foot');
  assert.ok(Math.hypot(state.player.x - state.car.x, state.player.z - state.car.z) < 5);
  const res = tryEnterCar(state);
  assert.equal(res, 'own');
  assert.equal(state.player.mode, 'car');
});

test('foot: tryEnterCar jacks the nearest traffic car', () => {
  const w = freshWorld();
  const { state } = w;
  state.player.mode = 'foot';
  const t = state.traffic[0];
  state.player.x = t.x; state.player.z = t.z;
  const before = state.carsStolen;
  const res = tryEnterCar(state);
  assert.equal(res, 'jacked');
  assert.equal(state.carsStolen, before + 1);
  assert.equal(state.player.mode, 'car');
});

test('foot: tryEnterCar fails when nothing is near', () => {
  const w = freshWorld();
  const { state } = w;
  state.player.mode = 'foot';
  state.player.x = 0; state.player.z = 0;
  for (const t of state.traffic) { t.x = 200; t.z = 200; }
  state.car.x = 200; state.car.z = 200;
  assert.equal(tryEnterCar(state), null);
});
