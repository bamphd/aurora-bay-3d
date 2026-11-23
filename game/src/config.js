// AURORA BAY — all tuning, names and data in one place. No imports.
export const CITY = {
  name: 'AURORA BAY',
  bound: 270, // map-edge clamp: nothing drives or walks past +/-270
  roadStep: 30,
  roadHalf: 4,
};

export const DISTRICTS = [
  { name: 'HARBOR', x0: -270, z0: -270, x1: -90, z1: -90, color: '#3a7d8c' },
  { name: 'OLD TOWN', x0: -90, z0: -270, x1: 90, z1: -90, color: '#8c6d3a' },
  { name: 'DOWNTOWN', x0: 90, z0: -270, x1: 270, z1: -90, color: '#5a6ee0' },
  { name: 'BEACHFRONT', x0: -270, z0: -90, x1: -90, z1: 90, color: '#2fae8c' },
  { name: 'MARINA', x0: -90, z0: -90, x1: 90, z1: 90, color: '#c98a2e' },
  { name: 'UPTOWN', x0: 90, z0: -90, x1: 270, z1: 90, color: '#9a4fd0' },
];

export const POLICE = { name: 'ABPD', airCallsign: 'KESTREL-1', radio: 'AURORA FM 91.7' };
export const CREW = [
  { name: 'VESPER', role: 'Hacker', ability: 'Ghost Hack — kills the wanted level for 12s' },
  { name: 'BRICK', role: 'Driver', ability: 'Ram Boost — getaway car + nitro refill' },
];
export const PLAYER_NAME = 'ROOK';

// 10 story missions. type: drive | rob | escape | fares | race | crates | stunts | ghost | finale
export const MISSIONS = [
  { n: 1, name: 'FIRST LIGHT', brief: 'Steal a car on Harbor Row and reach the Marina.', type: 'drive', target: { x: 0, z: 0 }, reward: 500 },
  { n: 2, name: 'NEON CUT', brief: 'Rob the Old Town shop on foot — then vanish.', type: 'rob', target: { x: 0, z: -180 }, reward: 900 },
  { n: 3, name: 'HARBOR HEIST', brief: 'Lift the cargo truck at the Harbor and lose the cops.', type: 'escape', target: { x: -180, z: -180 }, reward: 1500 },
  { n: 4, name: 'TAXI KINGS', brief: 'Run 3 fares across Aurora Bay. Tips pay double.', type: 'fares', target: { x: 180, z: 0 }, reward: 1200 },
  { n: 5, name: 'STREET KINGS', brief: 'Win the Beachfront sprint — 5 checkpoints.', type: 'race', target: { x: -180, z: 0 }, reward: 2000 },
  { n: 6, name: 'GOLDEN GETAWAY', brief: '4-star chase: cross the bridge and break the line.', type: 'escape', target: { x: 195, z: 0 }, reward: 2600 },
  { n: 7, name: 'CRATE RUN', brief: 'Collect 5 supply crates hidden in Downtown.', type: 'crates', target: { x: 180, z: -180 }, reward: 1800 },
  { n: 8, name: 'STUNT SHOW', brief: 'Hit 3 stunt ramps at full speed. Crowd loves it.', type: 'stunts', target: { x: 0, z: 180 }, reward: 1600 },
  { n: 9, name: 'THE LONG CON', brief: 'Deliver the package to Uptown — stay clean, wanted 0.', type: 'ghost', target: { x: 180, z: 180 }, reward: 3000 },
  { n: 10, name: 'AURORA FINALE', brief: 'Bridge heist: rob the convoy, then escape to the Marina.', type: 'finale', target: { x: 195, z: 0 }, reward: 5000 },
];

export const WEAPONS = [
  { name: 'P9 Pistol', dmg: 22, ammo: 120, price: 0, owned: true },
  { name: 'VK-9 SMG', dmg: 14, ammo: 240, price: 2500, owned: false },
  { name: 'Breacher 12', dmg: 65, ammo: 40, price: 6000, owned: false },
  { name: 'AR-77 Rifle', dmg: 34, ammo: 180, price: 14000, owned: false },
  { name: 'Longshot DMR', dmg: 90, ammo: 30, price: 22000, owned: false },
  { name: 'Riot Launcher', dmg: 120, ammo: 12, price: 30000, owned: false },
];

export const GARAGE = {
  engine: [{ name: 'Stock Engine', price: 0 }, { name: 'Tuned V8', price: 4000 }, { name: 'Aurora GT', price: 12000 }],
  armor: [{ name: 'No Armor', price: 0 }, { name: 'Plated Doors', price: 3500 }, { name: 'Full Plating', price: 9000 }],
  nitro: [{ name: 'No Nitro', price: 0 }, { name: 'Nitro Kit', price: 5000 }, { name: 'Twin Nitro', price: 11000 }],
};

export const RANKS = ['Nobody', 'Hustler', 'Street Boss', 'Kingpin', 'Legend of Aurora'];
export function rankFor(rep) {
  if (rep >= 400) return RANKS[4];
  if (rep >= 200) return RANKS[3];
  if (rep >= 80) return RANKS[2];
  if (rep >= 25) return RANKS[1];
  return RANKS[0];
}

export const TUNE = {
  step: 1 / 60,
  carAccel: 26, carBrake: 40, carMaxSpeed: 46, carReverseMax: 14,
  carTurn: 1.9,
  footSpeed: 7.5, footSprint: 11,
  wantedDecay: 0.045,
  wantedRiseSteal: 1, wantedRiseShoot: 1,
  trafficCount: 26, pedCount: 34,
  heliHeight: 55,
  clamp: 270,
};

export const SAVE_KEY = 'aurora-bay-save-v6';
export const BEST_KEY = 'aurora-bay-best-v6';
