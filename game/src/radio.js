// AURORA FM 91.7 — the in-game radio. A fixed playlist of invented tracks;
// the HUD shows the station and the current track, and the track changes
// every 45 seconds of play. No audio files: the audio module synthesises
// the station's jingle.
import { POLICE } from './config.js';

export const TRACKS = [
  'Golden Hour Drive — The Palms',
  'Neon Skyline — Vesper',
  'Bridge at Dawn — Kestrel',
  'Marina Nights — Sol & The Tides',
  'Uptown Hustle — Brick',
  'Sunset Run — Aurora Bay Collective',
];

export function createRadioState() {
  return { station: POLICE.radio, track: 0, timer: 0, on: true };
}

export function currentTrack(state) {
  return TRACKS[state.radio.track % TRACKS.length];
}

export function stepRadio(state, dt) {
  state.radio.timer += dt;
  if (state.radio.timer >= 45) {
    state.radio.timer = 0;
    state.radio.track += 1;
  }
}

export function toggleRadio(state) {
  state.radio.on = !state.radio.on;
  return state.radio.on;
}
