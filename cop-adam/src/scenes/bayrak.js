// SON GÜNCÜ vs HAZIRLIKLI
// The night of 28 October. On the left, three shops in a row: the last-day
// shopper runs from one to the next and every sign flips to "TÜKENDİ". He
// ends up on the kerb. On the right, the neighbour already has his flag: he
// picks it up from the table, mounts it on the wall bracket, it unfurls and
// he salutes it. Then he takes the spare flag from his table and brings it
// over; the last-day shopper holds it up, happy.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, walkTo, runTo } from '../moves.js';
import { PI, lerp, clamp, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const RED = '#e30a17';
const SHOPS = [-0.75, -1.75, -2.75]; // visited in this order
const FLIP = [0.95, 2.65, 4.35];
const KERB = { x: -1.6, z: 0.75, h: 0.22 };
const SOCKET = new THREE.Vector3(1.4, 1.8, -0.86);
const POLE = 2.0;
const FLAG_W = 1.2;
const FLAG_H = 0.8;
const MOUNT = 2.1;
const UNFURL = [2.15, 2.9];
const TABLE = { x: 2.75, z: 0.35, h: 0.72 };
const MEET = [-1.0, -0.35, 1.15]; // left x, right x, z
const HAND_OVER = 10.8;
const POLE_AT = new THREE.Vector3(2.62, 0, 0.65); // leaning by the table, waiting
const GRIP = 0.8;
const CAPTION = 11.8;
const DURATION = 14.5;

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
    return { g: c.getContext('2d'), t };
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

  // Turkish flag, drawn to the official proportions (height G, length 1.5 G).
  const drawFlag = (g, w, h) => {
    const G = h;
    g.fillStyle = RED;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(0.5 * G, 0.5 * G, 0.25 * G, 0, PI * 2);
    g.fill();
    g.fillStyle = RED;
    g.beginPath();
    g.arc(0.5625 * G, 0.5 * G, 0.2 * G, 0, PI * 2);
    g.fill();
    const cx = (0.5 + 0.0625 - 0.2 + 1 / 3 + 0.125) * G;
    const cy = 0.5 * G;
    const R = 0.125 * G;
    const r = R * 0.382;
    g.fillStyle = '#ffffff';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = PI + (i * PI) / 5;
      const rr = i % 2 ? r : R;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  };
  const flagTex = canvas(900, 600);
  drawFlag(flagTex.g, 900, 600);
  const flagMat = new THREE.MeshStandardMaterial({ map: flagTex.t, roughness: 0.7, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: flagTex.t, emissiveIntensity: 0.06 });
  const poleMat = std(0xc9a54a, { metalness: 0.7, roughness: 0.3 });

  // A flag on a pole. The pole runs up from the group origin; the cloth hangs
  // from the top with its hoist edge on the pole.
  const makeFlag = (w, h, len) => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 8), poleMat);
    pole.position.y = len / 2;
    g.add(pole);
    const geo = new THREE.PlaneGeometry(w, h, 20, 10);
    geo.translate(w / 2, -h / 2, 0);
    const base = geo.attributes.position.array.slice();
    const cloth = new THREE.Mesh(geo, flagMat);
    cloth.position.set(0.02, len - 0.03, 0);
    g.add(cloth);
    scene.add(g);
    const wave = (t, amp) => {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3];
        const k = bx / w;
        pos.setZ(i, Math.sin(bx * (6 / w) - t * 3.4) * amp * k + Math.sin(base[i * 3 + 1] * 3 + t * 1.9) * amp * 0.25 * k);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };
    return { g, cloth, wave };
  };

  // ---- left: three shops on a street --------------------------------------------------------------
  const street = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 6.5), std(0x2a2622, { roughness: 0.95 }));
  street.position.set(-2.3, 3.25, WALL_Z);
  street.receiveShadow = true;
  scene.add(street);
  const signs = SHOPS.map((x, i) => {
    box(std(0x101012, { roughness: 0.9 }), 0.72, 1.55, 0.04, x, 0.78, WALL_Z + 0.02);
    const awning = box(std([0x3a6a8a, 0x8a5a3a, 0x4a7a4a][i], { roughness: 0.8 }), 0.9, 0.06, 0.45, x, 1.85, WALL_Z + 0.22);
    awning.rotation.x = 0.35;
    const tex = canvas(256, 96);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.36), new THREE.MeshStandardMaterial({ map: tex.t, emissive: 0xffffff, emissiveMap: tex.t, emissiveIntensity: 0.5 }));
    mesh.position.set(x, 2.3, WALL_Z + 0.03);
    scene.add(mesh);
    return { ...tex, shown: null };
  });
  const drawSign = (s, out) => {
    if (s.shown === out) return;
    s.shown = out;
    s.g.fillStyle = out ? '#3a0a0a' : '#1c1c22';
    s.g.fillRect(0, 0, 256, 96);
    s.g.fillStyle = out ? '#ff4a3a' : '#e8e2d0';
    s.g.font = '700 46px Pixel';
    s.g.textAlign = 'center';
    s.g.textBaseline = 'middle';
    s.g.fillText(out ? 'TÜKENDİ' : 'AÇIK', 128, 50);
    s.t.needsUpdate = true;
  };
  box(std(0x5a5650, { roughness: 0.9 }), 1.5, KERB.h, 0.35, KERB.x, KERB.h / 2, KERB.z - 0.05);
  const streetLamp = new THREE.SpotLight(0xffd8a0, 11, 12, 0.5, 0.7, 1.2);
  streetLamp.position.set(-1.8, 6.5, 3.5);
  streetLamp.target.position.set(-1.8, 0.6, 0.2);
  scene.add(streetLamp, streetLamp.target);

  // ---- right: house, wall bracket, table --------------------------------------------------------------
  const house = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 6.5), std(0x3a3430, { roughness: 0.95 }));
  house.position.set(2.3, 3.25, WALL_Z - 0.01);
  house.receiveShadow = true;
  scene.add(house);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, emissive: 0xffc670, emissiveIntensity: 1.1 });
  box(winMat, 0.7, 0.8, 0.04, 2.65, 1.5, WALL_Z + 0.02);
  const frame = std(0xe8e2d4);
  box(frame, 0.05, 0.8, 0.05, 2.65, 1.5, WALL_Z + 0.04);
  box(frame, 0.7, 0.05, 0.05, 2.65, 1.5, WALL_Z + 0.04);
  box(std(0x2a2a2e, { metalness: 0.5 }), 0.1, 0.16, 0.18, SOCKET.x, SOCKET.y - 0.02, SOCKET.z - 0.06);
  const wood = std(0x7a5a3a, { roughness: 0.8 });
  box(wood, 0.55, 0.04, 0.45, TABLE.x, TABLE.h - 0.02, TABLE.z);
  for (const [dx, dz] of [[-0.23, -0.18], [0.23, -0.18], [-0.23, 0.18], [0.23, 0.18]]) box(wood, 0.04, TABLE.h - 0.04, 0.04, TABLE.x + dx, (TABLE.h - 0.04) / 2, TABLE.z + dz);
  const porch = new THREE.SpotLight(0xfff0d8, 12, 12, 0.5, 0.7, 1.2);
  porch.position.set(1.8, 6.5, 3.5);
  porch.target.position.set(1.8, 1.2, 0);
  scene.add(porch, porch.target);

  const big = makeFlag(FLAG_W, FLAG_H, POLE);
  const small = makeFlag(0.45, 0.3, 0.62);

  // ---- figures ----------------------------------------------------------------------------------------
  const L = new StickFigure(mat.figure); // son güncü
  const R = new StickFigure(mat.figure); // hazırlıklı
  scene.add(L.root, R.root);
  const face = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();

  // Left: three shops, the kerb, the gift.
  const START = [-1.5, 0.5];
  const AT = SHOPS.map((x) => [x, 0.05]);
  const shrug = (p, k = 1) => (u, lt, d, t) => ({ pos: [p[0], STAND_HIP, p[1]], yaw: 0, pose: breathe(pose({ nod: -0.15, lOut: 0.13 + 0.9 * k, rOut: 0.13 + 0.9 * k, lEl: 1.2 * k, rEl: 1.2 * k, lArm: 0.3, rArm: 0.3 }), t, 0.6), ground: 0 });
  const look = (p) => stand({ x: p[0], z: p[1], yaw: PI, ground: 0, pose: { nod: -0.25 } });
  const lClips = [];
  let from = START;
  AT.forEach((p, i) => {
    lClips.push({ name: `run${i}`, d: i === 0 ? 0.7 : 0.7, blend: 0.15, fn: runTo({ from, to: p, yaw: face(from, p), ground: 0, amp: 0.5 }) });
    lClips.push({ name: `look${i}`, d: 0.6, blend: 0.15, fn: look(p) });
    lClips.push({ name: `shrug${i}`, d: i === 2 ? 0.9 : 0.4, blend: 0.15, fn: shrug(p, i === 2 ? 1.2 : 0.8) });
    from = p;
  });
  const SEAT = [KERB.x, KERB.z + 0.05];
  lClips.push(
    { name: 'trudge', d: 1.3, blend: 0.25, fn: walkTo({ from: AT[2], to: [SEAT[0], SEAT[1] + 0.35], yaw: face(AT[2], [SEAT[0], SEAT[1] + 0.35]), ground: 0, amp: 0.22, opts: { lean: 0.2, arm: 0.1 } }) },
    {
      name: 'kerb',
      d: 2.2,
      blend: 0.4,
      fn: (u, lt, d, t) => ({
        pos: [SEAT[0], KERB.h + DIM.limbR * 1.2, SEAT[1]],
        yaw: 0,
        pose: breathe(pose({ lean: 0.45, nod: 0.6, lLeg: 1.9, rLeg: 1.9, lKnee: 2.3, rKnee: 2.3, lLegOut: 0.12, rLegOut: 0.12, lArm: 0.5, rArm: 0.5, lEl: 1.0, rEl: 1.0 }), t, 0.8),
      }),
    },
    { name: 'up', d: 0.5, blend: 0.35, fn: stand({ x: SEAT[0], z: SEAT[1] + 0.1, yaw: 0.9, ground: 0, pose: { nod: -0.1, turn: 0.3 } }) },
    { name: 'toMeet', d: 0.7, blend: 0.2, fn: walkTo({ from: [SEAT[0], SEAT[1] + 0.1], to: [MEET[0], MEET[2]], yaw: PI / 2, ground: 0, amp: 0.3 }) },
    { name: 'take', d: 0.5, blend: 0.2, fn: stand({ x: MEET[0], z: MEET[2], yaw: PI / 2, ground: 0, ik: { rHand: { p: [(MEET[0] + MEET[1]) / 2, 1.2, MEET[2] - 0.08, 'world'] } } }) },
    {
      name: 'joy',
      d: 10,
      blend: 0.3,
      fn: (u, lt, d, t) => {
        const sway = 0.08 * Math.sin(lt * 7);
        return { pos: [MEET[0], STAND_HIP, MEET[2]], yaw: 0.25, pose: breathe(pose({ nod: -0.15, lOut: 0.5 }), t, 0.6), ik: { rHand: { p: [-0.22 + sway, 0.95, 0.12, 'chest'] } }, ground: 0, lift: 0.06 * Math.abs(Math.sin(lt * 5)) * (1 - smoothstep(1.2, 2, lt)) };
      },
    },
  );
  const lTrack = new Track(L, lClips);

  // Right: table, bracket, salute, spare flag.
  const PICK = [TABLE.x - 0.4, TABLE.z];
  const MOUNT_AT = [1.05, -0.5];
  const BACK = [0.85, 0.35];
  const FLAG_C = [SOCKET.x + FLAG_W / 2, SOCKET.z];
  const toTable = (p) => ({ p: [TABLE.x - 0.05, TABLE.h + 0.04, TABLE.z + p, 'world'] });
  const bendDown = (u, lt, d, t) => ({ pos: [PICK[0], STAND_HIP, PICK[1]], yaw: PI / 2, pose: breathe(pose({ lean: 0.45, nod: 0.3, lLeg: 0.2, rLeg: 0.2, lKnee: 0.35, rKnee: 0.35 }), t, 0.3), ik: { lHand: toTable(-0.06), rHand: toTable(0.06) }, ground: 0 });
  const rTrack = new Track(R, [
    { name: 'pick', d: 0.6, fn: (u, lt, d, t) => ({ ...bendDown(u, lt, d, t), ik: { lHand: { p: [POLE_AT.x, GRIP, POLE_AT.z, 'world'] }, rHand: { p: [POLE_AT.x, GRIP + 0.12, POLE_AT.z, 'world'] } } }) },
    { name: 'toWall', d: 0.9, blend: 0.2, fn: walkTo({ from: PICK, to: MOUNT_AT, yaw: face(PICK, MOUNT_AT), ground: 0, amp: 0.4, opts: { arm: 0.1 } }) },
    {
      name: 'mount',
      d: 0.8,
      blend: 0.2,
      fn: (u, lt, d, t) => {
        const y = lerp(1.45, SOCKET.y + 0.05, smoothstep(0, 0.5, lt));
        return { pos: [MOUNT_AT[0], STAND_HIP, MOUNT_AT[1]], yaw: face(MOUNT_AT, [SOCKET.x, SOCKET.z]), pose: breathe(pose({ nod: -0.3 }), t, 0.3), ik: { lHand: { p: [SOCKET.x - 0.02, y, SOCKET.z + 0.06, 'world'] }, rHand: { p: [SOCKET.x + 0.02, y + 0.18, SOCKET.z + 0.06, 'world'] } }, ground: 0 };
      },
    },
    { name: 'stepBack', d: 0.7, blend: 0.2, fn: walkTo({ from: MOUNT_AT, to: BACK, yaw: face(BACK, MOUNT_AT), backwards: true, ground: 0, amp: 0.3 }) },
    { name: 'salute', d: 2.4, blend: 0.3, fn: stand({ x: BACK[0], z: BACK[1], yaw: face(BACK, FLAG_C) - 1.0, ground: 0, pose: { nod: -0.3, lean: -0.05, lArm: 0, lOut: 0.05, lEl: 0.05 }, ik: { rHand: { p: [-0.11, 0.07, 0.11, 'head'], pole: [-0.6, 0.35, 0.15, 'chest'] } }, breath: 0.3 }) },
    { name: 'toTable', d: 1.0, blend: 0.25, fn: walkTo({ from: BACK, to: PICK, yaw: face(BACK, PICK), ground: 0, amp: 0.4 }) },
    { name: 'admire', d: 1.6, blend: 0.3, fn: stand({ x: PICK[0], z: PICK[1], yaw: -0.3, ground: 0, pose: { nod: -0.2, turn: -0.4 } }) },
    { name: 'pickSmall', d: 0.5, blend: 0.25, fn: bendDown },
    { name: 'toMeet', d: HAND_OVER - 0.5 - 8.5, blend: 0.2, fn: walkTo({ from: PICK, to: [MEET[1], MEET[2]], yaw: face(PICK, [MEET[1], MEET[2]]), ground: 0, amp: 0.45, opts: { arm: 0.15 } }) },
    { name: 'give', d: 0.5, blend: 0.2, fn: stand({ x: MEET[1], z: MEET[2], yaw: -PI / 2, ground: 0, ik: { rHand: { p: [(MEET[0] + MEET[1]) / 2 + 0.03, 1.2, MEET[2] - 0.08, 'world'] } } }) },
    { name: 'proud', d: 10, blend: 0.35, fn: stand({ x: MEET[1], z: MEET[2], yaw: -0.2, ground: 0, pose: { nod: -0.1, turn: 0.3 } }) },
  ]);

  // ---- text ------------------------------------------------------------------------------------
  for (const [text, x] of [['SON GÜNCÜ', -1.6], ['HAZIRLIKLI', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '38px', letterSpacing: '0.08em' });
  }
  const clock = world.addLabel('', [0, 5.55, 0]);
  Object.assign(clock.el.style, { fontSize: '40px', color: '#f2c14e' });
  world.addThought('daha vakit var sanmıştım', L, 0.3, 1.9);
  world.addThought('burada da mı yok?!', L, 2.5, 4.0);
  world.addThought('yarın sabah bulurum...', L, 7.0, 9.2);
  world.addThought('sağ ol komşu!', L, HAND_OVER - 0.3, HAND_OVER + 0.45);
  world.setCaption('Cumhuriyet Bayramımız\nkutlu olsun!', CAPTION, { top: 470 });

  // ---- sounds and particles ---------------------------------------------------------------------------
  const sfx = [];
  for (const i of [0, 1, 2]) {
    const t0 = lTrack.at(`run${i}`);
    for (let k = 0; k < 3; k++) sfx.push({ t: t0 + 0.1 + k * 0.22, type: 'step', gain: 0.9 });
    sfx.push({ t: FLIP[i], type: 'click', gain: 1.0 });
  }
  sfx.push({ t: MOUNT, type: 'clink', gain: 0.9 }, { t: UNFURL[0], type: 'whoosh', gain: 0.8 }, { t: UNFURL[1], type: 'chime', gain: 0.5 });
  sfx.push({ t: HAND_OVER, type: 'rustle', gain: 1.0 }, { t: CAPTION, type: 'chime', gain: 0.6 });
  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  const r = mulberry32(29);
  const parts = Array.from({ length: 16 }, () => ({ x: (MEET[0] + MEET[1]) / 2, y: 2.4, z: MEET[2], vx: (r() - 0.5) * 1.6, vy: 0.4 + r() * 1.0, vz: r() * 0.4, delay: r() * 0.15, r: 0.012 + r() * 0.012 }));
  world.addBurst('glints', { t0: HAND_OVER + 0.3, parts, life: 0.8, gravity: 2 });

  // ---- per frame ---------------------------------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, '0');
  world.onUpdate((t) => {
    lTrack.apply(t);
    rTrack.apply(t);

    signs.forEach((s, i) => drawSign(s, t >= FLIP[i]));
    const mins = Math.round(20 * 60 + 230 * smoothstep(0, 10, t) ** 0.8);
    clock.el.textContent = `28 EKİM · ${pad(Math.floor(mins / 60))}:${pad(Math.floor((mins % 60) / 5) * 5)}`;

    // Big flag: carried furled, mounted on the bracket, then unfurls and waves.
    const unf = smoothstep(UNFURL[0], UNFURL[1], t);
    big.cloth.scale.set(lerp(0.03, 1, unf), lerp(0.6, 1, unf), 1);
    if (t < 0.45) {
      big.g.position.copy(POLE_AT);
      big.g.rotation.set(0, 0, 0.06);
    } else if (t < MOUNT) {
      // Held at the middle, then slid up into the bracket.
      const grip = lerp(GRIP, 0.05, smoothstep(1.55, 2.0, t));
      big.g.position.copy(R.handWorld('l', v1)).setY(v1.y - grip);
      big.g.rotation.set(0, 0, 0);
    } else {
      big.g.position.copy(SOCKET);
      big.g.rotation.set(0, 0, 0);
    }
    big.wave(t, 0.09 * unf);

    // Spare flag: on the table, in the neighbour's hand, then in the other's.
    const grabbed = t > rTrack.at('pickSmall') + 0.3;
    if (!grabbed) {
      small.g.position.set(TABLE.x + 0.12, TABLE.h + 0.02, TABLE.z + 0.12);
      small.g.rotation.set(-PI / 2, 0, 0.3);
    } else {
      const fig = t < HAND_OVER ? R : L;
      small.g.position.copy(fig.handWorld('r', v1)).sub(v2.set(0, 0.08, 0));
      small.g.rotation.set(0, 0, 0);
    }
    small.wave(t + 1.3, 0.04);
  });

  const markers = Object.fromEntries([...rTrack.clips.map((c) => ['R.' + c.name, +c.t0.toFixed(2)]), ...lTrack.clips.map((c) => ['L.' + c.name, +c.t0.toFixed(2)])]);
  return { duration: DURATION, sfx, markers };
}
