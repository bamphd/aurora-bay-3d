// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, the renderer paints what is there and the HUD shows
// every system at once. Screens: title, play, paused, busted.
//
// ?seed=N fixes the world. ?shot=cover|onfoot|night|garage (with &seed=N
// and &dpr=2) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, TUNE } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER_CAR, ACTION_EXIT_CAR, ACTION_WHEEL,
  ACTION_MISSION, ACTION_RACE, ACTION_TAXI, ACTION_GARAGE, ACTION_VESPER,
  ACTION_BRICK, ACTION_BUY, ACTION_RADIO, createInput,
} from './input.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { tryEnterCar, exitCar } from './player.js';
import { addWanted } from './police.js';
import { startMission } from './missions.js';
import { cycleWeapon, fireWeapon } from './combat.js';
import { useVesper, useBrick } from './crew.js';
import { startRace, startTaxi } from './activities.js';
import { buyWeaponAtGarage, buyUpgrade } from './garage.js';
import { saveGame, loadGame, readBest, writeBest } from './save.js';
import { toggleRadio } from './radio.js';

// three.min.js is the classic-script build: it sets globalThis.THREE
// (see its manifest: "global": "THREE"). It loads from the <script> tag in
// index.html before this module runs, so the global is ready here.
const THREE = globalThis.THREE;

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const dprParam = params.get('dpr') === '2' ? 2 : Math.min(window.devicePixelRatio || 1, 2);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
renderer.buildCity(world.state.city);
renderer.setPixelRatio(dprParam);
const hud = createHud();
const audio = createAudio();
const state = world.state;
state.best = readBest();
loadGame(state);
if (state.mission.index >= 10) state.mission.index = 0;

function announce(message) {
  status.textContent = message;
}

// Ground-plane point under a mouse click (for shooting).
function groundPointAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
  const v = new THREE.Vector3(nx, ny, 0.5).unproject(renderer.camera);
  const dir = v.sub(renderer.camera.position).normalize();
  if (Math.abs(dir.y) < 0.001) return null;
  const t = -renderer.camera.position.y / dir.y;
  if (t < 0) return null;
  return { x: renderer.camera.position.x + dir.x * t, z: renderer.camera.position.z + dir.z * t };
}

function runShot(name) {
  renderer.resize(1280, 720);
  stageShot(name, world, renderer);
  hud.update(state, 'play');
  let painted = 0;
  function paint() {
    renderer.render(state);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = 'title';
  let best = state.best;
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    world.reset();
    loadGame(state);
    accumulator = 0;
    screen = 'play';
    announce('Playing. Aurora Bay is yours — steal a car, start mission 1.');
  }

  function endGame() {
    screen = 'over';
    if (state.rep > best) { best = state.rep; writeBest(best); }
    saveGame(state);
    announce(`Busted. REP ${state.rep}. Best ${best}.`);
  }

  function damagePlayer(dt) {
    // Cops hurt you: ramming in a car, grabbing you on foot.
    const hero = state.player.mode === 'car' ? state.car : state.player;
    for (const c of state.police) {
      if (!c.active) continue;
      const d = Math.hypot(c.x - hero.x, c.z - hero.z);
      if (d < 3.5) {
        const dmg = state.player.mode === 'car' ? 4 : 14;
        state.player.health -= dmg * dt;
        if (state.player.health <= 0) {
          state.player.health = 0;
          endGame();
        }
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const slot = (actions >> 16) & 0x3f;
    if (slot >= 1 && slot <= 6 && screen === 'play') {
      const idx = slot - 1;
      if (state.combat.weapons[idx] && state.combat.weapons[idx].owned) state.combat.weaponIndex = idx;
    }
    if (actions & ACTION_CONFIRM && (screen === 'title' || screen === 'over')) startGame();
    else if (actions & ACTION_PAUSE && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === 'paused') {
      screen = 'play';
      announce('Playing.');
    }
    if (screen !== 'play') return;
    if (actions & ACTION_ENTER_CAR) {
      const res = tryEnterCar(state);
      if (res === 'jacked') { addWanted(state, 1); audio.siren(true, state.time); }
      if (res) audio.click();
    }
    if (actions & ACTION_EXIT_CAR && state.player.mode === 'car') exitCar(state);
    if (actions & ACTION_WHEEL) state.combat.wheelOpen = !state.combat.wheelOpen;
    if (actions & ACTION_MISSION) {
      if (state.mission.state === 'brief') { startMission(state); audio.jingle(); }
    }
    if (actions & ACTION_RACE) startRace(state);
    if (actions & ACTION_TAXI) startTaxi(state);
    if (actions & ACTION_GARAGE) state.garage.open = !state.garage.open;
    if (actions & ACTION_VESPER) useVesper(state);
    if (actions & ACTION_BRICK) useBrick(state);
    if (actions & ACTION_BUY) buyWeaponAtGarage(state, state.combat.weaponIndex);
    if (actions & ACTION_RADIO) toggleRadio(state);
    const wheel = input.takeWheel();
    if (wheel !== 0) cycleWeapon(state, Math.sign(wheel));
    const click = input.takeClick();
    if (click && state.player.mode === 'foot') {
      const p = groundPointAt(click.x, click.y);
      if (p) {
        fireWeapon(state, p);
        audio.shot();
      }
    } else if (click && state.player.mode === 'car') {
      // Click while driving: shoot from the car toward the click point.
      const p = groundPointAt(click.x, click.y);
      if (p) { fireWeapon(state, p); audio.shot(); }
    }
  }

  function step() {
    const drive = input.drive();
    const move = input.move();
    world.step(TUNE.step, {
      throttle: drive.throttle, steer: drive.steer, nitro: drive.nitro,
      moveX: move.x, moveZ: move.z, sprint: move.sprint,
    });
    damagePlayer(TUNE.step);
    audio.engine(state.player.mode === 'car' ? Math.abs(state.car.speed) : Math.abs(state.player.speed), 46);
    audio.siren(state.wanted >= 1, state.time);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === 'play') {
      while (accumulator >= TUNE.step) {
        step();
        accumulator -= TUNE.step;
        if (screen !== 'play') { accumulator = 0; break; }
      }
    } else {
      accumulator = 0;
      if (screen === 'title') world.step(TUNE.step, { throttle: 0, steer: 0, nitro: false, moveX: 0, moveZ: 0, sprint: false });
    }
    renderer.render(state);
    hud.update(state, screen);
  }

  function resize() {
    renderer.resize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    }
  });

  announce('Aurora Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
