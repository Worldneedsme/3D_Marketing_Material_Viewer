// MEYDANA İNEN vs EVDE KUTLAYAN
// The evening of 29 October. On the left, a lantern march: he walks with the
// crowd, a lantern up and a small flag in his hand. His feet hurt, he gets
// cold, but when the fireworks go off overhead he cheers with everyone.
// On the right, a warm living room with the flag on the wall: tea, couch and
// the fireworks on TV. At the first bang he goes to the window, watches the
// sky from afar and raises his tea to it, then goes back to the couch.
// "COŞKU" and "RAHAT" counters over both: each side wins one, loses the other.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, walkTo } from '../moves.js';
import { PI, lerp, clamp, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const RED = '#e30a17';
const MARCH = { from: [-3.5, 0.5], to: [-1.7, 0.5], end: 5.2 };
const COLD = 6.3;
const CHEER = 8.3;
const CROWD = [[-0.85, -0.45], [0.55, -0.6], [-1.6, -0.25], [-0.25, -0.85]];
const COUCH = { x: 1.45, z: -0.5, seat: 0.42 };
const WINDOW = { x: 0.45, y: 2.0, w: 0.6, h: 0.8 };
const AT_WIN = [0.45, -0.5];
const TV = { x: 2.75, z: -0.72, y: 1.0, rot: -0.5 };
const BANNER = { x: 2.2, y: 3.0, w: 0.8, h: 0.8 / 1.5 };
const R_UP = 6.4;
const TOAST = 8.6;
const R_BACK = 9.9;
const CAPTION = 11.8;
const DURATION = 14.5;
// Fireworks over the square: [time, x, y, colour]. The bang reaches the right
// side's window as a flash.
const FIREWORKS = [
  [2.6, -1.7, 4.6, 'gold'],
  [4.2, -2.5, 4.9, 'red'],
  [6.2, -1.6, 4.4, 'white'],
  [8.4, -2.4, 5.0, 'red'],
  [8.6, -1.6, 4.6, 'white'],
  [8.8, -2.0, 4.2, 'gold'],
  [9.4, -1.5, 5.1, 'red'],
  [9.8, -2.6, 4.5, 'gold'],
  [10.4, -1.8, 4.9, 'white'],
  [11.3, -2.2, 4.3, 'gold'],
  [12.6, -1.6, 4.5, 'red'],
];
const FW_COLORS = { red: 0xff3a30, white: 0xfff4e0, gold: 0xffc94a };

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.2, swell: 0.08 });
  world.key.intensity = 1.6;

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
  const flagMat = new THREE.MeshStandardMaterial({ map: flagTex.t, roughness: 0.7, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: flagTex.t, emissiveIntensity: 0.08 });
  const poleMat = std(0xc9a54a, { metalness: 0.7, roughness: 0.3 });

  // Cloth that ripples a little more towards its free end.
  const cloth = (w, h) => {
    const geo = new THREE.PlaneGeometry(w, h, 20, 10);
    geo.translate(w / 2, -h / 2, 0);
    const base = geo.attributes.position.array.slice();
    const mesh = new THREE.Mesh(geo, flagMat);
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
    return { mesh, wave };
  };

  // ---- left: the square at night ------------------------------------------------------------------
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 6.5), std(0x121830, { roughness: 1 }));
  sky.position.set(-2.3, 3.25, WALL_Z);
  sky.receiveShadow = true;
  scene.add(sky);
  const dark = std(0x0a0c14, { roughness: 1 });
  const lit = new THREE.MeshStandardMaterial({ color: 0x2a2a30, emissive: 0xffc670, emissiveIntensity: 0.7 });
  const rb = mulberry32(7);
  for (const [x, w, h] of [[-4.1, 0.8, 1.6], [-3.3, 0.7, 2.3], [-2.55, 0.9, 1.4], [-1.7, 0.6, 2.0], [-1.05, 0.8, 1.2], [-0.35, 0.6, 1.7]]) {
    box(dark, w, h, 0.05, x, h / 2, WALL_Z + 0.03);
    for (let k = 0; k < 3; k++) {
      if (rb() < 0.45) continue;
      const wy = 0.3 + rb() * (h - 0.5);
      box(lit, 0.1, 0.12, 0.02, x + (rb() - 0.5) * (w - 0.25), wy, WALL_Z + 0.06);
    }
  }
  const streetLamp = new THREE.SpotLight(0xc8d4ff, 6, 12, 0.5, 0.7, 1.2);
  streetLamp.position.set(-1.8, 6.5, 3.5);
  streetLamp.target.position.set(-1.8, 0.6, 0.2);
  scene.add(streetLamp, streetLamp.target);
  const flash = new THREE.PointLight(0xffe0c0, 0, 9, 1.4);
  flash.position.set(-1.7, 4.4, 1.0);
  scene.add(flash);

  // A lantern on a short stick: kept upright above whichever hand holds it.
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xff5a2a });
  const makeLantern = (light) => {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), std(0x6a4a2a));
    stick.position.y = 0.21;
    g.add(stick);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), lanternMat);
    ball.scale.y = 1.15;
    ball.position.y = 0.5;
    g.add(ball);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 8), poleMat);
    cap.position.y = 0.6;
    g.add(cap);
    if (light) {
      const p = new THREE.PointLight(0xff6a30, 1.4, 2.4, 1.6);
      p.position.y = 0.5;
      g.add(p);
    }
    scene.add(g);
    return g;
  };

  // Small hand flag: the pole runs up from the hand, the cloth hangs off its top.
  const handFlag = new THREE.Group();
  const hfPole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 8), poleMat);
  hfPole.position.y = 0.31;
  handFlag.add(hfPole);
  const hfCloth = cloth(0.45, 0.3);
  hfCloth.mesh.position.set(0.015, 0.6, 0);
  handFlag.add(hfCloth.mesh);
  scene.add(handFlag);

  // ---- right: living room --------------------------------------------------------------------------
  const room = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 6.5), std(0x3a3430, { roughness: 0.95 }));
  room.position.set(2.3, 3.25, WALL_Z - 0.01);
  room.receiveShadow = true;
  scene.add(room);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x0c1020, emissive: 0x1a2444, emissiveIntensity: 1 });
  box(winMat, WINDOW.w, WINDOW.h, 0.04, WINDOW.x, WINDOW.y, WALL_Z + 0.02);
  const frame = std(0xe8e2d4);
  box(frame, 0.05, WINDOW.h, 0.05, WINDOW.x, WINDOW.y, WALL_Z + 0.04);
  box(frame, WINDOW.w, 0.05, 0.05, WINDOW.x, WINDOW.y, WALL_Z + 0.04);
  for (const s of [-1, 1]) {
    box(frame, WINDOW.w + 0.08, 0.05, 0.06, WINDOW.x, WINDOW.y + (s * WINDOW.h) / 2, WALL_Z + 0.04);
    box(frame, 0.05, WINDOW.h, 0.06, WINDOW.x + (s * WINDOW.w) / 2, WINDOW.y, WALL_Z + 0.04);
  }

  // The flag on the wall, hung from a gold rod, high and clear of everything.
  box(poleMat, BANNER.w + 0.12, 0.03, 0.03, BANNER.x + BANNER.w / 2, BANNER.y + 0.02, WALL_Z + 0.06);
  const banner = cloth(BANNER.w, BANNER.h);
  banner.mesh.position.set(BANNER.x, BANNER.y, WALL_Z + 0.05);
  scene.add(banner.mesh);

  const fabric = std(0x7a4a3a, { roughness: 0.9 });
  box(fabric, 1.3, COUCH.seat, 0.8, COUCH.x, COUCH.seat / 2, COUCH.z);
  box(fabric, 1.3, 0.6, 0.2, COUCH.x, 0.7, COUCH.z - 0.35);
  for (const dx of [-0.65, 0.65]) box(fabric, 0.16, 0.62, 0.82, COUCH.x + dx, 0.31, COUCH.z);

  // TV on a low stand, angled towards the couch, showing the fireworks.
  const tv = new THREE.Group();
  tv.position.set(TV.x, 0, TV.z);
  tv.rotation.y = TV.rot;
  scene.add(tv);
  const wood = std(0x5a3e2a, { roughness: 0.8 });
  box(wood, 0.9, 0.5, 0.35, 0, 0.25, 0, tv);
  box(std(0x141416), 0.82, 0.5, 0.04, 0, TV.y, 0, tv);
  const tvTex = canvas(256, 156);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.44), new THREE.MeshBasicMaterial({ map: tvTex.t }));
  screen.position.set(0, TV.y, 0.025);
  tv.add(screen);
  const tvGlow = new THREE.PointLight(0x8aa0ff, 0.8, 2.2, 1.6);
  tvGlow.position.set(0, TV.y, 0.4);
  tv.add(tvGlow);

  const lamp = new THREE.SpotLight(0xffd8a8, 9, 12, 0.5, 0.7, 1.2);
  lamp.position.set(1.8, 6.5, 3.5);
  lamp.target.position.set(1.8, 0.8, 0);
  scene.add(lamp, lamp.target);

  const glassMat = new THREE.MeshStandardMaterial({ color: 0xb4501e, roughness: 0.2, transparent: true, opacity: 0.9, emissive: 0x401808, emissiveIntensity: 0.6 });
  const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.026, 0.1, 12), glassMat);
  scene.add(tea);

  // ---- figures ----------------------------------------------------------------------------------------
  const L = new StickFigure(mat.figure); // meydana inen
  const R = new StickFigure(mat.figure); // evde kutlayan
  const crowdMat = new THREE.MeshStandardMaterial({ color: 0x6a6e78, roughness: 0.5, emissive: 0x101014 });
  const crowd = CROWD.map(() => new StickFigure(crowdMat));
  scene.add(L.root, R.root, ...crowd.map((c) => c.root));
  crowd.forEach((c, i) => c.root.scale.setScalar(0.94 - 0.02 * i));
  const face = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);
  const v1 = new THREE.Vector3();

  // Left: march, cold, look up, cheer. Lantern in the left hand, flag in the right.
  const withHands = (fn, ik) => (u, lt, d, t) => ({ ...fn(u, lt, d, t), ik: ik(lt, t) });
  const marchHands = (k = 1) => (lt, t) => ({
    lHand: { p: [0.2, 1.05 + 0.03 * Math.sin(t * 4), 0.12, 'chest'] },
    rHand: { p: [-0.22, 0.5 * k + 0.02 * Math.sin(t * 4 + 1), 0.24, 'chest'] },
  });
  const cheerHands = (lt, t) => {
    const sway = Math.sin(t * 6);
    return { lHand: { p: [0.28, 1.25 + 0.05 * sway, 0.12, 'chest'] }, rHand: { p: [-0.55 + 0.04 * sway, 0.55 + 0.04 * sway, 0.15, 'chest'] } };
  };
  const cheerPose = (x, z, yaw, hop = 0.06) => (u, lt, d, t) => ({
    pos: [x, STAND_HIP, z],
    yaw,
    pose: breathe(pose({ nod: -0.35, lean: -0.05 }), t, 0.6),
    ground: 0,
    lift: hop * Math.abs(Math.sin(lt * 5.5)),
  });
  const lTrack = new Track(L, [
    { name: 'march', d: MARCH.end, fn: withHands(walkTo({ from: MARCH.from, to: MARCH.to, yaw: PI / 2, ground: 0, amp: 0.26, opts: { arm: 0.05 } }), marchHands()) },
    { name: 'cold', d: COLD - MARCH.end, blend: 0.3, fn: withHands(stand({ x: MARCH.to[0], z: MARCH.to[1], yaw: 0.3, ground: 0, pose: { lean: 0.12, nod: 0.25 }, shake: 0.06 }), () => ({ lHand: { p: [0.12, 0.62, 0.22, 'chest'] }, rHand: { p: [-0.12, 0.48, 0.24, 'chest'] } })) },
    { name: 'lookUp', d: CHEER - COLD, blend: 0.35, fn: withHands(stand({ x: MARCH.to[0], z: MARCH.to[1], yaw: 0, ground: 0, pose: { nod: -0.5, lean: -0.08 } }), () => ({ lHand: { p: [0.22, 0.9, 0.18, 'chest'] }, rHand: { p: [-0.25, 0.55, 0.25, 'chest'] } })) },
    { name: 'cheer', d: 20, blend: 0.3, fn: withHands(cheerPose(MARCH.to[0], MARCH.to[1], 0), cheerHands) },
  ]);
  const crowdTracks = crowd.map((c, i) => {
    const [dx, dz] = CROWD[i];
    const from = [MARCH.from[0] + dx, MARCH.from[1] + dz];
    const to = [MARCH.to[0] + dx, MARCH.to[1] + dz];
    const phase = i * 0.7;
    return new Track(c, [
      { name: 'march', d: MARCH.end + 0.1 * i, fn: withHands(walkTo({ from, to, yaw: PI / 2, ground: 0, amp: 0.26 + 0.02 * (i % 2), opts: { arm: 0.05 } }), (lt, t) => ({ lHand: { p: [0.2, 1.0 + 0.03 * Math.sin(t * 4 + phase), 0.12, 'chest'] } })) },
      { name: 'look', d: CHEER - MARCH.end + 0.15 * i, blend: 0.35, fn: withHands(stand({ x: to[0], z: to[1], yaw: 0.2 - 0.15 * i, ground: 0, pose: { nod: -0.45 } }), () => ({ lHand: { p: [0.2, 0.95, 0.15, 'chest'] } })) },
      { name: 'cheer', d: 20, blend: 0.3, fn: withHands(cheerPose(to[0], to[1], 0.2 - 0.15 * i, 0.04), (lt, t) => ({ lHand: { p: [0.25, 1.22 + 0.05 * Math.sin(t * 6 + phase), 0.1, 'chest'] }, rHand: { p: [-0.3, 1.15 + 0.05 * Math.sin(t * 6 + phase + 1), 0.1, 'chest'] } })) },
    ]);
  });
  const lantern = makeLantern(true);
  const crowdLanterns = crowd.map(() => makeLantern(false));

  // Right: in with the tea, couch, the bang, the window, the toast, back to the couch.
  const sitY = COUCH.seat + DIM.limbR * 1.2;
  const SEAT = [COUCH.x - 0.1, COUCH.z + 0.12];
  const legs = { lLeg: PI / 2 - 0.1, rLeg: PI / 2 - 0.15, lKnee: PI / 2, rKnee: PI / 2 - 0.1 };
  const cup = (lt, t, sips) => {
    const s = sips.reduce((m, [a, b]) => Math.max(m, smoothstep(a, a + 0.3, t) * (1 - smoothstep(b - 0.3, b, t))), 0);
    return { rHand: { p: [lerp(-0.2, -0.06, s), lerp(0.42, 0.86, s), lerp(0.28, 0.2, s), 'chest'] } };
  };
  const seated = (sips) => (u, lt, d, t) => ({
    pos: [SEAT[0], sitY, SEAT[1]],
    yaw: 0.5,
    pose: breathe(pose({ lean: -0.12, nod: 0.05, turn: 0.2 * smoothstep(5.9, 6.2, t) * (t < R_UP ? -1 : 0), ...legs, lArm: 0.25, lEl: 0.6 }), t, 0.5),
    ik: cup(lt, t, sips),
  });
  const IN_FROM = [2.55, 0.5];
  const IN_TO = [SEAT[0], SEAT[1] + 0.55];
  const FRONT = [AT_WIN[0], 0.15];
  const UP_AT = [SEAT[0], SEAT[1] + 0.45];
  const rTrack = new Track(R, [
    { name: 'in', d: 1.3, fn: withHands(walkTo({ from: IN_FROM, to: IN_TO, yaw: face(IN_FROM, IN_TO), ground: 0, amp: 0.3 }), (lt, t) => cup(lt, t, [])) },
    { name: 'sit', d: R_UP - 1.3, blend: 0.45, fn: seated([[2.8, 3.6], [4.9, 5.6]]) },
    { name: 'up', d: 0.5, blend: 0.4, fn: withHands(stand({ x: UP_AT[0], z: UP_AT[1], yaw: -0.8, ground: 0, pose: { nod: -0.1, turn: -0.3 } }), (lt, t) => cup(lt, t, [])) },
    { name: 'toWindow', d: 0.55, blend: 0.2, fn: withHands(walkTo({ from: UP_AT, to: FRONT, yaw: face(UP_AT, FRONT), ground: 0, amp: 0.3 }), (lt, t) => cup(lt, t, [])) },
    { name: 'toWindow2', d: 0.35, blend: 0.15, fn: withHands(walkTo({ from: FRONT, to: AT_WIN, yaw: PI, ground: 0, amp: 0.3 }), (lt, t) => cup(lt, t, [])) },
    {
      name: 'look',
      d: R_BACK - R_UP - 1.4,
      blend: 0.35,
      fn: (u, lt, d, t) => {
        const toast = smoothstep(TOAST, TOAST + 0.35, t) * (1 - smoothstep(TOAST + 1.0, TOAST + 1.35, t));
        return {
          pos: [AT_WIN[0], STAND_HIP, AT_WIN[1]],
          yaw: PI - 0.25,
          pose: breathe(pose({ nod: -0.25, lean: -0.03 }), t, 0.5),
          ik: { rHand: { p: [lerp(-0.2, -0.22, toast), lerp(0.42, 1.15, toast), lerp(0.28, 0.32, toast), 'chest'] } },
          ground: 0,
        };
      },
    },
    { name: 'back', d: 0.35, blend: 0.3, fn: withHands(walkTo({ from: AT_WIN, to: FRONT, yaw: 0, ground: 0, amp: 0.3 }), (lt, t) => cup(lt, t, [])) },
    { name: 'back2', d: 0.6, blend: 0.15, fn: withHands(walkTo({ from: FRONT, to: IN_TO, yaw: face(FRONT, IN_TO), ground: 0, amp: 0.3 }), (lt, t) => cup(lt, t, [])) },
    { name: 'sit2', d: 20, blend: 0.45, fn: seated([[11.6, 12.4]]) },
  ]);
  const tracks = [lTrack, rTrack, ...crowdTracks];

  // ---- text ------------------------------------------------------------------------------------
  for (const [text, x] of [['MEYDANA İNEN', -1.6], ['EVDE KUTLAYAN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '38px', letterSpacing: '0.08em' });
  }
  const joy = [-1.6, 1.6].map((x) => {
    const l = world.addLabel('', [x, 5.85, 0]);
    Object.assign(l.el.style, { fontSize: '34px', color: '#f2c14e' });
    return l;
  });
  const comfort = [-1.6, 1.6].map((x) => {
    const l = world.addLabel('', [x, 5.4, 0]);
    Object.assign(l.el.style, { fontSize: '34px', color: '#9fd0ff' });
    return l;
  });
  const clock = world.addLabel('', [0, 4.95, 0], { t1: CAPTION });
  Object.assign(clock.el.style, { fontSize: '36px', color: '#e8e2d0' });

  world.addThought('ayaklarım koptu...', L, 2.9, 4.5);
  world.addThought('üşüdüm ama değer!', L, MARCH.end + 0.1, COLD + 0.6);
  world.addThought('bu coşku evde yok!', L, R_BACK + 0.1, CAPTION - 0.1);
  world.addThought('çay sıcak, koltuk rahat', R, 1.8, 3.6);
  world.addThought('ekrandan da güzel', R, 4.2, 5.8);
  world.addThought('sokakta da coşku varmış...', R, 7.6, R_BACK - 0.1);
  world.setCaption('Bayram gönülde başlar.\n\nSEN NEREDE KUTLUYORSUN?', CAPTION, { top: 600 });

  // ---- fireworks ---------------------------------------------------------------------------------
  for (const [name, color] of Object.entries(FW_COLORS)) {
    world.makeParticles(name, new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color }));
  }
  const rf = mulberry32(29);
  FIREWORKS.forEach(([t0, x, y, color]) => {
    const z = -0.85;
    // The rocket climbs for 0.55 s, then the shell opens into a sphere of sparks.
    world.addBurst('gold', { t0: t0 - 0.55, parts: [{ x, y: 0.4, z, vx: 0, vy: (y - 0.4) / 0.55, vz: 0, delay: 0, r: 0.02 }], life: 0.55, gravity: 0 });
    const parts = Array.from({ length: 72 }, () => {
      const a = rf() * 2 * PI;
      const c = rf() * 2 - 1;
      const s = Math.sqrt(1 - c * c);
      const v = 1.3 + rf() * 0.45;
      return { x, y, z, vx: Math.cos(a) * s * v * 0.7, vy: c * v, vz: Math.sin(a) * s * v * 0.3, delay: 0, r: 0.026 + rf() * 0.018 };
    });
    world.addBurst(color, { t0, parts, life: 1.3, gravity: 0.9 });
  });
  const flashAt = (t) => FIREWORKS.reduce((s, [t0]) => s + (t >= t0 ? Math.exp(-(t - t0) * 5) : 0), 0);

  // ---- sounds ---------------------------------------------------------------------------------
  const sfx = [];
  for (let t = 0.15; t < MARCH.end; t += 0.62) sfx.push({ t, type: 'step', gain: 0.55 });
  for (let k = 0; k < 3; k++) sfx.push({ t: 0.15 + k * 0.32, type: 'step', gain: 0.45 });
  sfx.push({ t: 0.1, type: 'crowd', gain: 0.35 });
  for (const [t0] of FIREWORKS) sfx.push({ t: t0 - 0.55, type: 'whoosh', gain: 0.3 }, { t: t0, type: 'shot', gain: t0 >= CHEER ? 0.55 : 0.75 });
  sfx.push({ t: CHEER + 0.1, type: 'crowd', gain: 0.9 }, { t: CHEER + 1.6, type: 'crowd', gain: 0.6 });
  sfx.push({ t: rTrack.at('sit') + 0.3, type: 'creak', gain: 0.5 }, { t: rTrack.at('sit2') + 0.3, type: 'creak', gain: 0.4 });
  sfx.push({ t: 3.1, type: 'clink', gain: 0.4 }, { t: TOAST + 0.35, type: 'clink', gain: 0.6 });
  sfx.push({ t: CAPTION, type: 'chime', gain: 0.6 });

  // ---- per frame ---------------------------------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, '0');
  const pct = (n) => `%${Math.round(n / 5) * 5}`;
  const winBase = new THREE.Color(0x1a2444);
  const winHot = new THREE.Color(0xffd0a0);
  const TV_SHELLS = [[60, 50, '#ff4a3a'], [170, 40, '#ffe7b0'], [120, 90, '#ffc94a'], [210, 95, '#ff4a3a']];

  world.onUpdate((t) => {
    for (const tr of tracks) tr.apply(t);

    // Lanterns ride above the left hands; the hand flag above the right one.
    L.handWorld('l', v1);
    lantern.position.set(v1.x, v1.y - 0.04, v1.z);
    crowd.forEach((c, i) => {
      c.handWorld('l', v1);
      crowdLanterns[i].position.set(v1.x, v1.y - 0.04, v1.z);
    });
    L.handWorld('r', v1);
    handFlag.position.set(v1.x, v1.y - 0.08, v1.z);
    hfCloth.wave(t, 0.035 + 0.02 * smoothstep(CHEER, CHEER + 0.4, t));
    banner.wave(t * 0.5, 0.012);

    // Tea stays in the right hand of the one at home.
    R.handWorld('r', v1);
    tea.position.set(v1.x, v1.y + 0.03, v1.z);

    const f = flashAt(t);
    flash.intensity = 9 * f;
    winMat.emissive.copy(winBase).lerp(winHot, clamp(0.55 * f));

    // TV: shells opening on a night sky, on a loop.
    const g = tvTex.g;
    g.fillStyle = '#0a0f24';
    g.fillRect(0, 0, 256, 156);
    TV_SHELLS.forEach(([cx, cy, col], i) => {
      const ph = (t * 0.6 + i * 0.27) % 1;
      g.globalAlpha = 1 - ph;
      g.fillStyle = col;
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * 2 * PI;
        g.fillRect(cx + Math.cos(a) * ph * 34 - 2, cy + Math.sin(a) * ph * 34 + ph * ph * 8 - 2, 4, 4);
      }
    });
    g.globalAlpha = 1;
    tvTex.t.needsUpdate = true;

    // Counters: the square gains joy and loses comfort; home keeps comfort, gains a little joy.
    const lJoy = 40 + 25 * smoothstep(2.6, 4.4, t) + 35 * smoothstep(CHEER, CHEER + 1.2, t);
    const lCom = 70 - 25 * smoothstep(2.5, 4.5, t) - 25 * smoothstep(MARCH.end, COLD, t);
    const rJoy = 30 + 25 * smoothstep(7.4, TOAST + 0.4, t);
    joy[0].el.textContent = `COŞKU ${pct(lJoy)}`;
    joy[1].el.textContent = `COŞKU ${pct(rJoy)}`;
    comfort[0].el.textContent = `RAHAT ${pct(lCom)}`;
    comfort[1].el.textContent = `RAHAT ${pct(100)}`;

    const mins = Math.round(20 * 60 + 75 * smoothstep(0, CAPTION, t));
    clock.el.textContent = `29 EKİM · ${pad(Math.floor(mins / 60))}:${pad(Math.floor((mins % 60) / 5) * 5)}`;
  });

  const markers = Object.fromEntries([...rTrack.clips.map((c) => ['R.' + c.name, +c.t0.toFixed(2)]), ...lTrack.clips.map((c) => ['L.' + c.name, +c.t0.toFixed(2)])]);
  return { duration: DURATION, sfx, markers };
}
