// Procedural WebAudio: engine hum pitched by speed, two-tone ABPD sirens,
// gunshots as noise bursts, a radio jingle, and UI clicks. Everything is
// synthesised — no audio files, no network. Safe to call before any user
// gesture: the context is created lazily and resumes on input.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400;
      engineOsc.connect(lp);
      lp.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
      return ctx;
    } catch {
      return null;
    }
  }

  function noiseBurst(duration, volume, freq) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    src.start();
  }

  function blip(freq, duration, volume) {
    if (!ensure()) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duration);
  }

  return {
    ensure,
    engine(speed, maxSpeed) {
      if (!ensure()) return;
      const t = Math.max(0, Math.min(1, speed / maxSpeed));
      engineOsc.frequency.setTargetAtTime(55 + t * 165, ctx.currentTime, 0.05);
      engineGain.gain.setTargetAtTime(0.02 + t * 0.05, ctx.currentTime, 0.1);
    },
    siren(on, time) {
      if (!ensure()) return;
      if (!on) { sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); return; }
      sirenOsc.frequency.value = Math.sin(time * 5) > 0 ? 720 : 540;
      sirenGain.gain.setTargetAtTime(0.015, ctx.currentTime, 0.1);
    },
    shot() { noiseBurst(0.12, 0.25, 1800); },
    crash() { noiseBurst(0.3, 0.3, 500); },
    cash() { blip(880, 0.12, 0.12); blip(1320, 0.18, 0.1); },
    jingle() { blip(523, 0.1, 0.08); blip(659, 0.1, 0.08); blip(784, 0.2, 0.08); },
    click() { blip(440, 0.05, 0.06); },
  };
}
