// The crew: VESPER the hacker and BRICK the driver. Each ability has a
// cooldown and a clear, visible effect — the HUD shows both timers.
import { CREW } from './config.js';

export function createCrewState() {
  return {
    vesperCooldown: 0,
    brickCooldown: 0,
    ghostTimer: 0, // while > 0 the wanted level is frozen at 0
  };
}

// VESPER — Ghost Hack: wanted drops to 0 and stays there for 12 seconds.
export function useVesper(state) {
  if (state.crew.vesperCooldown > 0) return false;
  state.crew.vesperCooldown = 45;
  state.crew.ghostTimer = 12;
  state.wanted = 0;
  state.alerts.push(`${CREW[0].name}: GHOST HACK — YOU ARE INVISIBLE FOR 12S`);
  return true;
}

// BRICK — Ram Boost: full nitro refill + a burst of speed right now.
export function useBrick(state) {
  if (state.crew.brickCooldown > 0) return false;
  state.crew.brickCooldown = 30;
  state.car.nitroLeft = state.car.nitroMax;
  if (state.player.mode === 'car') state.car.speed = Math.min(state.car.speed + 18, 60);
  state.alerts.push(`${CREW[1].name}: RAM BOOST — NITRO FULL`);
  return true;
}

export function stepCrew(state, dt) {
  if (state.crew.vesperCooldown > 0) state.crew.vesperCooldown -= dt;
  if (state.crew.brickCooldown > 0) state.crew.brickCooldown -= dt;
  if (state.crew.ghostTimer > 0) {
    state.crew.ghostTimer -= dt;
    state.wanted = 0;
  }
}
