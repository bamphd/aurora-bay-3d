// The HUD: every system visible at once. Wanted stars, health + armor,
// money + rank + REP, the mission banner, police alerts, clock + district +
// radio, a big legible minimap, district standing bars, speed + weapon +
// ammo, and the controls hint. The minimap is a 2D canvas; everything else
// is DOM text, updated only when it changes.
import { DISTRICTS, GARAGE, POLICE, WEAPONS } from './config.js';
import { missionBanner, activeMission } from './missions.js';
import { currentWeapon } from './combat.js';
import { currentTrack } from './radio.js';
import { districtStanding } from './world.js';
import { rankFor } from './config.js';

const $ = (id) => document.getElementById(id);

function fmtMoney(n) {
  return '$' + n.toLocaleString('en-US');
}

export function createHud() {
  const els = {
    stars: $('stars'), health: $('health-fill'), armor: $('armor-fill'),
    money: $('money'), rank: $('rankrep'),
    banner: $('mission-banner'), alerts: $('alerts'),
    clock: $('clock'), district: $('district'), radio: $('radio'),
    map: $('minimap'), standing: $('standing'),
    speed: $('speed'), weapon: $('weapon'), ammo: $('ammo'),
    hint: $('hint'), wheel: $('wheel'), garage: $('garage-panel'),
    title: $('title-screen'), pause: $('pause-screen'), over: $('over-screen'),
    toast: $('toast'),
  };
  const mapCtx = els.map.getContext('2d');
  const cache = {};
  let lastToast = 0;

  function setText(el, key, value) {
    if (cache[key] !== value) { cache[key] = value; el.textContent = value; }
  }

  function drawMinimap(state) {
    const g = mapCtx;
    const W = 232, H = 150;
    const px = (v) => ((v + 270) / 540) * W;
    const pz = (v) => ((v + 270) / 540) * H;
    g.fillStyle = '#10131a';
    g.fillRect(0, 0, W, H);
    // District tint.
    for (const d of DISTRICTS) {
      g.fillStyle = d.color + '33';
      g.fillRect(px(d.x0), pz(d.z0), px(d.x1) - px(d.x0), pz(d.z1) - pz(d.z0));
    }
    // Roads.
    g.strokeStyle = '#4a505c';
    g.lineWidth = 2;
    for (let v = -270; v <= 270; v += 30) {
      g.beginPath(); g.moveTo(0, pz(v)); g.lineTo(W, pz(v)); g.stroke();
      g.beginPath(); g.moveTo(px(v), 0); g.lineTo(px(v), H); g.stroke();
    }
    // Buildings.
    g.fillStyle = '#6a707c';
    for (const b of state.city.buildings) {
      g.fillRect(px(b.x - b.w / 2), pz(b.z - b.d / 2), Math.max(1.5, (b.w / 540) * W), Math.max(1.5, (b.d / 540) * H));
    }
    // Bridge.
    g.strokeStyle = '#e07b2e';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(px(165), pz(0)); g.lineTo(px(270), pz(0)); g.stroke();
    // Mission marker.
    const m = activeMission(state);
    if (m) {
      const t = state.mission.target;
      g.fillStyle = '#f2c94c';
      g.beginPath(); g.arc(px(t.x), pz(t.z), 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#f2c94c'; g.lineWidth = 2;
      g.beginPath(); g.arc(px(t.x), pz(t.z), 10, 0, Math.PI * 2); g.stroke();
    }
    // Traffic dots.
    g.fillStyle = '#9fb3d8';
    for (const t of state.traffic) {
      if (t.active) g.fillRect(px(t.x) - 1, pz(t.z) - 1, 2.5, 2.5);
    }
    // Police dots (red).
    g.fillStyle = '#ff4040';
    for (const p of state.police) {
      if (p.active) { g.beginPath(); g.arc(px(p.x), pz(p.z), 3.5, 0, Math.PI * 2); g.fill(); }
    }
    // Player arrow.
    const hero = state.player.mode === 'car' ? state.car : state.player;
    g.fillStyle = '#ffffff';
    g.save();
    g.translate(px(hero.x), pz(hero.z));
    g.rotate(Math.atan2(Math.sin(hero.heading), -Math.cos(hero.heading)) + Math.PI);
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5); g.closePath(); g.fill();
    g.restore();
    // North marker.
    g.fillStyle = '#eef1f5';
    g.font = 'bold 11px system-ui, sans-serif';
    g.fillText('N', 8, 14);
  }

  function drawStanding(state) {
    const rows = districtStanding(state);
    let html = '';
    for (const r of rows) {
      html += `<div class="stand-row"><span>${r.name}</span><div class="stand-bar"><div style="width:${r.pct}%"></div></div><b>${r.pct}%</b></div>`;
    }
    if (cache.standing !== html) { cache.standing = html; els.standing.innerHTML = html; }
  }

  function drawWheel(state) {
    if (!state.combat.wheelOpen) {
      if (cache.wheel !== '') { cache.wheel = ''; els.wheel.innerHTML = ''; els.wheel.style.display = 'none'; }
      return;
    }
    els.wheel.style.display = 'flex';
    let html = '';
    state.combat.weapons.forEach((w, i) => {
      const cur = i === state.combat.weaponIndex ? 'cur' : '';
      const own = w.owned ? '' : 'locked';
      html += `<div class="wheel-slot ${cur} ${own}"><b>${i + 1}</b><span>${w.name}</span><em>${w.owned ? `DMG ${w.dmg}` : `$${w.price}`}</em></div>`;
    });
    if (cache.wheel !== html) { cache.wheel = html; els.wheel.innerHTML = html; }
  }

  function drawGarage(state) {
    if (!state.garage.open) {
      if (cache.garage !== '') { cache.garage = ''; els.garage.innerHTML = ''; els.garage.style.display = 'none'; }
      return;
    }
    els.garage.style.display = 'block';
    let html = '<h2>AURORA GARAGE</h2><p>Upgrades + weapons — spend your money, come back faster.</p>';
    const slots = [['engine', 'Engine'], ['armor', 'Armor'], ['nitro', 'Nitro']];
    for (const [slot, label] of slots) {
      const table = GARAGE[slot];
      const lvl = state.garage[slot];
      const cur = table[lvl].name;
      const next = lvl + 1 < table.length ? `${table[lvl + 1].name} — $${table[lvl + 1].price}` : 'MAXED';
      html += `<div class="row"><span>${label}: <b>${cur}</b></span><span>${next}</span></div>`;
    }
    for (const w of state.combat.weapons) {
      html += `<div class="row"><span>${w.name} · DMG ${w.dmg}</span><span>${w.owned ? 'OWNED' : '$' + w.price}</span></div>`;
    }
    html += '<p>Press G to close · B buys the selected weapon</p>';
    if (cache.garage !== html) { cache.garage = html; els.garage.innerHTML = html; }
  }

  function update(state, screen) {
    // Wanted stars.
    const w = Math.round(state.wanted);
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < w ? '★' : '☆';
    setText(els.stars, 'stars', stars);
    els.stars.className = w >= 4 ? 'stars hot' : 'stars';
    els.health.style.width = `${Math.max(0, state.player.health)}%`;
    els.armor.style.width = `${Math.max(0, state.player.armor)}%`;
    setText($('hp-num'), 'hp', String(Math.round(state.player.health)));
    setText($('armor-num'), 'armor', String(Math.round(state.player.armor)));
    setText(els.money, 'money', fmtMoney(state.money));
    setText(els.rank, 'rank', `${rankFor(state.rep)} · ${state.rep} REP`);
    setText(els.banner, 'banner', missionBanner(state));
    // Alerts: last 3, newest on top.
    const alerts = state.alerts.slice(-3).reverse().join('\n');
    setText(els.alerts, 'alerts', alerts);
    // The clock follows the light: golden hour is evening, night is late.
    const base = { golden: [17, 42], day: [12, 30], night: [21, 47] }[state.timeOfDay] || [17, 42];
    const totalMin = base[0] * 60 + base[1] + Math.floor(state.time / 60);
    const ch = Math.floor(totalMin / 60) % 24;
    const cm = totalMin % 60;
    setText(els.clock, 'clock', `${String(ch).padStart(2, '0')}:${String(cm).padStart(2, '0')}`);
    setText(els.district, 'district', state.district + ' DISTRICT');
    setText(els.radio, 'radio', `${POLICE.radio} — ${currentTrack(state)}`);
    setText(els.speed, 'speed', `${state.speedKmh} km/h`);
    const wp = currentWeapon(state);
    setText(els.weapon, 'weapon', state.player.mode === 'car' ? wp.name : 'ON FOOT · ' + wp.name);
    setText(els.ammo, 'ammo', `AMMO ${wp.ammo} · [1-6] weapon · [Q] wheel`);
    setText(els.hint, 'hint', 'WASD drive · E steal car · Click shoot · Q wheel · M mission · G garage · Esc pause');
    drawMinimap(state);
    drawStanding(state);
    drawWheel(state);
    drawGarage(state);
    els.title.style.display = screen === 'title' ? 'flex' : 'none';
    els.pause.style.display = screen === 'paused' ? 'flex' : 'none';
    els.over.style.display = screen === 'over' ? 'flex' : 'none';
    // Toast for payouts.
    if (state.toast && state.time - lastToast > 0.1) {
      lastToast = state.time;
      els.toast.textContent = state.toast;
      els.toast.style.opacity = '1';
      setTimeout(() => { els.toast.style.opacity = '0'; }, 1800);
      state.toast = '';
    }
  }

  return { update };
}
