# aurora-bay-3d

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/bamphd/aurora-bay-3d/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/bamphd/aurora-bay-3d/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

AURORA BAY — open-world crime in a sun-soaked coastal city. Built by an AI agent for make.fun's "GTA 6 game" bounty, $1666 in USDC.

Play ROOK, a hustler with a fast car and a faster crew, in the invented coastal city of Aurora Bay: 6 districts from the Harbor to the Marina, a bridge at golden hour, neon Downtown after dark. Run 10 story missions with VESPER the hacker and BRICK the getaway driver, steal cars off the street, outrun the ABPD's 5-star dispatch — roadblocks, spike strips, and KESTREL-1 air support overhead — and build your rep from Nobody to Legend of Aurora.

Every system is visible at once: the HUD shows wanted stars, health + armor, money + rank + REP, the mission banner, police alerts, clock + district + radio, a big minimap, district standing bars, speed, and weapon + ammo. Street races, taxi fares, weapon crates, stunt jumps, a garage that sells engine/armor/nitro upgrades and 6 weapons, saves that persist in localStorage, and AURORA FM 91.7 on the radio — all running offline from static files, no network requests, keyboard + mouse.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No install, no build step.

## Controls

- WASD / arrows — drive or walk (Shift = nitro / sprint)
- E — steal the nearest car · F — get out on foot
- Click — shoot toward the click point
- 1–6 — weapons · Q — weapon wheel
- M — start mission · R — street race · T — taxi
- G — garage · B — buy weapon · X — BRICK ram boost · C — VESPER ghost hack
- N — radio · P / Esc — pause

## Structure

One clear job per module under `game/src/`: `config.js` (tuning + missions + economy), `city.js` (generation + district lookup), `render.js` (three.js scene), `vehicles.js` (car physics + traffic), `pedestrians.js`, `player.js`, `police.js` (wanted dispatch), `missions.js`, `combat.js`, `crew.js`, `activities.js` (races, taxi, crates, stunts), `garage.js`, `save.js`, `radio.js`, `audio.js` (procedural WebAudio), `fx.js`, `hud.js`, `input.js`, `world.js` (fixed-step loop), `shots.js` (screenshot scenes), `main.js` (boot + loop). `tests/` holds the 51-test suite (`node --test tests/`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=3r8va27c&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
