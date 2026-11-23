// Keyboard + mouse input. Held keys give steering / movement; one-shot
// presses (confirm, pause, weapon keys, crew keys, garage, wheel) are queued
// as flags and taken once by the loop, so a press between two frames is
// never lost and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_EXIT_CAR = 8;
export const ACTION_WHEEL = 16;
export const ACTION_MISSION = 32;
export const ACTION_RACE = 64;
export const ACTION_TAXI = 128;
export const ACTION_GARAGE = 256;
export const ACTION_VESPER = 512;
export const ACTION_BRICK = 1024;
export const ACTION_BUY = 2048;
export const ACTION_RADIO = 4096;

const KEYMAP = {
  KeyE: ACTION_ENTER_CAR,
  KeyF: ACTION_EXIT_CAR,
  KeyQ: ACTION_WHEEL,
  KeyM: ACTION_MISSION,
  KeyR: ACTION_RACE,
  KeyT: ACTION_TAXI,
  KeyG: ACTION_GARAGE,
  KeyX: ACTION_BRICK,
  KeyC: ACTION_VESPER,
  KeyB: ACTION_BUY,
  KeyN: ACTION_RADIO,
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouse = { x: 0, y: 0, down: false, clicked: false, clickX: 0, clickY: 0 };
  let wheelDir = 0;

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'Enter') {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyP' || event.code === 'Escape') {
      if (!event.repeat) actions |= ACTION_PAUSE;
      event.preventDefault();
      return;
    }
    if (KEYMAP[event.code] !== undefined) {
      if (!event.repeat) actions |= KEYMAP[event.code];
      event.preventDefault();
      return;
    }
    if (event.code.startsWith('Digit')) {
      const n = Number(event.code.slice(5));
      if (n >= 1 && n <= 6) actions |= (n << 16); // weapon slots 1-6
    }
    keys.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointerdown', (e) => {
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = e.clientX;
    mouse.clickY = e.clientY;
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  canvas.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  canvas.addEventListener('wheel', (e) => { wheelDir += Math.sign(e.deltaY); }, { passive: true });

  const held = (code) => keys.has(code);

  return {
    // Driving: throttle -1..1, steer -1..1.
    drive() {
      const throttle = (held('ArrowUp') || held('KeyW') ? 1 : 0) - (held('ArrowDown') || held('KeyS') ? 1 : 0);
      const steer = (held('ArrowRight') || held('KeyD') ? 1 : 0) - (held('ArrowLeft') || held('KeyA') ? 1 : 0);
      return { throttle, steer, nitro: held('ShiftLeft') || held('ShiftRight') };
    },
    // On foot: moveX strafe, moveZ forward, sprint.
    move() {
      const z = (held('ArrowUp') || held('KeyW') ? 1 : 0) - (held('ArrowDown') || held('KeyS') ? 1 : 0);
      const x = (held('ArrowRight') || held('KeyD') ? 1 : 0) - (held('ArrowLeft') || held('KeyA') ? 1 : 0);
      return { x, z, sprint: held('ShiftLeft') || held('ShiftRight') };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const c = mouse.clicked;
      mouse.clicked = false;
      return c ? { x: mouse.clickX, y: mouse.clickY } : null;
    },
    takeWheel() {
      const w = wheelDir;
      wheelDir = 0;
      return w;
    },
    mouseDown() { return mouse.down; },
    mousePos() { return { x: mouse.x, y: mouse.y }; },
  };
}
