// İDARE EDEN vs AÇIK KONUŞAN
// Two desks, the same work. Folders land on both. On the right, the worker
// writes a short list of what he has done, walks to the manager's door, knocks
// and hands it over; the manager reads it and they shake hands: salary up. On
// the left, the worker keeps typing and watches over his shoulder. Then the
// years run in fast forward: folders keep piling up on the left desk while the
// salary there never moves. In the end he looks over and starts writing a list
// of his own.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, walkTo } from '../moves.js';
import { PI, lerp, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const DOOR_W = 0.9;
const DOOR_H = 2.1;
const DESK_Y = 0.78;
const SEAT_Y = 0.48;
const SEAT_HIP = SEAT_Y + DIM.limbR * 1.2;
const WORK_X = 1.3; // workers sit at ±WORK_X, facing their desks
const WORK_Z = 0.2;
const KEYS_X = 1.85;
const PILE = [2.3, 0.45];
const FOLDER_H = 0.045;
const RAISE = 8.4;
const FF = [10.0, 11.8];
const CAPTION = 12.9;
const DURATION = 15.2;

// Seated, both hands on the keyboard: `side` is -1 for the left desk.
const typing = (side, speed = 1) => (u, lt, d, t) => {
  const yaw = side * PI / 2;
  const key = (hand, ph) => {
    const lat = hand === 'l' ? 0.12 : -0.12;
    const tap = 0.025 * Math.max(0, Math.sin(t * 22 * speed + ph));
    return { p: [side * KEYS_X, DESK_Y + 0.04 + tap, WORK_Z - side * lat, 'world'] };
  };
  return {
    pos: [side * WORK_X, SEAT_HIP, WORK_Z],
    yaw,
    pose: breathe(pose({ lean: 0.2, nod: 0.15, lLeg: 1.5, rLeg: 1.5, lKnee: 1.5, rKnee: 1.5 }), t, 0.5),
    ik: { lHand: key('l', 0), rHand: key('r', PI * 0.8) },
  };
};

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.22, swell: 0.05 });
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

  // ---- office -------------------------------------------------------------------------------------
  // Back wall with a doorway in the middle: two side panels and a lintel.
  const wallMat = std(0x5c6670, { roughness: 0.95 });
  const sideW = 3.6 - DOOR_W / 2;
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(sideW, 6.5), wallMat);
    wall.position.set(s * (DOOR_W / 2 + sideW / 2), 3.25, WALL_Z);
    wall.receiveShadow = true;
    scene.add(wall);
  }
  const lintel = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, 6.5 - DOOR_H), wallMat);
  lintel.position.set(0, DOOR_H + (6.5 - DOOR_H) / 2, WALL_Z);
  scene.add(lintel);
  const frameMat = std(0x2a2522);
  box(frameMat, 0.06, DOOR_H, 0.08, -DOOR_W / 2 - 0.03, DOOR_H / 2, WALL_Z);
  box(frameMat, 0.06, DOOR_H, 0.08, DOOR_W / 2 + 0.03, DOOR_H / 2, WALL_Z);
  box(frameMat, DOOR_W + 0.12, 0.06, 0.08, 0, DOOR_H + 0.03, WALL_Z);
  const room = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W + 0.4, DOOR_H + 0.2), std(0x0c0c0e, { roughness: 1 }));
  room.position.set(0, DOOR_H / 2, WALL_Z - 1.4);
  scene.add(room);

  // The door swings into the room from a hinge on its left edge.
  const hinge = new THREE.Group();
  hinge.position.set(-DOOR_W / 2, 0, WALL_Z - 0.02);
  scene.add(hinge);
  box(std(0x8a5a3a, { roughness: 0.5 }), DOOR_W, DOOR_H - 0.02, 0.05, DOOR_W / 2, DOOR_H / 2, 0, hinge);
  box(std(0xd8c070, { metalness: 0.7, roughness: 0.3 }), 0.1, 0.03, 0.05, DOOR_W - 0.12, 1.0, 0.04, hinge);

  const sign = canvas(256, 72);
  sign.g.fillStyle = '#1a1a1e';
  sign.g.fillRect(0, 0, 256, 72);
  sign.g.fillStyle = '#e8d9a8';
  sign.g.font = '700 44px Pixel';
  sign.g.textAlign = 'center';
  sign.g.textBaseline = 'middle';
  sign.g.fillText('MÜDÜR', 128, 38);
  sign.t.needsUpdate = true;
  box(new THREE.MeshStandardMaterial({ map: sign.t, emissive: 0xffffff, emissiveMap: sign.t, emissiveIntensity: 0.4 }), 0.72, 0.2, 0.03, 0, DOOR_H + 0.28, WALL_Z + 0.02);

  // Desks, chairs and monitors, mirrored.
  const wood = std(0x9a7a58, { roughness: 0.55 });
  const steel = std(0x3a3e44, { metalness: 0.5, roughness: 0.4 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x2a4a6a, emissive: 0x4f8ad0, emissiveIntensity: 0.55, roughness: 0.3 });
  for (const s of [-1, 1]) {
    const dx = s * 2.18;
    box(wood, 0.95, 0.05, 0.9, dx, DESK_Y - 0.025, WORK_Z);
    for (const lx of [-0.42, 0.42]) for (const lz of [-0.4, 0.4]) box(steel, 0.04, DESK_Y - 0.05, 0.04, dx + lx, (DESK_Y - 0.05) / 2, WORK_Z + lz);
    box(std(0x2c2c30), 0.36, 0.02, 0.14, s * KEYS_X - s * 0.02, DESK_Y + 0.01, WORK_Z).rotation.y = PI / 2;
    const mon = new THREE.Group();
    mon.position.set(s * 2.45, DESK_Y, WORK_Z - 0.1);
    mon.rotation.y = s * 0.55;
    box(steel, 0.05, 0.2, 0.05, 0, 0.1, 0, mon);
    box(steel, 0.05, 0.36, 0.56, 0, 0.36, 0, mon);
    box(screenMat, 0.01, 0.31, 0.5, -s * 0.03, 0.36, 0, mon).castShadow = false;
    scene.add(mon);
    // Office chair: seat, post, base and a backrest behind the worker.
    const cx = s * WORK_X;
    box(std(0x23262c), 0.44, 0.06, 0.44, cx, SEAT_Y - 0.03, WORK_Z);
    box(steel, 0.05, SEAT_Y - 0.1, 0.05, cx, (SEAT_Y - 0.1) / 2 + 0.04, WORK_Z);
    box(steel, 0.46, 0.04, 0.06, cx, 0.03, WORK_Z);
    box(steel, 0.06, 0.04, 0.46, cx, 0.03, WORK_Z);
    box(std(0x23262c), 0.06, 0.5, 0.42, cx - s * 0.25, SEAT_Y + 0.33, WORK_Z);
  }

  // ---- folders ------------------------------------------------------------------------------------
  // Each folder drops onto its pile at its own time.
  const folderMats = [std(0xd9b56a, { roughness: 0.7 }), std(0x4a78b0, { roughness: 0.7 }), std(0xc85a4a, { roughness: 0.7 })];
  const rf = mulberry32(7);
  const ffDrops = Array.from({ length: 15 }, (_, k) => FF[0] + 0.1 + k * 0.11);
  const drops = {
    [-1]: [0.25, 0.4, 0.55, 1.9, 3.3, 4.7, 6.3, 7.7, 9.3, ...ffDrops],
    [1]: [0.25, 0.4, 0.55, 1.9, 10.5, 11.3],
  };
  const folders = [];
  for (const s of [-1, 1]) {
    drops[s].forEach((t0, i) => {
      const m = box(folderMats[i % 3], 0.34, FOLDER_H - 0.006, 0.25, 0, 0, 0);
      m.rotation.y = (rf() - 0.5) * 0.3;
      folders.push({ m, t0, x: s * PILE[0] + (rf() - 0.5) * 0.05, z: PILE[1] + (rf() - 0.5) * 0.04, y: DESK_Y + FOLDER_H * (i + 0.5) });
    });
  }

  // ---- paper --------------------------------------------------------------------------------------
  const listTex = canvas(128, 168);
  listTex.g.fillStyle = '#f4f2ea';
  listTex.g.fillRect(0, 0, 128, 168);
  listTex.g.fillStyle = '#2a2a2a';
  for (let k = 0; k < 6; k++) {
    listTex.g.fillRect(14, 22 + k * 22, 10, 10);
    listTex.g.fillRect(32, 25 + k * 22, 60 + ((k * 37) % 30), 5);
  }
  listTex.t.needsUpdate = true;
  const paperMat = new THREE.MeshStandardMaterial({ map: listTex.t, side: THREE.DoubleSide, roughness: 0.8, emissive: 0xffffff, emissiveMap: listTex.t, emissiveIntensity: 0.15 });
  const makePaper = () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), paperMat);
    m.castShadow = true;
    scene.add(m);
    return m;
  };
  const paperR = makePaper();
  const paperL = makePaper();
  const PAPER_R = [1.95, WORK_Z + 0.2];
  const PAPER_L = [-1.95, WORK_Z + 0.2];

  // ---- figures ------------------------------------------------------------------------------------
  const L = new StickFigure(mat.figure);
  const R = new StickFigure(mat.figure);
  const M = new StickFigure(mat.figure);
  scene.add(L.root, R.root, M.root);
  // The manager wears a tie.
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.03), std(0xb03030, { roughness: 0.5 }));
  tie.position.set(0, DIM.shoulderY - 0.2, DIM.torsoR + 0.015);
  M.j.spine.add(tie);
  const face = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);

  // Seated, writing on a sheet on the desk.
  const writing = (s, at) => (u, lt, d, t) => ({
    pos: [s * WORK_X, SEAT_HIP, WORK_Z],
    yaw: s * PI / 2,
    pose: breathe(pose({ lean: 0.3, nod: 0.35, lLeg: 1.5, rLeg: 1.5, lKnee: 1.5, rKnee: 1.5 }), t, 0.4),
    ik: {
      [s > 0 ? 'rHand' : 'lHand']: { p: [at[0] + 0.03 * Math.sin(t * 31), DESK_Y + 0.03 + 0.01 * Math.abs(Math.sin(t * 17)), at[1] + 0.05 * Math.sin(t * 9), 'world'] },
      [s > 0 ? 'lHand' : 'rHand']: { p: [s * KEYS_X, DESK_Y + 0.03, at[1] - 0.32, 'world'] },
    },
  });

  // Left worker: types, swivels round to watch the door, types through the
  // years, then looks over and starts a list of his own.
  const LOOK = { lean: 0.05, nod: -0.05, turn: 0.75, twist: 0.2, lLeg: 1.5, rLeg: 1.5, lKnee: 1.5, rKnee: 1.5, lArm: 0.3, rArm: 0.3, lEl: 1.0, rEl: 1.0 };
  const lTrack = new Track(L, [
    { name: 'type', d: 4.8, fn: typing(-1) },
    {
      name: 'watch',
      d: 4.1,
      blend: 0.45,
      fn: (u, lt, d, t) => ({ pos: [-WORK_X, SEAT_HIP, WORK_Z], yaw: -0.55, pose: breathe(pose(LOOK), t, 0.6) }),
    },
    { name: 'type2', d: FF[0] - 8.9, blend: 0.45, fn: typing(-1) },
    { name: 'ff', d: FF[1] - FF[0], blend: 0.2, fn: typing(-1, 1.8) },
    {
      name: 'look',
      d: 0.8,
      blend: 0.35,
      fn: (u, lt, d, t) => ({ pos: [-WORK_X, SEAT_HIP, WORK_Z], yaw: -0.9, pose: breathe(pose({ ...LOOK, nod: -0.25, turn: 0.9 }), t, 0.6) }),
    },
    { name: 'write', d: 10, blend: 0.4, fn: writing(-1, PAPER_L) },
  ]);

  // Right worker: types, writes his list, knocks, hands it over, shakes
  // hands and goes back to work.
  const R_UP = [WORK_X, 0.7];
  const R_AISLE = [0.8, 0.7];
  const R_KNOCK = [0.42, -0.5];
  const R_DOOR = [0.62, -0.3];
  const M_IN = [0.05, -2.1];
  const M_AT = [-0.15, -0.42];
  const GIVE = new THREE.Vector3(0.24, 1.15, -0.36);
  const SHAKE = new THREE.Vector3(0.22, 1.05, -0.35);
  const atM = face(R_DOOR, M_AT);
  const atR = face(M_AT, R_DOOR);
  const shakeAt = (t) => [SHAKE.x, SHAKE.y + 0.05 * Math.sin(t * 20), SHAKE.z, 'world'];
  const rTrack = new Track(R, [
    { name: 'type', d: 1.6, fn: typing(1) },
    { name: 'write', d: 1.4, blend: 0.3, fn: writing(1, PAPER_R) },
    { name: 'up', d: 0.4, blend: 0.4, fn: stand({ x: R_UP[0], z: R_UP[1], yaw: -PI / 2, ground: 0, pose: { nod: -0.05, rArm: 0.5, rEl: 0.8 } }) },
    { name: 'aisle', d: 0.5, blend: 0.15, fn: walkTo({ from: R_UP, to: R_AISLE, yaw: -PI / 2, ground: 0, amp: 0.36, opts: { arm: 0.15 } }) },
    { name: 'toDoor', d: 0.7, blend: 0.15, fn: walkTo({ from: R_AISLE, to: R_KNOCK, yaw: face(R_AISLE, R_KNOCK), ground: 0, amp: 0.38, opts: { arm: 0.15 } }) },
    {
      name: 'knock',
      d: 0.7,
      blend: 0.2,
      fn: (u, lt, d, t) => {
        const tap = 0.06 * Math.max(0, Math.sin(lt * 2 * PI * 2.6));
        return { pos: [R_KNOCK[0], STAND_HIP, R_KNOCK[1]], yaw: face(R_KNOCK, [0.2, WALL_Z]), pose: breathe(pose({ nod: -0.05 }), t), ik: { rHand: { p: [0.22, 1.45, WALL_Z + 0.06 + tap, 'world'] } }, ground: 0 };
      },
    },
    { name: 'back', d: 0.5, blend: 0.2, fn: walkTo({ from: R_KNOCK, to: R_DOOR, yaw: face(R_KNOCK, [0.2, WALL_Z]), ground: 0, amp: 0.25, backwards: true }) },
    { name: 'wait', d: 0.7, blend: 0.2, fn: stand({ x: R_DOOR[0], z: R_DOOR[1], yaw: atM, ground: 0, pose: { nod: -0.05, rArm: 0.4, rEl: 0.9 } }) },
    { name: 'give', d: 0.5, blend: 0.2, fn: stand({ x: R_DOOR[0], z: R_DOOR[1], yaw: atM, ground: 0, pose: { lean: 0.08 }, ik: { rHand: { p: [GIVE.x, GIVE.y, GIVE.z, 'world'] } } }) },
    { name: 'wait2', d: 0.9, blend: 0.3, fn: stand({ x: R_DOOR[0], z: R_DOOR[1], yaw: atM, ground: 0, pose: { nod: 0.05, lOut: 0.08, rOut: 0.08 } }) },
    { name: 'shake', d: 0.9, blend: 0.25, fn: (u, lt, d, t) => ({ pos: [R_DOOR[0], STAND_HIP, R_DOOR[1]], yaw: atM, pose: breathe(pose({ nod: -0.1, lean: 0.05 }), t), ik: { rHand: { p: shakeAt(t) } }, ground: 0 }) },
    { name: 'home1', d: 0.7, blend: 0.2, fn: walkTo({ from: R_DOOR, to: R_AISLE, yaw: face(R_DOOR, R_AISLE), ground: 0, amp: 0.38 }) },
    { name: 'home2', d: 0.4, blend: 0.15, fn: walkTo({ from: R_AISLE, to: R_UP, yaw: PI / 2, ground: 0, amp: 0.36 }) },
    { name: 'type2', d: 10, blend: 0.45, fn: typing(1) },
  ]);

  // Manager: inside until the knock, out through the door, reads the list,
  // shakes hands and goes back in.
  const READ = { lHand: { p: [0.08, 0.42, 0.34, 'chest'] }, rHand: { p: [-0.08, 0.42, 0.34, 'chest'] } };
  const mTrack = new Track(M, [
    { name: 'in', d: 5.5, fn: stand({ x: M_IN[0], z: M_IN[1], yaw: 0, ground: 0 }) },
    { name: 'out', d: 0.9, blend: 0, fn: walkTo({ from: M_IN, to: M_AT, yaw: 0, ground: 0, amp: 0.36 }) },
    { name: 'face', d: 0.3, blend: 0.2, fn: stand({ x: M_AT[0], z: M_AT[1], yaw: atR, ground: 0 }) },
    { name: 'take', d: 0.3, blend: 0.2, fn: stand({ x: M_AT[0], z: M_AT[1], yaw: atR, ground: 0, ik: { lHand: { p: [GIVE.x - 0.02, GIVE.y, GIVE.z - 0.03, 'world'] } } }) },
    { name: 'read', d: 0.9, blend: 0.25, fn: (u, lt, d, t) => ({ pos: [M_AT[0], STAND_HIP, M_AT[1]], yaw: atR, pose: breathe(pose({ nod: 0.35 + 0.12 * Math.sin(lt * 9) * smoothstep(0.4, 0.6, u) }), t), ik: READ, ground: 0 }) },
    { name: 'shake', d: 0.9, blend: 0.25, fn: (u, lt, d, t) => ({ pos: [M_AT[0], STAND_HIP, M_AT[1]], yaw: atR, pose: breathe(pose({ nod: -0.05, lArm: 0.5, lEl: 1.2 }), t), ik: { rHand: { p: shakeAt(t) } }, ground: 0 }) },
    { name: 'back', d: 0.8, blend: 0.25, fn: walkTo({ from: M_AT, to: M_IN, yaw: PI, ground: 0, amp: 0.36 }) },
    { name: 'gone', d: 10, blend: 0, fn: stand({ x: M_IN[0], z: M_IN[1], yaw: PI, ground: 0 }) },
  ]);
  const DOOR_OPEN = [5.25, 5.65];
  const DOOR_SHUT = [mTrack.at('gone') - 0.1, mTrack.at('gone') + 0.3];
  const tracks = [lTrack, rTrack, mTrack];

  // ---- text ---------------------------------------------------------------------------------------
  for (const [text, x] of [['İDARE EDEN', -1.6], ['AÇIK KONUŞAN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '38px', letterSpacing: '0.08em' });
  }
  const counters = [-1.6, 1.6].map((x) => {
    const l = world.addLabel('', [x, 5.75, 0]);
    Object.assign(l.el.style, { fontSize: '34px', color: '#f2c14e' });
    return l;
  });
  const year = world.addLabel('', [0, 5.05, 0], { t1: CAPTION });
  Object.assign(year.el.style, { fontSize: '40px', color: '#e8e2d0' });
  const list = world.addLabel('YAPTIKLARIM', [PAPER_R[0] + 0.3, DESK_Y + 1.25, PAPER_R[1]], { t0: 1.8, t1: 3.3 });
  Object.assign(list.el.style, { fontSize: '26px', color: '#9fd0ff', letterSpacing: '0.06em' });
  const plus = world.addLabel('+%20', () => R.headWorld().add(new THREE.Vector3(0, 0.45, 0)), { t0: RAISE, t1: RAISE + 1.4 });
  Object.assign(plus.el.style, { fontSize: '40px', color: '#6be08a' });

  world.addThought('çalışırsam fark ederler', L, 1.4, 3.6);
  world.addThought('ayıp olur...', L, 5.0, 6.3);
  world.addThought('ya kızarsa?', L, 6.4, 7.7);
  world.addThought('seneye kesin verirler', L, 8.9, 10.2);
  world.addThought('bana neden zam yok?', L, 11.8, 12.9);
  world.addThought('ben de yazayım bari...', L, 13.1, 14.8);
  world.setCaption('Ağlamayan çocuğa\nmeme vermezler.', CAPTION, { top: 470 });

  // ---- sounds -------------------------------------------------------------------------------------
  const sfx = [];
  const typeSfx = (a, b, step = 0.17) => {
    for (let t = a; t < b; t += step) sfx.push({ t, type: 'click', gain: 0.22 });
  };
  typeSfx(0.1, 1.5, 0.15);
  typeSfx(1.7, 4.7);
  typeSfx(9.2, FF[0]);
  typeSfx(FF[0], FF[1], 0.09);
  for (const t of [...drops[-1], ...drops[1]]) if (t < FF[0] || t > FF[1]) sfx.push({ t: t + 0.15, type: 'rustle', gain: 0.5 });
  for (const t of ffDrops) sfx.push({ t: t + 0.15, type: 'tick', gain: 0.8 });
  sfx.push({ t: 1.7, type: 'scribble', gain: 0.9 }, { t: 2.3, type: 'scribble', gain: 0.9 });
  for (const [name, n] of [['aisle', 2], ['toDoor', 3], ['home1', 3], ['home2', 2]]) {
    for (let k = 0; k < n; k++) sfx.push({ t: rTrack.at(name) + 0.1 + k * 0.24, type: 'step', gain: 0.7 });
  }
  for (const k of [0, 1]) sfx.push({ t: rTrack.at('knock') + 0.12 + k * 0.38, type: 'block', gain: 0.7 });
  sfx.push({ t: DOOR_OPEN[0], type: 'creak', gain: 0.7 });
  sfx.push({ t: mTrack.at('take') + 0.15, type: 'rustle', gain: 0.9 });
  sfx.push({ t: RAISE, type: 'register', gain: 0.9 }, { t: RAISE + 0.1, type: 'coin', gain: 0.8 });
  sfx.push({ t: DOOR_SHUT[1], type: 'click', gain: 0.8 });
  sfx.push({ t: FF[0], type: 'whoosh', gain: 0.8 });
  sfx.push({ t: 12.9, type: 'scribble', gain: 0.8 }, { t: CAPTION, type: 'chime', gain: 0.6 });

  // ---- per frame ----------------------------------------------------------------------------------
  const v = new THREE.Vector3();
  const fmt = (n) => `${n.toLocaleString('tr-TR')} TL`;
  world.onUpdate((t) => {
    for (const tr of tracks) tr.apply(t);
    M.root.visible = t > DOOR_OPEN[0] + 0.1 && t < DOOR_SHUT[0] + 0.15;

    hinge.rotation.y = 1.35 * smoothstep(DOOR_OPEN[0], DOOR_OPEN[1], t) * (1 - smoothstep(DOOR_SHUT[0], DOOR_SHUT[1], t));

    for (const f of folders) {
      f.m.visible = t >= f.t0;
      const fall = 1 - smoothstep(f.t0, f.t0 + 0.16, t);
      f.m.position.set(f.x, f.y + 0.6 * fall * fall, f.z);
    }

    // The list: on the desk, in the right worker's hand, then the manager's.
    paperR.visible = t > 1.6 && t < DOOR_SHUT[0];
    if (t < rTrack.at('up')) {
      paperR.position.set(PAPER_R[0], DESK_Y + 0.004, PAPER_R[1]);
      paperR.rotation.set(-PI / 2, 0, 0.2);
    } else {
      const holder = t < mTrack.at('take') + 0.25 ? R.handWorld('r', v) : M.handWorld('l', v);
      paperR.position.copy(holder).add(new THREE.Vector3(0, -0.04, 0.04));
      paperR.rotation.set(0, 0, 0);
    }
    paperL.visible = t > lTrack.at('write');
    paperL.position.set(PAPER_L[0], DESK_Y + 0.004, PAPER_L[1]);
    paperL.rotation.set(-PI / 2, 0, -0.2);

    counters[0].el.textContent = fmt(30000);
    counters[1].el.textContent = fmt(t < RAISE ? 30000 : 36000);
    counters[1].el.style.color = t >= RAISE && t < RAISE + 1.2 ? '#6be08a' : '#f2c14e';
    const y = t < FF[0] ? 1 : t < FF[1] ? (t < lerp(FF[0], FF[1], 0.5) ? 2 : 3) : 3;
    year.el.textContent = `${t >= FF[0] && t < FF[1] ? '▶▶ ' : ''}YIL ${y}`;
  });

  const markers = Object.fromEntries(
    [['L', lTrack], ['R', rTrack], ['M', mTrack]].flatMap(([n, tr]) => tr.clips.map((c) => [`${n}.${c.name}`, +c.t0.toFixed(2)])),
  );
  return { duration: DURATION, sfx, markers };
}
