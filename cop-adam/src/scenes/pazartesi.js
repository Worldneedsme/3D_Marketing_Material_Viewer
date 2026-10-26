// PAZARTESİCİ vs BUGÜNCÜ
// A wall calendar flips through four weeks. Every Monday the one on the couch
// sits up, promises to start, and sinks back into his phone. The other does
// curls every single day; his arms and his dumbbells grow week by week, and
// at the end he presses a full barbell overhead. It's Monday again on the
// calendar, and the couch says "this Monday for sure".
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { breathe } from '../moves.js';
import { PI, lerp, clamp, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const WEEKS = 4;
const WEEK = 2.5;
const FIRST = 0.3;
const weekAt = (w) => FIRST + w * WEEK;
const END = weekAt(WEEKS);
const DAYS = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];
const COUCH = { x: -1.85, z: -0.45, seat: 0.42 };
const GYM = { x: 1.9, z: 0.45 };
const PRESS = END + 0.6;
const DURATION = END + 3.5;

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.2, swell: 0.08 });
  world.key.intensity = 1.8;

  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { c, g: c.getContext('2d'), t };
  };
  const box = (m, w, h, d, x, y, z, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

  // ---- room and calendar -------------------------------------------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), std(0x24262a, { roughness: 0.95 }));
  wall.position.set(0, 3.25, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);
  const spot = new THREE.SpotLight(0xfff2e0, 12, 14, 0.6, 0.6, 1.2);
  spot.position.set(0, 7.5, 4);
  spot.target.position.set(0, 1.5, 0);
  scene.add(spot, spot.target);

  const cal = canvas(256, 320);
  let shown = '';
  const drawCalendar = (day, week) => {
    const key = `${day}/${week}`;
    if (key === shown) return;
    shown = key;
    const { g } = cal;
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 0, 256, 320);
    g.fillStyle = '#d4362a';
    g.fillRect(0, 0, 256, 78);
    g.fillStyle = '#ffffff';
    g.font = '700 34px Pixel';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`${week}. HAFTA`, 128, 40);
    g.fillStyle = day === 0 ? '#d4362a' : '#2a2a2e';
    g.font = '700 104px Pixel';
    g.fillText(DAYS[day], 128, 200);
    cal.t.needsUpdate = true;
  };
  const calendar = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.12), new THREE.MeshStandardMaterial({ map: cal.t, roughness: 0.8, emissive: 0xffffff, emissiveMap: cal.t, emissiveIntensity: 0.12 }));
  calendar.position.set(0, 3.55, WALL_Z + 0.02);
  scene.add(calendar);
  box(std(0x2a2a2e), 0.6, 0.06, 0.04, 0, 4.62, WALL_Z + 0.04);

  // ---- left: couch and phone --------------------------------------------------------------------------
  const fabric = std(0x5a4a6a, { roughness: 0.9 });
  box(fabric, 1.6, COUCH.seat, 0.8, COUCH.x, COUCH.seat / 2, COUCH.z);
  box(fabric, 1.6, 0.6, 0.2, COUCH.x, 0.7, COUCH.z - 0.35);
  for (const dx of [-0.8, 0.8]) box(fabric, 0.18, 0.62, 0.82, COUCH.x + dx, 0.31, COUCH.z);
  const phone = new THREE.Group();
  box(std(0x1a1a1e), 0.075, 0.14, 0.012, 0, 0, 0, phone);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.125), new THREE.MeshBasicMaterial({ color: 0x8fc7ff }));
  screen.position.z = 0.007;
  phone.add(screen);
  scene.add(phone);

  // ---- right: mat, dumbbells, barbell --------------------------------------------------------------------
  const matTop = box(std(0x2f5d50, { roughness: 0.9 }), 1.4, 0.02, 1.0, GYM.x, 0.01, GYM.z);
  matTop.castShadow = false;
  const iron = std(0x2b2d30, { metalness: 0.6, roughness: 0.35 });
  const chrome = std(0xb8bcc2, { metalness: 0.8, roughness: 0.25 });
  const makeDumbbell = () => {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 10), chrome);
    bar.rotation.z = PI / 2;
    g.add(bar);
    const plates = [-1, 1].map((s) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 18), iron);
      p.rotation.z = PI / 2;
      p.position.x = s * 0.11;
      p.castShadow = true;
      g.add(p);
      return p;
    });
    return { g, plates };
  };
  const bells = ['l', 'r'].map(() => makeDumbbell());
  const barbell = new THREE.Group();
  const longBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 12), chrome);
  longBar.rotation.z = PI / 2;
  barbell.add(longBar);
  for (const s of [-1, 1]) {
    for (const [dx, r] of [[0.52, 0.24], [0.6, 0.2]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 24), iron);
      p.rotation.z = PI / 2;
      p.position.x = s * dx;
      p.castShadow = true;
      barbell.add(p);
    }
  }
  scene.add(barbell);

  // ---- figures --------------------------------------------------------------------------------------
  const L = new StickFigure(mat.figure); // pazartesici
  const R = new StickFigure(mat.figure); // bugüncü
  scene.add(L.root, R.root);
  ['l', 'r'].forEach((side, i) => R.attach(side, bells[i].g));
  // Muscle: thicken arm and torso capsules as the weeks go by.
  const armMeshes = [];
  for (const j of ['lSh', 'lEl', 'rSh', 'rEl']) for (const c of R.j[j].children) if (c.isMesh) armMeshes.push(c);
  const torsoMesh = R.j.spine.children.find((c) => c.isMesh);

  // Left: on the couch with the phone; sits up with a fist every Monday, then sinks back.
  const sitY = COUCH.seat + DIM.limbR * 1.2;
  const sitPos = [COUCH.x, sitY, COUCH.z + 0.12];
  const legs = { lLeg: PI / 2 - 0.1, rLeg: PI / 2 - 0.15, lKnee: PI / 2, rKnee: PI / 2 - 0.1 };
  const phoneHands = { lHand: { p: [0.045, 0.27, 0.32, 'chest'] }, rHand: { p: [-0.045, 0.27, 0.32, 'chest'] } };
  const resolve = (t) => {
    const w = Math.floor((t - FIRST) / WEEK);
    if (w < 0 || w >= WEEKS) return t >= END && t < END + 0.9 ? Math.sin(clamp((t - END) / 0.9) * PI) : 0;
    return Math.sin(clamp((t - weekAt(w)) / 0.9) * PI);
  };
  const lTrack = new Track(L, [
    {
      name: 'couch',
      d: 30,
      fn: (u, lt, d, t) => {
        const k = resolve(t);
        const p = breathe(pose({ lean: lerp(-0.2, 0.15, k), nod: lerp(0.5, -0.2, k), ...legs }), t, 0.5);
        return {
          pos: sitPos,
          yaw: 0,
          pose: p,
          ik: k > 0.2 ? { rHand: { p: [-0.1, 0.62 * k, 0.25, 'chest'], pole: [-0.5, -0.3, 0, 'chest'] } } : phoneHands,
        };
      },
    },
  ]);

  // Right: curls all along, then the barbell press.
  const curl = (u, lt, d, t) => {
    const ph = t * 2 * PI * 1.25;
    const o = (a) => 0.5 - 0.5 * Math.cos(a);
    return {
      pos: [GYM.x, STAND_HIP, GYM.z],
      yaw: -0.25,
      pose: breathe(pose({ nod: 0.05, lean: -0.02, lArm: 0.25, rArm: 0.25, lOut: 0.2, rOut: 0.2, lEl: 0.2 + 2.0 * o(ph), rEl: 0.2 + 2.0 * o(ph + PI), lArmTw: 0.4, rArmTw: 0.4 }), t, 0.3),
      ground: 0,
    };
  };
  const press = (u, lt, d, t) => {
    const up = smoothstep(0, 0.5, lt);
    const rep = up * (0.75 + 0.25 * (0.5 + 0.5 * Math.cos(Math.max(0, lt - 0.6) * 2 * PI * 0.9)));
    const y = lerp(0.3, 0.5 + 0.55 * rep, up);
    return {
      pos: [GYM.x, STAND_HIP, GYM.z],
      yaw: 0,
      pose: breathe(pose({ nod: -0.15, lean: -0.04, lLeg: 0.05, rLeg: 0.05, lLegOut: 0.12, rLegOut: 0.12 }), t, 0.2),
      ik: { lHand: { p: [0.36, y, 0.08, 'chest'], pole: [0.8, -0.3, 0, 'chest'] }, rHand: { p: [-0.36, y, 0.08, 'chest'], pole: [-0.8, -0.3, 0, 'chest'] } },
      ground: 0,
    };
  };
  const rTrack = new Track(R, [
    { name: 'curls', d: END + 0.1, fn: curl },
    { name: 'pickUp', d: PRESS - END - 0.1, blend: 0.3, fn: (u, lt, d, t) => ({ pos: [GYM.x, STAND_HIP, GYM.z], yaw: 0, pose: pose({ lean: 0.5, nod: 0.4, lLeg: 0.5, rLeg: 0.5, lKnee: 0.9, rKnee: 0.9 }), ik: { lHand: { p: [GYM.x + 0.36, 0.3, GYM.z + 0.2, 'world'] }, rHand: { p: [GYM.x - 0.36, 0.3, GYM.z + 0.2, 'world'] } }, ground: 0 }) },
    { name: 'press', d: 10, blend: 0.3, fn: press },
  ]);

  // ---- text ------------------------------------------------------------------------------------
  for (const [text, x] of [['PAZARTESİCİ', -1.6], ['BUGÜNCÜ', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '38px', letterSpacing: '0.08em' });
  }
  const meter = (x, color) => {
    const l = world.addLabel('', [x, 5.55, 0]);
    Object.assign(l.el.style, { fontSize: '40px', color });
    return l;
  };
  const lMeter = meter(-1.6, '#ff5a4a');
  const rMeter = meter(1.6, '#7ddc7d');
  ['pazartesi başlarım', 'bu hafta yoğunum', 'ay başı başlarım', 'haftaya kesin!'].forEach((s, w) => world.addThought(s, L, weekAt(w) + 0.25, weekAt(w) + 1.7));
  world.addThought('bu pazartesi kesin!', L, END + 0.3, DURATION);
  world.setCaption('Bugünün işini\nyarına bırakma.', END + 1.3, { top: 470 });

  // ---- sounds and particles ------------------------------------------------------------------------
  const sfx = [];
  for (let w = 0; w <= WEEKS; w++) sfx.push({ t: weekAt(w), type: 'rustle', gain: 1.2 });
  for (let w = 1; w < WEEKS; w++) sfx.push({ t: weekAt(w) + 0.1, type: 'clink', gain: 0.9 });
  sfx.push({ t: PRESS + 0.5, type: 'block', gain: 1.2 }, { t: PRESS + 0.55, type: 'chime', gain: 0.7 });
  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  const r = mulberry32(12);
  const parts = Array.from({ length: 24 }, () => ({ x: GYM.x, y: 2.5, z: GYM.z + 0.2, vx: (r() - 0.5) * 2.4, vy: 0.5 + r() * 1.6, vz: r() * 0.6, delay: r() * 0.1, r: 0.014 + r() * 0.014 }));
  world.addBurst('glints', { t0: PRESS + 0.55, parts, life: 0.8, gravity: 2 });

  // ---- per frame --------------------------------------------------------------------------------------
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  world.onUpdate((t) => {
    lTrack.apply(t);
    rTrack.apply(t);

    const d = Math.max(0, Math.floor((t - FIRST) / (WEEK / 7)));
    const day = t >= END ? 0 : d % 7;
    const week = t >= END ? WEEKS + 1 : Math.floor(d / 7) + 1;
    drawCalendar(day, week);
    const trained = t >= END ? 28 : Math.min(28, d + (t >= FIRST ? 1 : 0));
    lMeter.el.textContent = '0 GÜN';
    rMeter.el.textContent = `${trained} GÜN`;

    // Muscles and dumbbells grow week by week.
    const grow = smoothstep(FIRST, END, t);
    for (const m of armMeshes) m.scale.set(1 + 0.75 * grow, 1, 1 + 0.75 * grow);
    torsoMesh.scale.set(1 + 0.4 * grow, 1, 1 + 0.3 * grow);
    const weekK = Math.min(WEEKS - 1, Math.max(0, Math.floor((t - FIRST) / WEEK)));
    const plateR = 0.055 + 0.022 * weekK;
    const holding = t < END + 0.25;
    for (const b of bells) {
      b.g.visible = holding;
      for (const p of b.plates) p.scale.set(plateR, 1, plateR);
    }

    // Barbell on the mat, then in his hands.
    if (t < END + 0.35) {
      barbell.position.set(GYM.x, 0.25, GYM.z + 0.2);
    } else {
      barbell.position.copy(R.handWorld('l', v1)).add(R.handWorld('r', v2)).multiplyScalar(0.5);
    }
    barbell.rotation.set(0, 0, 0);

    // Phone between his hands when he isn't making promises.
    const k = resolve(t);
    phone.visible = k <= 0.2;
    if (phone.visible) {
      phone.position.copy(L.handWorld('l', v1)).add(L.handWorld('r', v2)).multiplyScalar(0.5).add(v2.set(0, 0.06, 0));
      phone.lookAt(L.headWorld(v1));
    }
  });

  return { duration: DURATION, sfx };
}
