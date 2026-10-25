// "VAKTİM YOK" DİYEN vs BALTASINI BİLEYEN
// Two trees, two dull axes. One never stops swinging and barely scratches his
// tree. The other stops to sharpen on the grindstone, comes back and fells
// his tree in three swings.
import * as THREE from 'three';
import { StickFigure, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, walkTo, breathe } from '../moves.js';
import { PI, lerp, smoothstep, easeIn, easeInOut, clamp, mulberry32 } from '../math.js';

const TREE_X = 1.75;
const CHOP_X = 0.5; // where each chopper stands (mirrored)
const TRUNK_R = 0.2;
const NOTCH_Y = 0.42;
const HIT = 0.6; // phase of a swing where the blade lands

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.22, swell: 0.1 });

  // ---- trees ---------------------------------------------------------------------------
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5a4334, roughness: 0.95 });
  const leafMats = [0x2f4a33, 0x37573b, 0x29412d].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true }));
  const cutMat = new THREE.MeshStandardMaterial({ color: 0xe0c08f, roughness: 0.8 });
  const makeTree = (x, side, seed) => {
    // Everything above the cut hangs off a pivot at the cut, so the tree tips
    // over its stump; the stump stays behind.
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(TRUNK_R, TRUNK_R * 1.05, NOTCH_Y, 14), barkMat);
    stump.position.set(x, NOTCH_Y / 2, 0);
    stump.castShadow = true;
    scene.add(stump);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(TRUNK_R * 0.97, TRUNK_R * 0.97, 0.01, 14), cutMat);
    ring.position.set(x, NOTCH_Y + 0.004, 0);
    scene.add(ring);
    const g = new THREE.Group();
    g.position.set(x, NOTCH_Y, 0);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(TRUNK_R * 0.8, TRUNK_R, 2.5 - NOTCH_Y, 14), barkMat);
    trunk.position.y = (2.5 - NOTCH_Y) / 2;
    trunk.castShadow = true;
    g.add(trunk);
    const rand = mulberry32(seed);
    for (let i = 0; i < 7; i++) {
      const r = 0.55 + rand() * 0.35;
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMats[i % 3]);
      leaf.position.set((rand() - 0.5) * 1.1, 2.75 - NOTCH_Y + rand() * 1.0, (rand() - 0.5) * 0.7);
      leaf.rotation.set(rand() * 3, rand() * 3, 0);
      leaf.castShadow = true;
      g.add(leaf);
    }
    // The cut: a pale gash on the side facing the chopper, growing with progress.
    const notch = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cutMat);
    notch.visible = false;
    g.add(notch);
    scene.add(g);
    const setCut = (p) => {
      notch.visible = p > 0.01;
      const depth = Math.max(0.02, p * TRUNK_R * 1.7);
      notch.scale.set(depth, 0.07 + 0.16 * p, 0.12 + 0.24 * Math.sqrt(p));
      notch.position.set(side * (TRUNK_R + 0.012 - depth / 2), 0, 0.02);
    };
    return { group: g, setCut };
  };
  const treeL = makeTree(-TREE_X, 1, 3);
  const treeR = makeTree(TREE_X, -1, 4);

  // ---- grindstone --------------------------------------------------------------------------
  const WHEEL = new THREE.Vector3(0, 0.78, -0.62);
  const WHEEL_R = 0.38;
  const wheelTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#7d7a76';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#5a5754';
    g.lineWidth = 10;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(128, 128);
      g.lineTo(128 + Math.cos((i * PI) / 3) * 128, 128 + Math.sin((i * PI) / 3) * 128);
      g.stroke();
    }
    g.fillStyle = '#3b3937';
    g.beginPath();
    g.arc(128, 128, 22, 0, PI * 2);
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const wheelSide = new THREE.MeshStandardMaterial({ color: 0x6e6b67, roughness: 0.9 });
  const wheelFace = new THREE.MeshStandardMaterial({ map: wheelTex, roughness: 0.9 });
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.12, 32), [wheelSide, wheelFace, wheelFace]);
  wheel.rotation.order = 'XZY';
  wheel.rotation.x = PI / 2;
  wheel.position.copy(WHEEL);
  wheel.castShadow = true;
  scene.add(wheel);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b5442, roughness: 0.85 });
  for (const dz of [-0.13, 0.13]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, WHEEL.y, 0.07), woodMat);
    post.position.set(0, WHEEL.y / 2, WHEEL.z + dz);
    post.castShadow = true;
    scene.add(post);
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.4), woodMat);
  base.position.set(0, 0.04, WHEEL.z);
  scene.add(base);

  // ---- axes ----------------------------------------------------------------------------------
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xcbbba4, roughness: 0.7 });
  const dullMat = new THREE.MeshStandardMaterial({ color: 0x5e6066, roughness: 0.6, metalness: 0.5 });
  const sharpMat = new THREE.MeshStandardMaterial({ color: 0x8f949c, roughness: 0.25, metalness: 0.8, emissive: 0x222222 });
  const makeAxe = () => {
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.84, 10), handleMat);
    handle.position.y = -0.34;
    g.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.2), dullMat);
    head.position.set(0, -0.7, -0.1);
    g.add(head);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 0.05), dullMat);
    edge.position.set(0, -0.7, -0.215);
    g.add(edge);
    g.traverse((o) => (o.castShadow = true));
    return { group: g, head, edge };
  };

  const L = new StickFigure(mat.figure); // vaktim yok diyen
  const R = new StickFigure(mat.figure); // baltasını bileyen
  scene.add(L.root, R.root);
  const axeL = makeAxe();
  L.attach('r', axeL.group);
  const axeR = makeAxe();
  R.attach('r', axeR.group);
  const looseR = makeAxe();
  looseR.group.visible = false;
  scene.add(looseR.group);

  // ---- swings -------------------------------------------------------------------------------
  const swingPose = (f, tired = 0) => {
    const up = { a: 2.7 - tired * 0.8, l: -0.1, e: 0.55, tw: 0.25 };
    const hit = { a: 0.47, l: 0.25, e: 0.08, tw: -0.12 };
    let k;
    if (f < 0.45) k = 1 - easeInOut(f / 0.45);
    else if (f < HIT) k = easeIn((f - 0.45) / (HIT - 0.45));
    else k = 1 - 0.1 * Math.sin(((f - HIT) / (1 - HIT)) * PI);
    return pose({
      lean: lerp(up.l, hit.l, k) + tired * 0.15,
      twist: lerp(up.tw, hit.tw, k),
      nod: lerp(-0.1, 0.35, k),
      rArm: lerp(up.a, hit.a, k),
      rEl: lerp(up.e, hit.e, k),
      lLeg: 0.3,
      rLeg: -0.15,
      lKnee: lerp(0.25, 0.45, k) + tired * 0.15,
      rKnee: lerp(0.1, 0.35, k) + tired * 0.15,
    });
  };
  const leftGrip = (axe) => ({ p: (fig, out) => axe.group.localToWorld(out.set(0, -0.2, 0)), pole: [0.3, 0.05, 0.1, 'chest'] });

  // A chopping clip from a list of swings [{ t0, period, tired }].
  const chopClip = (fig, axe, x, yaw, swings) => (u, lt, d, t) => {
    let s = swings[0];
    for (const sw of swings) if (t >= sw.t0) s = sw;
    const f = clamp((t - s.t0) / s.period, 0, 0.999);
    const p = swingPose(f, s.tired);
    return { pos: [x, STAND_HIP, 0], yaw, pose: p, ik: { lHand: leftGrip(axe) }, ground: 0 };
  };

  // Left: frantic at first, slower and weaker as he tires.
  const swingsL = [];
  for (let t = 0.05; t < 13.0; ) {
    const k = t / 13;
    const period = lerp(0.52, 0.9, k);
    swingsL.push({ t0: t, period, tired: k });
    t += period;
  }
  const endL = swingsL[swingsL.length - 1].t0 + swingsL[swingsL.length - 1].period;

  // Right: three dull swings, sharpen, three sharp ones.
  const dull = [0, 1, 2].map((i) => ({ t0: 0.05 + i * 0.62, period: 0.62, tired: 0 }));
  const sharpStart = 7.55;
  const sharp = [0, 1, 2].map((i) => ({ t0: sharpStart + i * 0.66, period: 0.66, tired: 0 }));
  const SHARPEN_X = 1.48;
  const toWheelYaw = Math.atan2(SHARPEN_X - CHOP_X, WHEEL.z);
  const backYaw = Math.atan2(CHOP_X - SHARPEN_X, -WHEEL.z) + 2 * PI;
  const sharpenHands = (lt) => {
    const slide = 0.05 * Math.sin(lt * 7);
    const headPos = new THREE.Vector3(WHEEL.x + WHEEL_R + 0.03 + slide, WHEEL.y + 0.12, WHEEL.z + 0.05);
    return headPos;
  };

  const lTrack = new Track(L, [
    { name: 'chop', d: endL, fn: chopClip(L, axeL, -CHOP_X, -PI / 2, swingsL) },
    {
      name: 'tired',
      d: 6,
      blend: 0.4,
      fn: (u, lt, d, t) => {
        // Bent over, hands on knees, out of breath.
        const pant = Math.sin(t * 9) * 0.04;
        const p = pose({ lean: 0.8 + pant, nod: -0.35, lArm: 0.45, rArm: 0.45, lEl: 0.2, rEl: 0.2, lLeg: 0.4, rLeg: 0.15, lKnee: 0.45, rKnee: 0.3 });
        return { pos: [-CHOP_X, STAND_HIP, 0], yaw: -PI / 2, pose: p, ik: { lHand: leftGrip(axeL) }, ground: 0 };
      },
    },
  ]);

  const rTrack = new Track(R, [
    { name: 'dull', d: dull[2].t0 + dull[2].period, fn: chopClip(R, axeR, CHOP_X, PI / 2, dull) },
    {
      name: 'inspect',
      d: 0.75,
      blend: 0.25,
      fn: (u, lt, d, t) => ({ pos: [CHOP_X, STAND_HIP, 0], yaw: PI / 2, pose: breathe(pose({ nod: 0.15, tilt: 0.25, rArm: 1.45, rEl: 1.75, rOut: 0.2, rArmTw: 0.6 }), t), ik: { lHand: leftGrip(axeR) }, ground: 0 }),
    },
    { name: 'toWheel', d: 0.65, fn: walkTo({ from: [CHOP_X, 0], to: [SHARPEN_X, WHEEL.z], yaw: toWheelYaw, ground: 0, amp: 0.32 }) },
    {
      name: 'sharpen',
      d: sharpStart - 0.7 - 0.6 - 0.65 - 0.75 - (dull[2].t0 + dull[2].period),
      blend: 0.3,
      fn: (u, lt, d, t) => {
        const h = sharpenHands(lt);
        return {
          pos: [SHARPEN_X, STAND_HIP, WHEEL.z],
          yaw: 1.5 * PI,
          pose: breathe(pose({ lean: 0.35, nod: 0.5, lLeg: 0.35, rLeg: 0.1, lKnee: 0.5, rKnee: 0.4 }), t, 0.5),
          ik: {
            rHand: { p: [h.x + 0.78, h.y, h.z, 'world'] },
            lHand: { p: [h.x + 0.56, h.y, h.z, 'world'] },
          },
          ground: 0,
        };
      },
    },
    { name: 'test', d: 0.6, blend: 0.25, fn: stand({ x: SHARPEN_X, z: WHEEL.z, yaw: 1.5 * PI, ground: 0, pose: { nod: 0.1, tilt: -0.2, rArm: 1.45, rEl: 1.75, rArmTw: 0.6 } }) },
    { name: 'back', d: 0.7, fn: walkTo({ from: [SHARPEN_X, WHEEL.z], to: [CHOP_X, 0], yaw: backYaw, ground: 0, amp: 0.32 }) },
    { name: 'sharp', d: sharp[2].t0 + sharp[2].period - sharpStart + 0.1, blend: 0.35, fn: chopClip(R, axeR, CHOP_X, PI / 2 + 2 * PI, sharp) },
    {
      name: 'lean',
      d: 7,
      blend: 0.45,
      fn: (u, lt, d, t) => ({
        pos: [CHOP_X - 0.05, STAND_HIP, 0],
        yaw: PI / 2 + 2 * PI - 0.5,
        pose: breathe(pose({ lean: 0.05, nod: 0.1, turn: -0.9 * smoothstep(0.6, 1.4, lt), lLeg: 0.1, rLeg: -0.2 }), t),
        ik: {
          rHand: { p: (fig, out) => out.set(CHOP_X + 0.5, 0.9, 0.12) },
          lHand: { p: (fig, out) => out.set(CHOP_X + 0.48, 0.86, 0.02) },
        },
        ground: 0,
      }),
    },
  ]);

  // ---- progress, effects, sounds --------------------------------------------------------------
  const impacts = (swings) => swings.map((s) => s.t0 + HIT * s.period);
  const hitsL = impacts(swingsL);
  const hitsDull = impacts(dull);
  const hitsSharp = impacts(sharp);
  const fallAt = hitsSharp[2] + 0.12;
  const cutL = (t) => hitsL.filter((h) => t >= h).length * 0.0075;
  const cutR = (t) => Math.min(1, hitsDull.filter((h) => t >= h).length * 0.02 + hitsSharp.filter((h) => t >= h).length * 0.32);

  world.makeParticles('chips', new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xe0c08f, roughness: 0.8 }));
  world.makeParticles('sparks', new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
  world.makeParticles('dust', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6b6460, roughness: 1, transparent: true, opacity: 0.7 }));
  const chips = (x, dir, t, n, seed) => {
    const r = mulberry32(seed);
    const parts = Array.from({ length: n }, () => ({ x, y: NOTCH_Y, z: (r() - 0.5) * 0.2, vx: dir * (0.5 + r() * 1.5), vy: 0.8 + r() * 1.8, vz: (r() - 0.5) * 0.8, delay: 0, r: 0.015 + r() * 0.02 }));
    world.addBurst('chips', { t0: t, parts, floor: 0, life: 1.4, settle: true });
  };
  const sfx = [];
  hitsL.forEach((h, i) => {
    chips(-TREE_X + TRUNK_R, 1, h, 3, 10 + i);
    sfx.push({ t: h, type: 'chop', gain: 0.55 });
  });
  hitsDull.forEach((h, i) => {
    chips(TREE_X - TRUNK_R, -1, h, 3, 200 + i);
    sfx.push({ t: h, type: 'chop', gain: 0.6 });
  });
  hitsSharp.forEach((h, i) => {
    chips(TREE_X - TRUNK_R, -1, h, 22, 300 + i);
    sfx.push({ t: h, type: 'chop', gain: 1.2 });
  });
  const sharpenFrom = rTrack.at('sharpen') + 0.25;
  const sharpenTo = rTrack.at('test');
  for (let t = sharpenFrom; t < sharpenTo; t += 0.06) {
    const r = mulberry32(Math.floor(t * 1000));
    const parts = Array.from({ length: 5 }, () => ({ x: WHEEL.x + WHEEL_R, y: WHEEL.y + 0.1, z: WHEEL.z + 0.08, vx: -(0.6 + r() * 2.2), vy: 0.2 + r() * 1.6, vz: (r() - 0.2) * 0.8, delay: r() * 0.05, r: 0.008 + r() * 0.01 }));
    world.addBurst('sparks', { t0: t, parts, life: 0.4, gravity: 6 });
  }
  sfx.push({ t: sharpenFrom, type: 'grind' }, { t: sharpenFrom + 1.4, type: 'grind' });
  const landAt = fallAt + 1.25;
  sfx.push({ t: fallAt, type: 'creak' }, { t: landAt, type: 'crash' });
  {
    const r = mulberry32(77);
    const parts = Array.from({ length: 60 }, () => {
      const along = 0.6 + r() * 3.2;
      return { x: TREE_X + along, y: 0.05, z: (r() - 0.5) * 0.8, vx: (r() - 0.5) * 0.8, vy: 0.4 + r() * 1.2, vz: (r() - 0.5) * 0.8, delay: r() * 0.15, r: 0.04 + r() * 0.07 };
    });
    world.addBurst('dust', { t0: landAt, parts, life: 1.6, gravity: 0.6 });
  }

  // ---- text --------------------------------------------------------------------------------------
  // Both titles are long, so they get a smaller size to keep clear of each other.
  for (const [text, x] of [['"VAKTİM YOK" DİYEN', -1.6], ['BALTASINI BİLEYEN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '36px', letterSpacing: '0.1em' });
  }
  world.addThought('durursam geri kalırım', L, 2.6, 4.2);
  world.addThought('vaktim yok!', L, 5.4, 6.8);
  world.addThought('nasıl yani?', L, landAt + 0.1, landAt + 1.6);
  world.addThought('daha hızlı vurmalıyım', L, landAt + 1.7, landAt + 3.2);
  world.setCaption('Baltanı bilemeye vakit ayır.', landAt + 0.8, { top: 470 });

  // ---- per frame ------------------------------------------------------------------------------------
  world.onUpdate((t) => {
    lTrack.apply(t);
    rTrack.apply(t);
    treeL.setCut(cutL(t));
    treeR.setCut(cutR(t));

    // Timber: falls away from the chopper, accelerating, with a small bounce.
    const ft = t - fallAt;
    let ang = 0;
    if (ft > 0) {
      const k = clamp(ft / 1.25);
      ang = easeIn(k) * (PI / 2 - 0.06);
      if (ft > 1.25) ang = PI / 2 - 0.06 + 0.05 * Math.sin((ft - 1.25) * 14) * Math.exp(-(ft - 1.25) * 6);
    }
    treeR.group.rotation.z = -ang;

    // Wheel spins while in use.
    const spinning = smoothstep(rTrack.at('sharpen'), sharpenFrom, t) * (1 - smoothstep(sharpenTo, sharpenTo + 0.4, t));
    wheel.rotation.y = -t * 14 * spinning - (t > sharpenTo ? (sharpenTo - rTrack.at('sharpen')) * 14 : 0);

    // Axe: in the hand while chopping, held against the wheel while sharpening,
    // planted head-down to lean on at the end.
    const sharpening = t >= rTrack.at('sharpen') && t < rTrack.at('test');
    const leaning = t >= rTrack.at('lean') + 0.25;
    axeR.group.visible = !sharpening && !leaning;
    looseR.group.visible = sharpening || leaning;
    if (sharpening) {
      const h = sharpenHands(t - rTrack.at('sharpen'));
      looseR.group.position.set(h.x + 0.78, h.y, h.z);
      looseR.group.rotation.set(0, 0, -PI / 2);
    } else if (leaning) {
      looseR.group.position.set(CHOP_X + 0.5, 0.92, 0.07);
      looseR.group.rotation.set(0, PI / 2, 0.12);
    }
    const isSharp = t >= sharpenFrom + 1.0;
    for (const a of [axeR, looseR]) {
      a.head.material = isSharp ? sharpMat : dullMat;
      a.edge.material = isSharp ? sharpMat : dullMat;
    }
  });

  const markers = Object.fromEntries([...rTrack.clips.map((c) => ['R.' + c.name, +c.t0.toFixed(2)]), ['L.tired', +lTrack.at('tired').toFixed(2)], ['fallAt', +fallAt.toFixed(2)], ['landAt', +landAt.toFixed(2)]]);
  return { duration: Math.max(landAt + 4.0, 15), sfx, markers };
}
