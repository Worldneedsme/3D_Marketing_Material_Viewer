// HARCAYAN vs BİRİKTİREN
// Both get the same gold coin on every payday. The spender swaps each one for
// something at the sale kiosk and tosses it on a pile that loses its colour.
// The saver puts each coin under his feet; after a while the stack starts
// growing by itself (interest) and lifts him up.
import * as THREE from 'three';
import { StickFigure, STAND_HIP, DIM } from '../rig.js';
import { Track } from '../timeline.js';
import { pose, keyed } from '../poses.js';
import { breathe } from '../moves.js';
import { PI, lerp, smooth, smoothstep, easeInOut, clamp, mulberry32 } from '../math.js';

const PAY = 1.1; // seconds between paydays
const FIRST = 0.6; // first catch
const PAYDAYS = 10;
const payAt = (k) => FIRST + k * PAY;
const COIN_R = 0.3;
const COIN_H = 0.08;
const SX = 1.7; // saver
const HX = -1.7; // spender
const COIN_VALUE = 1000;
const ITEM_S = 1.5; // bought things are drawn a bit larger than life to read on a phone

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 4.2, 20.5], target: [0, 3.0, 0], fov: 35 });
  world.makeWater({ tint: 0.24, swell: 0.12 });

  // ---- coins ---------------------------------------------------------------------
  const faceTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(110, 100, 10, 128, 128, 128);
    grad.addColorStop(0, '#ffe7a1');
    grad.addColorStop(1, '#d9a531');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#b8821c';
    g.lineWidth = 10;
    g.beginPath();
    g.arc(128, 128, 104, 0, PI * 2);
    g.stroke();
    g.fillStyle = '#a8740f';
    g.font = "bold 132px Inter, 'DejaVu Sans', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('₺', 128, 136);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const gold = { metalness: 0.85, roughness: 0.3, envMapIntensity: 2.4 };
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xe8b443, emissive: 0x3a2600, ...gold });
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, emissive: 0x2a1c00, ...gold });
  const coinMats = [sideMat, faceMat, faceMat];
  const coinGeo = new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_H, 40);

  // ---- the saver's stack ---------------------------------------------------------------
  // Deposits land half a second after each catch; interest coins arrive at an
  // exponentially growing rate: N(t) = a/b * (e^(b(t - t0)) - 1).
  const deposits = Array.from({ length: PAYDAYS }, (_, k) => payAt(k) + 0.5);
  const INTEREST = 38;
  const it0 = 3.8;
  const itEnd = 13.6;
  const b = 0.42;
  const a = (INTEREST * b) / (Math.exp(b * (itEnd - it0)) - 1);
  const interest = Array.from({ length: INTEREST }, (_, i) => it0 + Math.log(1 + ((i + 1) * b) / a) / b);
  const rand = mulberry32(11);
  const stack = [...deposits.map((t) => ({ t, slide: -0.3 })), ...interest.map((t) => ({ t, slide: 0.5 }))]
    .sort((p, q) => p.t - q.t)
    .map((c) => ({ ...c, dx: (rand() - 0.5) * 0.06, dz: (rand() - 0.5) * 0.06, ry: rand() * PI * 2 }));
  const grow = (c, t) => smoothstep(c.t, c.t + 0.08, t);
  const stackTop = (t) => stack.reduce((h, c) => h + COIN_H * grow(c, t), 0);
  const coinsAt = (t) => stack.filter((c) => t >= c.t).length;

  const stackMesh = new THREE.InstancedMesh(coinGeo, coinMats, stack.length);
  stackMesh.castShadow = true;
  stackMesh.frustumCulled = false;
  scene.add(stackMesh);

  // ---- the kiosk -----------------------------------------------------------------------
  const KX = -3.1;
  const winX = KX + 0.5;
  const WIN = new THREE.Vector3(winX, 0.95, 0);
  const kiosk = new THREE.Group();
  const boxAt = (m, w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    kiosk.add(mesh);
    return mesh;
  };
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2c31, roughness: 0.6 });
  const light = new THREE.MeshStandardMaterial({ color: 0xd9d9d6, roughness: 0.5 });
  boxAt(dark, 1.0, 1.25, 0.9, KX, 0.625, 0);
  boxAt(new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.9 }), 0.03, 0.45, 0.6, winX + 0.005, 0.98, 0);
  boxAt(light, 0.2, 0.05, 0.7, winX + 0.08, 0.73, 0);
  boxAt(dark, 1.12, 0.08, 1.02, KX, 1.29, 0);
  for (let i = 0; i < 6; i++) {
    const stripe = boxAt(i % 2 ? light : mat.red, 0.5, 0.025, 0.17, winX + 0.18, 1.2, -0.425 + i * 0.17);
    stripe.rotation.z = -0.38;
  }
  const signTex = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#d4362a';
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#ffffff';
    g.font = "700 92px Pixel";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('İNDİRİM', 256, 86);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.3), new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.35, roughness: 0.6 }));
  sign.position.set(KX + 0.02, 1.52, 0.2);
  kiosk.add(sign);
  boxAt(dark, 0.04, 0.2, 0.04, KX - 0.35, 1.4, 0.2);
  boxAt(dark, 0.04, 0.2, 0.04, KX + 0.39, 1.4, 0.2);
  scene.add(kiosk);

  // ---- things the spender buys -------------------------------------------------------------
  const KINDS = ['cup', 'bag', 'box', 'phone', 'cup', 'bag', 'box', 'cup', 'phone', 'bag'];
  const makeItem = (kind) => {
    const g = new THREE.Group();
    const mats = [];
    const part = (geo, color, x, y, z, extra = {}) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
      mats.push(m);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      g.add(mesh);
      return mesh;
    };
    let half = 0.12;
    if (kind === 'cup') {
      part(new THREE.CylinderGeometry(0.085, 0.064, 0.25, 16), 0xf2f2ee, 0, 0, 0);
      part(new THREE.CylinderGeometry(0.083, 0.074, 0.08, 16), 0x8a5a3a, 0, -0.01, 0);
      part(new THREE.CylinderGeometry(0.092, 0.092, 0.03, 16), 0x2a2a2a, 0, 0.135, 0);
      half = 0.14;
    } else if (kind === 'bag') {
      part(new THREE.BoxGeometry(0.3, 0.32, 0.11), 0xd4362a, 0, 0, 0);
      const h = part(new THREE.TorusGeometry(0.07, 0.012, 6, 16, PI), 0x1e1e1e, 0, 0.16, 0);
      h.rotation.z = 0;
      half = 0.16;
    } else if (kind === 'box') {
      part(new THREE.BoxGeometry(0.42, 0.15, 0.26), 0xe9e2d4, 0, 0, 0);
      part(new THREE.BoxGeometry(0.43, 0.045, 0.27), 0xd4362a, 0, 0.065, 0);
      half = 0.095;
    } else {
      part(new THREE.BoxGeometry(0.12, 0.22, 0.025), 0x18181b, 0, 0, 0);
      part(new THREE.PlaneGeometry(0.1, 0.19), 0x4a7fe0, 0, 0, 0.014, { emissive: 0x2a50a0 });
      half = 0.11;
    }
    g.userData = { mats, base: mats.map((m) => m.color.clone()), half: half * ITEM_S };
    scene.add(g);
    return g;
  };
  const items = KINDS.map(makeItem);
  const pileRand = mulberry32(3);
  const pile = items.map((it, i) => {
    const row = Math.floor(i / 3);
    return {
      x: -1.2 + (i % 3) * 0.36 + row * 0.15 + (pileRand() - 0.5) * 0.06,
      y: row * 0.24 + it.userData.half,
      z: (pileRand() - 0.5) * 0.3,
      rz: (pileRand() - 0.5) * 0.9,
      ry: (pileRand() - 0.5) * 1.2,
    };
  });

  // ---- figures ---------------------------------------------------------------------------
  const H = new StickFigure(mat.figure); // harcayan
  const B = new StickFigure(mat.figure); // biriktiren
  scene.add(H.root, B.root);

  const STAND = pose();
  const READY = pose({ nod: -0.3, lArm: 2.0, rArm: 2.0, lOut: 0.25, rOut: 0.25, lEl: 0.7, rEl: 0.7 });
  const CATCH = pose({ nod: -0.5, lean: -0.05, lArm: 2.85, rArm: 2.85, lOut: 0.22, rOut: 0.22, lEl: 0.45, rEl: 0.45 });
  const THROW = pose({ nod: 0.05, lean: 0.25, rArm: 0.85, rEl: 0.1, lArm: 0.9, lEl: 0.6, lLeg: 0.2, rLeg: -0.15 });
  const OPEN = pose({ nod: 0.1, lean: 0.1, lArm: 1.35, rArm: 1.35, lEl: 0.7, rEl: 0.7, lOut: 0.15, rOut: 0.15 });
  const HOLD = pose({ nod: 0.45, lean: 0.05, lArm: 0.95, rArm: 0.95, lEl: 1.45, rEl: 1.45 });
  const TOSS = pose({ nod: -0.2, lean: -0.15, rArm: 3.1, rEl: 0.3, lArm: 0.5, lEl: 0.5, twist: 0.25 });
  const PLACE = pose({ nod: 0.55, lean: 0.85, lArm: 0.75, rArm: 0.75, lEl: 0.2, rEl: 0.2, lLeg: 0.75, rLeg: 0.75, lKnee: 1.25, rKnee: 1.25 });

  // Each payday cycle runs from 0.25 s before the catch to 0.85 s after it.
  const cycle = (t) => {
    const k = clamp(Math.floor((t - FIRST + 0.25) / PAY), 0, PAYDAYS - 1);
    return { k, c: t - payAt(k) };
  };
  const spendKeys = [[-0.6, STAND], [-0.25, READY], [0, CATCH], [0.1, CATCH], [0.24, THROW], [0.5, OPEN], [0.6, HOLD], [0.72, TOSS], [0.85, READY]];
  const saveKeys = [[-0.6, STAND], [-0.25, READY], [0, CATCH], [0.15, CATCH], [0.38, PLACE], [0.5, PLACE], [0.7, STAND], [0.85, READY]];
  const workEnd = payAt(PAYDAYS - 1) + 0.85;

  const hTrack = new Track(H, [
    {
      name: 'work',
      d: workEnd,
      fn: (u, lt, d, t) => {
        const { c } = cycle(t);
        const p = { ...keyed(spendKeys, c) };
        breathe(p, t, 0.5);
        return { pos: [HX, 0, 0], yaw: -PI / 2, pose: p, ground: 0 };
      },
    },
    {
      name: 'turn',
      d: 0.55,
      blend: 0.3,
      fn: (u, lt, d, t) => ({ pos: [HX, 0, 0], yaw: lerp(-PI / 2, 0, easeInOut(u)), pose: breathe(pose({ nod: -0.1, turn: 0.4 * u }), t), ground: 0 }),
    },
    {
      name: 'shrug',
      d: 6,
      blend: 0.35,
      fn: (u, lt, d, t) => {
        // Facing us, empty hands out, looking up at the saver.
        const up = smoothstep(0, 0.6, lt);
        const p = pose({ nod: -0.45 * up, turn: 0.4 + 0.3 * up, tilt: -0.12 * up, lArm: 0.25, rArm: 0.25, lOut: 0.13 + 0.75 * up, rOut: 0.13 + 0.75 * up, lEl: 0.18 + 1.2 * up, rEl: 0.18 + 1.2 * up });
        breathe(p, t);
        return { pos: [HX, 0, 0], yaw: 0, pose: p, ground: 0 };
      },
    },
  ]);

  const relaxHands = {
    lHand: { p: [0.12, 0.02, -0.1, 'head'], pole: [0.6, 0.65, 0.05, 'chest'] },
    rHand: { p: [-0.12, 0.02, -0.1, 'head'], pole: [-0.6, 0.65, 0.05, 'chest'] },
  };
  const sitY = (t) => stackTop(t) + DIM.limbR * 1.15;
  const bTrack = new Track(B, [
    {
      name: 'work',
      d: workEnd,
      fn: (u, lt, d, t) => {
        const { c } = cycle(t);
        const p = { ...keyed(saveKeys, c) };
        breathe(p, t, 0.5);
        const g = stackTop(t);
        return { pos: [SX, g + STAND_HIP, 0], yaw: -PI / 2, pose: p, ground: g };
      },
    },
    {
      name: 'sitdown',
      d: 0.7,
      blend: 0.1,
      fn: (u, lt, d, t) => {
        const k = easeInOut(u);
        const p = pose({ lean: lerp(0.1, 0.3, k), nod: 0.3, lLeg: lerp(0, PI / 2, k), rLeg: lerp(0, PI / 2, k), lKnee: lerp(0.05, 1.6, k), rKnee: lerp(0.05, 1.6, k), lArm: 0.4 * k, rArm: 0.4 * k });
        return { pos: [lerp(SX, SX + 0.12, k), lerp(stackTop(t) + STAND_HIP, sitY(t), k), 0], yaw: -PI / 2, pose: p };
      },
    },
    {
      name: 'relax',
      d: 6,
      blend: 0.5,
      fn: (u, lt, d, t) => {
        const p = pose({ lean: -0.18, nod: 0.35, lLeg: PI / 2 - 0.1, rLeg: PI / 2 - 0.1, lKnee: PI / 2 + 0.22 * Math.sin(t * 2), rKnee: PI / 2 + 0.22 * Math.sin(t * 2 + PI) });
        p.spineX += 0.01 * Math.sin(t * 1.5);
        return { pos: [SX + 0.12, sitY(t), 0], yaw: -PI / 2, pose: p, ik: relaxHands };
      },
    },
  ]);

  // ---- where the coins meet the hands -----------------------------------------------------
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const handsMid = (fig) => fig.handWorld('l', v1).add(fig.handWorld('r', v2)).multiplyScalar(0.5);
  const catchAt = (track, fig, t) => {
    fig.apply(track.sample(t));
    return handsMid(fig).clone().add(new THREE.Vector3(0, 0.12, 0));
  };
  const TOP = 10.6;
  const G = 6;
  const falls = (track, fig) =>
    Array.from({ length: PAYDAYS }, (_, k) => {
      const at = catchAt(track, fig, payAt(k));
      return { at, start: payAt(k) - Math.sqrt((2 * (TOP - at.y)) / G) };
    });
  const hFalls = falls(hTrack, H);
  const bFalls = falls(bTrack, B);

  const makeCoin = () => {
    const m = new THREE.Mesh(coinGeo, coinMats);
    m.rotation.order = 'YXZ';
    m.castShadow = true;
    m.visible = false;
    scene.add(m);
    return m;
  };
  const hCoins = hFalls.map(makeCoin);
  const bCoins = bFalls.map(makeCoin);
  const arc = (from, to, u, h, out) => out.lerpVectors(from, to, u).setY(lerp(from.y, to.y, u) + h * 4 * u * (1 - u));

  // Drops a coin from above the frame into the hands. True while airborne.
  const fall = (coin, f, k, t) => {
    if (t < f.start || t >= payAt(k)) return false;
    const dt = t - f.start;
    coin.visible = true;
    coin.scale.setScalar(1);
    coin.position.set(f.at.x, TOP - 0.5 * G * dt * dt, f.at.z);
    coin.rotation.set(PI / 2, dt * 7, 0);
    return true;
  };

  // ---- effects and sounds ----------------------------------------------------------------
  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  const sfx = [];
  stack.forEach((c, i) => {
    if (c.slide < 0) return;
    const r = mulberry32(500 + i);
    const y = (i + 1) * COIN_H;
    const parts = Array.from({ length: 7 }, () => {
      const ang = r() * PI * 2;
      return { x: SX + Math.cos(ang) * COIN_R, y, z: Math.sin(ang) * COIN_R, vx: Math.cos(ang) * 0.8, vy: 0.6 + r() * 1.2, vz: Math.sin(ang) * 0.5, delay: 0, r: 0.012 + r() * 0.012 };
    });
    world.addBurst('glints', { t0: c.t, parts, life: 0.5, gravity: 2 });
    if (i % 2 === 0) sfx.push({ t: c.t, type: 'tick' });
  });
  for (let k = 0; k < PAYDAYS; k++) {
    sfx.push({ t: payAt(k), type: 'coin' });
    sfx.push({ t: payAt(k) + 0.38, type: 'register' });
    sfx.push({ t: deposits[k], type: 'clink' });
  }

  // ---- text ------------------------------------------------------------------------------
  world.addLabel('HARCAYAN', [-1.75, 7.2, 0]);
  world.addLabel('BİRİKTİREN', [1.75, 7.2, 0]);
  const hCount = world.addLabel('0 TL', [-1.75, 6.75, 0], { cls: 'label counter' });
  const bCount = world.addLabel('0 TL', [1.75, 6.75, 0], { cls: 'label counter gold' });
  world.addThought('bir kahveden ne olur', H, 1.25, 2.6);
  world.addThought('indirim kaçmaz!', H, 3.45, 4.8);
  world.addThought('ay sonu bakarız', H, 5.65, 7.0);
  world.addThought('bu ay da yetmedi...', H, 8.0, 9.4);
  world.addThought('maaş nereye gitti?', H, hTrack.at('shrug') + 0.4, hTrack.at('shrug') + 2.6);
  world.setCaption('Damlaya damlaya göl olur.', 12.9, { top: 470 });
  const tl = (n) => `${(n * COIN_VALUE).toLocaleString('tr-TR')} TL`;

  // ---- per frame ---------------------------------------------------------------------------
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s3 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const gray = new THREE.Color(0x3a3a3c);
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  world.onUpdate((t) => {
    hTrack.apply(t);
    bTrack.apply(t);

    // Stack, bottom coin first; the newest slides in under the saver's feet.
    let y = 0;
    let n = 0;
    for (const c of stack) {
      const g = grow(c, t);
      if (g <= 0) break;
      e.set(0, c.ry, 0);
      q.setFromEuler(e);
      const w = lerp(0.7, 1, g);
      s3.set(w, Math.max(g, 0.01), w);
      p3.set(SX + c.dx + c.slide * (1 - g), y + (COIN_H * g) / 2, c.dz);
      m4.compose(p3, q, s3);
      stackMesh.setMatrixAt(n++, m4);
      y += COIN_H * g;
    }
    stackMesh.count = n;
    stackMesh.instanceMatrix.needsUpdate = true;

    let holding = false;
    for (let k = 0; k < PAYDAYS; k++) {
      const tk = payAt(k);
      const c = t - tk;

      // Spender: catch, throw it into the kiosk window.
      const hc = hCoins[k];
      hc.visible = false;
      if (!fall(hc, hFalls[k], k, t) && c >= 0 && c < 0.36) {
        hc.visible = true;
        if (c < 0.2) {
          holding = true;
          hc.position.copy(H.handWorld('r', tmpA)).add(tmpB.set(0, 0.1, 0));
          hc.rotation.set(PI / 2, 0, 0);
        } else {
          const u = (c - 0.2) / 0.16;
          arc(H.handWorld('r', tmpA), WIN, u, 0.4, hc.position);
          hc.scale.setScalar(lerp(1, 0.5, u));
          hc.rotation.set(PI / 2, u * 6, 0);
        }
      }

      // The thing he bought: out of the window, into his hands, onto the pile.
      const it = items[k];
      it.visible = c >= 0.38;
      if (it.visible) {
        const slot = pile[k];
        if (c < 0.5) {
          const u = (c - 0.38) / 0.12;
          arc(WIN, handsMid(H), u, 0.3, it.position);
          it.scale.setScalar(lerp(0.4, 1, u) * ITEM_S);
          it.rotation.set(0, 0, 0);
        } else if (c < 0.7) {
          it.position.copy(handsMid(H)).add(tmpB.set(0, 0.05, 0));
          it.scale.setScalar(ITEM_S);
          it.rotation.set(0, 0, 0);
        } else if (c < 1.0) {
          const u = (c - 0.7) / 0.3;
          const from = tmpA.set(HX + 0.05, 2.3, 0);
          arc(from, tmpB.set(slot.x, slot.y, slot.z), smooth(u), 0.7, it.position);
          it.scale.setScalar(ITEM_S);
          it.rotation.set(0, slot.ry * u, slot.rz * u + u * PI * 2);
        } else {
          it.position.set(slot.x, slot.y, slot.z);
          it.rotation.set(0, slot.ry, slot.rz);
          // Bought things lose their shine and shrink a little.
          const age = smoothstep(tk + 1.0, tk + 3.5, t);
          it.userData.mats.forEach((m, i) => m.color.copy(it.userData.base[i]).lerp(gray, 0.85 * age));
          it.scale.setScalar((1 - 0.18 * age) * ITEM_S);
        }
      }

      // Saver: catch, hold it up, put it under his feet.
      const bc = bCoins[k];
      bc.visible = false;
      if (!fall(bc, bFalls[k], k, t) && c >= 0 && t < deposits[k]) {
        bc.visible = true;
        if (c < 0.42) {
          bc.position.copy(handsMid(B)).add(tmpB.set(0, 0.08, 0));
          bc.rotation.set(PI / 2, 0, 0);
        } else {
          const u = (c - 0.42) / 0.08;
          bc.position.lerpVectors(handsMid(B), tmpA.set(SX - 0.3, stackTop(t) + COIN_H / 2, 0), u);
          bc.rotation.set(lerp(PI / 2, 0, u), 0, 0);
        }
      }
    }

    hCount.el.textContent = holding ? tl(1) : tl(0);
    bCount.el.textContent = tl(coinsAt(t));
  });

  const markers = Object.fromEntries([
    ...hTrack.clips.map((c) => ['H.' + c.name, +c.t0.toFixed(2)]),
    ...bTrack.clips.map((c) => ['B.' + c.name, +c.t0.toFixed(2)]),
    ['coins', stack.length],
    ['stackTop', +stackTop(99).toFixed(2)],
  ]);
  return { duration: 15.5, sfx, markers };
}
