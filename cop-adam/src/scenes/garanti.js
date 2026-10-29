// GARANTİCİ vs RİSKÇİ
// The same bag of money drops into both pairs of hands. On the left, it goes
// into a safe; he locks it, sits on top and dozes off, while the purchasing
// power bar on the wall behind him quietly melts. On the right, it goes onto a
// platform that rides a price chart: up, crash, up again; he cheers and
// panics in turn. Years run in fast forward. In the end the right one is
// richer but worn out, the left one is rested but his money buys less.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose, mixPose } from '../poses.js';
import { stand, breathe, tremble, walkTo } from '../moves.js';
import { PI, lerp, clamp, smoothstep } from '../math.js';

const SAFE = { x: -2.35, w: 0.8, h: 0.95, d: 0.8 };
const SAFE_FACE = SAFE.x + SAFE.w / 2;
const SEAT_HIP = SAFE.h + DIM.limbR * 1.2;
const PILLAR_X = 2.35;
const BOARD_Z = -1.1;
const RIDE = 2.0;
const FF = [6.6, 9.6];
const CAPTION = 11.3;
const DURATION = 14.6;

// Piecewise curve through [[t, v], ...], eased between keys.
const curve = (keys) => (t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, b] = keys[i];
    if (t <= t1) {
      const [t0, a] = keys[i - 1];
      return lerp(a, b, smoothstep(t0, t1, t));
    }
  }
  return keys[keys.length - 1][1];
};

// Value of the right one's money, 1 = what he put in.
const value = curve([
  [RIDE, 1.0], [3.2, 1.35], [3.9, 0.78], [5.0, 1.12], [5.8, 0.92], [FF[0], 1.05],
  [7.0, 1.3], [7.4, 1.02], [7.9, 1.42], [8.3, 1.15], [8.8, 1.55], [9.2, 1.33], [FF[1], 1.65],
]);
const purchasing = curve([[2.6, 100], [FF[0], 91], [FF[1], 62]]);
const peace = curve([[RIDE, 100], [3.2, 96], [3.9, 70], [5.8, 58], [FF[0], 55], [7.4, 45], [8.3, 38], [FF[1], 33]]);
const height = (t) => 0.06 + 1.5 * (value(t) - 0.7) * smoothstep(RIDE, RIDE + 0.5, t);
const slope = (t) => (value(t + 0.05) - value(t - 0.05)) / 0.1;

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.22, swell: 0.05 });
  world.key.intensity = 1.6;

  const box = (m, w, h, d, x, y, z, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

  // ---- left: safe and purchasing power bar ----------------------------------------------------
  const steel = std(0x3c4148, { metalness: 0.55, roughness: 0.35 });
  const dark = std(0x0a0a0c, { roughness: 1 });
  // Body as five walls so the open door shows a dark inside.
  const sx = SAFE.x;
  box(steel, SAFE.w, 0.06, SAFE.d, sx, SAFE.h - 0.03, 0);
  box(steel, SAFE.w, 0.06, SAFE.d, sx, 0.03, 0);
  box(steel, 0.06, SAFE.h, SAFE.d, sx - SAFE.w / 2 + 0.03, SAFE.h / 2, 0);
  box(steel, SAFE.w, SAFE.h, 0.06, sx, SAFE.h / 2, -SAFE.d / 2 + 0.03);
  box(steel, SAFE.w, SAFE.h, 0.06, sx, SAFE.h / 2, SAFE.d / 2 - 0.03);
  box(dark, 0.02, SAFE.h - 0.14, SAFE.d - 0.14, sx - SAFE.w / 2 + 0.07, SAFE.h / 2, 0);
  // Door on the side facing the middle, hinged at its front edge.
  const hinge = new THREE.Group();
  hinge.position.set(SAFE_FACE, 0, SAFE.d / 2);
  scene.add(hinge);
  const doorMat = std(0x4a5058, { metalness: 0.6, roughness: 0.3 });
  box(doorMat, 0.05, SAFE.h - 0.02, SAFE.d - 0.02, 0.025, SAFE.h / 2, -SAFE.d / 2, hinge);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 24), std(0xc8b070, { metalness: 0.8, roughness: 0.25 }));
  dial.rotation.z = PI / 2;
  dial.position.set(0.07, SAFE.h * 0.58, -SAFE.d / 2);
  hinge.add(dial);
  box(std(0x1a1a1a), 0.02, 0.03, 0.08, 0.02, 0, 0, dial).position.set(0, 0.06, 0);
  box(std(0xc8b070, { metalness: 0.8, roughness: 0.25 }), 0.05, 0.18, 0.04, 0.08, SAFE.h * 0.38, -SAFE.d * 0.75, hinge);

  // Purchasing power: a bar in a frame on the back wall, draining downward.
  const BAR = { x: -2.1, y0: 1.35, h: 2.9, w: 0.55 };
  const frameMat = std(0x2a2d33, { roughness: 0.8 });
  box(frameMat, BAR.w + 0.14, 0.07, 0.06, BAR.x, BAR.y0 - 0.04, BOARD_Z);
  box(frameMat, BAR.w + 0.14, 0.07, 0.06, BAR.x, BAR.y0 + BAR.h + 0.04, BOARD_Z);
  box(frameMat, 0.07, BAR.h + 0.14, 0.06, BAR.x - BAR.w / 2 - 0.04, BAR.y0 + BAR.h / 2, BOARD_Z);
  box(frameMat, 0.07, BAR.h + 0.14, 0.06, BAR.x + BAR.w / 2 + 0.04, BAR.y0 + BAR.h / 2, BOARD_Z);
  box(dark, BAR.w, BAR.h, 0.02, BAR.x, BAR.y0 + BAR.h / 2, BOARD_Z - 0.02);
  const barMat = new THREE.MeshStandardMaterial({ color: 0x4cc06a, emissive: 0x4cc06a, emissiveIntensity: 0.45, roughness: 0.5 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(BAR.w - 0.04, 1, 0.04), barMat);
  scene.add(bar);

  // ---- right: pillar and chart -----------------------------------------------------------------
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.8), std(0x30343a, { metalness: 0.4, roughness: 0.5 }));
  pillar.castShadow = pillar.receiveShadow = true;
  scene.add(pillar);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x808890, emissive: 0x000000, roughness: 0.4, metalness: 0.3 });
  const plate = box(plateMat, 0.9, 0.06, 0.9, PILLAR_X, 0, 0);

  const CH = { w: 2.3, h: 2.9, x: 2.2, y: 1.35 + 2.9 / 2 };
  const chartC = document.createElement('canvas');
  chartC.width = 460;
  chartC.height = 580;
  const cg = chartC.getContext('2d');
  const chartTex = new THREE.CanvasTexture(chartC);
  chartTex.colorSpace = THREE.SRGBColorSpace;
  const chart = new THREE.Mesh(
    new THREE.PlaneGeometry(CH.w, CH.h),
    new THREE.MeshStandardMaterial({ map: chartTex, emissive: 0xffffff, emissiveMap: chartTex, emissiveIntensity: 0.5, roughness: 0.9 }),
  );
  chart.position.set(CH.x, CH.y, BOARD_Z);
  scene.add(chart);
  box(frameMat, CH.w + 0.12, CH.h + 0.12, 0.04, CH.x, CH.y, BOARD_Z - 0.03);
  const T_END = FF[1] + 0.4;
  const cx = (t) => 20 + ((t - RIDE) / (T_END - RIDE)) * 420;
  const cy = (v) => 560 - ((v - 0.6) / 1.2) * 540;
  let drawnAt = -1;
  const drawChart = (t) => {
    const tt = Math.min(t, T_END);
    if (Math.abs(tt - drawnAt) < 1e-4) return;
    drawnAt = tt;
    cg.fillStyle = '#101418';
    cg.fillRect(0, 0, 460, 580);
    cg.strokeStyle = '#26303a';
    cg.lineWidth = 2;
    for (let k = 1; k < 6; k++) {
      cg.beginPath();
      cg.moveTo(0, k * 96);
      cg.lineTo(460, k * 96);
      cg.stroke();
    }
    // Where he started.
    cg.setLineDash([10, 10]);
    cg.strokeStyle = '#6a7480';
    cg.beginPath();
    cg.moveTo(0, cy(1));
    cg.lineTo(460, cy(1));
    cg.stroke();
    cg.setLineDash([]);
    cg.lineWidth = 7;
    cg.lineCap = 'round';
    let px = cx(RIDE);
    let pv = value(RIDE);
    for (let s = RIDE + 0.04; s <= tt; s += 0.04) {
      const v = value(s);
      cg.strokeStyle = v >= pv ? '#4fd27a' : '#e2574c';
      cg.beginPath();
      cg.moveTo(px, cy(pv));
      cg.lineTo(cx(s), cy(v));
      cg.stroke();
      px = cx(s);
      pv = v;
    }
    chartTex.needsUpdate = true;
  };

  // ---- money bags -----------------------------------------------------------------------------
  const sackMat = std(0xb88a4c, { roughness: 0.85 });
  const cordMat = std(0x5a3a1e);
  const makeBag = () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), sackMat);
    body.scale.set(1, 0.9, 0.85);
    body.castShadow = true;
    g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.1, 12), sackMat);
    neck.position.y = 0.16;
    g.add(neck);
    const cord = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16), cordMat);
    cord.rotation.x = PI / 2;
    cord.position.y = 0.15;
    g.add(cord);
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 20), std(0xf2c14e, { metalness: 0.8, roughness: 0.25, emissive: 0x4a3200 }));
    coin.rotation.x = PI / 2;
    coin.position.set(0, -0.01, 0.135);
    g.add(coin);
    scene.add(g);
    return g;
  };
  const bagL = makeBag();
  const bagR = makeBag();

  // ---- figures --------------------------------------------------------------------------------
  const L = new StickFigure(mat.figure);
  const R = new StickFigure(mat.figure);
  scene.add(L.root, R.root);
  const HOLD = { lHand: { p: [0.11, 0.3, 0.3, 'chest'] }, rHand: { p: [-0.11, 0.3, 0.3, 'chest'] } };
  const READY = { lHand: { p: [0.14, 0.55, 0.3, 'chest'] }, rHand: { p: [-0.14, 0.55, 0.3, 'chest'] } };
  const CATCH = 0.5;
  const SEATED = { lean: -0.12, nod: 0.0, lLeg: 1.45, rLeg: 1.45, lKnee: 1.45, rKnee: 1.45, lArm: 0.55, rArm: 0.55, lEl: 0.7, rEl: 0.7, lOut: 0.2, rOut: 0.2 };

  // Left: catches, walks to the safe, puts the bag in, shuts it, hops up
  // and sits on it, then dozes.
  const L0 = [-1.0, 0.15];
  const L_SAFE = [-1.42, 0.0];
  const IN = [SAFE.x + 0.05, 0.42, 0.0];
  const lTrack = new Track(L, [
    { name: 'ready', d: CATCH, fn: stand({ x: L0[0], z: L0[1], yaw: 0, ground: 0, pose: { nod: -0.2 }, ik: READY }) },
    { name: 'catch', d: 0.45, blend: 0.12, fn: stand({ x: L0[0], z: L0[1], yaw: 0, ground: 0, pose: { nod: 0.15, lKnee: 0.25, rKnee: 0.25, lLeg: 0.12, rLeg: 0.12 }, ik: HOLD }) },
    { name: 'walk', d: 0.6, blend: 0.2, fn: (u, lt, d, t) => ({ ...walkTo({ from: L0, to: L_SAFE, yaw: -PI / 2, ground: 0, amp: 0.3, opts: { arm: 0 } })(u), ik: HOLD }) },
    { name: 'put', d: 0.6, blend: 0.25, fn: stand({ x: L_SAFE[0], z: L_SAFE[1], yaw: -PI / 2, ground: 0, pose: { lean: 0.55, nod: 0.3, lLeg: 0.25, rLeg: 0.25, lKnee: 0.4, rKnee: 0.4 }, ik: { lHand: { p: [IN[0] + 0.15, IN[1] + 0.05, IN[2] - 0.1, 'world'] }, rHand: { p: [IN[0] + 0.15, IN[1] + 0.05, IN[2] + 0.1, 'world'] } } }) },
    { name: 'shut', d: 0.55, blend: 0.25, fn: stand({ x: L_SAFE[0], z: L_SAFE[1], yaw: -PI / 2, ground: 0, pose: { lean: 0.2, nod: 0.25 }, ik: { rHand: { p: [SAFE_FACE + 0.08, 0.6, 0.3, 'world'] } } }) },
    { name: 'pat', d: 0.4, blend: 0.2, fn: stand({ x: L_SAFE[0], z: L_SAFE[1], yaw: -PI / 2, ground: 0, pose: { lean: 0.1, nod: 0.1 }, ik: { rHand: { p: [SAFE.x + 0.2, SAFE.h + 0.04, 0.1, 'world'] } } }) },
    {
      name: 'hop',
      d: 0.5,
      blend: 0.1,
      fn: (u) => {
        const e = smoothstep(0, 1, u);
        return {
          pos: [lerp(L_SAFE[0], SAFE.x + 0.02, e), lerp(STAND_HIP, SEAT_HIP, e) + 0.45 * Math.sin(PI * u), lerp(L_SAFE[1], 0.12, e)],
          yaw: lerp(-PI / 2, 0, e),
          pose: pose({ lean: 0.2, nod: 0, lLeg: 0.9 * e, rLeg: 0.9 * e, lKnee: 1.2 * e, rKnee: 1.2 * e, lArm: 0.6, rArm: 0.6, lOut: 0.5, rOut: 0.5 }),
        };
      },
    },
    { name: 'sit', d: 1.7, blend: 0.25, fn: (u, lt, d, t) => ({ pos: [SAFE.x + 0.02, SEAT_HIP, 0.12], yaw: 0, pose: breathe(pose(SEATED), t, 0.6) }) },
    {
      name: 'doze',
      d: 20,
      blend: 0.8,
      fn: (u, lt, d, t) => ({ pos: [SAFE.x + 0.02, SEAT_HIP, 0.12], yaw: 0, pose: breathe(pose({ ...SEATED, nod: 0.5 + 0.06 * Math.sin(t * 1.6), tilt: 0.25, lean: -0.05 }), t, 1.2) }),
    },
  ]);
  // He wakes up at the end to look at the bar.
  const WAKE = FF[1] + 0.2;

  // Right: catches, walks onto the platform, sets the bag down and rides
  // the chart.
  const R0 = [1.0, 0.15];
  const R_ON = [PILLAR_X - 0.12, 0.0];
  const BAG_SPOT = [PILLAR_X + 0.22, 0.22];
  const JOY = pose({ lean: -0.05, nod: -0.25, lArm: 2.7, rArm: 2.7, lOut: 0.45, rOut: 0.45, lEl: 0.3, rEl: 0.3 });
  const FEAR = pose({ lean: 0.3, nod: 0.3, lArm: 0.5, rArm: 0.5, lOut: 1.3, rOut: 1.3, lEl: 0.3, rEl: 0.3, lLeg: 0.45, rLeg: 0.45, lKnee: 0.9, rKnee: 0.9 });
  const CALM = pose({ nod: 0.0 });

  const groundR = (x) => (x > PILLAR_X - 0.45 ? 0.06 : 0);
  const rTrack = new Track(R, [
    { name: 'ready', d: CATCH, fn: stand({ x: R0[0], z: R0[1], yaw: 0, ground: 0, pose: { nod: -0.2 }, ik: READY }) },
    { name: 'catch', d: 0.45, blend: 0.12, fn: stand({ x: R0[0], z: R0[1], yaw: 0, ground: 0, pose: { nod: 0.15, lKnee: 0.25, rKnee: 0.25, lLeg: 0.12, rLeg: 0.12 }, ik: HOLD }) },
    { name: 'walk', d: 0.65, blend: 0.2, fn: (u, lt, d, t) => ({ ...walkTo({ from: R0, to: R_ON, yaw: PI / 2, ground: groundR, amp: 0.34, opts: { arm: 0 } })(u), ik: HOLD }) },
    { name: 'set', d: 0.4, blend: 0.2, fn: stand({ x: R_ON[0], z: R_ON[1], yaw: 0.6, ground: 0.06, pose: { lean: 0.5, nod: 0.4, lLeg: 0.35, rLeg: 0.35, lKnee: 0.7, rKnee: 0.7 }, ik: { lHand: { p: [BAG_SPOT[0] + 0.06, 0.55, BAG_SPOT[1] - 0.05, 'world'] }, rHand: { p: [BAG_SPOT[0] - 0.08, 0.55, BAG_SPOT[1] + 0.07, 'world'] } } }) },
    {
      name: 'ride',
      d: WAKE - 2.0,
      blend: 0.3,
      fn: (u, lt, d, t) => {
        const k = clamp(slope(t) / 1.1, -1, 1);
        let p = k >= 0 ? mixPose(CALM, JOY, smoothstep(0.15, 0.8, k)) : mixPose(CALM, FEAR, smoothstep(0.15, 0.8, -k));
        breathe(p, t, 1);
        if (k < -0.2) tremble(p, t, 0.05 * -k);
        return { pos: [R_ON[0], height(t) + STAND_HIP, R_ON[1]], yaw: 0, pose: p, ground: height(t) };
      },
    },
    { name: 'tired', d: 20, blend: 0.6, fn: (u, lt, d, t) => ({ pos: [R_ON[0], height(t) + STAND_HIP, R_ON[1]], yaw: 0, pose: breathe(pose({ lean: 0.38, nod: 0.6, side: 0.06, lArm: 0.2, rArm: 0.2, lOut: 0.04, rOut: 0.04, lEl: 0.05, rEl: 0.05, lKnee: 0.3, rKnee: 0.3, lLeg: 0.15, rLeg: 0.15 }), t, 1.8), ground: height(t) }) },
  ]);

  const tracks = [lTrack, rTrack];

  // ---- text -----------------------------------------------------------------------------------
  for (const [text, x] of [['GARANTİCİ', -1.6], ['RİSKÇİ', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '46px', letterSpacing: '0.1em' });
  }
  const counters = [-1.6, 1.6].map((x) => {
    const l = world.addLabel('', [x, 5.85, 0]);
    Object.assign(l.el.style, { fontSize: '36px', color: '#f2c14e' });
    return l;
  });
  const subs = [-1.6, 1.6].map((x) => {
    const l = world.addLabel('', [x, 5.4, 0], { t0: 2.2 });
    Object.assign(l.el.style, { fontSize: '28px', color: '#cfcfcf', letterSpacing: '0.06em' });
    return l;
  });
  const year = world.addLabel('', [0, 4.95, 0], { t0: 2.2, t1: CAPTION });
  Object.assign(year.el.style, { fontSize: '38px', color: '#e8e2d0' });

  world.addThought('param güvende', L, 2.6, 3.9);
  for (const [a, b] of [[4.6, FF[0]], [FF[0] + 2.0, WAKE]]) {
    world.addLabel('Zzz', () => L.headWorld().add(new THREE.Vector3(0.3, 0.3, 0)), { t0: a, t1: b, cls: 'thought' }).el.style.color = '#9fb4d0';
  }
  world.addThought('ekmek yine mi zamlandı?', L, FF[0] + 0.1, FF[0] + 1.9);
  world.addThought('aynı para, yarım sepet...', L, WAKE + 0.2, CAPTION);
  world.addThought('uçuyoruz!', R, 2.6, 3.4);
  world.addThought('ya batarsa?!', R, 3.6, 4.8);
  world.addThought('uykum kaçtı...', R, 5.6, FF[0]);
  world.addThought('ya tutarsa?', R, 7.5, 8.7);
  world.addThought('değdi mi acaba?', R, WAKE + 0.2, CAPTION);
  world.setCaption('Korkak bezirgân\nne kâr eder ne zarar.\n\nSEN HANGİSİSİN?', CAPTION, { top: 600 });

  // ---- sounds ---------------------------------------------------------------------------------
  const sfx = [];
  sfx.push({ t: 0.05, type: 'whoosh', gain: 0.5 });
  sfx.push({ t: CATCH, type: 'coin', gain: 0.9 }, { t: CATCH + 0.03, type: 'clink', gain: 0.7 });
  for (const [tr, name, n] of [[lTrack, 'walk', 2], [rTrack, 'walk', 3]]) {
    for (let k = 0; k < n; k++) sfx.push({ t: tr.at(name) + 0.1 + k * 0.22, type: 'step', gain: 0.6 });
  }
  sfx.push({ t: lTrack.at('put') + 0.35, type: 'clink', gain: 0.8 });
  sfx.push({ t: lTrack.at('shut') + 0.4, type: 'block', gain: 0.9 });
  for (let k = 0; k < 4; k++) sfx.push({ t: lTrack.at('pat') + k * 0.09, type: 'click', gain: 0.5 });
  sfx.push({ t: rTrack.at('set') + 0.3, type: 'clink', gain: 0.8 });
  sfx.push({ t: RIDE + 0.1, type: 'whir', gain: 0.5 });
  for (const t of [3.2, 5.0, 7.0, 7.9, 8.8, FF[1]]) sfx.push({ t: t - 0.15, type: 'register', gain: 0.5 });
  for (const t of [3.9, 5.8, 7.4, 8.3, 9.2]) sfx.push({ t: t - 0.2, type: 'crash', gain: t < FF[0] ? 0.55 : 0.35 });
  sfx.push({ t: FF[0], type: 'whoosh', gain: 0.8 });
  for (let t = FF[0] + 0.2; t < FF[1]; t += 0.25) sfx.push({ t, type: 'tick', gain: 0.5 });
  sfx.push({ t: CAPTION, type: 'chime', gain: 0.6 });

  // ---- per frame ------------------------------------------------------------------------------
  const v = new THREE.Vector3();
  const bagAt = (fig) => {
    fig.handWorld('l', v);
    const l = v.clone();
    fig.handWorld('r', v);
    return l.add(v).multiplyScalar(0.5).add(new THREE.Vector3(0, -0.06, 0));
  };
  const fmt = (n) => `${n.toLocaleString('tr-TR')} TL`;
  const green = new THREE.Color(0x4cc06a);
  const red = new THREE.Color(0xe2574c);
  const col = new THREE.Color();
  const PUT_IN = lTrack.at('put') + 0.4;
  const SHUT = lTrack.at('shut');
  const SET_DOWN = rTrack.at('set') + 0.25;

  world.onUpdate((t) => {
    for (const tr of tracks) tr.apply(t);

    // Bags fall from above into the hands, then go into the safe / onto the platform.
    const fall = 1 - smoothstep(0, CATCH, t);
    for (const [bag, fig, x] of [[bagL, L, L0[0]], [bagR, R, R0[0]]]) {
      if (t < CATCH) {
        const target = bagAt(fig);
        bag.position.set(lerp(target.x, x, 0), target.y + 6 * fall * fall, target.z);
        bag.rotation.set(0, 0, 0.6 * fall);
      }
    }
    if (t >= CATCH) {
      if (t < PUT_IN) bagL.position.copy(bagAt(L));
      else bagL.position.set(IN[0], IN[1] - 0.25, IN[2]);
      bagL.visible = t < SHUT + 0.4;
      if (t < SET_DOWN) bagR.position.copy(bagAt(R));
      else {
        const drop = 1 - smoothstep(SET_DOWN, SET_DOWN + 0.15, t);
        bagR.position.set(BAG_SPOT[0], height(t) + 0.03 + 0.14 + 0.25 * drop, BAG_SPOT[1]);
      }
      bagL.rotation.set(0, 0, 0);
      bagR.rotation.set(0, 0.3, 0);
    }

    // Safe door: open at the start, shut by his hand.
    hinge.rotation.y = -2.0 * (1 - smoothstep(SHUT + 0.1, SHUT + 0.4, t));
    dial.rotation.x = 4 * smoothstep(lTrack.at('pat'), lTrack.at('pat') + 0.4, t);

    // Purchasing power bar drains.
    const pp = purchasing(t) / 100;
    bar.scale.y = BAR.h * pp - 0.04;
    bar.position.set(BAR.x, BAR.y0 + (BAR.h * pp) / 2, BOARD_Z + 0.01);
    col.copy(red).lerp(green, smoothstep(0.55, 0.95, pp));
    barMat.color.copy(col);
    barMat.emissive.copy(col);

    // Pillar follows the chart.
    const h = height(t);
    pillar.scale.y = Math.max(h - 0.06, 0.001);
    pillar.position.set(PILLAR_X, (h - 0.06) / 2, 0);
    plate.position.set(PILLAR_X, h - 0.03, 0);
    const s = slope(t);
    plateMat.emissive.setHex(t < RIDE || Math.abs(s) < 0.15 ? 0x000000 : s > 0 ? 0x1f7a3a : 0x8a2420);
    drawChart(t);

    const val = t < RIDE ? 1 : value(t);
    counters[0].el.textContent = fmt(100000);
    counters[1].el.textContent = fmt(Math.round(val * 100) * 1000);
    counters[1].el.style.color = t < RIDE || Math.abs(s) < 0.15 ? '#f2c14e' : s > 0 ? '#6be08a' : '#ff7a6e';
    const ppn = Math.round(purchasing(t));
    subs[0].el.textContent = `ALIM GÜCÜ %${ppn}`;
    subs[0].el.style.color = ppn > 85 ? '#cfcfcf' : '#ff9a6e';
    const pc = Math.round(peace(t));
    subs[1].el.textContent = `HUZUR %${pc}`;
    subs[1].el.style.color = pc > 85 ? '#cfcfcf' : '#ff9a6e';

    const y = t < FF[0] ? 1 : t < FF[1] ? (t < lerp(FF[0], FF[1], 0.5) ? 2 : 3) : 3;
    year.el.textContent = `${t >= FF[0] && t < FF[1] ? '▶▶ ' : ''}YIL ${y}`;
  });

  // Left wakes up and looks at the bar: swap the doze clip's head for a look.
  const dozeClip = lTrack.clips.find((c) => c.name === 'doze');
  const dozeFn = dozeClip.fn;
  dozeClip.fn = (u, lt, d, t) => {
    const s = dozeFn(u, lt, d, t);
    const k = smoothstep(WAKE, WAKE + 0.6, t);
    if (k > 0) {
      s.pose = mixPose(s.pose, breathe(pose({ ...SEATED, nod: -0.15, turn: -0.9, twist: -0.25, lean: 0.05 }), t, 0.6), k);
    }
    return s;
  };

  const markers = Object.fromEntries(
    [['L', lTrack], ['R', rTrack]].flatMap(([n, tr]) => tr.clips.map((c) => [`${n}.${c.name}`, +c.t0.toFixed(2)])),
  );
  return { duration: DURATION, sfx, markers };
}
