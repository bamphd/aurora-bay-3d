// Save / load through localStorage. Saves money, REP, campaign progress,
// garage, weapons and the best score. A corrupt or missing save is a fresh
// start, never a crash.
import { SAVE_KEY, BEST_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      money: state.money,
      rep: state.rep,
      missionsDone: state.missionsDone,
      missionIndex: state.mission.index,
      garage: { engine: state.garage.engine, armor: state.garage.armor, nitro: state.garage.nitro },
      weapons: state.combat.weapons.map((w) => w.owned),
      weaponIndex: state.combat.weaponIndex,
      best: state.best,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(state) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (typeof d !== 'object' || d === null) return false;
    state.money = d.money | 0;
    state.rep = d.rep | 0;
    state.missionsDone = d.missionsDone | 0;
    state.mission.index = Math.max(0, Math.min(10, d.missionIndex | 0));
    if (d.garage) {
      state.garage.engine = d.garage.engine | 0;
      state.garage.armor = d.garage.armor | 0;
      state.garage.nitro = d.garage.nitro | 0;
    }
    if (Array.isArray(d.weapons)) {
      d.weapons.forEach((owned, i) => {
        if (state.combat.weapons[i]) state.combat.weapons[i].owned = !!owned;
      });
    }
    state.combat.weaponIndex = d.weaponIndex | 0;
    state.best = d.best | 0;
    return true;
  } catch {
    return false;
  }
}

export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function writeBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
    return true;
  } catch {
    return false;
  }
}
