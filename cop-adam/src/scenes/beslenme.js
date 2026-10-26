// FAST FOOD YİYEN vs EVDE YEMEK YAPAN
// Three meals. One orders from the couch: a paper bag drops in, he eats a
// burger and slumps a bit lower each time. The other chops vegetables, stirs
// the pot and eats a plate of salad, and gets livelier each time. Energy
// meters over both. At the end one does jumping jacks, the other can't get
// off the couch and reaches for the phone again. No brands anywhere.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, walkTo } from '../moves.js';
import { PI, lerp, clamp, smooth, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const MEALS = 3;
const MEAL = 3.0;
const FIRST = 0.3;
const mealAt = (r) => FIRST + r * MEAL;
const END = mealAt(MEALS);
const START_ENERGY = 70;

const COUCH = { x: -1.85, z: -0.45, seat: 0.42 };
// Kitchen island; the cook stands behind it facing the camera, like a cooking show.
const ISLAND = { x: 1.9, z: 0.1, w: 2.2, d: 0.6, h: 0.9 };
const BOARD = new THREE.Vector3(1.45, ISLAND.h + 0.02, 0.02);
const POT = new THREE.Vector3(2.45, ISLAND.h, 0.02);
const PLATE = new THREE.Vector3(1.95, ISLAND.h + 0.02, 0.14);
const BEHIND = -0.5;
// Clip-local times inside a meal.
const L_PHONE = 0.9;
const L_EAT = 1.4;
const L_SLUMP = MEAL - L_PHONE - L_EAT;
const R_CLIPS = [['chop', 1.0], ['toPot', 0.2], ['stir', 0.7], ['toPlate', 0.2], ['eat', 0.6], ['cheer', 0.3]];
const CHOPS = [0.26, 0.48, 0.7, 0.92];
const BAGS = [
  [-0.95, 0.16, 0.55, 0.2],
  [-0.68, 0.16, 0.82, -0.3],
  [-0.84, 0.48, 0.64, 0.1],
];
const WRAPS = [
  [-2.75, 0.06, 0.6],
  [-2.5, 0.06, 0.88],
  [-2.95, 0.06, 0.95],
];

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.2, swell: 0.08 });
  world.key.intensity = 1.8;

  const box = (m, w, h, d, x, y, z, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const ball = (m, r, x, y, z, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

  // ---- room --------------------------------------------------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), std(0x26241f, { roughness: 0.95 }));
  wall.position.set(0, 3.25, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);
  // Window between the two halves: a soft square of daylight.
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ color: 0x55667a }));
  win.position.set(0, 3.4, WALL_Z + 0.01);
  scene.add(win);
  const frameMat = std(0xd8d2c4);
  box(frameMat, 1.62, 0.06, 0.05, 0, 4.15, WALL_Z + 0.03);
  box(frameMat, 1.62, 0.06, 0.05, 0, 2.65, WALL_Z + 0.03);
  for (const x of [-0.78, 0, 0.78]) box(frameMat, 0.06, 1.56, 0.05, x, 3.4, WALL_Z + 0.03);
  box(frameMat, 1.56, 0.04, 0.05, 0, 3.4, WALL_Z + 0.03);
  const spotL = new THREE.SpotLight(0xffe2c0, 6, 12, 0.5, 0.7, 1.2);
  spotL.position.set(-1.9, 6.5, 3.5);
  spotL.target.position.set(-1.9, 0.5, -0.2);
  const spotR = new THREE.SpotLight(0xfff6e6, 10, 12, 0.5, 0.7, 1.2);
  spotR.position.set(1.9, 6.5, 3.5);
  spotR.target.position.set(1.9, 0.8, 0);
  scene.add(spotL, spotL.target, spotR, spotR.target);

  // ---- left: couch, phone, takeaway ---------------------------------------------------------------
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

  const paper = std(0xa57a4a, { roughness: 0.9 });
  const bags = BAGS.map(() => {
    const g = new THREE.Group();
    box(paper, 0.26, 0.3, 0.18, 0, -0.01, 0, g);
    box(std(0x8e683e, { roughness: 0.9 }), 0.27, 0.04, 0.19, 0, 0.15, 0, g);
    scene.add(g);
    return g;
  });
  const wrapMat = std(0xe8d9a8, { roughness: 0.95 });
  const wraps = WRAPS.map(() => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), wrapMat);
    m.castShadow = true;
    scene.add(m);
    return m;
  });
  // Burger: buns, patty, a bit of lettuce.
  const burger = new THREE.Group();
  const bun = std(0xd59a4a, { roughness: 0.7 });
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 8, 0, PI * 2, 0, PI / 2), bun);
  top.scale.y = 0.75;
  top.position.y = 0.035;
  burger.add(top);
  box(std(0x5b8f3a), 0.15, 0.012, 0.15, 0, 0.03, 0, burger).rotation.y = 0.4;
  const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.03, 16), std(0x4a2a1a, { roughness: 0.8 }));
  patty.position.y = 0.012;
  burger.add(patty);
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.07, 0.03, 16), bun);
  bottom.position.y = -0.016;
  burger.add(bottom);
  scene.add(burger);

  // ---- right: kitchen island ------------------------------------------------------------------------
  const counterMat = std(0xe9e4da, { roughness: 0.5 });
  box(std(0x4e5a47, { roughness: 0.8 }), ISLAND.w, ISLAND.h - 0.04, ISLAND.d, ISLAND.x, (ISLAND.h - 0.04) / 2, ISLAND.z);
  box(counterMat, ISLAND.w + 0.06, 0.04, ISLAND.d + 0.06, ISLAND.x, ISLAND.h - 0.02, ISLAND.z);
  box(std(0xb98d5a, { roughness: 0.8 }), 0.42, 0.025, 0.28, BOARD.x, BOARD.y - 0.008, BOARD.z);
  const burnerMat = std(0x1d1f22, { roughness: 0.4 });
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.01, 24), burnerMat);
  burner.position.set(POT.x, ISLAND.h + 0.005, POT.z);
  scene.add(burner);
  const steel = std(0xb8bcc2, { metalness: 0.7, roughness: 0.3 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.2, 24, 1, true), steel);
  pot.material.side = THREE.DoubleSide;
  pot.position.set(POT.x, POT.y + 0.11, POT.z);
  pot.castShadow = true;
  scene.add(pot);
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), std(0xd2722e, { roughness: 0.4, emissive: 0x2a0e02 }));
  soup.rotation.x = -PI / 2;
  soup.position.set(POT.x, POT.y + 0.17, POT.z);
  scene.add(soup);
  for (const s of [-1, 1]) box(steel, 0.08, 0.02, 0.03, POT.x + s * 0.19, POT.y + 0.18, POT.z);

  // Whole vegetables on the board, and the chopped pieces that pile up.
  const veg = [std(0xd8342a, { roughness: 0.4 }), std(0xf08a24, { roughness: 0.5 }), std(0x5aa83a, { roughness: 0.6 })];
  ball(veg[0], 0.055, BOARD.x + 0.13, BOARD.y + 0.06, BOARD.z - 0.06);
  const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 10), veg[1]);
  carrot.rotation.z = PI / 2;
  carrot.position.set(BOARD.x + 0.02, BOARD.y + 0.035, BOARD.z + 0.08);
  scene.add(carrot);
  const rand = mulberry32(3);
  const pieces = Array.from({ length: 9 }, (_, i) => {
    const m = box(veg[i % 3], 0.035, 0.03, 0.035, BOARD.x - 0.12 + (rand() - 0.5) * 0.12, BOARD.y + 0.03, BOARD.z + (rand() - 0.5) * 0.14);
    m.rotation.y = rand() * PI;
    return m;
  });
  // Plate of salad.
  const plate = new THREE.Group();
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.03, 28), std(0xf4f2ec, { roughness: 0.3 }));
  plate.add(dish);
  for (let i = 0; i < 10; i++) ball(veg[i % 3], 0.03, (rand() - 0.5) * 0.18, 0.035, (rand() - 0.5) * 0.18, plate);
  plate.position.copy(PLATE);
  scene.add(plate);
  // Knife, ladle, fork: placed in the hand each frame.
  const knife = new THREE.Group();
  box(std(0x2a2a2a), 0.025, 0.03, 0.09, 0, 0, -0.03, knife);
  box(steel, 0.008, 0.045, 0.17, 0, -0.005, 0.1, knife);
  scene.add(knife);
  const ladle = new THREE.Group();
  box(steel, 0.015, 0.34, 0.015, 0, -0.17, 0, ladle);
  ball(steel, 0.04, 0, -0.34, 0, ladle);
  scene.add(ladle);
  const fork = new THREE.Group();
  box(steel, 0.012, 0.012, 0.16, 0, 0, 0.04, fork);
  scene.add(fork);

  // ---- figures ------------------------------------------------------------------------------
  const L = new StickFigure(mat.figure); // fast food yiyen
  const R = new StickFigure(mat.figure); // evde yemek yapan
  scene.add(L.root, R.root);
  const head = new THREE.Vector3();

  // A bite: the hand travels from `rest` to the mouth and back `n` times in the clip.
  const bite = (lt, d, n) => 0.5 - 0.5 * Math.cos(clamp(lt / d) * n * 2 * PI);
  const toMouth = (rest, k) => (fig, out) => {
    fig.toWorld([0, -0.08, 0.17, 'head'], head);
    return out.copy(rest).lerp(head, k);
  };

  // Right: chop, stir, plate, eat, a little cheer; three times. Then out front for jumping jacks.
  // Pelvis at standing height before IK, so hand targets are solved from where the shoulders really are.
  const behind = (x, extra = {}) => ({ pos: [x, STAND_HIP, BEHIND], yaw: 0, ground: 0, ...extra });
  const rFns = {
    chop: (u, lt, d, t) => {
      const lift = 0.5 + 0.5 * Math.cos((2 * PI * (lt - 0.15)) / 0.22);
      return behind(BOARD.x, {
        pose: breathe(pose({ lean: 0.3, nod: 0.6 }), t, 0.3),
        ik: { rHand: { p: [BOARD.x - 0.08, BOARD.y + 0.06 + 0.13 * lift, BOARD.z + 0.02, 'world'] }, lHand: { p: [BOARD.x + 0.12, BOARD.y + 0.05, BOARD.z + 0.04, 'world'] } },
      });
    },
    stir: (u, lt, d, t) => {
      const w = lt * 9;
      return behind(POT.x, {
        pose: breathe(pose({ lean: 0.25, nod: 0.5 }), t, 0.3),
        ik: { rHand: { p: [POT.x - 0.02 + 0.07 * Math.cos(w), POT.y + 0.36, POT.z + 0.07 * Math.sin(w), 'world'] }, lHand: { p: [POT.x + 0.3, ISLAND.h + 0.04, POT.z + 0.08, 'world'] } },
      });
    },
    eat: (u, lt, d, t) => {
      const rest = PLATE.clone().add(new THREE.Vector3(-0.03, 0.07, 0));
      return behind(PLATE.x, {
        pose: breathe(pose({ lean: 0.18, nod: 0.25 }), t, 0.3),
        ik: { rHand: { p: toMouth(rest, bite(lt, d, 2)) }, lHand: { p: [PLATE.x + 0.22, ISLAND.h + 0.04, PLATE.z, 'world'] } },
      });
    },
    cheer: (u, lt, d, t) => {
      const k = Math.sin(clamp(lt / d) * PI);
      return { ...behind(PLATE.x), pose: pose({ lean: -0.1, nod: -0.2, lArm: 0.3, rArm: 0.3, lOut: 0.4 + 2.2 * k, rOut: 0.4 + 2.2 * k, lEl: 0.3, rEl: 0.3 }), lift: 0.12 * k };
    },
  };
  const rClips = [{ name: 'start', d: FIRST, fn: stand({ x: BOARD.x, z: BEHIND, yaw: 0, ground: 0, pose: { nod: 0.2 } }) }];
  for (let r = 0; r < MEALS; r++) {
    for (const [name, d] of R_CLIPS) {
      let fn = rFns[name];
      if (name === 'toPot') fn = walkTo({ from: [BOARD.x, BEHIND], to: [POT.x, BEHIND], yaw: PI / 2, ground: 0, amp: 0.4 });
      if (name === 'toPlate') fn = walkTo({ from: [POT.x, BEHIND], to: [PLATE.x, BEHIND], yaw: -PI / 2, ground: 0, amp: 0.4 });
      rClips.push({ name: `${name}${r}`, d, blend: name === 'chop' ? 0.3 : 0.15, fn });
    }
  }
  const FRONT = [1.25, 0.95];
  rClips.push(
    { name: 'out1', d: 0.5, blend: 0.2, fn: walkTo({ from: [PLATE.x, BEHIND], to: [0.55, BEHIND], yaw: -PI / 2, ground: 0, amp: 0.45 }) },
    { name: 'out2', d: 0.45, fn: walkTo({ from: [0.55, BEHIND], to: [0.55, FRONT[1]], yaw: 0, ground: 0, amp: 0.45 }) },
    { name: 'out3', d: 0.3, fn: walkTo({ from: [0.55, FRONT[1]], to: FRONT, yaw: PI / 2, ground: 0, amp: 0.45 }) },
    {
      name: 'jacks',
      d: 10,
      blend: 0.25,
      fn: (u, lt) => {
        const o = 0.5 - 0.5 * Math.cos(lt * 2 * PI * 1.6);
        return { pos: [FRONT[0], 0, FRONT[1]], yaw: 0, pose: pose({ nod: -0.05, lean: 0, lArm: 0.1, rArm: 0.1, lOut: 0.15 + 2.6 * o, rOut: 0.15 + 2.6 * o, lEl: 0.1, rEl: 0.1, lLegOut: 0.03 + 0.32 * o, rLegOut: 0.03 + 0.32 * o }), ground: 0, lift: 0.1 * Math.sin(o * PI) };
      },
    },
  );
  const rTrack = new Track(R, rClips);

  // Left: phone, eat, slump; three times. Then a failed attempt to get up.
  const sitY = COUCH.seat + DIM.limbR * 1.2;
  const sitPos = [COUCH.x, sitY, COUCH.z + 0.12];
  const legs = { lLeg: PI / 2 - 0.1, rLeg: PI / 2 - 0.15, lKnee: PI / 2, rKnee: PI / 2 - 0.1 };
  const phoneHands = { lHand: { p: [0.045, 0.27, 0.32, 'chest'] }, rHand: { p: [-0.045, 0.27, 0.32, 'chest'] } };
  // Slumps a little deeper after every meal.
  const slumpOf = (t) => [0, 1, 2].reduce((a, r) => a + smoothstep(mealAt(r) + L_PHONE + L_EAT, mealAt(r) + MEAL - 0.1, t), 0) / MEALS;
  const sitting = (t, extra = {}) => breathe(pose({ lean: -0.08 - 0.25 * slumpOf(t), nod: 0.5 - 0.3 * slumpOf(t), ...legs, ...extra }), t, 0.5);
  const lFns = {
    phone: (u, lt, d, t) => ({ pos: sitPos, yaw: 0, pose: sitting(t), ik: phoneHands }),
    eat: (u, lt, d, t) => ({
      pos: sitPos,
      yaw: 0,
      pose: sitting(t, { nod: 0.15 }),
      ik: { rHand: { p: (fig, out) => toMouth(fig.toWorld([-0.09, 0.2, 0.3, 'chest'], out).clone(), bite(lt, d, 3))(fig, out) }, lHand: { p: [0.12, 0.05, 0.25, 'chest'] } },
    }),
    slump: (u, lt, d, t) => ({ pos: sitPos, yaw: 0, pose: sitting(t, { nod: -0.15, lArm: 0.15, rArm: 0.15, lOut: 0.45, rOut: 0.45, lEl: 0.25, rEl: 0.25 }) }),
  };
  const lClips = [{ name: 'start', d: FIRST, fn: lFns.phone }];
  for (let r = 0; r < MEALS; r++) {
    lClips.push({ name: `phone${r}`, d: L_PHONE, blend: 0.3, fn: lFns.phone });
    lClips.push({ name: `eat${r}`, d: L_EAT, blend: 0.25, fn: lFns.eat });
    lClips.push({ name: `slump${r}`, d: L_SLUMP, blend: 0.3, fn: lFns.slump });
  }
  lClips.push(
    { name: 'rest', d: 0.3, fn: lFns.slump },
    {
      name: 'tryUp',
      d: 1.1,
      blend: 0.2,
      fn: (u, lt, d, t) => {
        const k = Math.sin(clamp(lt / 0.9) * PI);
        return {
          pos: [COUCH.x, sitY + 0.32 * k, COUCH.z + 0.12 + 0.12 * k],
          yaw: 0,
          pose: breathe(pose({ lean: 0.1 + 0.55 * k, nod: 0.3, lLeg: lerp(legs.lLeg, 0.9, k), rLeg: lerp(legs.rLeg, 0.9, k), lKnee: lerp(legs.lKnee, 1.2, k), rKnee: lerp(legs.rKnee, 1.2, k) }), t, 0.5),
          ik: { lHand: { p: [COUCH.x + 0.42, COUCH.seat + 0.03, COUCH.z + 0.1, 'world'] }, rHand: { p: [COUCH.x - 0.42, COUCH.seat + 0.03, COUCH.z + 0.1, 'world'] } },
        };
      },
    },
    { name: 'flop', d: 0.6, blend: 0.15, fn: lFns.slump },
    { name: 'phoneAgain', d: 10, blend: 0.4, fn: lFns.phone },
  );
  const lTrack = new Track(L, lClips);

  // ---- text ------------------------------------------------------------------------------------
  for (const [text, x] of [['FAST FOOD YİYEN', -1.6], ['EVDE YEMEK YAPAN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '34px', letterSpacing: '0.06em' });
  }
  const meter = (x) => {
    const l = world.addLabel('', [x, 5.55, 0]);
    Object.assign(l.el.style, { fontSize: '46px' });
    return l;
  };
  const lMeter = meter(-1.6);
  const rMeter = meter(1.6);
  const mealsDone = (t, at) => [0, 1, 2].reduce((a, r) => a + smoothstep(mealAt(r) + at, mealAt(r) + at + 0.5, t), 0);
  const lEnergy = (t) => START_ENERGY - 15 * mealsDone(t, L_PHONE + L_EAT) - 10 * smoothstep(lTrack.at('tryUp'), lTrack.at('flop'), t);
  const rEnergy = (t) => START_ENERGY + 10 * mealsDone(t, MEAL - 0.4);
  world.addThought('yemek yapmaya kim uğraşacak?', L, 0.5, 1.9);
  world.addThought('çok pratik ya...', L, mealAt(1) + 0.3, mealAt(1) + 1.6);
  world.addThought('neden hep yorgunum?', L, mealAt(2) + L_PHONE + L_EAT, END + 0.2);
  world.addThought('of... kalkamıyorum', L, lTrack.at('tryUp') + 0.3, lTrack.at('phoneAgain') + 0.2);
  world.addThought('bir tane daha mı söylesem?', L, lTrack.at('phoneAgain') + 0.3, 13.6);
  world.setCaption('Az ye, öz ye.\nSağlık mutfakta başlar.', 12.0, { top: 470 });

  // ---- sounds and particles ------------------------------------------------------------------------
  const sfx = [];
  const BAG_FALL = Math.sqrt(5.8 / 7);
  for (let r = 0; r < MEALS; r++) {
    const m = mealAt(r);
    const rc = (name) => rTrack.at(`${name}${r}`);
    sfx.push({ t: m + 0.25, type: 'click', gain: 0.8 });
    sfx.push({ t: m + BAG_FALL, type: 'rustle', gain: 1.1 }, { t: m + BAG_FALL, type: 'step', gain: 2 });
    sfx.push({ t: m + L_PHONE + L_EAT + 0.15, type: 'rustle', gain: 0.8 });
    for (const c of CHOPS) sfx.push({ t: rc('chop') + c, type: 'chop', gain: 0.45 });
    sfx.push({ t: rc('stir'), type: 'whoosh', gain: 0.5 });
    sfx.push({ t: rc('eat'), type: 'clink', gain: 0.8 });
    sfx.push({ t: rc('cheer') + 0.1, type: 'tick', gain: 2 });
  }
  for (let k = 0; k < 6; k++) sfx.push({ t: rTrack.at('jacks') + 0.31 + k / 1.6, type: 'step', gain: 1.6 });
  sfx.push({ t: 12.0, type: 'chime', gain: 0.6 });

  world.makeParticles('steam', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xdfe3e8, transparent: true, opacity: 0.35, depthWrite: false }));
  for (let t = 0.2; t < 9.3; t += 0.12) {
    const parts = Array.from({ length: 3 }, () => ({ x: POT.x + (rand() - 0.5) * 0.18, y: POT.y + 0.2, z: POT.z + (rand() - 0.5) * 0.18, vx: (rand() - 0.5) * 0.15, vy: 0.35 + rand() * 0.25, vz: (rand() - 0.5) * 0.1, delay: 0, r: 0.03 + rand() * 0.03 }));
    world.addBurst('steam', { t0: t, parts, life: 1.3, gravity: -0.15 });
  }
  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  for (let r = 0; r < MEALS; r++) {
    const r2 = mulberry32(90 + r);
    const t0 = rTrack.at(`cheer${r}`) + 0.1;
    const parts = Array.from({ length: 12 }, () => ({ x: PLATE.x, y: 2.1, z: BEHIND + 0.2, vx: (r2() - 0.5) * 1.6, vy: 0.4 + r2() * 1.2, vz: r2() * 0.5, delay: 0, r: 0.012 + r2() * 0.012 }));
    world.addBurst('glints', { t0, parts, life: 0.6, gravity: 2 });
  }

  // ---- per frame -------------------------------------------------------------------------------------
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const inClip = (track, prefix, t) => track.clips.find((c) => c.name.startsWith(prefix) && /\d$/.test(c.name) && t >= c.t0 && t < c.t1);
  world.onUpdate((t) => {
    rTrack.apply(t);
    lTrack.apply(t);

    const le = lEnergy(t);
    const re = rEnergy(t);
    lMeter.el.textContent = `ENERJİ %${Math.round(le)}`;
    lMeter.el.style.color = le < 40 ? '#ff5a4a' : '#f2c14e';
    rMeter.el.textContent = `ENERJİ %${Math.round(re)}`;
    rMeter.el.style.color = '#7ddc7d';
    spotR.intensity = 10 + 6 * smoothstep(0, END, t);

    // Phone between his hands whenever he isn't eating.
    const eating = inClip(lTrack, 'eat', t);
    const onPhone = inClip(lTrack, 'phone', t) || t < FIRST || t >= lTrack.at('phoneAgain') + 0.2;
    phone.visible = !!onPhone;
    if (onPhone) {
      phone.position.copy(L.handWorld('l', v1)).add(L.handWorld('r', v2)).multiplyScalar(0.5).add(v2.set(0, 0.06, 0));
      phone.lookAt(L.headWorld(v1));
    }
    burger.visible = !!eating && t > eating.t0 + 0.15;
    if (burger.visible) {
      burger.position.copy(L.handWorld('r', v1)).add(v2.set(0, 0.05, 0));
      burger.rotation.set(0, 0, 0.3);
    }

    // Bags drop in at the start of every meal; wrappers get tossed after it.
    bags.forEach((g, r) => {
      const [x, y, z, ry] = BAGS[r];
      const dt = t - mealAt(r);
      g.visible = dt >= 0;
      g.position.set(x, Math.max(y, 6 - 7 * dt * dt), z);
      g.rotation.set(0, ry, 0);
    });
    wraps.forEach((m, r) => {
      const t0 = mealAt(r) + L_PHONE + L_EAT + 0.15;
      const u = clamp((t - t0) / 0.45);
      m.visible = t >= t0;
      if (!m.visible) return;
      const from = v1.set(COUCH.x - 0.25, 1.2, COUCH.z + 0.4);
      const to = v2.set(...WRAPS[r]);
      m.position.lerpVectors(from, to, u).setY(lerp(from.y, to.y, u) + 0.6 * 4 * u * (1 - u));
      m.rotation.set(u * 6, u * 4, 0);
    });

    // Kitchen: chopped pieces build up while chopping and go into the pot.
    const chop = inClip(rTrack, 'chop', t);
    const n = chop ? Math.floor(clamp((t - chop.t0 - 0.2) / 0.8) * pieces.length) : 0;
    pieces.forEach((p, i) => (p.visible = i < n));
    knife.visible = !!chop;
    if (chop) {
      knife.position.copy(R.handWorld('r', v1));
      knife.rotation.set(0.9, 0, 0);
    }
    const stir = inClip(rTrack, 'stir', t);
    ladle.visible = !!stir;
    if (stir) ladle.position.copy(R.handWorld('r', v1));
    const eat = inClip(rTrack, 'eat', t);
    const plateK = [0, 1, 2].reduce((a, r) => Math.max(a, smoothstep(rTrack.at(`toPlate${r}`), rTrack.at(`eat${r}`), t) * (1 - smoothstep(rTrack.at(`cheer${r}`) + 0.2, rTrack.at(`cheer${r}`) + 0.4, t))), 0);
    plate.visible = plateK > 0;
    plate.scale.setScalar(Math.max(plateK, 0.001));
    fork.visible = !!eat;
    if (eat) {
      fork.position.copy(R.handWorld('r', v1));
      fork.lookAt(R.headWorld(v2));
    }
  });

  const markers = Object.fromEntries([...rTrack.clips.map((c) => ['R.' + c.name, +c.t0.toFixed(2)]), ...lTrack.clips.map((c) => ['L.' + c.name, +c.t0.toFixed(2)])]);
  return { duration: 14.0, sfx, markers };
}
