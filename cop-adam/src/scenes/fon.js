// SORGULAMADAN İNANAN vs ARAŞTIRAN
// A smiling salesman in a suit calls both: "never-falling fund!". One puts all
// his savings into a shiny gold safe (no writing on it) and watches the number climb; the
// other asks about the risk, reads the long fine print and spreads his money
// over three baskets. The salesman pockets his commission, a padlock slams
// onto the safe (DONDURULDU) and he walks off for good. The baskets are still
// there.
// No bank, fund or person is named or shown; the target is the pitch.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, walkTo } from '../moves.js';
import { PI, lerp, clamp, smooth, smoothstep, easeIn, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const SAVINGS = 500000;
const LX = -2.0;
const RX = 2.0;
const FRONT = 0.35;
const SAFE = new THREE.Vector3(-1.05, 0, 0.35);
const PILE_L = new THREE.Vector3(-2.75, 0, 0.75);
const PILE_R = new THREE.Vector3(2.75, 0, 0.75);
const BASKETS = [1.3, 1.85, 2.4].map((x) => new THREE.Vector3(x, 0, 0.95));
const BUNDLES = 5;

// Story beats (seconds).
const T = {
  ring: [0.25, 2.2],
  deposit: [2.9, 3.9], // bundles fly into the safe, one after another
  read: [3.6, 5.0],
  split: [5.0, 6.3],
  rise: [4.0, 7.4],
  commission: 6.7,
  lock: 7.5,
  leave: [7.9, 9.1],
  caption: 11.6,
  end: 13.5,
};

const tl = (n) => `${Math.round(n).toLocaleString('tr-TR')} TL`;

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.2, swell: 0.08 });
  world.key.intensity = 1.7;

  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
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

  // ---- room ----------------------------------------------------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), std(0x1f2124, { roughness: 0.95 }));
  wall.position.set(0, 3.25, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);
  const spot = new THREE.SpotLight(0xfff2e0, 10, 14, 0.6, 0.6, 1.2);
  spot.position.set(0, 7.5, 4);
  spot.target.position.set(0, 0.5, 0.3);
  scene.add(spot, spot.target);

  // ---- the safe and the padlock ---------------------------------------------------------------------
  const gold = std(0xd4a93a, { metalness: 0.85, roughness: 0.25, emissive: 0x3a2a05 });
  const safe = new THREE.Group();
  safe.position.copy(SAFE);
  box(gold, 0.72, 0.82, 0.6, 0, 0.41, 0, safe);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 24), std(0x2a2a2a, { metalness: 0.6 }));
  dial.rotation.x = PI / 2;
  dial.position.set(0, 0.38, 0.31);
  safe.add(dial);
  const safeGlow = new THREE.PointLight(0xffd36a, 0, 3.5, 2);
  safeGlow.position.set(0, 1.1, 0.5);
  safe.add(safeGlow);
  scene.add(safe);

  const lock = new THREE.Group();
  box(std(0x8a1414, { metalness: 0.4, roughness: 0.4, emissive: 0x250303 }), 0.5, 0.42, 0.12, 0, 0, 0, lock);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 10, 24, PI), std(0xb8bcc2, { metalness: 0.8, roughness: 0.25 }));
  shackle.position.y = 0.21;
  lock.add(shackle);
  scene.add(lock);

  // ---- money -------------------------------------------------------------------------------------
  const note = std(0x6fb873, { roughness: 0.7, emissive: 0x15301a });
  const band = std(0xf0ead8, { roughness: 0.7 });
  const makeBundle = () => {
    const g = new THREE.Group();
    box(note, 0.3, 0.09, 0.16, 0, 0, 0, g);
    box(band, 0.06, 0.095, 0.165, 0, 0, 0, g);
    scene.add(g);
    return g;
  };
  const pileSpot = (pile, i) => new THREE.Vector3(pile.x + (i % 2) * 0.12 - 0.06, 0.05 + Math.floor(i / 2) * 0.09, pile.z + (i % 2) * 0.05);
  const bundlesL = Array.from({ length: BUNDLES }, makeBundle);
  const bundlesR = Array.from({ length: BUNDLES }, makeBundle);
  const commission = makeBundle();

  const wicker = std(0x9a7448, { roughness: 0.95 });
  for (const b of BASKETS) {
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.26, 18, 1, true), wicker);
    basket.material.side = THREE.DoubleSide;
    basket.position.set(b.x, 0.13, b.z);
    basket.castShadow = true;
    scene.add(basket);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.17, 18), wicker);
    floor.rotation.x = -PI / 2;
    floor.position.set(b.x, 0.01, b.z);
    scene.add(floor);
  }

  // Fine print: a long sheet that unrolls to the floor.
  const fineTex = canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#8a8a8a';
    for (let y = 10; y < h; y += 9) g.fillRect(8, y, 60 + ((y * 37) % 50), 3);
  });
  const fine = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1), new THREE.MeshStandardMaterial({ map: fineTex, roughness: 0.9, side: THREE.DoubleSide }));
  fine.geometry.translate(0, -0.5, 0);
  scene.add(fine);

  // ---- people -----------------------------------------------------------------------------------
  const L = new StickFigure(mat.figure);
  const R = new StickFigure(mat.figure);
  const S = new StickFigure(mat.figure); // the salesman
  scene.add(L.root, R.root, S.root);
  // Suit: dark jacket over the torso, red tie, briefcase.
  const suit = std(0x23262c, { roughness: 0.5 });
  const jacket = new THREE.Mesh(new THREE.CapsuleGeometry(DIM.torsoR * 2.3, DIM.torso * 0.75, 6, 14), suit);
  jacket.position.y = DIM.torso * 0.5;
  jacket.scale.z = 0.75;
  S.j.spine.add(jacket);
  const tie = box(std(0xc0141e, { emissive: 0x300306 }), 0.05, 0.3, 0.02, 0, DIM.torso * 0.62, DIM.torsoR * 1.75, S.j.spine);
  tie.castShadow = false;
  for (const side of ['lSh', 'rSh']) {
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(DIM.limbR * 1.5, DIM.upperArm * 0.8, 4, 10), suit);
    sleeve.position.y = -DIM.upperArm / 2;
    S.j[side].add(sleeve);
  }
  const brief = new THREE.Group();
  box(std(0x3b2516, { roughness: 0.6 }), 0.36, 0.26, 0.09, 0, -0.13, 0, brief);
  box(std(0xc9a54a, { metalness: 0.7 }), 0.12, 0.03, 0.03, 0, 0.01, 0, brief);
  S.attach('r', brief);

  const phones = [L, R].map(() => {
    const p = new THREE.Group();
    box(std(0x1a1a1e), 0.075, 0.14, 0.012, 0, 0, 0, p);
    scene.add(p);
    return p;
  });

  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const atEar = { rHand: { p: [-0.15, -0.02, 0.06, 'head'], pole: [-0.5, -0.3, 0, 'chest'] } };
  const armsCrossed = {
    lHand: { p: [-0.13, 0.3, 0.17, 'chest'], pole: [0.35, 0.2, 0.15, 'chest'] },
    rHand: { p: [0.13, 0.32, 0.19, 'chest'], pole: [-0.35, 0.2, 0.15, 'chest'] },
  };
  const standAt = (x, z, yaw, p, ik) => (u, lt, d, t) => ({ pos: [x, STAND_HIP, z], yaw, pose: breathe(pose(p), t, 0.4), ik: typeof ik === 'function' ? ik(lt, t) : ik, ground: 0 });

  // Left: phone, pours everything into the safe, dances, then the lock.
  const lTrack = new Track(L, [
    { name: 'call', d: T.ring[1], fn: standAt(LX, FRONT, 0.3, { nod: 0.1, turn: 0.3 }, atEar) },
    { name: 'toSafe', d: 0.6, blend: 0.3, fn: walkTo({ from: [LX, FRONT], to: [-1.65, 0.5], yaw: PI / 2, ground: 0, amp: 0.35 }) },
    { name: 'deposit', d: T.rise[0] - T.ring[1] - 0.6, blend: 0.2, fn: standAt(-1.65, 0.5, 1.2, { lean: 0.2, nod: 0.3, lArm: 1.0, rArm: 1.0, lEl: 0.6, rEl: 0.6 }) },
    {
      name: 'dance',
      d: T.lock - T.rise[0],
      blend: 0.3,
      fn: (u, lt, d, t) => {
        const s = Math.sin(lt * 2 * PI * 1.8);
        return { pos: [-1.75, STAND_HIP, 0.6], yaw: 0.5, pose: pose({ nod: -0.25, side: 0.12 * s, lArm: 0.2, rArm: 0.2, lOut: 1.6 + 0.9 * s, rOut: 1.6 - 0.9 * s, lEl: 0.5, rEl: 0.5, lKnee: 0.15 + 0.15 * s, rKnee: 0.15 - 0.15 * s }), ground: 0, lift: 0.05 * Math.abs(s) };
      },
    },
    { name: 'shock', d: 0.8, blend: 0.12, fn: standAt(-1.75, 0.6, 0.6, { lean: -0.15, nod: -0.3, lArm: 2.6, rArm: 2.6, lOut: 0.5, rOut: 0.5, lEl: 1.7, rEl: 1.7 }) },
    {
      name: 'pound',
      d: 1.9,
      blend: 0.25,
      fn: (u, lt, d, t) => {
        const hit = 0.5 + 0.5 * Math.cos(lt * 2 * PI * 2.6);
        return {
          pos: [-1.6, STAND_HIP, 0.75],
          yaw: 1.2,
          pose: pose({ lean: 0.35, nod: 0.25 }),
          ik: { rHand: { p: [SAFE.x - 0.2, 0.55 + 0.25 * hit, SAFE.z + 0.34, 'world'] }, lHand: { p: [SAFE.x - 0.25, 0.75, SAFE.z + 0.32, 'world'] } },
          ground: 0,
        };
      },
    },
    {
      name: 'kneel',
      d: 10,
      blend: 0.5,
      fn: (u, lt, d, t) => ({
        pos: [-1.7, 0.62, 0.8],
        yaw: 0.9,
        pose: breathe(pose({ lean: 0.55, nod: 0.6, lLeg: 0.2, rLeg: 1.4, lKnee: 1.9, rKnee: 1.5, lArm: 0.3, rArm: 0.3 }), t, 0.5),
      }),
    },
  ]);

  // Right: phone, asks, reads the fine print, spreads the money, arms crossed.
  const rTrack = new Track(R, [
    { name: 'call', d: T.ring[1], fn: standAt(RX, FRONT, -0.3, { nod: 0.1, turn: -0.3 }, atEar) },
    { name: 'ask', d: T.read[0] - T.ring[1], blend: 0.25, fn: standAt(RX, FRONT, -0.6, { nod: -0.05, rArm: 1.0, rOut: 0.5, rEl: 0.9, lArm: 0.8, lOut: 0.4, lEl: 0.9, lArmTw: -0.8, rArmTw: -0.8 }) },
    { name: 'read', d: T.read[1] - T.read[0], blend: 0.25, fn: standAt(RX, FRONT, 0, { nod: 0.55, lean: 0.05 }, { lHand: { p: [0.12, 0.3, 0.32, 'chest'] }, rHand: { p: [-0.12, 0.3, 0.32, 'chest'] } }) },
    { name: 'split', d: T.split[1] - T.split[0], blend: 0.25, fn: standAt(RX, 0.55, 0.4, { nod: 0.45, lean: 0.25, rArm: 0.9, lArm: 0.9, rOut: 0.3, lOut: 0.3, rEl: 0.4, lEl: 0.4 }) },
    { name: 'calm', d: 10, blend: 0.4, fn: standAt(RX, 0.55, -0.15, { nod: 0.05, lean: -0.03 }, armsCrossed) },
  ]);

  // Salesman: centre stage, turns to each, takes his cut, walks off and stays gone.
  const SX = 0;
  const SZ = 0.95;
  const pitch = { nod: -0.15, lean: -0.05, lArm: 2.5, lOut: 0.5, lEl: 0.2 };
  const sTrack = new Track(S, [
    { name: 'pitch', d: T.ring[1], fn: standAt(SX, SZ, 0, pitch) },
    { name: 'toLeft', d: 1.2, blend: 0.3, fn: standAt(SX, SZ, -0.9, { ...pitch, lArm: 1.0, lOut: 0.6 }) },
    { name: 'toRight', d: 1.6, blend: 0.3, fn: standAt(SX, SZ, 0.9, { nod: 0.15, lArm: 0.4, lOut: 0.9, lEl: 0.3, lArmTw: -0.8 }) },
    { name: 'walkL', d: 0.6, blend: 0.2, fn: walkTo({ from: [SX, SZ], to: [-0.45, 0.85], yaw: -PI / 2, ground: 0, amp: 0.3 }) },
    {
      name: 'grab',
      d: 0.5,
      blend: 0.2,
      fn: (u, lt, d, t) => ({ pos: [-0.45, STAND_HIP, 0.85], yaw: -PI / 2 - 0.4, pose: pose({ lean: 0.3, nod: 0.3 }), ik: { lHand: { p: [SAFE.x + 0.15, 0.9 - 0.1 * Math.sin(lt * 6), SAFE.z + 0.15, 'world'] } }, ground: 0 }),
    },
    { name: 'smirk', d: T.lock - T.commission - 0.15 + 0.4, blend: 0.2, fn: standAt(-0.45, 0.85, 0.2, { nod: -0.2, lean: -0.08, lArm: 0.1 }) },
    // Leaves along the front, well clear of the right one.
    { name: 'leave', d: T.leave[1] - T.leave[0] + 0.1, blend: 0.2, fn: walkTo({ from: [-0.45, 0.85], to: [4.4, 1.6], yaw: PI / 2 - 0.12, ground: 0, amp: 0.4 }) },
    { name: 'gone', d: 10, fn: standAt(5.5, 1.6, PI / 2, {}) },
  ]);

  // ---- text ----------------------------------------------------------------------------------
  for (const [text, x] of [['SORGULAMADAN İNANAN', -1.6], ['ARAŞTIRAN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '32px', letterSpacing: '0.06em' });
  }
  const meter = (x) => {
    const l = world.addLabel('', [x, 5.55, 0]);
    Object.assign(l.el.style, { fontSize: '40px' });
    return l;
  };
  const lMeter = meter(-1.6);
  const rMeter = meter(1.6);
  const shout = (text, anchor, t0, t1, color = '#e8c15a', size = '38px') =>
    Object.assign(world.addLabel(text, anchor, { t0, t1 }).el.style, { fontSize: size, color, textShadow: '0 0 22px rgba(0,0,0,0.6)' });
  const headOf = (fig, dy = 0.45) => () => fig.headWorld().add(new THREE.Vector3(0, dy, 0));
  shout('HİÇ DÜŞMEYEN FON!', headOf(S, 0.55), 0.3, 3.2);
  shout('DONDURULDU', [SAFE.x - 0.1, 2.45, SAFE.z + 0.4], T.lock + 0.1, T.end + 1, '#ff4a3d', '40px');
  shout('KOMİSYON', () => commission.position.clone().add(new THREE.Vector3(0, 0.3, 0)), T.commission, T.commission + 1.0, '#7ddc7d', '28px');
  world.addThought('garantiymiş!', L, 2.3, 3.5);
  world.addThought('zengin oluyorum!', L, 5.3, 6.9);
  world.addThought('param nerede?!', L, T.lock + 0.7, T.lock + 2.2);
  world.addThought('kimse açmıyor...', L, 10.3, 11.8);
  world.addThought('riski ne?', R, 2.3, 3.0);
  world.addThought('yazılı verin.', R, 3.0, 3.9);
  world.setCaption('Bedava peynir\nfare kapanında olur.', T.caption, { top: 470 });

  // ---- sounds and particles -------------------------------------------------------------------------
  const sfx = [];
  for (const base of [T.ring[0], T.ring[0] + 0.7]) for (let k = 0; k < 6; k++) sfx.push({ t: base + k * 0.06, type: 'tick', gain: 2.5 });
  const flyAt = (i) => T.deposit[0] + i * 0.18;
  for (let i = 0; i < BUNDLES; i++) sfx.push({ t: flyAt(i) + 0.35, type: 'coin', gain: 0.8 });
  for (let i = 0; i < BUNDLES; i++) sfx.push({ t: T.split[0] + i * 0.22 + 0.35, type: 'rustle', gain: 0.6 });
  sfx.push({ t: T.read[0] + 0.1, type: 'rustle', gain: 1 });
  sfx.push({ t: T.commission + 0.2, type: 'register', gain: 1 });
  sfx.push({ t: T.lock + 0.35, type: 'crash', gain: 1.2 }, { t: T.lock + 0.35, type: 'block', gain: 1.5 });
  for (let k = 0; k < 5; k++) sfx.push({ t: T.lock + 1.2 + k / 2.6, type: 'block', gain: 0.7 });
  sfx.push({ t: T.caption, type: 'chime', gain: 0.5 });

  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  world.makeParticles('dust', new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 1 }));
  const rand = mulberry32(5);
  const dust = Array.from({ length: 40 }, () => ({ x: SAFE.x + (rand() - 0.5) * 0.6, y: 0.85, z: SAFE.z + 0.3, vx: (rand() - 0.5) * 2.2, vy: 0.5 + rand() * 1.2, vz: rand() * 1.0, delay: 0, r: 0.015 + rand() * 0.02 }));
  world.addBurst('dust', { t0: T.lock + 0.35, parts: dust, life: 0.9, gravity: 6 });
  for (let i = 0; i < BUNDLES; i++) {
    const r2 = mulberry32(30 + i);
    const parts = Array.from({ length: 6 }, () => ({ x: SAFE.x, y: 1.0, z: SAFE.z + 0.2, vx: (r2() - 0.5) * 1.2, vy: 0.4 + r2(), vz: r2() * 0.4, delay: 0, r: 0.012 + r2() * 0.01 }));
    world.addBurst('glints', { t0: flyAt(i) + 0.35, parts, life: 0.5, gravity: 2 });
  }

  // ---- per frame ---------------------------------------------------------------------------------------
  const arc = (from, to, u, h, out) => out.lerpVectors(from, to, u).setY(lerp(from.y, to.y, u) + h * 4 * u * (1 - u));
  const lValue = (t) => SAVINGS * (1 + 0.45 * smoothstep(...T.rise, t));
  const rValue = (t) => SAVINGS * (1 + 0.08 * smoothstep(T.split[1], T.end - 1, t));
  world.onUpdate((t) => {
    lTrack.apply(t);
    rTrack.apply(t);
    sTrack.apply(t);

    const locked = t >= T.lock + 0.35;
    lMeter.el.textContent = locked ? '0 TL' : `${tl(lValue(t))}${t > T.rise[0] ? ' ↑' : ''}`;
    lMeter.el.style.color = locked ? '#ff4a3d' : t > T.rise[0] ? '#f3d77a' : '#e8e8e8';
    rMeter.el.textContent = tl(rValue(t));
    rMeter.el.style.color = '#7ddc7d';

    // Phones at the ear while it rings.
    [L, R].forEach((fig, i) => {
      const p = phones[i];
      p.visible = t < T.ring[1];
      if (p.visible) {
        p.position.copy(fig.handWorld('r', v1));
        p.lookAt(fig.headWorld(v2));
      }
    });

    // Left bundles: from his pile into the safe.
    bundlesL.forEach((b, i) => {
      const t0 = flyAt(i);
      const u = clamp((t - t0) / 0.35);
      const from = pileSpot(PILE_L, i);
      const to = v2.set(SAFE.x, 0.95, SAFE.z);
      b.visible = u < 1;
      arc(from, to, u, 0.9, b.position);
      b.rotation.set(0, u * 3, 0);
      b.scale.setScalar(u > 0.85 ? Math.max(0.001, (1 - u) / 0.15) : 1);
    });
    // Right bundles: from his pile into the three baskets.
    bundlesR.forEach((b, i) => {
      const t0 = T.split[0] + i * 0.22;
      const u = clamp((t - t0) / 0.35);
      const from = pileSpot(PILE_R, i);
      const basket = BASKETS[i % 3];
      const to = v2.set(basket.x + (i > 2 ? 0.05 : -0.03), 0.22 + (i > 2 ? 0.07 : 0), basket.z);
      arc(from, to, u, 0.7, b.position);
      b.rotation.set(0, u * 2 + i, 0);
    });

    // The safe glows while the number climbs; the lock drops on it.
    safeGlow.intensity = locked ? 0 : 4 * smoothstep(...T.rise, t) * (0.8 + 0.2 * Math.sin(t * 8));
    gold.emissive.setHex(locked ? 0x0a0802 : 0x3a2a05);
    const fall = clamp((t - T.lock) / 0.35);
    lock.visible = t >= T.lock;
    lock.position.set(SAFE.x, lerp(6.5, 0.55, easeIn(fall)) + (locked ? 0.03 * Math.exp(-(t - T.lock - 0.35) * 8) * Math.sin((t - T.lock) * 40) : 0), SAFE.z + 0.37);
    lock.rotation.set(0, 0, locked ? 0 : 0.3 * (1 - fall));

    // Commission: one bundle hops out of the safe into the briefcase.
    const cu = clamp((t - T.commission) / 0.45);
    commission.visible = t >= T.commission && cu < 1;
    arc(v1.set(SAFE.x, 0.9, SAFE.z), S.handWorld('r', v2).add(new THREE.Vector3(0, -0.1, 0)), cu, 0.5, commission.position);

    // Fine print unrolls from his hands to the floor while he reads.
    const reading = t >= T.read[0] && t < T.read[1] + 0.1;
    fine.visible = reading;
    if (reading) {
      fine.position.copy(R.handWorld('l', v1)).add(R.handWorld('r', v2)).multiplyScalar(0.5).add(v2.set(0, 0.05, 0.03));
      fine.scale.y = Math.max(0.001, lerp(0.2, fine.position.y - 0.02, smoothstep(T.read[0] + 0.2, T.read[0] + 0.9, t)));
      fine.rotation.set(-0.15, 0, 0);
    }
  });

  const markers = Object.fromEntries([...lTrack.clips.map((c) => ['L.' + c.name, +c.t0.toFixed(2)]), ...rTrack.clips.map((c) => ['R.' + c.name, +c.t0.toFixed(2)]), ...sTrack.clips.map((c) => ['S.' + c.name, +c.t0.toFixed(2)])]);
  return { duration: T.end, sfx, markers };
}
