// Three.js scene for Aurora Bay: golden-hour sun, the city, cars, peds, police
// helicopter, bridge and props. One renderer, one InstancedMesh for the
// buildings, simple box-built vehicles. No assets, no network.
// three.min.js is the classic-script build: it sets globalThis.THREE
// (see its manifest: "global": "THREE"). It loads from the <script> tag in
// index.html before this module runs, so the global is ready here.
const THREE = globalThis.THREE;

const SUN_POS = new THREE.Vector3(180, 70, -300); // NNE, low — golden hour
const SKIES = {
  golden: { sky: 0xffb45e, fog: 0xf7a55c, sun: 0xffd9a0, sunI: 2.6, hemiSky: 0xffd9b0, hemiGround: 0x5a4a3a, hemiI: 1.1, amb: 0.45 },
  day: { sky: 0x87bfe8, fog: 0x9fc8e8, sun: 0xfff2d0, sunI: 2.2, hemiSky: 0xbfe3ff, hemiGround: 0x6a7a6a, hemiI: 1.0, amb: 0.5 },
  night: { sky: 0x121838, fog: 0x1d2539, sun: 0x8fa8ff, sunI: 1.3, hemiSky: 0x4a5a8c, hemiGround: 0x2a2a38, hemiI: 1.35, amb: 0.95 },
};

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#20242e';
  for (let y = 8; y < 120; y += 14) for (let x = 6; x < 58; x += 14) g.fillRect(x, y, 9, 9);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Night version: dark walls, warm lit windows — used as the emissive map so
// the city glows window-by-window after dark instead of glowing white.
// Small dense windows (8 x 16) so a tall face reads as a lit facade, not a
// few flat slabs; ~30% dark, mostly warm, one neon in ten (cyan/magenta/green).
function windowTextureLit() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0c0e14'; g.fillRect(0, 0, 64, 128);
  const lit = ['#ffd27a', '#ffb45e', '#ff9d5c', '#ffe9a8'];
  let i = 0;
  for (let y = 6; y < 124; y += 8) {
    for (let x = 4; x < 60; x += 8) {
      const r = (i * 7 + 3) % 10; // deterministic scatter across the grid
      if (r < 3) g.fillStyle = '#1a1e28'; // dark window
      else if (r === 7) g.fillStyle = '#59d8ff'; // neon cyan
      else if (r === 8) g.fillStyle = '#ff5ad8'; // neon magenta
      else if (r === 9) g.fillStyle = '#7dff8a'; // neon green
      else g.fillStyle = lit[i % lit.length]; // warm
      g.fillRect(x, y, 5, 6);
      i += 1;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf7a55c, 180, 900);
  const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2000);
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.6);
  sun.position.copy(SUN_POS);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x5a4a3a, 0.9);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);

  // Sun disc + halo, always in the NNE sky.
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false }));
  sunDisc.position.copy(SUN_POS).multiplyScalar(2.2);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.35, fog: false }));
  halo.position.copy(SUN_POS).multiplyScalar(2.2);
  halo.lookAt(0, 0, 0);
  scene.add(halo);

  const dyn = { cars: new Map(), peds: new Map(), police: new Map(), heli: null, playerMesh: null };
  let buildingMesh = null;
  let lampHeadMesh = null;
  let poolMesh = null;
  let timeOfDay = 'golden';

  function buildGround() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#3d3a33'; g.fillRect(0, 0, 1024, 1024);
    const px = (v) => ((v + 270) / 540) * 1024;
    g.fillStyle = '#2fae8c'; g.fillRect(px(270), 0, 1024 - px(270), 1024); // lagoon east
    g.fillStyle = '#23262e';
    for (let v = -270; v <= 270; v += 30) {
      g.fillRect(0, px(v) - 8, 1024, 16);
      g.fillRect(px(v) - 8, 0, 16, 1024);
    }
    g.fillStyle = '#f2c94c';
    for (let v = -270; v <= 270; v += 30) {
      for (let u = -270; u < 270; u += 24) {
        g.fillRect(px(u), px(v) - 1, 12, 2);
        g.fillRect(px(v) - 1, px(u), 2, 12);
      }
    }
    g.fillStyle = '#6a6258';
    g.fillRect(px(-45), px(-45), px(45) - px(-45), px(45) - px(-45)); // marina plaza
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(620, 620), new THREE.MeshLambertMaterial({ map: tex }));
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }
  scene.add(buildGround());

  function buildCity(city) {
    const winTex = windowTexture();
    const litTex = windowTextureLit();
    const mat = new THREE.MeshLambertMaterial({ map: winTex, emissive: 0xffffff, emissiveMap: litTex, emissiveIntensity: 0.12 });
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    buildingMesh = new THREE.InstancedMesh(geo, mat, city.buildings.length);
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    city.buildings.forEach((b, i) => {
      m.makeScale(b.w, b.h, b.d);
      m.setPosition(b.x, 0, b.z);
      buildingMesh.setMatrixAt(i, m);
      col.set(b.color);
      if (b.style === 'glass') col.multiplyScalar(1.25);
      if (b.style === 'brick') col.multiplyScalar(0.8);
      buildingMesh.setColorAt(i, col);
    });
    buildingMesh.instanceMatrix.needsUpdate = true;
    if (buildingMesh.instanceColor) buildingMesh.instanceColor.needsUpdate = true;
    scene.add(buildingMesh);

    const lampGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 6);
    const lampMat = new THREE.MeshLambertMaterial({ color: 0x2a2d33 });
    const lampMesh = new THREE.InstancedMesh(lampGeo, lampMat, city.lamps.length);
    city.lamps.forEach((l, i) => {
      m.makeScale(1, 1, 1);
      m.setPosition(l.x, 3, l.z);
      lampMesh.setMatrixAt(i, m);
    });
    lampMesh.instanceMatrix.needsUpdate = true;
    scene.add(lampMesh);
    // Lamp heads glow warm after dark (streetlight pools on the road).
    const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffc46b, emissiveIntensity: 0 });
    lampHeadMesh = new THREE.InstancedMesh(headGeo, headMat, city.lamps.length);
    city.lamps.forEach((l, i) => {
      m.makeScale(1, 1, 1);
      m.setPosition(l.x, 6.1, l.z);
      lampHeadMesh.setMatrixAt(i, m);
    });
    lampHeadMesh.instanceMatrix.needsUpdate = true;
    scene.add(lampHeadMesh);
    // Warm light pools on the road under each lamp, visible only at night.
    const poolGeo = new THREE.CircleGeometry(7, 16);
    poolGeo.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.16, depthWrite: false });
    poolMesh = new THREE.InstancedMesh(poolGeo, poolMat, city.lamps.length);
    city.lamps.forEach((l, i) => {
      m.makeScale(1, 1, 1);
      m.setPosition(l.x, 0.06, l.z);
      poolMesh.setMatrixAt(i, m);
    });
    poolMesh.instanceMatrix.needsUpdate = true;
    scene.add(poolMesh);

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
    const crownMat = new THREE.MeshLambertMaterial({ color: 0x2f8f5a });
    for (const p of city.palms) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
      trunk.position.set(p.x, 3.5, p.z);
      scene.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4, 7), crownMat);
      crown.position.set(p.x, 8.5, p.z);
      scene.add(crown);
    }

    const deckMat = new THREE.MeshLambertMaterial({ color: 0x4a4d55 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(105, 1.5, 10), deckMat);
    deck.position.set(217.5, 1, 0);
    scene.add(deck);
    const towerMat = new THREE.MeshLambertMaterial({ color: 0xb03a2e });
    for (const t of city.bridge.towers) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 42, 4), towerMat);
      tower.position.set(t.x, 21, 0);
      scene.add(tower);
    }

    const gateMat = new THREE.MeshLambertMaterial({ color: 0xf2c94c, emissive: 0x664d00, emissiveIntensity: 0.6 });
    for (const gt of city.raceGates) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 0.6), gateMat);
      bar.position.set(gt.x, 5, gt.z);
      scene.add(bar);
      for (const s of [-5, 5]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), gateMat);
        post.position.set(gt.x + s, 2.5, gt.z);
        scene.add(post);
      }
    }

    const rampMat = new THREE.MeshLambertMaterial({ color: 0xe07b2e });
    for (const r of city.ramps) {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 10), rampMat);
      ramp.position.set(r.x, 1.2, r.z);
      ramp.rotation.y = r.heading;
      ramp.rotation.x = -0.35;
      scene.add(ramp);
    }
  }

  function makeCarMesh(color, kind) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), new THREE.MeshLambertMaterial({ color }));
    body.position.y = 0.55;
    g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2), new THREE.MeshLambertMaterial({ color: 0x1a2028 }));
    cab.position.set(0, 1.15, -0.2);
    g.add(cab);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.38, wz);
      g.add(w);
    }
    if (kind === 'police') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshLambertMaterial({ color: 0x2233ff, emissive: 0x2233ff, emissiveIntensity: 1.2 }));
      bar.position.set(0, 1.55, 0.4);
      g.add(bar);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.2 }));
      bar2.position.set(0, 1.55, -0.4);
      g.add(bar2);
    }
    if (kind === 'taxi') {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5), new THREE.MeshLambertMaterial({ color: 0xf2c94c, emissive: 0x664d00, emissiveIntensity: 0.8 }));
      sign.position.set(0, 1.55, 0);
      g.add(sign);
    }
    if (kind === 'hero') {
      // Headlights + taillights so the hero car reads at a glance, day and
      // night; the beam cone is toggled on only after dark in render().
      const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6d8, emissive: 0xfff2b0, emissiveIntensity: 2.2 });
      const tailMat = new THREE.MeshLambertMaterial({ color: 0xff2a1e, emissive: 0xff2a1e, emissiveIntensity: 2.2 });
      for (const s of [-0.7, 0.7]) {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.12), headMat);
        h.position.set(s, 0.55, 2.22);
        g.add(h);
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.12), tailMat);
        t.position.set(s, 0.55, -2.22);
        g.add(t);
      }
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(4.5, 20, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }),
      );
      cone.name = 'headcone';
      cone.rotation.x = -Math.PI / 2; // apex at the car, base 20 m ahead
      cone.position.set(0, 0.6, 12);
      g.add(cone);
    }
    return g;
  }

  function makePedMesh(shirt) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.4), new THREE.MeshLambertMaterial({ color: shirt }));
    body.position.y = 0.95;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
    head.position.y = 1.75;
    g.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), new THREE.MeshLambertMaterial({ color: 0x222831 }));
    legs.position.y = 0.35;
    g.add(legs);
    return g;
  }

  function makeHeliMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 5), new THREE.MeshLambertMaterial({ color: 0x1c2733 }));
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4), new THREE.MeshLambertMaterial({ color: 0x1c2733 }));
    tail.position.set(0, 0.3, -4);
    g.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x888888 }));
    rotor.position.y = 0.9;
    rotor.name = 'rotor';
    g.add(rotor);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(7, 55, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    cone.position.y = -27;
    cone.rotation.x = Math.PI;
    g.add(cone);
    return g;
  }

  function makePlayerMesh() {
    const g = makePedMesh(0xff5533);
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.45), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    vest.position.y = 1.05;
    g.add(vest);
    return g;
  }

  function syncMap(map, list, make) {
    const seen = new Set();
    for (const c of list) {
      seen.add(c.id);
      let m = map.get(c.id);
      if (!m) { m = make(c); scene.add(m); map.set(c.id, m); }
      m.position.set(c.x, 0, c.z);
      m.rotation.y = c.heading;
    }
    for (const [id, m] of map) {
      if (!seen.has(id)) { scene.remove(m); map.delete(id); }
    }
  }

  function setTimeOfDay(mode) {
    timeOfDay = mode;
    const s = SKIES[mode];
    scene.background = new THREE.Color(s.sky);
    scene.fog.color.set(s.fog);
    sun.color.set(s.sun);
    sun.intensity = s.sunI;
    hemi.color.set(s.hemiSky);
    hemi.groundColor.set(s.hemiGround);
    hemi.intensity = s.hemiI;
    amb.intensity = s.amb;
    sunDisc.visible = mode !== 'night';
    halo.visible = mode !== 'night';
    renderer.toneMappingExposure = mode === 'night' ? 1.3 : 1.05;
    if (buildingMesh) buildingMesh.material.emissiveIntensity = mode === 'night' ? 0.9 : 0.12;
    if (lampHeadMesh) lampHeadMesh.material.emissiveIntensity = mode === 'night' ? 2.8 : 0;
    if (poolMesh) poolMesh.visible = mode === 'night';
  }

  function render(state) {
    // The hero car is one entry in the same cars list as traffic: syncing
    // it separately and then syncing traffic would delete it again.
    if (state.player.mode === 'car') {
      if (dyn.playerMesh) { scene.remove(dyn.playerMesh); dyn.playerMesh = null; }
    } else {
      if (!dyn.playerMesh) { dyn.playerMesh = makePlayerMesh(); scene.add(dyn.playerMesh); }
      dyn.playerMesh.position.set(state.player.x, 0, state.player.z);
      dyn.playerMesh.rotation.y = state.player.heading;
    }
    const carList = [
      { id: 'hero', x: state.car.x, z: state.car.z, heading: state.car.heading, color: state.car.color, kind: 'hero' },
      ...state.traffic.filter((t) => t.active),
    ];
    syncMap(dyn.cars, carList, (c) => makeCarMesh(c.color, c.kind));
    // The hero's headlight beam only exists after dark.
    const heroMesh = dyn.cars.get('hero');
    if (heroMesh) {
      const cone = heroMesh.getObjectByName('headcone');
      if (cone) cone.visible = state.timeOfDay === 'night';
    }
    syncMap(dyn.police, state.police.filter((p) => p.active), (p) => makeCarMesh(0xf2f2f2, 'police'));
    syncMap(dyn.peds, state.peds, (p) => makePedMesh(p.shirt));
    if (state.heli.active) {
      if (!dyn.heli) { dyn.heli = makeHeliMesh(); scene.add(dyn.heli); }
      dyn.heli.position.set(state.heli.x, 55, state.heli.z);
      const rotor = dyn.heli.getObjectByName('rotor');
      if (rotor) rotor.rotation.y = state.time * 22;
    } else if (dyn.heli) {
      scene.remove(dyn.heli);
      dyn.heli = null;
    }
    const sh = state.fx.shake;
    const sx = sh > 0 ? Math.sin(state.time * 91) * sh * 0.35 : 0;
    const sy = sh > 0 ? Math.cos(state.time * 113) * sh * 0.25 : 0;
    camera.position.set(state.camera.x + sx, state.camera.y + sy, state.camera.z);
    camera.lookAt(state.camera.lx, state.camera.ly, state.camera.lz);
    renderer.render(scene, camera);
  }

  function setPixelRatio(dpr) { renderer.setPixelRatio(dpr); }
  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  setTimeOfDay('golden');
  return { render, setTimeOfDay, buildCity, setPixelRatio, resize, camera, scene, renderer, SUN_POS };
}
