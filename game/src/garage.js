// The garage: spend money on engine, armor and nitro upgrades, and buy
// weapons. Upgrades change the car: engine raises top speed, armor raises
// effective health, nitro adds a boost tank. All prices from config.js.
import { GARAGE, WEAPONS } from './config.js';
import { buyWeapon } from './combat.js';

export function createGarageState() {
  return { engine: 0, armor: 0, nitro: 0, open: false };
}

export function engineMul(state) {
  return [1, 1.18, 1.38][state.garage.engine] || 1;
}

export function armorBonus(state) {
  return [0, 40, 100][state.garage.armor] || 0;
}

export function nitroMax(state) {
  return [0, 3, 6][state.garage.nitro] || 0;
}

export function buyUpgrade(state, slot) {
  const table = GARAGE[slot];
  const g = state.garage;
  const next = g[slot] + 1;
  if (next >= table.length) return false;
  const price = table[next].price;
  if (state.money < price) return false;
  state.money -= price;
  g[slot] = next;
  if (slot === 'engine') state.car.engineMul = engineMul(state);
  if (slot === 'armor') state.player.armorMax = 100 + armorBonus(state);
  if (slot === 'nitro') {
    state.car.nitroMax = nitroMax(state);
    state.car.nitroLeft = state.car.nitroMax;
  }
  state.alerts.push(`GARAGE: ${table[next].name} INSTALLED — $${price}`);
  return true;
}

export function buyWeaponAtGarage(state, index) {
  const ok = buyWeapon(state, index);
  if (ok) state.alerts.push(`GARAGE: ${WEAPONS[index].name} BOUGHT`);
  return ok;
}
