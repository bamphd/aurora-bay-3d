// The 10-story campaign: one mission active at a time, each with a target,
// a type, and a reward. Completing a mission pays out, raises REP, and opens
// the next one. The HUD banner always shows the active mission.
import { MISSIONS } from './config.js';

export function createMissionState() {
  return {
    index: 0, // 0-based into MISSIONS; 10 = campaign complete
    state: 'brief', // brief | active | done
    progress: 0, // type-specific counter (fares, crates, ramps, checkpoints)
    target: { ...MISSIONS[0].target },
    timer: 0,
  };
}

export function activeMission(state) {
  if (state.mission.index >= MISSIONS.length) return null;
  return MISSIONS[state.mission.index];
}

export function missionBanner(state) {
  const m = activeMission(state);
  if (!m) return 'CAMPAIGN COMPLETE — AURORA BAY IS YOURS';
  return `MISSION ${m.n}: ${m.name} — ${m.brief}`;
}

export function startMission(state) {
  const m = activeMission(state);
  if (!m) return;
  state.mission.state = 'active';
  state.mission.progress = 0;
  state.mission.target = { ...m.target };
  state.mission.timer = 0;
}

export function completeMission(state) {
  const m = activeMission(state);
  if (!m) return;
  state.money += m.reward;
  state.rep += 10 + m.n * 2;
  state.missionsDone += 1;
  state.mission.index += 1;
  state.mission.state = 'brief';
  state.mission.progress = 0;
  if (state.mission.index < MISSIONS.length) {
    state.mission.target = { ...MISSIONS[state.mission.index].target };
  }
  state.alerts.push(`MISSION COMPLETE — +$${m.reward}`);
}

// Per-type progress. Returns true when the mission just completed.
export function stepMissions(state, dt) {
  const m = activeMission(state);
  if (!m || state.mission.state !== 'active') return false;
  const hero = state.player.mode === 'car' ? state.car : state.player;
  const ms = state.mission;
  ms.timer += dt;
  const atTarget = Math.hypot(hero.x - ms.target.x, hero.z - ms.target.z) < 8;
  switch (m.type) {
    case 'drive':
    case 'escape':
    case 'ghost':
      if (atTarget) {
        if (m.type === 'ghost' && state.wanted >= 1) break; // must stay clean
        if (m.type === 'escape' && state.wanted < 2) break; // need a chase first
        completeMission(state);
        return true;
      }
      break;
    case 'rob':
      if (atTarget && state.player.mode === 'foot') {
        completeMission(state);
        return true;
      }
      break;
    case 'fares':
    case 'crates':
    case 'stunts':
    case 'race':
      // Progress is fed by the activities module (see activities.js).
      break;
    case 'finale': {
      // Two phases: rob the convoy at the bridge, then reach the Marina.
      if (ms.progress === 0 && atTarget) {
        ms.progress = 1;
        ms.target = { x: 0, z: 0 };
        state.alerts.push('CONVOY HIT — NOW LOSE THEM, GET TO THE MARINA');
      } else if (ms.progress === 1 && atTarget) {
        completeMission(state);
        return true;
      }
      break;
    }
    default:
      break;
  }
  return false;
}
