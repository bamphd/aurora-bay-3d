// RNG + city generation + config: determinism, districts, clamp.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRandom } from '../game/src/random.js';
import { generateCity, districtAt, clampToCity, hitsBuilding } from '../game/src/city.js';
import { CITY, DISTRICTS, MISSIONS, WEAPONS, TUNE } from '../game/src/config.js';

test('rng: same seed gives the same sequence', () => {
  const a = createRandom(7);
  const b = createRandom(7);
  for (let i = 0; i < 50; i += 1) assert.equal(a.next(), b.next());
});

test('rng: different seeds give different sequences', () => {
  const a = createRandom(7);
  const b = createRandom(8);
  assert.notEqual(a.next(), b.next());
});

test('rng: values stay in [0, 1) and int is in range', () => {
  const r = createRandom(42);
  for (let i = 0; i < 100; i += 1) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
    assert.ok(r.int(3, 6) >= 3 && r.int(3, 6) <= 6);
  }
});

test('config: 10 missions, 6 weapons, 6 districts, map 540', () => {
  assert.equal(MISSIONS.length, 10);
  assert.equal(WEAPONS.length, 6);
  assert.equal(DISTRICTS.length, 6);
  assert.equal(CITY.bound, 270);
  assert.ok(TUNE.step > 0 && TUNE.step < 0.05);
});

test('city: deterministic generation for the same seed', () => {
  const a = generateCity(1);
  const b = generateCity(1);
  assert.equal(a.buildings.length, b.buildings.length);
  assert.deepEqual(a.buildings[0], b.buildings[0]);
  assert.deepEqual(a.raceGates, b.raceGates);
});

test('city: has buildings, lamps, palms, gates, crates, ramps, garage, plaza', () => {
  const c = generateCity(1);
  assert.ok(c.buildings.length > 100);
  assert.ok(c.lamps.length > 20);
  assert.ok(c.palms.length > 10);
  assert.equal(c.raceGates.length, 5);
  assert.equal(c.crates.length, 8);
  assert.equal(c.ramps.length, 3);
  assert.ok(c.garage.x !== undefined && c.plaza.x !== undefined);
});

test('city: districtAt names all six districts', () => {
  const seen = new Set();
  for (const d of DISTRICTS) seen.add(districtAt(d.x0 + 1, d.z0 + 1).name);
  assert.equal(seen.size, 6);
  assert.equal(districtAt(0, 0).name, 'MARINA');
  assert.equal(districtAt(200, -200).name, 'DOWNTOWN');
});

test('city: clampToCity keeps heroes inside +/-270', () => {
  const p1 = { x: 300, y: 0, z: 0 };
  assert.equal(clampToCity(p1), true);
  assert.deepEqual({ x: p1.x, z: p1.z }, { x: 270, z: 0 });
  const p2 = { x: -300, y: 0, z: 400 };
  assert.equal(clampToCity(p2), true);
  assert.deepEqual({ x: p2.x, z: p2.z }, { x: -270, z: 270 });
  const p3 = { x: 10, y: 0, z: 20 };
  assert.equal(clampToCity(p3), false);
  assert.deepEqual({ x: p3.x, z: p3.z }, { x: 10, z: 20 });
});

test('city: hitsBuilding finds a building at its centre, none on a road', () => {
  const c = generateCity(1);
  const b = c.buildings[0];
  assert.ok(hitsBuilding(c, b.x, b.z, 0));
  assert.equal(hitsBuilding(c, 0, 0, 0), null);
  assert.equal(hitsBuilding(c, 15, 15, 0), null); // road centreline
});
