// BAHANE BULAN vs YOL BULAN
// One wall, a flag on top, the same pile of stones on both sides. One builds
// steps out of his stones and climbs; the other sits down against the wall.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { StickFigure, STAND_HIP, DIM } from '../rig.js';
import { Track } from '../timeline.js';
import { pose, walk } from '../poses.js';
import { stand, walkTo, breathe } from '../moves.js';
import { PI, lerp, smooth, smoothstep, clamp, mulberry32 } from '../math.js';

const B = 0.62; // stone size
const WALL_H = 4 * B;
const WALL_X = 0.45; // half width of the wall
const LANE = 0.95; // walking lane in front of everything

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.22, swell: 0.1 });

  // ---- wall and flag -----------------------------------------------------------------
  const brickTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#1c1b1a';
    g.fillRect(0, 0, 256, 512);
    const rand = mulberry32(4);
    for (let row = 0; row < 16; row++) {
      for (let col = -1; col < 3; col++) {
        const x = col * 128 + (row % 2) * 64;
        const shade = 52 + Math.floor(rand() * 18);
        g.fillStyle = `rgb(${shade},${shade - 3},${shade - 6})`;
        g.fillRect(x + 4, row * 32 + 4, 120, 26);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(WALL_X * 2, WALL_H, 1.3), new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.9 }));
  wall.position.set(0, WALL_H / 2, 0);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(WALL_X * 2 + 0.08, 0.06, 1.38), new THREE.MeshStandardMaterial({ color: 0x8c8580, roughness: 0.8 }));
  cap.position.set(0, WALL_H + 0.03, 0);
  scene.add(cap);

  const poleX = -0.12;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.15, 8), new THREE.MeshStandardMaterial({ color: 0xd9d9d6, roughness: 0.4, metalness: 0.4 }));
  pole.position.set(poleX, WALL_H + 0.06 + 0.575, -0.3);
  scene.add(pole);
  const clothGeo = new THREE.PlaneGeometry(0.58, 0.34, 14, 4);
  // Flies towards the left, over the side that never climbs.
  clothGeo.translate(-0.29, 0, 0);
  const clothBase = clothGeo.attributes.position.array.slice();
  const cloth = new THREE.Mesh(clothGeo, new THREE.MeshStandardMaterial({ color: 0xd4362a, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x3a0804 }));
  cloth.position.set(poleX, WALL_H + 0.06 + 0.98, -0.3);
  scene.add(cloth);

  // ---- stones --------------------------------------------------------------------------
  const stoneGeo = new RoundedBoxGeometry(B, B, B, 3, 0.07);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8b867f, roughness: 0.9 });
  const pileSlots = [
    [2.62, 0, -0.3, 0.1],
    [2.78, 0, 0.38, -0.15],
    [3.2, 0, 0.0, 0.25],
    [2.72, 1, 0.05, -0.1],
    [3.12, 1, 0.3, 0.2],
    [2.92, 2, 0.15, 0.05],
  ].map(([x, layer, z, ry]) => ({ pos: new THREE.Vector3(x, B / 2 + layer * B, z), ry }));
  const makeStone = (p, ry) => {
    const m = new THREE.Mesh(stoneGeo, stoneMat);
    m.position.copy(p);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  // The idle pile on the left mirrors the one on the right.
  for (const s of pileSlots) makeStone(new THREE.Vector3(-s.pos.x, s.pos.y, s.pos.z), -s.ry);

  const colX = [WALL_X + B / 2, WALL_X + B * 1.5, WALL_X + B * 2.5];
  // Build order: one stone at the far end, then two, then three next to the wall.
  const targets = [
    [2, 0],
    [1, 0],
    [0, 0],
    [1, 1],
    [0, 1],
    [0, 2],
  ].map(([c, layer]) => new THREE.Vector3(colX[c], B / 2 + layer * B, 0));
  // Pick from the top of the pile down.
  const pickOrder = [5, 3, 4, 0, 1, 2];
  const stones = pickOrder.map((i) => ({ slot: pileSlots[i], mesh: makeStone(pileSlots[i].pos, pileSlots[i].ry) }));

  // ---- figures ---------------------------------------------------------------------------
  const L = new StickFigure(mat.figure); // bahane bulan
  const R = new StickFigure(mat.figure); // yol bulan
  scene.add(L.root, R.root);

  const JOG = 3.1;
  const carryArms = { lArm: 1.15, rArm: 1.15, lEl: 0.85, rEl: 0.85, lOut: 0.18, rOut: 0.18, arm: 0 };
  const PICK = pose({ lean: 0.75, nod: 0.45, lArm: 1.2, rArm: 1.2, lEl: 0.5, rEl: 0.5, lOut: 0.25, rOut: 0.25, lLeg: 0.55, rLeg: 0.55, lKnee: 1.0, rKnee: 1.0 });
  const PLACE_LOW = pose({ lean: 0.55, nod: 0.4, lArm: 1.1, rArm: 1.1, lEl: 0.3, rEl: 0.3, lOut: 0.25, rOut: 0.25, lLeg: 0.35, rLeg: 0.35, lKnee: 0.6, rKnee: 0.6 });
  const PLACE_MID = pose({ lean: 0.1, nod: 0.1, lArm: 1.55, rArm: 1.55, lEl: 0.3, rEl: 0.3, lOut: 0.25, rOut: 0.25 });
  const PLACE_HIGH = pose({ lean: -0.05, nod: -0.35, lArm: 2.4, rArm: 2.4, lEl: 0.35, rEl: 0.35, lOut: 0.25, rOut: 0.25 });
  const placePose = (y) => (y < B ? PLACE_LOW : y < 2 * B ? PLACE_MID : PLACE_HIGH);

  const rClips = [
    { name: 'look', d: 0.65, fn: stand({ x: 1.9, z: LANE, yaw: -PI / 2, ground: 0, pose: { nod: -0.55, lean: -0.05 } }) },
  ];
  let x = 1.9;
  const pickX = 2.72;
  const events = [];
  let t = 0.65;
  stones.forEach((st, i) => {
    const goTo = (to, d, carry) => {
      rClips.push({ name: `walk${i}${carry ? 'c' : ''}`, d, fn: walkTo({ from: [x, LANE], to: [to, LANE], yaw: to > x ? PI / 2 : -PI / 2, ground: 0, amp: 0.42, opts: carry ? carryArms : { lean: 0.14, arm: 0.5 } }) });
      t += d;
      x = to;
    };
    goTo(pickX, Math.max(0.22, Math.abs(pickX - x) / JOG), false);
    rClips.push({ name: `pick${i}`, d: 0.3, blend: 0.1, fn: stand({ x: pickX, z: LANE, yaw: PI, ground: 0, pose: PICK, breath: 0 }) });
    events.push({ stone: i, pick: t + 0.08, lift: t + 0.3 });
    t += 0.3;
    const tx = targets[i].x;
    goTo(tx, Math.max(0.22, Math.abs(tx - x) / JOG), true);
    rClips.push({ name: `place${i}`, d: 0.3, blend: 0.1, fn: stand({ x: tx, z: LANE, yaw: PI, ground: 0, pose: placePose(targets[i].y), breath: 0 }) });
    events[i].place = t + 0.08;
    events[i].set = t + 0.26;
    t += 0.3;
  });

  // Climb: off the lane onto the far stone, then up the steps onto the wall.
  const stepTop = (px, pz) => {
    if (pz > 0.5 || px > colX[2] + B / 2) return 0;
    if (px > colX[1] + B / 2) return B;
    if (px > colX[0] + B / 2) return 2 * B;
    if (px > WALL_X) return 3 * B;
    return WALL_H + 0.06;
  };
  // Back along the lane to the far end first.
  const start = colX[2] + 0.75;
  rClips.push({ name: 'toSteps', d: Math.abs(start - x) / JOG, fn: walkTo({ from: [x, LANE], to: [start, LANE], yaw: PI / 2, ground: 0, amp: 0.42, opts: { lean: 0.14, arm: 0.5 } }) });
  t += Math.abs(start - x) / JOG;
  x = start;
  const path = [
    [x, LANE],
    [colX[2], 0.05],
    [colX[1], 0],
    [colX[0], 0],
    [0.15, 0],
  ];
  const lens = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  // Heading per segment, unwrapped so turns take the short way round.
  const heads = [];
  path.slice(1).forEach((p, i) => {
    let h = Math.atan2(p[0] - path[i][0], p[1] - path[i][1]);
    const prev = i ? heads[i - 1] : PI / 2;
    while (h - prev > PI) h -= 2 * PI;
    while (h - prev < -PI) h += 2 * PI;
    heads.push(h);
  });
  const total = lens.reduce((a, b) => a + b, 0);
  const climbD = total / 2.0;
  rClips.push({
    name: 'climb',
    d: climbD,
    fn: (u) => {
      let dist = u * total;
      let i = 0;
      while (i < lens.length - 1 && dist > lens[i]) dist -= lens[i++];
      const k = clamp(dist / lens[i]);
      const px = lerp(path[i][0], path[i + 1][0], k);
      const pz = lerp(path[i][1], path[i + 1][1], k);
      // Each step up is a quick hop.
      const g = stepTop(px, pz);
      const yaw = lerp(heads[i], heads[Math.min(i + 1, heads.length - 1)], smoothstep(0.75, 1, k));
      const phase = (u * total) / 0.55 * PI;
      const p = walk(phase, { amp: 0.4, knee: 1.1, lean: 0.2, arm: 0.45 });
      return { pos: [px, g + STAND_HIP, pz], yaw, pose: p, ground: g, lift: 0.08 * Math.abs(Math.sin(phase)) };
    },
  });
  t += climbD;
  const topAt = t;
  rClips.push({
    name: 'top',
    d: 2.2,
    blend: 0.3,
    fn: (u, lt, d, tt) => {
      const k = smooth(lt / 0.5);
      const wave = Math.sin(lt * 7) * 0.2;
      return { pos: [0.2, 0, 0], yaw: lerp(heads[heads.length - 1], 2 * PI - 0.25, k), pose: breathe(pose({ nod: -0.25, lean: -0.08, lArm: 2.6, rArm: 2.6, lOut: 0.75 + wave, rOut: 0.75 - wave, lEl: 0.2, rEl: 0.2 }), tt), ground: WALL_H + 0.06 };
    },
  });
  rClips.push({
    name: 'lookdown',
    d: 6,
    blend: 0.5,
    fn: (u, lt, d, tt) => ({
      pos: [0.2, 0, 0],
      yaw: 2 * PI - 0.25,
      pose: breathe(pose({ nod: 0.45, turn: -0.75, tilt: 0.1, lArm: 0.25, rArm: 0.25, lOut: 0.45, rOut: 0.45, lEl: 1.7, rEl: 1.7, lArmTw: 0.6, rArmTw: 0.6 }), tt),
      ground: WALL_H + 0.06,
    }),
  });
  const rTrack = new Track(R, rClips);

  // ---- BAHANE BULAN --------------------------------------------------------------------------
  const wallFace = -WALL_X - 0.42;
  const sitPose = pose({ lean: -0.1, nod: 0.25, lLeg: PI / 2 - 0.15, rLeg: PI / 2 - 0.2, lKnee: 0.35, rKnee: 0.5 });
  const sitY = DIM.limbR * 1.15 + 0.02;
  const armsCrossed = {
    lHand: { p: [-0.13, 0.3, 0.17, 'chest'], pole: [0.35, 0.2, 0.15, 'chest'] },
    rHand: { p: [0.13, 0.32, 0.19, 'chest'], pole: [-0.35, 0.2, 0.15, 'chest'] },
  };
  const lTrack = new Track(L, [
    { name: 'walk', d: 1.3, fn: walkTo({ from: [-2.2, LANE], to: [wallFace - 0.15, 0.1], yaw: Math.atan2(wallFace - 0.15 + 2.2, 0.1 - LANE), ground: 0, amp: 0.3 }) },
    { name: 'lookup', d: 0.7, fn: stand({ x: wallFace - 0.15, z: 0.1, yaw: PI / 2, ground: 0, pose: { nod: -0.7, lean: -0.1 } }) },
    {
      name: 'hop',
      d: 0.8,
      blend: 0.1,
      fn: (u, lt) => {
        // Crouch, jump with one arm reaching up, land.
        const crouch = smoothstep(0, 0.2, lt) * (1 - smoothstep(0.2, 0.3, lt)) + smoothstep(0.55, 0.65, lt) * (1 - smoothstep(0.65, 0.8, lt));
        const air = clamp((lt - 0.25) / 0.35);
        const lift = 0.32 * 4 * air * (1 - air);
        const reach = smoothstep(0.2, 0.35, lt) * (1 - smoothstep(0.55, 0.75, lt));
        const p = pose({ nod: -0.6, lean: 0.25 * crouch, lLeg: 0.5 * crouch, rLeg: 0.5 * crouch, lKnee: 1.0 * crouch, rKnee: 1.0 * crouch, rArm: 0.2 + 2.8 * reach, rEl: 0.15, lArm: 0.2 + 1.5 * reach });
        return { pos: [wallFace - 0.15, 0, 0.1], yaw: PI / 2, pose: p, ground: 0, lift };
      },
    },
    // Glances back at his own pile of stones and waves it off.
    { name: 'pile', d: 0.9, blend: 0.3, fn: stand({ x: wallFace - 0.15, z: 0.1, yaw: 3.5, ground: 0, pose: { nod: 0.3, rArm: 0.7, rOut: 0.7, rEl: 0.6, lArm: 0.1 } }) },
    {
      name: 'sitdown',
      d: 0.9,
      blend: 0.25,
      fn: (u) => {
        const k = smooth(u);
        const yaw = lerp(3.5, 1.5 * PI, smooth(clamp(u * 1.6)));
        const p = pose({ lean: lerp(0.05, -0.1, k), nod: 0.25, lLeg: lerp(0, PI / 2 - 0.15, k), rLeg: lerp(0, PI / 2 - 0.2, k), lKnee: lerp(0.05, 0.35, k) + 0.9 * Math.sin(k * PI), rKnee: lerp(0.05, 0.5, k) + 0.9 * Math.sin(k * PI) });
        return { pos: [lerp(wallFace - 0.15, wallFace + 0.08, k), lerp(STAND_HIP, sitY, k), 0.1], yaw, pose: p };
      },
    },
    {
      name: 'sulk',
      d: 20,
      blend: 0.4,
      fn: (u, lt, d, tt) => {
        const p = { ...sitPose };
        p.neckY = 0.25 * Math.sin(tt * 0.6);
        p.spineX += 0.01 * Math.sin(tt * 1.4);
        return { pos: [wallFace + 0.08, sitY, 0.1], yaw: 1.5 * PI, pose: p, ik: armsCrossed };
      },
    },
  ]);

  // ---- sounds and text ------------------------------------------------------------------------
  const sfx = [];
  for (const e of events) sfx.push({ t: e.lift, type: 'step', gain: 1.5 }, { t: e.set, type: 'block' });
  sfx.push({ t: topAt + 0.15, type: 'chime', gain: 0.8 });
  sfx.push({ t: lTrack.at('hop') + 0.62, type: 'step', gain: 2 });

  world.addLabel('BAHANE BULAN', [-1.6, 6.45, 0]);
  world.addLabel('YOL BULAN', [1.6, 6.45, 0]);
  world.addThought('çok yüksek', L, 0.9, 2.2);
  world.addThought('merdiven yok', L, lTrack.at('pile') + 0.1, lTrack.at('sulk') + 0.3);
  world.addThought('şansım yok', L, lTrack.at('sulk') + 1.6, lTrack.at('sulk') + 3.0);
  world.addThought('ona kolay...', L, topAt - 1.6, topAt + 0.2);
  world.setCaption('İsteyen yolunu bulur,\nistemeyen bahanesini.', topAt + 1.2, { top: 470 });

  // ---- per frame -------------------------------------------------------------------------------
  const v = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const held = (fig, out) => fig.handWorld('l', out).add(fig.handWorld('r', v2)).multiplyScalar(0.5).add(v.set(0, 0, -0.18));
  const arc = (from, to, u, h, out) => out.lerpVectors(from, to, u).setY(lerp(from.y, to.y, u) + h * 4 * u * (1 - u));
  const tmp = new THREE.Vector3();

  world.onUpdate((time) => {
    rTrack.apply(time);
    lTrack.apply(time);

    stones.forEach((st, i) => {
      const e = events[i];
      const m = st.mesh;
      if (time < e.pick) {
        m.position.copy(st.slot.pos);
        m.rotation.y = st.slot.ry;
      } else if (time < e.lift) {
        arc(st.slot.pos, held(R, tmp), (time - e.pick) / (e.lift - e.pick), 0.25, m.position);
        m.rotation.y = lerp(st.slot.ry, 0, (time - e.pick) / (e.lift - e.pick));
      } else if (time < e.place) {
        held(R, m.position);
        m.rotation.y = 0;
      } else if (time < e.set) {
        m.position.lerpVectors(held(R, tmp), targets[i], smooth((time - e.place) / (e.set - e.place)));
      } else {
        m.position.copy(targets[i]);
        m.rotation.y = 0;
      }
    });

    // Flag ripples in the wind.
    const pos = clothGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = -clothBase[i * 3];
      const by = clothBase[i * 3 + 1];
      pos.setZ(i, Math.sin(bx * 9 - time * 7) * 0.05 * (bx / 0.58));
      pos.setY(i, by - 0.03 * (bx / 0.58) + Math.sin(bx * 7 - time * 6) * 0.01);
    }
    pos.needsUpdate = true;
    clothGeo.computeVertexNormals();
  });

  const markers = Object.fromEntries([...rTrack.clips.filter((c) => !/^walk/.test(c.name)).map((c) => ['R.' + c.name, +c.t0.toFixed(2)]), ...lTrack.clips.map((c) => ['L.' + c.name, +c.t0.toFixed(2)])]);
  return { duration: topAt + 4.4, sfx, markers };
}
