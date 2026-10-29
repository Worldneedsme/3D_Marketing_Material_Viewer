// BORÇLA DÜĞÜN vs SADE DÜĞÜN
// Two couples dance at the same time. The left one has the big hall: a disco
// ball, coloured lights, confetti, a three-tier cake, and a debt counter that
// climbs with every extra. The right one dances under a string of bulbs in a
// small garden in front of their little house. When the music stops, the
// left hall goes dark and two "TAKSİT" sacks land on the newlyweds' backs.
// The right couple holds hands and the light comes on in their window.
import * as THREE from 'three';
import { StickFigure, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { breathe, tremble } from '../moves.js';
import { PI, lerp, clamp, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const WED_END = 6.6;
const SACKS = [7.0, 7.25];
const FALL = 0.45;
const WINDOW_ON = 7.6;
const CAPTION = 11.8;
const DURATION = 14.0;
const CL = [-1.8, 0.45];
const CR = [1.8, 0.45];
// Debt steps during the wedding: [time, total TL].
const DEBT = [[0.6, 150000], [1.8, 320000], [3.0, 480000], [4.2, 640000], [5.4, 850000]];
const fmt = (n) => String(Math.round(n / 1000) * 1000).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.2, swell: 0.08 });
  world.key.intensity = 1.5;

  const canvas = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
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
  const rand = mulberry32(29);

  // ---- left: the big hall ----------------------------------------------------------------------
  const hallWall = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 6.5), std(0x2a2026, { roughness: 0.9 }));
  hallWall.position.set(-2.3, 3.25, WALL_Z);
  hallWall.receiveShadow = true;
  scene.add(hallWall);
  // Drapes on both sides of the hall.
  const drape = std(0x6a2a3a, { roughness: 0.85 });
  for (const x of [-3.9, -0.55]) {
    for (let k = 0; k < 4; k++) box(drape, 0.14, 4.6, 0.12, x + (k - 1.5) * 0.13, 2.3, WALL_Z + 0.1 + (k % 2) * 0.05);
  }
  // Disco ball.
  const disco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), std(0xd8dce4, { metalness: 0.95, roughness: 0.15, flatShading: true }));
  disco.position.set(CL[0], 4.5, 0);
  scene.add(disco);
  box(std(0x888888), 0.015, 1.5, 0.015, CL[0], 5.4, 0).castShadow = false;
  // Three-tier cake on its own table.
  const cloth = std(0xf2eee6, { roughness: 0.8 });
  box(cloth, 0.7, 0.8, 0.5, -3.05, 0.4, 0.05);
  const icing = std(0xfbf7ef, { roughness: 0.5 });
  [[0.25, 0.22], [0.19, 0.2], [0.13, 0.18]].reduce((y, [r, h]) => {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), icing);
    tier.position.set(-3.05, y + h / 2, 0.05);
    tier.castShadow = true;
    scene.add(tier);
    return y + h;
  }, 0.8);
  // Party lights that cycle through colours, then go out.
  const party = [0xff4fa0, 0x4fc3ff, 0xffd24f].map((c, i) => {
    const l = new THREE.PointLight(c, 0, 7, 1.4);
    l.position.set(CL[0] + (i - 1) * 1.3, 3.6, 1.2);
    scene.add(l);
    return l;
  });
  const cold = new THREE.SpotLight(0x9fb4d8, 0, 12, 0.45, 0.7, 1.2);
  cold.position.set(CL[0], 7, 3.5);
  cold.target.position.set(CL[0], 0.8, 0.4);
  scene.add(cold, cold.target);

  // ---- right: garden and little house ----------------------------------------------------------------
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 6.5), std(0x1c2a3a, { roughness: 1 }));
  sky.position.set(2.3, 3.25, WALL_Z - 0.02);
  scene.add(sky);
  const grass = box(std(0x2f5a32, { roughness: 0.95 }), 4.4, 0.02, 2.2, 2.3, 0.01, 0.1);
  grass.castShadow = false;
  const plaster = std(0xd9cdb5, { roughness: 0.9 });
  box(plaster, 1.9, 2.1, 0.3, 1.85, 1.05, -0.8);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.35, 0.75, 4, 1), std(0x9a4a32, { roughness: 0.8 }));
  roof.rotation.y = PI / 4;
  roof.scale.set(1, 1, 0.35);
  roof.position.set(1.85, 2.45, -0.8);
  roof.castShadow = true;
  scene.add(roof);
  box(std(0x6a4630, { roughness: 0.8 }), 0.5, 1.0, 0.04, 1.35, 0.5, -0.63);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, emissive: 0xffc670, emissiveIntensity: 0, roughness: 0.4 });
  box(winMat, 0.55, 0.5, 0.04, 2.35, 1.35, -0.63);
  const frame = std(0xf0ece2);
  box(frame, 0.04, 0.5, 0.05, 2.35, 1.35, -0.61);
  box(frame, 0.55, 0.04, 0.05, 2.35, 1.35, -0.61);
  // String of bulbs over the garden.
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffc870, emissiveIntensity: 1.6 });
  for (const x of [0.7, 2.95]) box(std(0x5a4a3a), 0.05, 2.9, 0.05, x, 1.45, 0.05);
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), bulbMat);
    b.position.set(lerp(0.7, 2.95, u), 2.85 - 0.35 * 4 * u * (1 - u), 0.05);
    scene.add(b);
  }
  const warm = new THREE.SpotLight(0xffe2b8, 9, 12, 0.45, 0.7, 1.2);
  warm.position.set(CR[0], 6.5, 3.5);
  warm.target.position.set(CR[0], 0.8, 0.4);
  scene.add(warm, warm.target);
  // A small one-tier cake.
  box(std(0x8a6a4a, { roughness: 0.8 }), 0.4, 0.7, 0.4, 2.8, 0.35, 0.15);
  const small = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 20), icing);
  small.position.set(2.8, 0.77, 0.15);
  small.castShadow = true;
  scene.add(small);

  // ---- figures ------------------------------------------------------------------------------------
  const veilMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, roughness: 0.5 });
  const tieMat = std(0x141416, { roughness: 0.5 });
  const couple = () => {
    const groom = new StickFigure(mat.figure);
    const bride = new StickFigure(mat.figure);
    for (const s of [-1, 1]) {
      const bow = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 10), tieMat);
      bow.rotation.z = (s * PI) / 2;
      bow.position.set(s * 0.035, 0.0, 0.05);
      groom.j.neck.add(bow);
    }
    const veil = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.8, 24, 1, true), veilMat);
    veil.position.set(0, -0.22, -0.1);
    veil.rotation.x = 0.18;
    bride.head.add(veil);
    const tiara = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 24), std(0xf3d36a, { metalness: 0.8, roughness: 0.25 }));
    tiara.rotation.x = PI / 2 - 0.3;
    tiara.position.set(0, 0.14, -0.02);
    bride.head.add(tiara);
    scene.add(groom.root, bride.root);
    return [groom, bride];
  };
  const [LA, LB] = couple();
  const [RA, RB] = couple();

  // Slow dance around a centre point. Partner 0 holds partner 1's waist; the
  // other two hands clasp up high on partner 0's right.
  const dance = (C, i, speed, a0, bounce) => (u, lt, d, t) => {
    const a = a0 + speed * t;
    const r = 0.3;
    const s = i === 0 ? 1 : -1;
    const px = C[0] + s * r * Math.cos(a);
    const pz = C[1] + s * r * Math.sin(a);
    const dx = -s * Math.cos(a);
    const dz = -s * Math.sin(a);
    const left = [dz, -dx];
    const ox = C[0] - s * r * Math.cos(a);
    const oz = C[1] - s * r * Math.sin(a);
    const side = i === 0 ? -1 : 1; // the clasp is on partner 0's right
    const clasp = [C[0] + side * left[0] * 0.3, 1.5, C[1] + side * left[1] * 0.3, 'world'];
    const bob = bounce * Math.abs(Math.sin(t * 5));
    const ik =
      i === 0
        ? { rHand: { p: clasp }, lHand: { p: [ox + left[0] * 0.13 - dx * 0.06, 1.05, oz + left[1] * 0.13 - dz * 0.06, 'world'] } }
        : { lHand: { p: clasp }, rHand: { p: [ox - left[0] * 0.17 - dx * 0.05, 1.42, oz - left[1] * 0.17 - dz * 0.05, 'world'] } };
    return {
      pos: [px, STAND_HIP, pz],
      yaw: Math.atan2(dx, dz),
      pose: breathe(pose({ nod: -0.05, lLeg: 0.12 * Math.sin(t * 5), rLeg: -0.12 * Math.sin(t * 5), lKnee: 0.15 + bob, rKnee: 0.15 + bob }), t, 0.4),
      ik,
      ground: 0,
      lift: 0.04 * bob,
    };
  };

  // Left after the party: facing the camera, then buckling under the sacks.
  const LX = [-2.25, -1.3];
  const hunched = (i) => (u, lt, d, t) => {
    const k = smoothstep(SACKS[i] - 0.05, SACKS[i] + 0.15, t);
    const sink = smoothstep(SACKS[i] + 0.3, DURATION - 2, t);
    const p = pose({
      lean: lerp(0.03, 0.55 + 0.15 * sink, k),
      nod: lerp(0, 0.35, k),
      lLeg: lerp(0, 0.35 + 0.15 * sink, k),
      rLeg: lerp(0, 0.35 + 0.15 * sink, k),
      lKnee: lerp(0.05, 0.6 + 0.25 * sink, k),
      rKnee: lerp(0.05, 0.6 + 0.25 * sink, k),
    });
    tremble(p, t + i * 3, 0.03 * k);
    const hands = k > 0 ? { lHand: { p: [0.27, 0.72, -0.12, 'chest'] }, rHand: { p: [-0.27, 0.72, -0.12, 'chest'] } } : undefined;
    return { pos: [LX[i], STAND_HIP, CL[1]], yaw: (i === 0 ? -1 : 1) * 0.6 * k, pose: breathe(p, t, 0.5), ik: hands, ground: 0 };
  };
  const lTracks = [LA, LB].map(
    (f, i) =>
      new Track(f, [
        { name: 'dance', d: WED_END, fn: dance(CL, i, 1.6, 0.3, 0.12) },
        { name: 'after', d: 20, blend: 0.45, fn: hunched(i) },
      ]),
  );

  // Right after the dance: side by side, holding hands, heads leaning in.
  const RX = [1.5, 2.1];
  const together = (i) => (u, lt, d, t) => {
    const lean = smoothstep(WINDOW_ON, WINDOW_ON + 0.8, t);
    const hand = { p: [CR[0], 0.98, CR[1] + 0.05, 'world'] };
    return {
      pos: [RX[i], STAND_HIP, CR[1]],
      yaw: (i === 0 ? 1 : -1) * 0.25,
      pose: breathe(pose({ nod: 0.05, tilt: (i === 0 ? -1 : 1) * 0.22 * lean }), t, 0.5),
      ik: i === 0 ? { lHand: hand } : { rHand: hand },
      ground: 0,
    };
  };
  const rTracks = [RA, RB].map(
    (f, i) =>
      new Track(f, [
        { name: 'dance', d: WED_END + 0.3, fn: dance(CR, i, 0.8, 1.2, 0.02) },
        { name: 'together', d: 20, blend: 0.6, fn: together(i) },
      ]),
  );

  // ---- debt sacks ------------------------------------------------------------------------------------
  const sackTex = canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#8a6a42';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6a4e2e';
    g.lineWidth = 6;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#f4ead6';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 64px Pixel';
    g.fillText('TAKSİT', w / 2, h / 2 - 22);
    g.font = '700 40px Pixel';
    g.fillText('48 AY', w / 2, h / 2 + 38);
  });
  const sackMat = new THREE.MeshStandardMaterial({ map: sackTex, roughness: 0.9 });
  const sacks = [LA, LB].map(() => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.46), sackMat);
    m.castShadow = true;
    scene.add(m);
    return m;
  });

  // ---- text ------------------------------------------------------------------------------------------
  for (const [text, x] of [['BORÇLA DÜĞÜN', -1.6], ['SADE DÜĞÜN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '38px', letterSpacing: '0.08em' });
  }
  const meter = (x) => {
    const l = world.addLabel('', [x, 5.55, 0]);
    Object.assign(l.el.style, { fontSize: '40px' });
    return l;
  };
  const lMeter = meter(-1.6);
  const rMeter = meter(1.6);
  world.addThought('el âlem ne der?', LA, 0.4, 2.0);
  world.addThought('bir kere evleniyoruz!', LB, 2.3, 3.9);
  world.addThought('takılar öder nasılsa', LA, 4.2, 5.9);
  world.addThought('takılar yetmedi mi?', LB, 7.8, 9.6);
  world.addThought('48 ay mı?!', LA, 9.9, DURATION);
  world.setCaption('Ayağını yorganına\ngöre uzat.', CAPTION, { top: 470 });

  // ---- sounds and particles -------------------------------------------------------------------------------
  const sfx = [{ t: 0.05, type: 'crowd', gain: 0.5 }];
  for (const [t] of DEBT) sfx.push({ t, type: 'register', gain: 0.9 });
  sfx.push({ t: WED_END, type: 'click', gain: 1.2 });
  for (const t of SACKS) sfx.push({ t, type: 'block', gain: 1.8 }, { t: t + 0.05, type: 'rustle', gain: 1.2 });
  sfx.push({ t: 9.0, type: 'creak', gain: 0.8 }, { t: WINDOW_ON, type: 'chime', gain: 0.5 }, { t: CAPTION, type: 'chime', gain: 0.6 });

  const confettiColors = [0xffd24f, 0xff6fae, 0xffffff];
  confettiColors.forEach((c, k) => {
    world.makeParticles(`confetti${k}`, new THREE.BoxGeometry(1, 0.15, 0.7), new THREE.MeshBasicMaterial({ color: c }));
    for (let t0 = 0.15; t0 < WED_END - 0.8; t0 += 1.2) {
      const parts = Array.from({ length: 22 }, () => ({ x: CL[0] + (rand() - 0.5) * 2.6, y: 4.6 + rand() * 0.8, z: CL[1] + (rand() - 0.5) * 1.0, vx: (rand() - 0.5) * 0.4, vy: -0.4 - rand() * 0.4, vz: (rand() - 0.5) * 0.3, delay: rand() * 0.6, r: 0.03 + rand() * 0.015 }));
      world.addBurst(`confetti${k}`, { t0: t0 + k * 0.2, parts, life: 2.6, gravity: 0.9 });
    }
  });
  world.makeParticles('hearts', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb0c0 }));
  {
    const parts = Array.from({ length: 16 }, () => ({ x: CR[0] + (rand() - 0.5) * 0.6, y: 2.2, z: CR[1], vx: (rand() - 0.5) * 0.8, vy: 0.4 + rand() * 0.8, vz: rand() * 0.3, delay: rand() * 0.3, r: 0.02 + rand() * 0.015 }));
    world.addBurst('hearts', { t0: WINDOW_ON + 0.4, parts, life: 1.4, gravity: 0.3 });
  }

  // ---- per frame ---------------------------------------------------------------------------------------
  const v1 = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const debtAt = (t) => DEBT.reduce((a, [t0, v], i) => lerp(a, v, smoothstep(t0, t0 + 0.4, t)), 0);
  world.onUpdate((t) => {
    for (const tr of [...lTracks, ...rTracks]) tr.apply(t);

    // Hall lights cycle while the party lasts, then the cold light of the morning after.
    const on = 1 - smoothstep(WED_END - 0.1, WED_END + 0.1, t);
    party.forEach((l, i) => (l.intensity = on * 9 * (0.55 + 0.45 * Math.sin(t * 6 + i * 2.1))));
    disco.rotation.y = t * 1.5;
    cold.intensity = 7 * smoothstep(WED_END + 0.1, WED_END + 0.6, t);
    winMat.emissiveIntensity = 1.4 * smoothstep(WINDOW_ON, WINDOW_ON + 0.3, t);

    const debt = debtAt(t);
    if (t < SACKS[1]) {
      lMeter.el.textContent = `BORÇ ${fmt(debt)} TL`;
      lMeter.el.style.color = debt > 0 ? '#ff5a4a' : '#f2c14e';
    } else {
      lMeter.el.textContent = '48 AY TAKSİT';
      lMeter.el.style.color = '#ff5a4a';
    }
    rMeter.el.textContent = 'BORÇ 0 TL';
    rMeter.el.style.color = '#7ddc7d';

    // Sacks drop from above and settle on the upper back.
    [LA, LB].forEach((f, i) => {
      const m = sacks[i];
      const u = clamp((t - (SACKS[i] - FALL)) / FALL);
      m.visible = t >= SACKS[i] - FALL;
      if (!m.visible) return;
      f.toWorld([0, 0.66, -0.36, 'chest'], v1);
      f.j.spine.getWorldQuaternion(q);
      m.position.copy(v1);
      m.position.y += 5 * (1 - u * u);
      m.quaternion.copy(q);
    });
  });

  return { duration: DURATION, sfx };
}
