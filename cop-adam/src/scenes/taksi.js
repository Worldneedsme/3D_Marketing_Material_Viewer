// YOLCU SEÇEN vs İŞİNİ SEVEN
// Two taxis wait at the kerb. On the left, a passenger with a suitcase asks
// for a short ride; the driver shakes his head and they argue. The passenger
// sits on her suitcase all day. On the right, the driver walks over, loads the
// suitcase into the boot and leaves with his fare. Then the day runs in fast
// forward: the right taxi keeps coming back, dropping one passenger and taking
// the next, while the left driver waves away everyone who walks up to him.
// In the evening the waiting passenger crosses over to the right taxi.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, tremble, walkTo } from '../moves.js';
import { PI, lerp, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const CAR_Z = -0.3;
const CAR_L = 1.7;
const WHEEL_R = 0.17;
const CL = -1.75;
const CR = 1.7;
const LEAVE = [4.3, 5.5]; // the right taxi's first trip
const AWAY = 6.4;
const FULL_AT = 4.2;
// Fast forward: the right taxi's round trips and the left driver's refusals.
const FF = 5.5;
const TRIP = 1.1;
const TRIPS = 4;
const FF_END = FF + TRIP * TRIPS;
const ARRIVE = 0.35; // a trip: arrive, swap passengers, U-turn, leave
const SWAP = 0.75;
const TURN = 0.85;
const LAST_BACK = [FF_END, FF_END + 0.4];
const ASKER = 1.5;
const ASKERS = 3;
const FARES = [LEAVE[0], ...Array.from({ length: TRIPS }, (_, k) => FF + k * TRIP + SWAP)];
const HAND_OVER = 12.8;
const CAPTION = 13.4;
const DURATION = 16.0;
const HANDLE_Y = 0.9;
const SIDE = 0.2; // suitcase distance to the side of the one pulling it
const TRUNK = new THREE.Vector3(CR - CAR_L / 2 + 0.25, 0.6, CAR_Z);

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.22, swell: 0.08 });
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

  // ---- street -------------------------------------------------------------------------------------
  const glass = std(0x2c3a46, { roughness: 0.25, metalness: 0.3 });
  for (const [x, color] of [[-2.3, 0x6a564a], [2.3, 0x56606c]]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 6.5), std(color, { roughness: 0.95 }));
    wall.position.set(x, 3.25, WALL_Z);
    wall.receiveShadow = true;
    scene.add(wall);
    for (const wx of [-1.3, 0, 1.3]) for (const wy of [2.1, 3.5]) box(glass, 0.6, 0.8, 0.04, x + wx, wy, WALL_Z + 0.02);
  }

  // ---- taxis --------------------------------------------------------------------------------------
  const yellow = std(0xf2c200, { roughness: 0.35, metalness: 0.2 });
  const checker = canvas(256, 16);
  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 2; j++) {
      checker.g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4';
      checker.g.fillRect(i * 8, j * 8, 8, 8);
    }
  }
  const checkerMat = new THREE.MeshStandardMaterial({ map: checker.t, roughness: 0.4 });
  const tyre = std(0x161616, { roughness: 0.9 });
  const hub = std(0xbfc4c8, { metalness: 0.7, roughness: 0.3 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 0.8 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x8a1010, emissive: 0xff2a1a, emissiveIntensity: 0.4 });

  // The car faces +x in its own frame; the group sits on the floor.
  const makeTaxi = () => {
    const g = new THREE.Group();
    box(yellow, CAR_L, 0.42, 0.8, 0, 0.39, 0, g);
    box(checkerMat, CAR_L + 0.01, 0.06, 0.81, 0, 0.5, 0, g).castShadow = false;
    box(glass, 0.95, 0.34, 0.7, -0.08, 0.77, 0, g);
    box(yellow, 0.99, 0.04, 0.72, -0.08, 0.96, 0, g);
    for (const z of [-0.3, 0.3]) {
      box(lamp, 0.03, 0.08, 0.14, CAR_L / 2, 0.45, z, g);
      box(tail, 0.03, 0.08, 0.14, -CAR_L / 2, 0.45, z, g);
    }
    const sign = canvas(192, 96);
    const signMesh = box(new THREE.MeshStandardMaterial({ map: sign.t, emissive: 0xffffff, emissiveMap: sign.t, emissiveIntensity: 0.55 }), 0.5, 0.24, 0.14, -0.08, 1.1, 0, g);
    signMesh.rotation.y = PI / 2; // texture faces both long sides of the car
    const wheels = [];
    for (const x of [-0.55, 0.55]) {
      for (const z of [-0.36, 0.36]) {
        const w = new THREE.Group();
        w.position.set(x, WHEEL_R, z);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.12, 18), tyre);
        t.rotation.x = PI / 2;
        t.castShadow = true;
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.125), hub);
        w.add(t, h);
        g.add(w);
        wheels.push(w);
      }
    }
    scene.add(g);
    return { g, wheels, sign: { ...sign, shown: null } };
  };
  const drawSign = (s, full) => {
    if (s.shown === full) return;
    s.shown = full;
    s.g.fillStyle = '#16161a';
    s.g.fillRect(0, 0, 192, 96);
    s.g.textAlign = 'center';
    s.g.textBaseline = 'middle';
    s.g.fillStyle = '#f2c200';
    s.g.font = '700 36px Pixel';
    s.g.fillText('TAKSİ', 96, 28);
    s.g.fillStyle = full ? '#ff4a3a' : '#5cf27a';
    s.g.font = '700 34px Pixel';
    s.g.fillText(full ? 'DOLU' : 'BOŞ', 96, 70);
    s.t.needsUpdate = true;
  };
  const leftCar = makeTaxi();
  const rightCar = makeTaxi();

  leftCar.g.position.set(CL, 0, CAR_Z);
  leftCar.g.rotation.y = PI;

  // The right taxi: parked, off on its first trip, then round trips in fast
  // forward (back in from the right, passengers swap, U-turn, off again), and
  // home for the evening. `full` is true while someone is riding.
  const away = (k) => ({ x: CR + AWAY * k ** 1.6, yaw: 0 });
  const back = (k) => ({ x: CR + AWAY * (1 - k) ** 1.6, yaw: PI });
  const rightAt = (t) => {
    if (t < FF) return { ...away(smoothstep(LEAVE[0], LEAVE[1], t)), full: t > FULL_AT };
    if (t >= FF_END) return { ...back(smoothstep(LAST_BACK[0], LAST_BACK[1], t)), full: false };
    const c = (t - FF) % TRIP;
    if (c < ARRIVE) return { ...back(c / ARRIVE), full: true };
    if (c < SWAP) return { x: CR, yaw: PI, full: false };
    if (c < TURN) return { x: CR, yaw: PI + PI * smoothstep(SWAP, TURN, c), full: true };
    return { ...away((c - TURN) / (TRIP - TURN)), full: true };
  };
  const placeRight = (t) => {
    const { x, yaw, full } = rightAt(t);
    const car = rightCar;
    car.g.position.set(x, 0, CAR_Z);
    car.g.rotation.y = yaw;
    const spin = -(Math.abs(x - CR) * (yaw < PI / 2 ? 1 : -1)) / WHEEL_R;
    for (const w of car.wheels) w.rotation.z = spin;
    car.g.position.y = x !== CR ? 0.008 * Math.sin(t * 40) : 0;
    drawSign(car.sign, full);
  };

  // ---- suitcases ----------------------------------------------------------------------------------
  const makeCase = (color) => {
    const g = new THREE.Group();
    box(std(color, { roughness: 0.5 }), 0.16, 0.42, 0.3, 0, 0.27, 0, g);
    const rod = std(0x30343a, { metalness: 0.6, roughness: 0.3 });
    box(rod, 0.02, HANDLE_Y - 0.48, 0.02, 0, (HANDLE_Y + 0.48) / 2, -0.05, g);
    box(rod, 0.02, HANDLE_Y - 0.48, 0.02, 0, (HANDLE_Y + 0.48) / 2, 0.05, g);
    box(rod, 0.03, 0.03, 0.13, 0, HANDLE_Y, 0, g);
    for (const z of [-0.11, 0.11]) box(tyre, 0.04, 0.06, 0.04, 0, 0.03, z, g);
    scene.add(g);
    return g;
  };
  const case1 = makeCase(0x3a6a9a);
  const case2 = makeCase(0x9a4a5a);
  // A suitcase standing at the right side of someone at (x, z) facing yaw.
  const sideOf = (x, z, yaw, out = new THREE.Vector3()) => out.set(x - Math.cos(yaw) * SIDE, 0, z + Math.sin(yaw) * SIDE);
  const handle = (x, z, yaw) => {
    const p = sideOf(x, z, yaw);
    return { rHand: { p: [p.x, HANDLE_Y, p.z, 'world'] } };
  };
  const pulling = (fn) => (u, lt, d, t) => {
    const s = fn(u, lt, d, t);
    return { ...s, ik: handle(s.pos[0], s.pos[2], s.yaw) };
  };
  const ofFigure = (f, out) => sideOf(f.root.position.x, f.root.position.z, f.root.rotation.y, out);

  // ---- figures ------------------------------------------------------------------------------------
  const P1 = new StickFigure(mat.figure); // waiting passenger
  const D1 = new StickFigure(mat.figure); // picky driver
  const P2 = new StickFigure(mat.figure); // right passenger
  const D2 = new StickFigure(mat.figure); // good driver
  scene.add(P1.root, D1.root, P2.root, D2.root);
  const face = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);

  // Left passenger.
  const P1_AT = [-2.25, 0.85];
  const CASE1_PARK = sideOf(P1_AT[0], P1_AT[1], PI / 2);
  const P1_ASK = [0.05, 0.85];
  const p1Track = new Track(P1, [
    { name: 'in', d: 1.1, fn: pulling(walkTo({ from: [-3.6, 0.85], to: P1_AT, yaw: PI / 2, ground: 0, amp: 0.35 })) },
    { name: 'ask', d: 1.5, blend: 0.2, fn: pulling(stand({ x: P1_AT[0], z: P1_AT[1], yaw: PI / 2, ground: 0, pose: { lArm: 1.35, lOut: 0.35, lEl: 0.15, nod: -0.1 } })) },
    {
      name: 'argue',
      d: 1.7,
      blend: 0.2,
      fn: (u, lt, d, t) => {
        const k = 0.5 + 0.5 * Math.sin(lt * 9);
        return { pos: [P1_AT[0], STAND_HIP, P1_AT[1]], yaw: PI / 2 - 0.15, pose: tremble(pose({ lean: 0.12, nod: -0.2, lOut: 0.6 + 0.5 * k, rOut: 0.6 + 0.5 * (1 - k), lEl: 1.4, rEl: 1.4, lArm: 0.4, rArm: 0.4 }), t, 0.03), ground: 0 };
      },
    },
    { name: 'watch', d: 1.2, blend: 0.3, fn: stand({ x: P1_AT[0], z: P1_AT[1], yaw: 0.6, ground: 0, pose: { nod: -0.25, lOut: 0.9, rOut: 0.9, lEl: 1.3, rEl: 1.3, lArm: 0.3, rArm: 0.3 } }) },
    {
      name: 'sit',
      d: FF_END + 0.1 - 5.5,
      blend: 0.4,
      fn: (u, lt, d, t) => ({
        pos: [CASE1_PARK.x, 0.48 + DIM.limbR * 1.2, CASE1_PARK.z],
        yaw: 0,
        pose: breathe(pose({ lean: 0.4, nod: 0.5, lLeg: 1.55, rLeg: 1.55, lKnee: 1.6, rKnee: 1.6, lLegOut: 0.15, rLegOut: 0.15, lArm: 0.6, rArm: 0.6, lEl: 1.4, rEl: 1.4 }), t, 0.8),
      }),
    },
    { name: 'up', d: 0.5, blend: 0.35, fn: pulling(stand({ x: P1_AT[0], z: P1_AT[1], yaw: PI / 2, ground: 0, pose: { nod: -0.1, turn: 0.4 } })) },
    { name: 'cross', d: 1.3, blend: 0.2, fn: pulling(walkTo({ from: P1_AT, to: P1_ASK, yaw: PI / 2, ground: 0, amp: 0.4 })) },
    { name: 'ask2', d: HAND_OVER - 11.8, blend: 0.2, fn: pulling(stand({ x: P1_ASK[0], z: P1_ASK[1], yaw: PI / 2, ground: 0, pose: { nod: -0.1, lArm: 0.9, lOut: 0.3 } })) },
    {
      name: 'joy',
      d: 10,
      blend: 0.3,
      fn: (u, lt, d, t) => ({ pos: [P1_ASK[0], STAND_HIP, P1_ASK[1]], yaw: 0.6, pose: breathe(pose({ nod: -0.2, lArm: 0.5, rArm: 0.5, lOut: 0.7, rOut: 0.7, lEl: 1.2, rEl: 1.2 }), t, 0.6), ground: 0, lift: 0.05 * Math.abs(Math.sin(lt * 6)) * (1 - smoothstep(0.8, 1.6, lt)) }),
    },
  ]);

  // Left driver.
  const D1_AT = [-1.3, 0.45];
  const D1_IDLE = D1_AT;
  const ASK_AT = [-0.5, 1.3];
  const ASK_FROM = [-3.7, 1.85];
  const atP1 = face(D1_AT, P1_AT);
  const atAsker = face(D1_AT, ASK_AT);
  const d1Track = new Track(D1, [
    { name: 'lean', d: 1.7, fn: stand({ x: D1_AT[0], z: D1_AT[1], yaw: -0.5, ground: 0, pose: { lOut: 0.6, rOut: 0.6, lEl: 1.7, rEl: 1.7, lArm: -0.25, rArm: -0.25, lean: -0.05 } }) },
    {
      name: 'refuse',
      d: 1.2,
      blend: 0.25,
      fn: (u, lt, d, t) => ({ pos: [D1_AT[0], STAND_HIP, D1_AT[1]], yaw: atP1, pose: breathe(pose({ turn: 0.45 * Math.sin(lt * 11), lOut: 0.6, lEl: 1.7, lArm: -0.25, rArm: 1.1, rEl: 0.7, rOut: 0.3 + 0.35 * Math.sin(lt * 13) }), t), ground: 0 }),
    },
    { name: 'argue', d: 1.5, blend: 0.2, fn: stand({ x: D1_AT[0], z: D1_AT[1], yaw: atP1, ground: 0, shake: 0.04, pose: { lean: 0.15, nod: -0.15, rArm: 1.5, rEl: 0.1, rOut: 0.05, lOut: 0.6, lEl: 1.7, lArm: -0.25 } }) },
    { name: 'wait', d: FF - 4.4, blend: 0.3, fn: stand({ x: D1_AT[0], z: D1_AT[1], yaw: -0.3, ground: 0, pose: { lOut: 0.6, rOut: 0.6, lEl: 1.7, rEl: 1.7, lArm: -0.25, rArm: -0.25, lean: -0.05 } }) },
    {
      // Fast forward: turns to each person who walks up and waves them away.
      name: 'ff',
      d: ASKER * ASKERS,
      blend: 0.2,
      fn: (u, lt, d, t) => {
        const c = lt % ASKER;
        const no = smoothstep(0.4, 0.5, c) * (1 - smoothstep(0.95, 1.05, c));
        const p = pose({ lOut: 0.6, lEl: 1.7, lArm: -0.25, rArm: lerp(-0.25, 1.1, no), rEl: lerp(1.7, 0.6, no), rOut: lerp(0.6, 0.3 + 0.35 * Math.sin(lt * 16), no), turn: no * 0.45 * Math.sin(lt * 14), lean: -0.05 });
        return { pos: [D1_AT[0], STAND_HIP, D1_AT[1]], yaw: lerp(-0.3, atAsker, smoothstep(0.2, 0.45, c) * (1 - smoothstep(1.0, 1.3, c))), pose: breathe(p, t), ground: 0 };
      },
    },
    {
      name: 'idle',
      d: 10,
      blend: 0.3,
      fn: (u, lt, d, t) => {
        const look = smoothstep(12.1, 12.8, t);
        return { pos: [D1_IDLE[0], STAND_HIP, D1_IDLE[1]], yaw: lerp(-0.3, 1.2, look), pose: breathe(pose({ nod: lerp(0.45, 0.1, look), lean: 0.08, lOut: 0.2, rOut: 0.2, lArm: 0.15, rArm: 0.15 }), t, 0.7), ground: 0 };
      },
    },
  ]);

  // Right passenger.
  const P2_AT = [2.3, 0.85];
  const p2Track = new Track(P2, [
    { name: 'in', d: 1.1, fn: pulling(walkTo({ from: [3.6, 0.85], to: P2_AT, yaw: -PI / 2, ground: 0, amp: 0.35 })) },
    { name: 'wait', d: 0.7, blend: 0.2, fn: pulling(stand({ x: P2_AT[0], z: P2_AT[1], yaw: -PI / 2, ground: 0, pose: { nod: -0.1 } })) },
    { name: 'nod', d: 0.5, blend: 0.25, fn: stand({ x: P2_AT[0], z: P2_AT[1], yaw: -PI / 2 + 0.3, ground: 0, pose: { nod: 0.3 } }) },
    { name: 'around1', d: 0.5, blend: 0.15, fn: walkTo({ from: P2_AT, to: [2.9, 0.3], yaw: face(P2_AT, [2.9, 0.3]), ground: 0, amp: 0.4 }) },
    { name: 'around2', d: 0.6, blend: 0.15, fn: walkTo({ from: [2.9, 0.3], to: [2.1, -0.88], yaw: face([2.9, 0.3], [2.1, -0.88]), ground: 0, amp: 0.4 }) },
    { name: 'gone', d: 20, blend: 0, fn: stand({ x: 2.1, z: -0.88, yaw: PI, ground: 0 }) },
  ]);

  // Right driver.
  const D2_AT = [1.0, 0.55];
  const TAKE = [2.0, 0.55];
  const BOOT = [0.45, 0.55];
  const LOAD = [0.4, -0.25];
  const D2_BACK = [0.6, -0.88];
  const D2_IDLE = [0.6, 0.5];
  const D2_MEET = [0.42, 1.12];
  const CASE2_PARK = sideOf(P2_AT[0], P2_AT[1], -PI / 2);
  const CASE2_BOOT = sideOf(BOOT[0], BOOT[1], -PI / 2);
  const CASE1_ASK = sideOf(P1_ASK[0], P1_ASK[1], PI / 2);
  const LOAD_T = [3.0, 3.8];
  // The suitcase lifted from beside the driver into the boot.
  const loadPath = (t, out = new THREE.Vector3()) => {
    const k = smoothstep(LOAD_T[0] + 0.1, LOAD_T[1] - 0.15, t);
    out.lerpVectors(CASE2_BOOT, TRUNK, k);
    out.y += Math.sin(k * PI) * 0.35;
    return out;
  };
  const vLoad = new THREE.Vector3();
  const d2Track = new Track(D2, [
    {
      name: 'greet',
      d: 0.9,
      fn: (u, lt, d, t) => ({ pos: [D2_AT[0], STAND_HIP, D2_AT[1]], yaw: 1.1, pose: breathe(pose({ nod: -0.1, rArm: 2.7, rEl: 0.4, rOut: 0.35 + 0.3 * Math.sin(lt * 12) }), t), ground: 0 }),
    },
    { name: 'toP2', d: 0.7, blend: 0.2, fn: walkTo({ from: D2_AT, to: TAKE, yaw: PI / 2, ground: 0, amp: 0.4 }) },
    { name: 'take', d: 0.4, blend: 0.2, fn: stand({ x: TAKE[0], z: TAKE[1], yaw: PI / 2, ground: 0, pose: { lean: 0.25, nod: 0.2 }, ik: { rHand: { p: [CASE2_PARK.x, HANDLE_Y, CASE2_PARK.z, 'world'] } } }) },
    { name: 'toBoot', d: 1.0, blend: 0.2, fn: pulling(walkTo({ from: TAKE, to: BOOT, yaw: -PI / 2, ground: 0, amp: 0.4 })) },
    {
      name: 'load',
      d: LOAD_T[1] - LOAD_T[0],
      blend: 0.25,
      fn: (u, lt, d, t) => {
        const c = loadPath(t, vLoad);
        return { pos: [LOAD[0], STAND_HIP, LOAD[1]], yaw: PI / 2, pose: breathe(pose({ lean: 0.2, lLeg: 0.15, rLeg: 0.15, lKnee: 0.25, rKnee: 0.25 }), t, 0.3), ik: { lHand: { p: [c.x - 0.03, c.y + 0.5, c.z + 0.12, 'world'] }, rHand: { p: [c.x - 0.03, c.y + 0.5, c.z - 0.12, 'world'] } }, ground: 0 };
      },
    },
    { name: 'toDoor', d: 0.4, blend: 0.2, fn: walkTo({ from: LOAD, to: D2_BACK, yaw: face(LOAD, D2_BACK), ground: 0, amp: 0.4 }) },
    { name: 'gone', d: LAST_BACK[1] + 0.05 - 4.2, blend: 0, fn: stand({ x: D2_BACK[0], z: D2_BACK[1], yaw: 0, ground: 0 }) },
    { name: 'out', d: 0.6, blend: 0, fn: walkTo({ from: D2_BACK, to: D2_IDLE, yaw: 0, ground: 0, amp: 0.3 }) },
    { name: 'idle', d: 11.8 - (LAST_BACK[1] + 0.65), blend: 0.3, fn: stand({ x: D2_IDLE[0], z: D2_IDLE[1], yaw: -0.4, ground: 0, pose: { nod: -0.05 } }) },
    { name: 'meet', d: 0.5, blend: 0.2, fn: walkTo({ from: D2_IDLE, to: D2_MEET, yaw: face(D2_IDLE, D2_MEET), ground: 0, amp: 0.35 }) },
    { name: 'take2', d: HAND_OVER - 12.3, blend: 0.2, fn: stand({ x: D2_MEET[0], z: D2_MEET[1], yaw: -PI / 2, ground: 0, pose: { lean: 0.2, nod: 0.15 }, ik: { rHand: { p: [CASE1_ASK.x, HANDLE_Y, CASE1_ASK.z, 'world'] } } }) },
    { name: 'welcome', d: 10, blend: 0.3, fn: pulling(stand({ x: D2_MEET[0], z: D2_MEET[1], yaw: -0.4, ground: 0, pose: { nod: -0.1, lArm: 0.9, lOut: 0.9, lEl: 0.2 } })) },
  ]);

  const hidden = (f, [a, b]) => (t) => {
    f.root.visible = !(t > a && t < b);
  };
  // Fast-forward extras: people the left driver turns away, and the right
  // taxi's passengers getting out and in on every trip.
  const A = new StickFigure(mat.figure);
  const Qout = new StickFigure(mat.figure);
  const Qin = new StickFigure(mat.figure);
  scene.add(A.root, Qout.root, Qin.root);
  const off = (p, yaw) => stand({ x: p[0], z: p[1], yaw, ground: 0 });
  const aTrack = new Track(A, [
    { name: 'pre', d: FF, fn: off(ASK_FROM, PI / 2) },
    ...Array.from({ length: ASKERS }, (_, j) => [
      { name: `in${j}`, d: 0.5, blend: 0, fn: walkTo({ from: ASK_FROM, to: ASK_AT, yaw: face(ASK_FROM, ASK_AT), ground: 0, amp: 0.5 }) },
      { name: `ask${j}`, d: 0.5, blend: 0.1, fn: stand({ x: ASK_AT[0], z: ASK_AT[1], yaw: face(ASK_AT, D1_AT), ground: 0, pose: { lArm: 1.3, lOut: 0.4, lEl: 0.2 } }) },
      { name: `out${j}`, d: 0.45, blend: 0.1, fn: walkTo({ from: ASK_AT, to: ASK_FROM, yaw: face(ASK_AT, ASK_FROM), ground: 0, amp: 0.5, opts: { lean: 0.15 } }) },
      { name: `gap${j}`, d: ASKER - 1.45, blend: 0, fn: off(ASK_FROM, PI / 2) },
    ]).flat(),
  ]);
  const OUT_FROM = [2.75, -0.88];
  const OUT_TO = [3.6, 0.6];
  const IN_FROM = [3.6, 0.95];
  const IN_MID = [2.75, 0.45];
  const IN_TO = [2.8, -0.65];
  const qoTrack = new Track(Qout, [
    { name: 'pre', d: FF + ARRIVE, fn: off(OUT_TO, 0) },
    ...Array.from({ length: TRIPS }, (_, k) => [
      { name: `out${k}`, d: SWAP - ARRIVE, blend: 0, fn: walkTo({ from: OUT_FROM, to: OUT_TO, yaw: face(OUT_FROM, OUT_TO), ground: 0, amp: 0.55 }) },
      { name: `gap${k}`, d: TRIP - (SWAP - ARRIVE), blend: 0, fn: off(OUT_TO, 0) },
    ]).flat(),
  ]);
  const qiTrack = new Track(Qin, [
    { name: 'pre', d: FF, fn: off(IN_FROM, -PI / 2) },
    ...Array.from({ length: TRIPS }, (_, k) => [
      { name: `in${k}`, d: 0.4, blend: 0, fn: walkTo({ from: IN_FROM, to: IN_MID, yaw: face(IN_FROM, IN_MID), ground: 0, amp: 0.55 }) },
      { name: `door${k}`, d: SWAP - 0.4, blend: 0.1, fn: walkTo({ from: IN_MID, to: IN_TO, yaw: PI, ground: 0, amp: 0.5 }) },
      { name: `gap${k}`, d: TRIP - SWAP, blend: 0, fn: off(IN_FROM, -PI / 2) },
    ]).flat(),
  ]);
  const inTrip = (t, a, b) => t >= FF && t < FF_END && (t - FF) % TRIP >= a && (t - FF) % TRIP < b;
  const vis = [
    hidden(D2, [4.2, d2Track.at('out')]),
    hidden(P2, [p2Track.at('gone'), Infinity]),
    (t) => (A.root.visible = t >= FF && t < FF + ASKER * ASKERS && (t - FF) % ASKER < 1.45),
    (t) => (Qout.root.visible = inTrip(t, ARRIVE, SWAP)),
    (t) => (Qin.root.visible = inTrip(t, 0, SWAP)),
  ];
  const tracks = [p1Track, d1Track, p2Track, d2Track, aTrack, qoTrack, qiTrack];

  // ---- text ---------------------------------------------------------------------------------------
  for (const [text, x] of [['YOLCU SEÇEN', -1.6], ['İŞİNİ SEVEN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '38px', letterSpacing: '0.08em' });
  }
  const counters = [-1.6, 1.6].map((x) => {
    const l = world.addLabel('', [x, 5.75, 0]);
    Object.assign(l.el.style, { fontSize: '34px', color: '#f2c14e' });
    return l;
  });
  const clock = world.addLabel('', [0, 5.05, 0], { t1: CAPTION });
  Object.assign(clock.el.style, { fontSize: '40px', color: '#e8e2d0' });
  world.addThought('şuraya, 2 km...', P1, 0.9, 1.95);
  world.addThought('kısa mesafe, gitmem!', D1, 1.95, 3.1);
  world.addThought('taksimetre ne için var?!', P1, 3.1, 4.4);
  world.addThought('yok, gitmem!', D1, FF + 0.45, FF + 1.3);
  world.addThought('bu taksi de gitmiyor...', P1, 7.1, 8.4);
  world.addThought('trafik var, gitmem!', D1, FF + 2 * ASKER + 0.45, FF + 2 * ASKER + 1.3);
  world.addThought('bugün hiç iş yok...', D1, 10.2, 11.4);
  world.addThought('usta, 2 km gider misin?', P1, 11.4, 12.6);
  world.addThought('o kısa yol da iyiydi aslında...', D1, 13.0, 14.6);
  world.setCaption('Ayağına gelen kısmeti\ntepme.', CAPTION, { top: 470 });

  // ---- sounds and particles -----------------------------------------------------------------------
  const sfx = [];
  for (const [track, name, n] of [[p1Track, 'in', 4], [p2Track, 'in', 4], [d2Track, 'toP2', 3], [d2Track, 'toBoot', 4], [p1Track, 'cross', 5]]) {
    const t0 = track.at(name);
    for (let k = 0; k < n; k++) sfx.push({ t: t0 + 0.12 + k * 0.26, type: 'step', gain: 0.7 });
  }
  sfx.push({ t: d1Track.at('argue'), type: 'block', gain: 0.8 });
  sfx.push({ t: LOAD_T[1] - 0.15, type: 'creak', gain: 0.8 });
  for (const t of [4.2, d2Track.at('out')]) sfx.push({ t, type: 'click', gain: 0.9 });
  const departs = [LEAVE[0], ...Array.from({ length: TRIPS }, (_, k) => FF + k * TRIP + TURN)];
  for (const t of [...departs, LAST_BACK[0]]) sfx.push({ t, type: 'whoosh', gain: 0.7 });
  for (let j = 0; j < ASKERS; j++) sfx.push({ t: FF + j * ASKER + 0.5, type: 'block', gain: 0.6 });
  for (const t of [...FARES, HAND_OVER]) sfx.push({ t, type: 'register', gain: 0.8 });
  sfx.push({ t: HAND_OVER, type: 'rustle', gain: 0.9 }, { t: CAPTION, type: 'chime', gain: 0.6 });

  world.makeParticles('puff', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 1, transparent: true, opacity: 0.6 }));
  const r = mulberry32(31);
  const puff = (t0, x, dir) => {
    const parts = Array.from({ length: 10 }, () => ({ x, y: 0.25, z: CAR_Z + (r() - 0.5) * 0.4, vx: -dir * (0.4 + r() * 0.6), vy: 0.2 + r() * 0.4, vz: (r() - 0.5) * 0.3, delay: r() * 0.2, r: 0.04 + r() * 0.04 }));
    world.addBurst('puff', { t0, parts, life: 0.9, gravity: -0.2 });
  };
  for (const t of departs) puff(t, CR - CAR_L / 2, 1);

  // ---- per frame ----------------------------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, '0');
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  // A suitcase follows its current holder, easing over when it changes hands.
  const follow = (obj, owners, t) => {
    let i = owners.length - 1;
    while (i > 0 && owners[i][0] > t) i--;
    const [t0, at] = owners[i];
    at(t, v1);
    if (i > 0) {
      owners[i - 1][1](t0, v2);
      v1.lerpVectors(v2, v1, smoothstep(t0, t0 + 0.3, t));
    }
    obj.position.copy(v1);
  };
  const case1Owners = [
    [0, (t, o) => ofFigure(P1, o)],
    [p1Track.at('argue'), (t, o) => o.copy(CASE1_PARK)],
    [p1Track.at('up') + 0.2, (t, o) => ofFigure(P1, o)],
    [HAND_OVER, (t, o) => ofFigure(D2, o)],
  ];
  const case2Owners = [
    [0, (t, o) => ofFigure(P2, o)],
    [p2Track.at('nod'), (t, o) => o.copy(CASE2_PARK)],
    [d2Track.at('toBoot'), (t, o) => ofFigure(D2, o)],
    [LOAD_T[0], loadPath],
  ];

  world.onUpdate((t) => {
    for (const tr of tracks) tr.apply(t);
    for (const f of vis) f(t);

    placeRight(t);
    drawSign(leftCar.sign, false);

    follow(case1, case1Owners, t);
    case1.rotation.y = t < HAND_OVER ? PI / 2 : D2.root.rotation.y;
    follow(case2, case2Owners, t);
    case2.rotation.y = -PI / 2;
    case2.visible = t < LOAD_T[1];

    const fares = [...FARES, HAND_OVER].filter((x) => t >= x).length;
    counters[0].el.textContent = 'BUGÜN 0 YOLCU';
    counters[1].el.textContent = `BUGÜN ${fares} YOLCU`;
    const mins = Math.round(9 * 60 + 9 * 60 * smoothstep(FF, FF_END, t));
    const ff = t >= FF && t < FF_END ? '▶▶ ' : '';
    clock.el.textContent = `${ff}${pad(Math.floor(mins / 60))}:${pad(Math.floor((mins % 60) / 15) * 15)}`;
  });

  const markers = Object.fromEntries(
    [['P1', p1Track], ['D1', d1Track], ['P2', p2Track], ['D2', d2Track]].flatMap(([n, tr]) => tr.clips.map((c) => [`${n}.${c.name}`, +c.t0.toFixed(2)])),
  );
  return { duration: DURATION, sfx, markers };
}
