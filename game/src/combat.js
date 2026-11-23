// Combat: 6 weapons, a weapon wheel, mouse-aim shooting. Shots are hitscan
// against traffic, police and peds in a cone in front of the player; every
// shot is a crime (wanted +1 on the first shot of a burst).
import { WEAPONS } from './config.js';
import { addWanted } from './police.js';

export function createCombatState() {
  return {
    weaponIndex: 0,
    weapons: WEAPONS.map((w) => ({ ...w })),
    wheelOpen: false,
    cooldown: 0,
    shotsFired: 0,
  };
}

export function currentWeapon(state) {
  return state.combat.weapons[state.combat.weaponIndex];
}

export function cycleWeapon(state, dir) {
  const owned = state.combat.weapons.map((w, i) => (w.owned ? i : -1)).filter((i) => i >= 0);
  const at = owned.indexOf(state.combat.weaponIndex);
  state.combat.weaponIndex = owned[(at + dir + owned.length) % owned.length];
}

export function buyWeapon(state, index) {
  const w = state.combat.weapons[index];
  if (!w || w.owned || state.money < w.price) return false;
  state.money -= w.price;
  w.owned = true;
  w.ammo = WEAPONS[index].ammo;
  return true;
}

// Fire one shot from the hero toward `aim` (a world {x,z} point). Returns the
// number of targets hit (0, 1 or more).
export function fireWeapon(state, aim) {
  const c = state.combat;
  const w = currentWeapon(state);
  if (c.cooldown > 0 || w.ammo <= 0) return 0;
  c.cooldown = w.name === 'VK-9 SMG' ? 0.09 : 0.28;
  w.ammo -= 1;
  c.shotsFired += 1;
  state.fx.shake = Math.min(1, state.fx.shake + 0.25);
  state.fx.muzzle = 0.08;
  if (c.shotsFired % 6 === 1) addWanted(state, 1);
  const hero = state.player.mode === 'car' ? state.car : state.player;
  const hx = hero.x, hz = hero.z;
  const dx = aim.x - hx, dz = aim.z - hz;
  const dist = Math.hypot(dx, dz) || 1;
  const ux = dx / dist, uz = dz / dist;
  let hits = 0;
  const tryHit = (t) => {
    const tx = t.x - hx, tz = t.z - hz;
    const along = tx * ux + tz * uz;
    if (along < 0 || along > 90) return;
    const perp = Math.abs(tx * uz - tz * ux);
    if (perp < 3) {
      t.hp = (t.hp ?? 100) - w.dmg;
      hits += 1;
      if (t.hp <= 0) {
        t.active = false;
        if (t.kind === 'car' || t.kind === 'van') state.money += 50;
      }
    }
  };
  for (const t of state.traffic) if (t.active) tryHit(t);
  for (const p of state.police) if (p.active) tryHit(p);
  return hits;
}

export function stepCombat(state, dt) {
  if (state.combat.cooldown > 0) state.combat.cooldown -= dt;
  if (state.fx.muzzle > 0) state.fx.muzzle -= dt;
}
