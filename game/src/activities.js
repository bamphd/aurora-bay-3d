// Side activities: taxi fares, the Beachfront sprint (5 checkpoints), supply
// crates and stunt ramps. Each one pays money and REP, and feeds mission
// progress when its mission is active.
import { MISSIONS } from './config.js';

export function createActivityState() {
  return {
    taxi: { active: false, pickup: null, dropoff: null, fare: 0 },
    race: { active: false, gate: 0, timer: 0 },
    cratesGot: 0,
    rampsHit: 0,
    fareCount: 0,
  };
}

function randomRoadPoint(state, avoid) {
  for (let tries = 0; tries < 20; tries += 1) {
    const x = state.rng.int(-8, 8) * 30;
    const z = state.rng.int(-8, 8) * 30;
    if (Math.hypot(x - avoid.x, z - avoid.z) > 90) return { x, z };
  }
  return { x: 150, z: 150 };
}

export function startTaxi(state) {
  const hero = state.player.mode === 'car' ? state.car : state.player;
  const a = state.activities;
  a.taxi.active = true;
  a.taxi.pickup = randomRoadPoint(state, hero);
  a.taxi.dropoff = null;
  a.taxi.fare = 0;
  state.alerts.push('TAXI: PICK UP THE FARE — FOLLOW THE MARKER');
}

export function startRace(state) {
  const a = state.activities;
  a.race.active = true;
  a.race.gate = 0;
  a.race.timer = 0;
  state.alerts.push('RACE: BEACHFRONT SPRINT — 5 CHECKPOINTS');
}

// Returns a list of payout events ({kind, amount}) that happened this step.
export function stepActivities(state, dt) {
  const out = [];
  const hero = state.player.mode === 'car' ? state.car : state.player;
  const a = state.activities;
  const ms = state.mission;
  const m = ms.index < MISSIONS.length ? MISSIONS[ms.index] : null;

  // Taxi: reach the pickup, then the dropoff, get paid.
  if (a.taxi.active && state.player.mode === 'car') {
    const target = a.taxi.dropoff || a.taxi.pickup;
    if (target && Math.hypot(hero.x - target.x, hero.z - target.z) < 8) {
      if (!a.taxi.dropoff) {
        a.taxi.dropoff = randomRoadPoint(state, hero);
        a.taxi.fare = 150 + state.rng.int(0, 150);
        state.alerts.push(`TAXI: FARE ABOARD — $${a.taxi.fare} TO THE MARKER`);
      } else {
        state.money += a.taxi.fare;
        state.rep += 2;
        a.fareCount += 1;
        out.push({ kind: 'fare', amount: a.taxi.fare });
        a.taxi.active = false;
        a.taxi.dropoff = null;
        if (m && m.type === 'fares' && ms.state === 'active' && a.fareCount >= 3) {
          state.missionsDone += 0; // completed by missions module below
          ms.progress = 3;
        }
      }
    }
  }

  // Race: pass each gate in order.
  if (a.race.active) {
    a.race.timer += dt;
    const gate = state.city.raceGates[a.race.gate];
    if (gate && Math.hypot(hero.x - gate.x, hero.z - gate.z) < 9) {
      a.race.gate += 1;
      if (a.race.gate >= state.city.raceGates.length) {
        const bonus = Math.max(300, 2000 - Math.floor(a.race.timer) * 10);
        state.money += bonus;
        state.rep += 8;
        out.push({ kind: 'race', amount: bonus });
        a.race.active = false;
        if (m && m.type === 'race' && ms.state === 'active') ms.progress = 5;
      }
    }
  }

  // Crates: drive over them.
  for (const c of state.city.crates) {
    if (!c.taken && Math.hypot(hero.x - c.x, hero.z - c.z) < 5) {
      c.taken = true;
      a.cratesGot += 1;
      state.money += 200;
      state.rep += 1;
      out.push({ kind: 'crate', amount: 200 });
      if (m && m.type === 'crates' && ms.state === 'active' && a.cratesGot >= 5) ms.progress = 5;
    }
  }

  // Stunt ramps: cross one at speed.
  for (const r of state.city.ramps) {
    if (!r.hit && Math.hypot(hero.x - r.x, hero.z - r.z) < 6 && Math.abs(hero.speed || 0) > 18) {
      r.hit = true;
      a.rampsHit += 1;
      state.money += 250;
      state.rep += 2;
      state.fx.shake = 0.6;
      out.push({ kind: 'stunt', amount: 250 });
      if (m && m.type === 'stunts' && ms.state === 'active' && a.rampsHit >= 3) ms.progress = 3;
    }
  }
  return out;
}

// Mission-type progress check, called after stepActivities.
export function checkActivityMission(state) {
  const ms = state.mission;
  const m = ms.index < MISSIONS.length ? MISSIONS[ms.index] : null;
  if (!m || ms.state !== 'active') return false;
  if (m.type === 'fares' && state.activities.fareCount >= 3) return true;
  if (m.type === 'race' && ms.progress >= 5) return true;
  if (m.type === 'crates' && state.activities.cratesGot >= 5) return true;
  if (m.type === 'stunts' && state.activities.rampsHit >= 3) return true;
  return false;
}
