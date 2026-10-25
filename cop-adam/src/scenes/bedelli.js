// BEDELLİ YAPAN vs ASKERLİK YAPAN
// The barracks room under the big Turkish flag. Both wake to the bugle and
// salute. One pays his fee, does a quick round of push-ups and walks out with
// his bag the next morning. The other stays the full term: the rifle range,
// the climbing rope, push-ups, and is the one saluting the flag at the end.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, walkTo } from '../moves.js';
import { PI, lerp, smooth, smoothstep, mulberry32 } from '../math.js';

const DAYS = 3;
const DAY = 2.35;
const FIRST = 0.35;
const SALUTE = 0.7;
const TRAIN = DAY - SALUTE;
const PAY = 0.8;
const dayAt = (d) => FIRST + d * DAY;
const END = dayAt(DAYS); // after the last day
const WALL_Z = -1.05;
const BED_TOP = 0.58;
const BED_Z = -0.55;
const RED = '#e30a17';
const GOLD = '#e8c15a';
const TERM = 180; // days of regular service

// Training stations on the right half of the room. Each one is only there on its day.
const SHOOT = { x: 0.95, z: 1.0 };
const TARGET = new THREE.Vector3(2.75, 1.42, 1.0);
const SHOTS = [0.55, 0.9, 1.25]; // clip-local times
const HOLES = [[6, -5], [-13, 9], [5, 15]];
const ROPE = { x: 2.3, z: 0.65, top: 4.6 };
const BELL = new THREE.Vector3(ROPE.x + 0.32, ROPE.top - 0.2, ROPE.z);
const CLIMB = { up: [0.12, 1.0], bell: [1.0, 1.25], down: 1.6 };
const ACTIVITIES = ['shoot', 'climb', 'pushups'];

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.2, swell: 0.08 });
  world.key.intensity = 1.8;

  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return Object.assign(t, { canvas: c });
  };
  const box = (m, w, h, d, x, y, z, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ---- room ------------------------------------------------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), new THREE.MeshStandardMaterial({ color: 0x23261f, roughness: 0.95 }));
  wall.position.set(0, 3.25, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);

  // Turkish flag, drawn to the official proportions (height G, length 1.5 G).
  const flagTex = canvasTex(900, 600, (g, w, h) => {
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
    // Five-pointed star, one point towards the crescent.
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
  });
  const FLAG_W = 2.4;
  const FLAG_H = 1.6;
  const flagGeo = new THREE.PlaneGeometry(FLAG_W, FLAG_H, 24, 12);
  const flagBase = flagGeo.attributes.position.array.slice();
  const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.7, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: flagTex, emissiveIntensity: 0.04 });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(0, 3.7, WALL_Z + 0.12);
  scene.add(flag);
  const flagPole = box(new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 0.7, roughness: 0.3 }), 0.05, FLAG_H + 0.5, 0.05, -FLAG_W / 2 - 0.03, 3.6, WALL_Z + 0.12);
  flagPole.castShadow = false;
  const spot = new THREE.SpotLight(0xfff2e0, 14, 14, 0.42, 0.6, 1.2);
  spot.position.set(0, 7.5, 4);
  spot.target = flag;
  scene.add(spot, spot.target);

  // Beds.
  const metal = new THREE.MeshStandardMaterial({ color: 0x3d4a32, roughness: 0.5, metalness: 0.4 });
  const sheet = new THREE.MeshStandardMaterial({ color: 0xe6e2d6, roughness: 0.85 });
  const blanket = new THREE.MeshStandardMaterial({ color: 0x55633f, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const cx = s * 2.05;
    box(metal, 1.95, 0.08, 0.84, cx, 0.4, BED_Z);
    for (const dx of [-0.93, 0.93]) for (const dz of [-0.38, 0.38]) box(metal, 0.05, 0.4, 0.05, cx + dx, 0.2, BED_Z + dz);
    box(metal, 0.05, 0.7, 0.84, cx + s * 0.95, 0.55, BED_Z);
    box(sheet, 1.88, 0.12, 0.78, cx, 0.5, BED_Z);
    box(sheet, 0.36, 0.1, 0.55, cx + s * 0.7, 0.61, BED_Z);
    box(blanket, 1.1, 0.03, 0.8, cx - s * 0.32, 0.575, BED_Z);
  }

  // ---- gear ----------------------------------------------------------------------------------
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b5442, roughness: 0.8 });
  // Lighter than real gunmetal so it reads against the dark room.
  const gun = new THREE.MeshStandardMaterial({ color: 0x5d6658, roughness: 0.4, metalness: 0.35, emissive: 0x141614 });
  const stockWood = new THREE.MeshStandardMaterial({ color: 0x8f6a45, roughness: 0.6, emissive: 0x140c06 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 0.75, roughness: 0.3 });

  // Paper target on a post, turned towards both the shooter and the camera.
  const targetTex = canvasTex(256, 256, () => {});
  let holes = -1;
  const drawTarget = (n) => {
    if (n === holes) return;
    holes = n;
    const g = targetTex.canvas.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    ['#f2efe6', '#1b1b1b', '#f2efe6', '#1b1b1b', RED].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(128, 128, 124 - i * 24, 0, PI * 2);
      g.fill();
    });
    g.fillStyle = '#050505';
    g.strokeStyle = '#f2efe6';
    g.lineWidth = 2;
    for (const [x, y] of HOLES.slice(0, n)) {
      g.beginPath();
      g.arc(128 + x, 128 + y, 7, 0, PI * 2);
      g.fill();
      g.stroke();
    }
    targetTex.needsUpdate = true;
  };
  const targetStand = new THREE.Group();
  targetStand.position.set(TARGET.x, 0, TARGET.z);
  targetStand.rotation.y = -0.9;
  box(wood, 0.05, TARGET.y - 0.3, 0.05, 0, (TARGET.y - 0.3) / 2, -0.03, targetStand);
  const backing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 40), wood);
  backing.rotation.x = PI / 2;
  backing.position.set(0, TARGET.y, -0.02);
  backing.castShadow = true;
  targetStand.add(backing);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48), new THREE.MeshStandardMaterial({ map: targetTex, roughness: 0.8 }));
  face.position.set(0, TARGET.y, 0.0);
  targetStand.add(face);
  scene.add(targetStand);

  // Rifle, built along +z from the right fist: stock behind, barrel ahead.
  const rifle = new THREE.Group();
  box(stockWood, 0.06, 0.13, 0.28, 0, 0.02, -0.17, rifle);
  box(gun, 0.065, 0.1, 0.34, 0, 0.06, 0.13, rifle);
  const mag = box(gun, 0.045, 0.17, 0.07, 0, -0.04, 0.17, rifle);
  mag.rotation.x = 0.25;
  box(stockWood, 0.07, 0.07, 0.22, 0, 0.05, 0.38, rifle);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 10), gun);
  barrel.rotation.x = PI / 2;
  barrel.position.set(0, 0.07, 0.5);
  rifle.add(barrel);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  flash.position.set(0, 0.07, 0.74);
  rifle.add(flash);
  const flashLight = new THREE.PointLight(0xffb050, 0, 3.5, 2);
  flashLight.position.copy(flash.position);
  rifle.add(flashLight);
  scene.add(rifle);

  // Climbing rope hanging from a wall bracket, with a bell to ring at the top.
  const ropeRig = new THREE.Group();
  ropeRig.position.set(ROPE.x, ROPE.top, ROPE.z);
  const armLen = ROPE.z - WALL_Z + 0.05;
  box(metal, 0.06, 0.06, armLen, 0, 0.03, -armLen / 2 + 0.05, ropeRig);
  box(metal, 0.45, 0.05, 0.05, 0.15, 0.03, 0, ropeRig);
  const ropeLen = ROPE.top - 0.12;
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, ropeLen, 8), new THREE.MeshStandardMaterial({ color: 0x9c7a4a, roughness: 0.9 }));
  rope.position.y = -ropeLen / 2;
  rope.castShadow = true;
  ropeRig.add(rope);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), rope.material);
  knot.position.y = -ropeLen;
  ropeRig.add(knot);
  box(metal, 0.012, 0.1, 0.012, BELL.x - ROPE.x, -0.05, 0, ropeRig);
  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.13, 18, 1, true), brass);
  bell.material.side = THREE.DoubleSide;
  bell.position.set(BELL.x - ROPE.x, BELL.y - ROPE.top, 0);
  ropeRig.add(bell);
  scene.add(ropeRig);

  // The fee: a banded stack of notes, and the kit bag he leaves with.
  const cash = new THREE.Group();
  box(new THREE.MeshStandardMaterial({ color: 0x6fb873, roughness: 0.7, emissive: 0x15301a }), 0.36, 0.11, 0.19, 0, 0, 0, cash);
  box(new THREE.MeshStandardMaterial({ color: 0xf0ead8, roughness: 0.7 }), 0.07, 0.115, 0.195, 0, 0, 0, cash);
  scene.add(cash);
  const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 16), blanket);
  bag.rotation.z = PI / 2;
  bag.castShadow = true;
  scene.add(bag);

  // ---- soldiers ----------------------------------------------------------------------------
  const capMat = new THREE.MeshStandardMaterial({ color: 0x4b5a3a, roughness: 0.8 });
  const addCap = (fig) => {
    const cap = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.185, 0.09, 20), capMat);
    cap.add(crown);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.12), capMat);
    visor.position.set(0, -0.035, 0.17);
    cap.add(visor);
    cap.position.y = DIM.headR * 0.62;
    cap.rotation.x = -0.12;
    fig.head.add(cap);
  };
  const L = new StickFigure(mat.figure);
  const R = new StickFigure(mat.figure);
  addCap(L);
  addCap(R);
  scene.add(L.root, R.root);

  const lieY = BED_TOP + DIM.torsoR + 0.02;
  const lying = (s, extra = {}) => ({
    pos: [s * 1.95, lieY, BED_Z],
    yaw: s < 0 ? PI / 2 : -PI / 2,
    pitch: -PI / 2,
    pose: pose({ nod: 0.15, lArm: 0.05, rArm: 0.05, lOut: 0.12, rOut: 0.12, lEl: 0.2, rEl: 0.2, ...extra }),
  });
  const salute = {
    rHand: { p: [-0.11, 0.07, 0.11, 'head'], pole: [-0.6, 0.35, 0.15, 'chest'] },
  };
  const saluting = (x) => (u, lt, d, t) => ({ pos: [x, 0, 0.2], yaw: -PI, pose: breathe(pose({ nod: -0.25, lean: -0.05, lArm: 0, lOut: 0.05, lEl: 0.05 }), t, 0.3), ik: salute, ground: 0 });

  // Aiming: right fist at the cheek, left hand out along the line to the target.
  const aim = new THREE.Vector3();
  const shoot = (u, lt, dd, t) => {
    const kick = SHOTS.reduce((a, s) => a + (lt >= s ? Math.exp(-(lt - s) * 22) : 0), 0);
    const grip = [-0.07, 0.42, 0.2 - 0.05 * kick, 'chest'];
    const support = (fig, out) => {
      fig.toWorld(grip, out);
      return out.add(aim.copy(TARGET).sub(out).setLength(0.34));
    };
    return {
      pos: [SHOOT.x, STAND_HIP, SHOOT.z],
      yaw: PI / 2,
      pose: breathe(pose({ lean: 0.08 - 0.05 * kick, nod: 0.18, lLeg: 0.25, rLeg: -0.15, lKnee: 0.15, rKnee: 0.05 }), t, 0.3),
      ik: { lHand: { p: support, pole: [0.25, -0.5, 0.15, 'chest'] }, rHand: { p: grip, pole: [-0.5, -0.1, -0.1, 'chest'] } },
      ground: 0,
    };
  };

  // Hand over hand up the rope, ring the bell, slide back down.
  const LOW = STAND_HIP + 0.04;
  const HIGH = ROPE.top - 1.3;
  const climb = (u, lt) => {
    const up = smooth((lt - CLIMB.up[0]) / (CLIMB.up[1] - CLIMB.up[0]));
    const down = smooth((lt - CLIMB.bell[1]) / (CLIMB.down - CLIMB.bell[1]));
    const y = lt < CLIMB.bell[1] ? lerp(LOW, HIGH, up) : lerp(HIGH, LOW, down);
    const swing = lt < CLIMB.up[1] ? Math.sin(up * 4 * PI) : 0;
    const grip = (k) => Math.min(y + 1.02 + 0.13 * k, ROPE.top - 0.12);
    const ring = smoothstep(CLIMB.bell[0], CLIMB.bell[0] + 0.08, lt) * (1 - smoothstep(CLIMB.bell[1] - 0.07, CLIMB.bell[1], lt));
    const legs = smoothstep(LOW, LOW + 0.35, y);
    return {
      pos: [ROPE.x, y, ROPE.z + 0.19],
      yaw: PI,
      pose: pose({ nod: -0.35, lean: 0.05, lLeg: legs * (0.55 + 0.25 * swing), rLeg: legs * (0.55 - 0.25 * swing), lKnee: legs * (1.1 - 0.3 * swing), rKnee: legs * (1.1 + 0.3 * swing) }),
      ik: {
        lHand: { p: [ROPE.x - 0.015, grip(swing), ROPE.z, 'world'], pole: [0.5, -0.2, 0.1, 'chest'] },
        rHand: {
          p: (fig, out) => out.set(ROPE.x + 0.015, grip(-swing), ROPE.z).lerp(BELL, ring),
          pole: [-0.5, -0.2, 0.1, 'chest'],
        },
      },
    };
  };

  // Push-ups on the floor in front of a bed; side -1 is the left half, facing right.
  const pushups = (side) => (u, lt) => {
    const bob = 0.5 + 0.5 * Math.cos(lt * 2 * PI * 1.8);
    const px = side * 1.35;
    const hx = px - side * 0.62;
    return {
      pos: [px, 0.3 + 0.16 * bob, 0.65],
      yaw: -side * PI / 2,
      pitch: 1.33,
      pose: pose({ nod: -0.5, lLeg: 0, rLeg: 0, lKnee: 0, rKnee: 0, lAnk: 1.1, rAnk: 1.1 }),
      ik: {
        lHand: { p: [hx, 0.02, 0.65 + side * 0.15, 'world'], pole: [0.4, 0.2, -0.3, 'chest'] },
        rHand: { p: [hx, 0.02, 0.65 - side * 0.15, 'world'], pole: [-0.4, 0.2, -0.3, 'chest'] },
      },
    };
  };
  const TRAINING = { shoot, climb, pushups: pushups(1) };

  // ASKERLİK YAPAN: salute every morning, then the day's training, the full term.
  const RX = 1.45;
  const rClips = [{ name: 'bed', d: FIRST + 0.05, fn: () => lying(1) }];
  for (let d = 0; d < DAYS; d++) {
    rClips.push({ name: `salute${d}`, d: SALUTE - (d === 0 ? 0.05 : 0), blend: d === 0 ? 0.35 : 0.3, fn: saluting(RX) });
    const act = ACTIVITIES[d];
    rClips.push({ name: `${act}${d}`, d: TRAIN, blend: 0.3, fn: TRAINING[act] });
  }
  rClips.push({ name: 'ready', d: 0.6, blend: 0.3, fn: stand({ x: RX, z: 0.2, yaw: 0, ground: 0, pose: { nod: -0.1, lean: -0.05 } }) });
  rClips.push({ name: 'finalSalute', d: 8, blend: 0.4, fn: saluting(RX - 0.25) });
  const rTrack = new Track(R, rClips);
  const clipOf = (name) => rTrack.clips.find((c) => c.name === name);
  const shootClip = clipOf('shoot0');
  const climbClip = clipOf('climb1');
  const shotAt = SHOTS.map((s) => shootClip.t0 + s);
  const bellAt = climbClip.t0 + CLIMB.bell[0] + 0.08;

  // BEDELLİ YAPAN: salutes, pays, a few push-ups, and is gone the next morning.
  const LX = -1.3;
  const PAY_Z = 0.6;
  const EXIT_X = -4.2;
  const holdOut = { lHand: { p: [0.07, 0.32, 0.36, 'chest'] }, rHand: { p: [-0.07, 0.32, 0.36, 'chest'] } };
  const lClips = [
    { name: 'bed', d: FIRST + 0.05, fn: () => lying(-1) },
    { name: 'salute', d: SALUTE - 0.05, blend: 0.35, fn: saluting(-RX) },
    {
      name: 'pay',
      d: PAY,
      blend: 0.3,
      fn: (u, lt, d, t) => ({ pos: [LX, 0, PAY_Z], yaw: 0, pose: breathe(pose({ nod: 0.25, lean: 0.08 }), t, 0.4), ik: holdOut, ground: 0 }),
    },
    { name: 'pushups', d: TRAIN - PAY, blend: 0.3, fn: pushups(-1) },
    { name: 'grab', d: 0.35, blend: 0.3, fn: stand({ x: LX, z: PAY_Z, yaw: -PI / 2, ground: 0, pose: { nod: -0.1, rArm: 0.05, rOut: 0.3, rEl: 0.1 } }) },
    { name: 'leave', d: 1.7, fn: walkTo({ from: [LX, PAY_Z], to: [EXIT_X, PAY_Z], yaw: -PI / 2, ground: 0, amp: 0.36, opts: { rArm: 0.05, rOut: 0.3, rEl: 0.1, lean: 0.08 } }) },
    { name: 'gone', d: 20, fn: stand({ x: EXIT_X - 2, z: PAY_Z, yaw: -PI / 2, ground: 0 }) },
  ];
  const lTrack = new Track(L, lClips);
  const payAt = lTrack.at('pay');
  const paidAt = payAt + 0.6;
  const leaveAt = lTrack.at('grab');

  // ---- counters, text, sounds ------------------------------------------------------------------
  const safakAt = (t) => {
    if (t < FIRST) return TERM;
    if (t < END) return Math.round(lerp(TERM, 10, (t - FIRST) / (END - FIRST)));
    return Math.max(0, Math.round(lerp(10, 0, (t - END) / 0.5)));
  };
  const counterStyle = { fontSize: '50px', textShadow: '0 0 24px rgba(227, 10, 23, 0.55)' };
  const rCounter = world.addLabel(`ŞAFAK ${TERM}`, [1.6, 5.55, 0], { t1: END + 1.7 });
  Object.assign(rCounter.el.style, counterStyle, { color: RED });
  const lCounter = world.addLabel('BEDEL ÖDENDİ', [-1.6, 5.55, 0], { t0: paidAt, t1: leaveAt + 2.0 });
  Object.assign(lCounter.el.style, counterStyle, { color: GOLD, textShadow: '0 0 24px rgba(232, 193, 90, 0.5)' });
  for (const [text, x] of [['BEDELLİ YAPAN', -1.6], ['ASKERLİK YAPAN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '34px', letterSpacing: '0.08em' });
  }
  world.addThought('bedelimi ödedim', L, payAt + 0.2, payAt + 1.5);
  world.addThought('kolay gelsin!', L, leaveAt + 0.1, leaveAt + 1.4);
  world.addThought('vatan sağ olsun!', R, END + 0.7, END + 1.8);
  world.setCaption('Bedel parayla ödenir,\nvatan borcu alın teriyle.', END + 1.8, { top: 470 });

  const sfx = [];
  for (let d = 0; d < DAYS; d++) sfx.push({ t: dayAt(d), type: 'bugle', gain: 0.9 });
  sfx.push({ t: paidAt, type: 'register', gain: 1 });
  sfx.push({ t: leaveAt + 0.05, type: 'rustle', gain: 1 });
  for (const t of shotAt) sfx.push({ t, type: 'shot', gain: 0.9 });
  for (const k of [0.3, 0.55, 0.8]) sfx.push({ t: climbClip.t0 + k, type: 'rustle', gain: 0.8 });
  sfx.push({ t: bellAt, type: 'chime', gain: 0.8 });
  sfx.push({ t: climbClip.t0 + CLIMB.down - 0.05, type: 'step', gain: 2 });
  sfx.push({ t: END + 0.45, type: 'bugle', gain: 1 });
  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  const glints = (at, t0, seed, n = 10) => {
    const r = mulberry32(seed);
    const parts = Array.from({ length: n }, () => ({ x: at.x, y: at.y, z: at.z + 0.1, vx: (r() - 0.5) * 1.4, vy: 0.4 + r() * 1.2, vz: r() * 0.5, delay: 0, r: 0.012 + r() * 0.012 }));
    world.addBurst('glints', { t0, parts, life: 0.6, gravity: 2 });
  };
  shotAt.forEach((t, i) => glints(TARGET, t + 0.03, 40 + i, 6));
  glints(BELL, bellAt, 50, 14);
  glints(new THREE.Vector3(LX, 1.35, PAY_Z + 0.4), paidAt, 60, 12);

  // ---- per frame -----------------------------------------------------------------------------------
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  // Gear pops up for its day and folds away after.
  const showFor = (obj, t0, t1, t) => {
    const k = smoothstep(t0, t0 + 0.25, t) * (1 - smoothstep(t1 - 0.25, t1, t));
    obj.visible = k > 0;
    obj.scale.set(1, Math.max(k, 0.001), 1);
  };
  world.onUpdate((t) => {
    rTrack.apply(t);
    lTrack.apply(t);
    rCounter.el.textContent = t >= END + 0.55 ? 'TEZKERE!' : `ŞAFAK ${safakAt(t)}`;
    lCounter.el.textContent = t >= leaveAt ? 'TEZKERE!' : 'BEDEL ÖDENDİ';

    // Flag waves; the light on it swells at the final salute.
    const pos = flagGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = flagBase[i * 3] + FLAG_W / 2;
      pos.setZ(i, Math.sin(bx * 3.2 - t * 3.2) * 0.06 * (bx / FLAG_W) + Math.sin(flagBase[i * 3 + 1] * 2 + t * 1.7) * 0.015 * (bx / FLAG_W));
    }
    pos.needsUpdate = true;
    flagGeo.computeVertexNormals();
    const glory = smoothstep(END + 0.4, END + 1.6, t);
    spot.intensity = 14 + 14 * glory;
    flagMat.emissiveIntensity = 0.04 + 0.06 * glory;

    showFor(targetStand, shootClip.t0 - 0.3, shootClip.t1 + 0.4, t);
    showFor(ropeRig, climbClip.t0 - 0.3, climbClip.t1 + 0.4, t);
    drawTarget(shotAt.filter((s) => t >= s + 0.02).length);
    bell.rotation.z = t > bellAt ? 0.35 * Math.sin((t - bellAt) * 22) * Math.exp(-(t - bellAt) * 3) : 0;

    // Rifle in hand while shooting, with a muzzle flash on every shot.
    rifle.visible = t > shootClip.t0 + 0.15 && t < shootClip.t1 - 0.12;
    if (rifle.visible) {
      rifle.position.copy(R.handWorld('r', v1));
      rifle.lookAt(R.handWorld('l', v2));
    }
    const since = Math.min(...shotAt.map((s) => (t >= s ? t - s : Infinity)));
    const f = since < 0.07 ? 1 - since / 0.07 : 0;
    flash.visible = rifle.visible && f > 0;
    flash.scale.setScalar(0.6 + f);
    flashLight.intensity = rifle.visible ? 8 * f : 0;

    // The fee is held out, then handed over and gone.
    const hand = smoothstep(payAt + 0.15, payAt + 0.3, t) * (1 - smoothstep(paidAt - 0.05, paidAt + 0.1, t));
    cash.visible = hand > 0;
    if (cash.visible) {
      cash.position.copy(L.handWorld('l', v1)).add(L.handWorld('r', v2)).multiplyScalar(0.5).add(v2.set(0, 0.05, 0));
      cash.scale.setScalar(Math.max(hand, 0.001));
    }

    // Kit bag hangs from his right hand on the way out.
    bag.visible = t > leaveAt + 0.15;
    if (bag.visible) bag.position.copy(L.handWorld('r', v1)).add(v2.set(0, -0.14, 0));
  });

  const markers = Object.fromEntries([...rTrack.clips.map((c) => ['R.' + c.name, +c.t0.toFixed(2)]), ...lTrack.clips.map((c) => ['L.' + c.name, +c.t0.toFixed(2)]), ['END', +END.toFixed(2)]]);
  return { duration: END + 3.6, sfx, markers };
}
