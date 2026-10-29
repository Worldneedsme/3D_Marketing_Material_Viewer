// TABLET VEREN vs VAKİT AYIRAN
// Left: a tired parent on the couch with a phone, the child on the rug lit
// blue by a tablet. Right: a parent and child in the park: they toss a ball,
// the parent flies the child around like a plane, they play tag, and the
// child runs into a hug. At the end the left child gets up and tugs at the
// parent's arm; the parent doesn't look up, and the child goes back to the
// tablet. "Time together" counters over both.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose, walk, run, strideOf } from '../poses.js';
import { breathe } from '../moves.js';
import { PI, lerp, clamp, smooth, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const KID = 0.58;
const COUCH = { x: -2.2, z: -0.45, seat: 0.42 };
const RUG = [-1.25, 0.55];
const PARK = [1.85, 0.5];
const TOSS = { end: 4.5, period: 0.9, flight: 0.7 };
const P_CATCH = new THREE.Vector3(1.42, 1.15, 0.5);
const C_CATCH = new THREE.Vector3(2.32, 0.62, 0.5);
const PLANE = { pick: 4.9, up: 5.25, down: 7.4 };
const TAG = { start: 7.8, end: 9.6, r: 0.75 };
const HUG = 10.2;
const HUG_AT = [2.1, 0.7];
const TUG = { up: 9.4, go: 9.8, tug: 10.6, back: 11.6, sit: 12.4 };
const CAPTION = 12.2;
const DURATION = 14.5;

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.2, swell: 0.08 });
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

  // ---- left: living room -------------------------------------------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 6.5), std(0x24262a, { roughness: 0.95 }));
  wall.position.set(-2.3, 3.25, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);
  const fabric = std(0x5a4a6a, { roughness: 0.9 });
  box(fabric, 1.6, COUCH.seat, 0.8, COUCH.x, COUCH.seat / 2, COUCH.z);
  box(fabric, 1.6, 0.6, 0.2, COUCH.x, 0.7, COUCH.z - 0.35);
  for (const dx of [-0.8, 0.8]) box(fabric, 0.18, 0.62, 0.82, COUCH.x + dx, 0.31, COUCH.z);
  const rug = box(std(0x7a3a3a, { roughness: 0.95 }), 1.3, 0.02, 0.9, RUG[0], 0.01, RUG[1]);
  rug.castShadow = false;
  const lamp = new THREE.SpotLight(0xffd8a8, 4, 10, 0.55, 0.7, 1.2);
  lamp.position.set(-1.9, 6.5, 3.5);
  lamp.target.position.set(-1.9, 0.5, 0);
  scene.add(lamp, lamp.target);

  const phone = new THREE.Group();
  box(std(0x1a1a1e), 0.075, 0.14, 0.012, 0, 0, 0, phone);
  const pScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.125), new THREE.MeshBasicMaterial({ color: 0x8fc7ff }));
  pScreen.position.z = 0.007;
  phone.add(pScreen);
  scene.add(phone);
  const tablet = new THREE.Group();
  box(std(0x1a1a1e), 0.26, 0.18, 0.012, 0, 0, 0, tablet);
  const tScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.155), new THREE.MeshBasicMaterial({ color: 0x7ab8ff }));
  tScreen.position.z = 0.007;
  tablet.add(tScreen);
  scene.add(tablet);
  const glow = new THREE.PointLight(0x5aa0ff, 0, 1.6, 1.5);
  scene.add(glow);

  // ---- right: park --------------------------------------------------------------------------------
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 6.5), std(0x2a4258, { roughness: 1 }));
  sky.position.set(2.3, 3.25, WALL_Z - 0.02);
  scene.add(sky);
  const grass = box(std(0x355f34, { roughness: 0.95 }), 4.4, 0.02, 2.4, 2.3, 0.01, 0.2);
  grass.castShadow = false;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.9, 10), std(0x5a3e2a, { roughness: 0.9 }));
  trunk.position.set(2.85, 0.95, -0.7);
  trunk.castShadow = true;
  scene.add(trunk);
  const leaves = std(0x3f7a3a, { roughness: 0.8, flatShading: true });
  for (const [x, y, r] of [[2.85, 2.25, 0.62], [2.45, 2.0, 0.42], [3.2, 2.05, 0.42]]) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaves);
    m.position.set(x, y, -0.7);
    m.castShadow = true;
    scene.add(m);
  }
  const sun = new THREE.SpotLight(0xfff0d0, 11, 12, 0.5, 0.7, 1.2);
  sun.position.set(1.9, 6.5, 3.5);
  sun.target.position.set(1.9, 0.6, 0.4);
  scene.add(sun, sun.target);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), std(0xe84a3a, { roughness: 0.45 }));
  ball.castShadow = true;
  scene.add(ball);

  // ---- figures ---------------------------------------------------------------------------------------
  const LP = new StickFigure(mat.figure); // tablet veren
  const LC = new StickFigure(mat.figure);
  const RP = new StickFigure(mat.figure); // vakit ayıran
  const RC = new StickFigure(mat.figure);
  LC.root.scale.setScalar(KID);
  RC.root.scale.setScalar(KID);
  scene.add(LP.root, LC.root, RP.root, RC.root);

  // A child-sized walk/run: leg phase follows distance at the child's own stride.
  const kidGo = (from, to, { mover = walk, amp = 0.34, ease = (u) => u } = {}) => {
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const stride = strideOf(amp) * KID;
    const yaw = Math.atan2(to[0] - from[0], to[1] - from[1]);
    return (u) => {
      const e = ease(u);
      return {
        pos: [lerp(from[0], to[0], e), STAND_HIP * KID, lerp(from[1], to[1], e)],
        yaw,
        pose: mover((e * dist * 2 * PI) / stride, { amp }),
        ground: 0,
      };
    };
  };

  // Left parent: on the couch, on the phone, the whole time.
  const sitY = COUCH.seat + DIM.limbR * 1.2;
  const legs = { lLeg: PI / 2 - 0.1, rLeg: PI / 2 - 0.15, lKnee: PI / 2, rKnee: PI / 2 - 0.1 };
  const phoneHands = { lHand: { p: [0.045, 0.27, 0.32, 'chest'] }, rHand: { p: [-0.045, 0.27, 0.32, 'chest'] } };
  const lpTrack = new Track(LP, [
    {
      name: 'couch',
      d: 30,
      fn: (u, lt, d, t) => {
        const tired = smoothstep(0, 8, t);
        return { pos: [COUCH.x, sitY, COUCH.z + 0.12], yaw: 0.2, pose: breathe(pose({ lean: -0.1 - 0.15 * tired, nod: 0.5, ...legs }), t, 0.5), ik: phoneHands };
      },
    },
  ]);

  // Left child: on the rug with the tablet; later a short visit to the couch.
  const kidSit = (u, lt, d, t) => ({
    pos: [RUG[0], 0.1, RUG[1]],
    yaw: 0.35,
    pose: breathe(pose({ lean: 0.12, nod: 0.55, lLeg: PI / 2 - 0.05, rLeg: PI / 2 - 0.05, lKnee: 0.15, rKnee: 0.15, lLegOut: 0.2, rLegOut: 0.2 }), t, 0.4),
    ik: { lHand: { p: [0.08, 0.22, 0.32, 'chest'] }, rHand: { p: [-0.08, 0.22, 0.32, 'chest'] } },
    ground: 0,
  });
  const NEAR = [COUCH.x + 0.75, COUCH.z + 0.75];
  const kidStand = (x, z, yaw, extra = {}) => (u, lt, d, t) => ({ pos: [x, STAND_HIP * KID, z], yaw, pose: breathe(pose({ nod: 0.1, ...extra.pose }), t, 0.6), ik: extra.ik, ground: 0 });
  const lcTrack = new Track(LC, [
    { name: 'sit', d: TUG.up, fn: kidSit },
    { name: 'up', d: TUG.go - TUG.up, blend: 0.35, fn: kidStand(RUG[0], RUG[1], -0.6) },
    { name: 'go', d: TUG.tug - TUG.go, blend: 0.2, fn: kidGo(RUG, NEAR) },
    {
      name: 'tug',
      d: TUG.back - TUG.tug,
      blend: 0.2,
      fn: (u, lt, d, t) => {
        const pull = 0.05 * Math.sin(lt * 14) * smoothstep(0.1, 0.3, lt);
        return kidStand(NEAR[0], NEAR[1], -2.2, { pose: { nod: -0.35, lean: -0.05 }, ik: { rHand: { p: [COUCH.x + 0.32 + pull, 0.82, COUCH.z + 0.38, 'world'] } } })(u, lt, d, t);
      },
    },
    { name: 'back', d: TUG.sit - TUG.back, blend: 0.25, fn: kidGo(NEAR, RUG) },
    { name: 'sitAgain', d: 10, blend: 0.4, fn: kidSit },
  ]);

  // Right parent: toss, airplane, tag, hug.
  const tossPhase = (t) => {
    const k = Math.floor(t / TOSS.period);
    const lt = t - k * TOSS.period;
    return { k, lt, flying: lt < TOSS.flight, u: clamp(lt / TOSS.flight) };
  };
  const catchHands = (pt) => ({ lHand: { p: [pt.x, pt.y, pt.z - 0.09, 'world'] }, rHand: { p: [pt.x, pt.y, pt.z + 0.09, 'world'] } });
  const SPIN = (t) => 2 * PI * smooth((t - PLANE.up) / (PLANE.down - PLANE.up));
  const rpTrack = new Track(RP, [
    {
      name: 'toss',
      d: TOSS.end,
      fn: (u, lt, d, t) => {
        const { k, u: f } = tossPhase(t);
        const throwing = k % 2 === 0;
        const hop = throwing ? 0.15 * Math.sin(clamp(f * 3) * PI) : 0;
        return { pos: [1.1, STAND_HIP, 0.5], yaw: PI / 2, pose: breathe(pose({ nod: 0.15, lean: 0.08 + hop }), t, 0.4), ik: catchHands(P_CATCH), ground: 0 };
      },
    },
    { name: 'toCentre', d: PLANE.pick - TOSS.end, blend: 0.2, fn: walkAdult([1.1, 0.5], PARK) },
    {
      name: 'plane',
      d: PLANE.down - PLANE.pick,
      blend: 0.25,
      fn: (u, lt, d, t) => {
        const up = smoothstep(PLANE.pick, PLANE.up, t);
        const y = lerp(0.05, 0.5, up);
        return {
          pos: [PARK[0], STAND_HIP, PARK[1]],
          yaw: SPIN(t),
          pose: breathe(pose({ nod: -0.1, lean: -0.05, lLegOut: 0.12, rLegOut: 0.12 }), t, 0.3),
          ik: { lHand: { p: [0.15, y, 0.32, 'chest'] }, rHand: { p: [-0.15, y, 0.32, 'chest'] } },
          ground: 0,
        };
      },
    },
    {
      name: 'tag',
      d: TAG.end - TAG.start + (TAG.start - PLANE.down),
      blend: 0.35,
      fn: (u, lt, d, t) => {
        const a = tagAngle(t);
        return { pos: [PARK[0], STAND_HIP, PARK[1]], yaw: Math.atan2(Math.cos(a - 0.4), Math.sin(a - 0.4)), pose: breathe(pose({ lean: 0.3, nod: -0.2, lArm: 0.6, rArm: 0.6, lOut: 0.9, rOut: 0.9, lEl: 0.4, rEl: 0.4, lLeg: 0.4, rLeg: 0.4, lKnee: 0.7, rKnee: 0.7 }), t, 0.6), ground: 0 };
      },
    },
    {
      name: 'kneel',
      d: 10,
      blend: 0.35,
      fn: (u, lt, d, t) => {
        const hug = smoothstep(HUG, HUG + 0.3, t);
        const open = { lHand: { p: [0.45, 0.35, 0.25, 'chest'] }, rHand: { p: [-0.45, 0.35, 0.25, 'chest'] } };
        const wrap = { lHand: { p: [HUG_AT[0] + 0.07, 0.74, HUG_AT[1] - 0.12, 'world'] }, rHand: { p: [HUG_AT[0] + 0.07, 0.74, HUG_AT[1] + 0.12, 'world'] } };
        return {
          pos: [HUG_AT[0] - 0.45, 0.56, HUG_AT[1]],
          yaw: PI / 2,
          pose: breathe(pose({ lean: 0.1 + 0.1 * hug, nod: 0.1 + 0.2 * hug, tilt: -0.2 * hug, lLeg: 0.05, lKnee: 1.55, rLeg: 1.45, rKnee: 1.5 }), t, 0.4),
          ik: hug > 0.5 ? wrap : open,
          ground: 0,
        };
      },
    },
  ]);
  function walkAdult(from, to) {
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const stride = strideOf(0.34);
    const yaw = Math.atan2(to[0] - from[0], to[1] - from[1]);
    return (u) => ({ pos: [lerp(from[0], to[0], u), STAND_HIP, lerp(from[1], to[1], u)], yaw: lerp(yaw, 0, smoothstep(0.6, 1, u)), pose: walk((u * dist * 2 * PI) / stride), ground: 0 });
  }
  function tagAngle(t) {
    return -PI / 2 + ((t - TAG.start) / (TAG.end - TAG.start)) * 2.6 * PI;
  }

  // Right child: toss, airplane (carried), tag around the parent, run into the hug.
  const tagStart = [PARK[0] + TAG.r * Math.cos(tagAngle(TAG.start)), PARK[1] + TAG.r * Math.sin(tagAngle(TAG.start))];
  const tagEnd = [PARK[0] + TAG.r * Math.cos(tagAngle(TAG.end)), PARK[1] + TAG.r * Math.sin(tagAngle(TAG.end))];
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const rcTrack = new Track(RC, [
    {
      name: 'toss',
      d: TOSS.end,
      fn: (u, lt, d, t) => {
        const { k, u: f } = tossPhase(t);
        const hop = k % 2 === 1 ? 0.12 * Math.sin(clamp(f * 3) * PI) : 0;
        return { pos: [2.6, STAND_HIP * KID, 0.5], yaw: -PI / 2, pose: breathe(pose({ nod: -0.25, lean: 0.05 }), t, 0.6), ik: catchHands(C_CATCH), ground: 0, lift: hop };
      },
    },
    { name: 'toParent', d: PLANE.pick - TOSS.end, blend: 0.2, fn: kidGo([2.6, 0.5], [PARK[0], PARK[1] + 0.35], { mover: run, amp: 0.5 }) },
    {
      name: 'plane',
      d: PLANE.down - PLANE.pick,
      blend: 0.25,
      fn: (u, lt, d, t) => {
        RP.handWorld('l', v1).add(RP.handWorld('r', v2)).multiplyScalar(0.5);
        const up = smoothstep(PLANE.pick, PLANE.up, t);
        return {
          pos: [v1.x, v1.y + 0.02, v1.z],
          yaw: SPIN(t),
          pitch: (PI / 2) * up,
          pose: pose({ nod: -0.6 * up, lArm: 0.2, rArm: 0.2, lOut: 1.45 * up, rOut: 1.45 * up, lEl: 0.05, rEl: 0.05, lLeg: 0, rLeg: 0, lKnee: 0.1, rKnee: 0.1 }),
        };
      },
    },
    { name: 'toTag', d: TAG.start - PLANE.down, blend: 0.3, fn: kidGo([PARK[0], PARK[1] + 0.35], tagStart, { mover: run, amp: 0.5 }) },
    {
      name: 'tag',
      d: TAG.end - TAG.start,
      blend: 0.15,
      fn: (u, lt, d, t) => {
        const a = tagAngle(t);
        const dist = TAG.r * (a - tagAngle(TAG.start));
        return {
          pos: [PARK[0] + TAG.r * Math.cos(a), STAND_HIP * KID, PARK[1] + TAG.r * Math.sin(a)],
          yaw: Math.atan2(-Math.sin(a), Math.cos(a)),
          pose: run((dist * 2 * PI) / (strideOf(0.5) * KID), { amp: 0.5 }),
          ground: 0,
        };
      },
    },
    { name: 'toHug', d: HUG - TAG.end, blend: 0.15, fn: kidGo(tagEnd, [HUG_AT[0], HUG_AT[1]], { mover: run, amp: 0.5 }) },
    {
      name: 'hug',
      d: 10,
      blend: 0.25,
      fn: (u, lt, d, t) => ({
        pos: [HUG_AT[0], STAND_HIP * KID, HUG_AT[1]],
        yaw: -PI / 2,
        pose: breathe(pose({ nod: -0.1, tilt: 0.2 }), t, 0.5),
        ik: { lHand: { p: [HUG_AT[0] - 0.36, 1.0, HUG_AT[1] + 0.13, 'world'] }, rHand: { p: [HUG_AT[0] - 0.36, 1.0, HUG_AT[1] - 0.13, 'world'] } },
        ground: 0,
      }),
    },
  ]);

  // ---- text ------------------------------------------------------------------------------------
  for (const [text, x] of [['TABLET VEREN', -1.6], ['VAKİT AYIRAN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '38px', letterSpacing: '0.08em' });
  }
  const meter = (x, color) => {
    const l = world.addLabel('', [x, 5.55, 0]);
    Object.assign(l.el.style, { fontSize: '40px', color });
    return l;
  };
  const lMeter = meter(-1.6, '#ff5a4a');
  const rMeter = meter(1.6, '#7ddc7d');
  world.addThought('5 dakika sessizlik...', LP, 0.4, 2.6);
  world.addThought('herkes veriyor zaten', LP, 3.2, 5.2);
  world.addThought('çok yoruldum bugün', LP, 6.0, 8.2);
  world.addThought('hı? bir dakika...', LP, TUG.tug + 0.1, TUG.sit + 0.3);
  world.setCaption('Ağaç yaşken eğilir.', CAPTION, { top: 470 });

  // ---- sounds and particles ---------------------------------------------------------------------------
  const sfx = [];
  for (let t = 0.6; t < TUG.up; t += 1.1) sfx.push({ t, type: 'click', gain: 0.4 });
  for (let k = 0; (k + 1) * TOSS.period < TOSS.end + 0.1; k++) {
    sfx.push({ t: k * TOSS.period + 0.02, type: 'whoosh', gain: 0.35 }, { t: k * TOSS.period + TOSS.flight, type: 'tick', gain: 1.6 });
  }
  sfx.push({ t: PLANE.up, type: 'whoosh', gain: 0.8 }, { t: PLANE.up + 0.9, type: 'whoosh', gain: 0.8 });
  for (let k = 0; k < 7; k++) sfx.push({ t: TAG.start + k * 0.26, type: 'step', gain: 1.0 });
  sfx.push({ t: TUG.tug + 0.2, type: 'rustle', gain: 0.6 }, { t: HUG + 0.1, type: 'chime', gain: 0.5 }, { t: CAPTION, type: 'chime', gain: 0.6 });
  world.makeParticles('hearts', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb0c0 }));
  const r = mulberry32(14);
  const parts = Array.from({ length: 18 }, () => ({ x: HUG_AT[0] - 0.25, y: 1.5, z: HUG_AT[1], vx: (r() - 0.5) * 0.9, vy: 0.4 + r() * 0.8, vz: r() * 0.3, delay: r() * 0.3, r: 0.02 + r() * 0.015 }));
  world.addBurst('hearts', { t0: HUG + 0.3, parts, life: 1.5, gravity: 0.3 });

  // ---- per frame ---------------------------------------------------------------------------------------
  world.onUpdate((t) => {
    lpTrack.apply(t);
    lcTrack.apply(t);
    rpTrack.apply(t);
    rcTrack.apply(t);

    lMeter.el.textContent = 'BİRLİKTE 0 DK';
    rMeter.el.textContent = `BİRLİKTE ${Math.round(60 * smoothstep(0, HUG, t))} DK`;

    phone.position.copy(LP.handWorld('l', v1)).add(LP.handWorld('r', v2)).multiplyScalar(0.5).add(v2.set(0, 0.06, 0));
    phone.lookAt(LP.headWorld(v1));

    // Tablet in the child's hands while sitting, on the rug while away.
    const holding = t < TUG.up + 0.1 || t > TUG.sit + 0.15;
    if (holding) {
      tablet.position.copy(LC.handWorld('l', v1)).add(LC.handWorld('r', v2)).multiplyScalar(0.5).add(v2.set(0, 0.04, 0));
      tablet.lookAt(LC.headWorld(v1));
    } else {
      tablet.position.set(RUG[0] + 0.1, 0.03, RUG[1] + 0.15);
      tablet.rotation.set(-PI / 2, 0, 0.4);
    }
    glow.position.copy(tablet.position).add(v1.set(0, 0.1, 0.1));
    glow.intensity = holding ? 2.2 : 0.5;

    // Ball: arcs between the two catch points, then rests on the grass.
    if (t < TOSS.end) {
      const { k, u, flying } = tossPhase(t);
      const [a, b] = k % 2 === 0 ? [P_CATCH, C_CATCH] : [C_CATCH, P_CATCH];
      if (flying) ball.position.lerpVectors(a, b, u).setY(lerp(a.y, b.y, u) + 0.9 * 4 * u * (1 - u));
      else ball.position.copy(b);
    } else {
      ball.position.set(2.45, 0.1, 1.2);
    }
  });

  return { duration: DURATION, sfx };
}
