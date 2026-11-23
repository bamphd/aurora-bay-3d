// Juice: screen shake, muzzle flash, sparks and smoke puffs. The FX state
// lives on the world state (fx.shake, fx.muzzle) so the renderer and the
// screenshot scenes both read the same numbers. Pure functions, no DOM.
export function createFxState() {
  return { shake: 0, muzzle: 0, sparks: [], smoke: [] };
}

// A burst of sparks at a world point (used on impacts and gunfire).
export function spawnSparks(fx, x, z, n) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    fx.sparks.push({ x, z, vx: Math.cos(a) * 12, vz: Math.sin(a) * 12, life: 0.35 });
  }
  if (fx.sparks.length > 120) fx.sparks.splice(0, fx.sparks.length - 120);
}

export function spawnSmoke(fx, x, z) {
  fx.smoke.push({ x, z, life: 1.2 });
  if (fx.smoke.length > 40) fx.smoke.shift();
}

export function stepFx(fx, dt) {
  if (fx.shake > 0) fx.shake = Math.max(0, fx.shake - dt * 2.2);
  for (const s of fx.sparks) {
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    s.life -= dt;
  }
  fx.sparks = fx.sparks.filter((s) => s.life > 0);
  for (const s of fx.smoke) s.life -= dt;
  fx.smoke = fx.smoke.filter((s) => s.life > 0);
}
