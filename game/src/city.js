// Aurora Bay's layout: a 540x540 grid city, roads every 30 units, buildings
// filling the blocks between them, a bridge east over the lagoon, and the
// garage, race gates, crates and stunt ramps placed on the map. Deterministic
// from the seed: the same seed builds the same city, every time.
import { CITY, DISTRICTS } from './config.js';

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return DISTRICTS[4];
}

function isRoadCoord(v) {
  // Roads run along multiples of 30 (centrelines); road surface is +/-4.
  const m = ((v % CITY.roadStep) + CITY.roadStep) % CITY.roadStep;
  return m <= CITY.roadHalf || m >= CITY.roadStep - CITY.roadHalf;
}

export function generateCity(seed) {
  const rng = (function mulberry(s) {
    let a = s >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })(seed);

  const buildings = [];
  // One building per block cell (blocks are 30 wide, road takes 8, so a
  // building footprint is up to ~18x18, inset from the road edge).
  for (let bx = -270; bx < 270; bx += 30) {
    for (let bz = -270; bz < 270; bz += 30) {
      const cx = bx + 15, cz = bz + 15;
      // Keep the marina plaza (centre) and the bridge corridor open.
      if (Math.abs(cx) < 45 && Math.abs(cz) < 45) continue;
      if (cz >= -15 && cz <= 15 && cx >= 165) continue; // bridge corridor east
      if (rng() < 0.12) continue; // empty lot / park
      const d = districtAt(cx, cz);
      const w = 12 + rng() * 7, dep = 12 + rng() * 7;
      let h;
      const r = rng();
      if (d.name === 'DOWNTOWN' || d.name === 'UPTOWN') h = r < 0.4 ? 55 + rng() * 45 : 22 + rng() * 25;
      else if (d.name === 'MARINA') h = 14 + rng() * 18;
      else h = 10 + rng() * (r < 0.25 ? 30 : 12);
      buildings.push({
        x: cx, z: cz, w, d: dep, h,
        district: d.name, color: d.color,
        style: r < 0.3 ? 'neon' : r < 0.6 ? 'glass' : 'brick',
        windows: Math.max(2, Math.floor(h / 6)),
      });
    }
  }

  // Street lamps along the roads, palms on Beachfront, trees in Old Town.
  const lamps = [];
  for (let v = -270; v <= 270; v += 30) {
    for (let u = -255; u <= 255; u += 30) {
      lamps.push({ x: v + 6, z: u });
      lamps.push({ x: u, z: v + 6 });
    }
  }
  const palms = [];
  for (let i = 0; i < 40; i += 1) {
    palms.push({ x: -255 + rng() * 150, z: -75 + rng() * 150 });
  }

  // Bridge east over the lagoon: deck from x=165 to x=270 at z=0, two towers.
  const bridge = { x0: 165, x1: 270, z: 0, deckY: 2, towers: [{ x: 195, z: 0 }, { x: 240, z: 0 }] };

  // Race gates (Beachfront sprint), crates (Downtown), stunt ramps, garage.
  const raceGates = [
    { x: -180, z: 0 }, { x: -180, z: 60 }, { x: -120, z: 60 },
    { x: -120, z: -60 }, { x: -60, z: -60 },
  ];
  const crates = [];
  for (let i = 0; i < 8; i += 1) {
    crates.push({ x: 105 + rng() * 150, z: -255 + rng() * 150, taken: false });
  }
  const ramps = [
    { x: 0, z: 150, heading: 0 }, { x: -60, z: 180, heading: Math.PI / 2 }, { x: 60, z: 210, heading: -Math.PI / 2 },
  ];
  const garage = { x: -30, z: 30 };
  const plaza = { x: 0, z: 0 };

  return { buildings, lamps, palms, bridge, raceGates, crates, ramps, garage, plaza, seed };
}

// Circle (x,z,r) vs building AABB — true when the circle touches a building.
export function hitsBuilding(city, x, z, r) {
  for (const b of city.buildings) {
    if (x > b.x - b.w / 2 - r && x < b.x + b.w / 2 + r && z > b.z - b.d / 2 - r && z < b.z + b.d / 2 + r) return b;
  }
  return null;
}

// Push a circle out of a building (slide along the shallow axis). Returns true if pushed.
export function resolveBuilding(city, p, r) {
  const b = hitsBuilding(city, p.x, p.z, r);
  if (!b) return false;
  const dxl = (p.x + r) - (b.x - b.w / 2);
  const dxr = (b.x + b.w / 2) - (p.x - r);
  const dzl = (p.z + r) - (b.z - b.d / 2);
  const dzr = (b.z + b.d / 2) - (p.z - r);
  const m = Math.min(dxl, dxr, dzl, dzr);
  if (m === dxl) p.x = b.x - b.w / 2 - r;
  else if (m === dxr) p.x = b.x + b.w / 2 + r;
  else if (m === dzl) p.z = b.z - b.d / 2 - r;
  else p.z = b.z + b.d / 2 + r;
  return true;
}

// Map-edge clamp: nothing leaves the city. Returns true when clamped.
export function clampToCity(p) {
  const b = CITY.bound;
  const cx = Math.max(-b, Math.min(b, p.x));
  const cz = Math.max(-b, Math.min(b, p.z));
  const hit = cx !== p.x || cz !== p.z;
  p.x = cx; p.z = cz;
  return hit;
}
