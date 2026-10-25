// VERESİYE VEREN vs PEŞİN SATAN
// Two corner shops get the same customers. One writes every sale into the
// debt book: his shelves empty, the list of debts spills onto the floor and
// the shop closes. The other takes cash: the till fills and the shelves are
// restocked after every sale.
import * as THREE from 'three';
import { StickFigure, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose, keyed } from '../poses.js';
import { stand, walkTo, breathe, along } from '../moves.js';
import { PI, lerp, smooth, smoothstep, clamp, mulberry32 } from '../math.js';

const CUSTOMERS = 5;
const PERIOD = 2.4;
const FIRST = 0.9;
const PRICE = 1200;
const COUNTER_TOP = 0.97;

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.22, swell: 0.1 });
  world.key.intensity = 1.7;

  const shops = [
    { c: -1.5, s: -1, pays: false, delay: 0 },
    { c: 1.5, s: 1, pays: true, delay: 0.3 },
  ];
  const arrive = (shop, k) => FIRST + k * PERIOD + shop.delay;
  const lastLeave = (shop) => arrive(shop, CUSTOMERS - 1) + 1.4 + 1.1;

  const box = (m, w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const signTex = (text, bg, fg, size = 96) =>
    canvasTex(512, 150, (g, w, h) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = fg;
      g.lineWidth = 8;
      g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = fg;
      g.font = `700 ${size}px Pixel`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 6);
    });

  const wood = new THREE.MeshStandardMaterial({ color: 0x6b5442, roughness: 0.8 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x1d1a18, roughness: 0.9 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x3a3330, roughness: 0.7 });
  const topMat = new THREE.MeshStandardMaterial({ color: 0xbdb3a6, roughness: 0.5 });
  const bagMat = new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 0.85 });
  const PRODUCT = [0xd4362a, 0xe8e4da, 0x3f6fb5, 0xe0b23a, 0x4f8a5b];
  const BOARDS = [1.65, 1.05, 0.45];

  // ---- shops ----------------------------------------------------------------------
  for (const shop of shops) {
    const { c, s } = shop;
    box(counterMat, 1.3, COUNTER_TOP - 0.03, 0.5, c, (COUNTER_TOP - 0.03) / 2, 0.25);
    box(topMat, 1.38, 0.04, 0.58, c, COUNTER_TOP - 0.01, 0.25);
    box(panel, 1.6, 2.35, 0.03, c, 1.17, -1.03);
    for (const x of [c - 0.78, c + 0.78]) box(wood, 0.05, 2.35, 0.34, x, 1.17, -0.85);
    for (const y of [...BOARDS, 2.25]) box(wood, 1.56, 0.04, 0.34, c, y - 0.02, -0.85);

    // Products: same layout in both shops.
    const rand = mulberry32(8);
    shop.items = [];
    for (const by of BOARDS) {
      for (const ix of [-0.54, -0.18, 0.18, 0.54]) {
        const kind = Math.floor(rand() * 3);
        const m = new THREE.MeshStandardMaterial({ color: PRODUCT[Math.floor(rand() * PRODUCT.length)], roughness: 0.5 });
        let geo;
        let h;
        if (kind === 0) {
          h = 0.24 + rand() * 0.08;
          geo = new THREE.BoxGeometry(0.22, h, 0.18);
        } else if (kind === 1) {
          h = 0.2;
          geo = new THREE.CylinderGeometry(0.075, 0.075, h, 14);
        } else {
          h = 0.32;
          geo = new THREE.CylinderGeometry(0.055, 0.06, h, 12);
        }
        const mesh = new THREE.Mesh(geo, m);
        mesh.castShadow = true;
        const home = new THREE.Vector3(c + ix, by + h / 2, -0.82);
        mesh.position.copy(home);
        scene.add(mesh);
        shop.items.push({ mesh, home, h });
      }
    }

    // Till for the cash shop, debt book for the other, both on the inner end.
    const tillX = c - s * 0.38;
    shop.till = new THREE.Vector3(tillX, COUNTER_TOP + 0.1, 0.18);
    if (shop.pays) {
      const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5 });
      box(dark, 0.34, 0.16, 0.26, tillX, COUNTER_TOP + 0.08, 0.18);
      const screen = box(new THREE.MeshStandardMaterial({ color: 0x0f2a12, emissive: 0x2fbf4a, emissiveIntensity: 0.6 }), 0.2, 0.08, 0.02, tillX, COUNTER_TOP + 0.24, 0.12);
      screen.rotation.x = -0.4;
    } else {
      box(new THREE.MeshStandardMaterial({ color: 0x7a2e24, roughness: 0.7 }), 0.3, 0.03, 0.22, tillX, COUNTER_TOP + 0.015, 0.2);
      box(new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.8 }), 0.27, 0.012, 0.2, tillX, COUNTER_TOP + 0.034, 0.2);
    }

    // Sign above the shelves.
    shop.signOpen = signTex('BAKKAL', '#f1ede4', '#2a2420');
    shop.sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.38), new THREE.MeshStandardMaterial({ map: shop.signOpen, emissive: 0xffffff, emissiveMap: shop.signOpen, emissiveIntensity: 0.25 }));
    shop.sign.position.set(c, 2.72, -0.98);
    scene.add(shop.sign);
    if (shop.pays) {
      const t = signTex('VERESİYE YOKTUR', '#d4362a', '#ffffff', 58);
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.24), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.2 }));
      plaque.position.set(c, 2.02, -1.0);
      scene.add(plaque);
    }

    // Pendant lamp.
    const lampZ = 0.35;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 6.6, 6), panel);
    cord.position.set(c, 3.55 + 3.3, lampZ);
    scene.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }));
    shade.position.set(c, 3.42, lampZ);
    scene.add(shade);
    shop.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff2d8, emissive: 0xffd08a, emissiveIntensity: 2.5 }));
    shop.bulb.position.set(c, 3.3, lampZ);
    scene.add(shop.bulb);
    shop.lamp = new THREE.PointLight(0xffd6a0, 6, 7, 1.4);
    shop.lamp.position.set(c, 3.2, lampZ);
    scene.add(shop.lamp);
    shop.beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.15, 3.1, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    shop.beam.position.set(c, 3.3 - 1.55, lampZ);
    scene.add(shop.beam);

    // Bags, one per customer.
    shop.bags = Array.from({ length: CUSTOMERS }, () => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.2), bagMat);
      b.castShadow = true;
      g.add(b);
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.03, 0.21), new THREE.MeshStandardMaterial({ color: 0xa88760, roughness: 0.9 }));
      fold.position.y = 0.15;
      g.add(fold);
      g.visible = false;
      scene.add(g);
      return g;
    });
  }

  // The debt list: a paper strip from the book over the counter onto the floor.
  const debtShop = shops[0];
  const stripTex = canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#6d6a66';
    for (let y = 12; y < h; y += 22) {
      g.fillRect(6, y, 20 + ((y * 7) % 14), 4);
      g.fillRect(38, y, 18, 4);
    }
  });
  stripTex.wrapS = stripTex.wrapT = THREE.RepeatWrapping;
  const stripMat = new THREE.MeshStandardMaterial({ map: stripTex, roughness: 0.9, side: THREE.DoubleSide });
  const stripDown = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 1), stripMat);
  const stripFloor = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 1), stripMat.clone());
  stripFloor.material.map = stripTex.clone();
  stripFloor.material.map.needsUpdate = true;
  stripFloor.rotation.x = -PI / 2;
  scene.add(stripDown, stripFloor);
  const stripX = debtShop.till.x + 0.02;
  const PER_SALE = 0.55;

  // ---- figures ----------------------------------------------------------------------
  const greys = [0x8a8a8f, 0x6f6f74].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }));
  const keepers = shops.map(() => {
    const f = new StickFigure(mat.figure);
    scene.add(f.root);
    return f;
  });
  const customers = shops.map(() =>
    [0, 1].map((i) => {
      const f = new StickFigure(greys[i]);
      scene.add(f.root);
      return f;
    }),
  );

  // Clip-local timeline of one sale, relative to the customer's arrival:
  //  0.25 bag appears, 0.3-0.72 goods fly in, 0.72-0.85 bag slides over,
  //  0.85-1.0 customer lifts it, coin on counter 0.35, till / book 1.0-1.5.
  const saleAt = (shop, t) => {
    const k = clamp(Math.floor((t - FIRST - shop.delay + 0.4) / PERIOD), 0, CUSTOMERS - 1);
    return { k, c: t - arrive(shop, k) };
  };

  // Shopkeepers.
  const keeperTracks = shops.map((shop, si) => {
    const { c, s } = shop;
    const fig = keepers[si];
    const inner = s < 0 ? 'l' : 'r';
    const outer = s < 0 ? 'r' : 'l';
    const sx = (side) => (side === 'l' ? 1 : -1);
    const rest = (side) => [sx(side) * 0.2, -0.1, 0.06, 'root'];
    const shelf = [c - s * 0.25, 1.35, -0.62, 'world'];
    const push = (dz) => [c + s * 0.3, COUNTER_TOP + 0.12, 0.3 + dz, 'world'];
    const book = [shop.till.x, COUNTER_TOP + 0.08, shop.till.z + 0.04, 'world'];
    const innerKeys = [[-0.4, rest(inner)], [0.1, rest(inner)], [0.32, shelf], [0.55, shelf], [0.72, push(-0.06)], [0.86, push(-0.06)], [1.02, book], [1.5, book], [1.85, rest(inner)]];
    const outerKeys = [[-0.4, rest(outer)], [0.6, rest(outer)], [0.72, push(0.08)], [0.86, push(0.08)], [1.05, rest(outer)]];
    const bodyKeys = [
      [-0.4, pose({})],
      [0.1, pose({})],
      [0.32, pose({ twist: -s * 0.55, turn: -s * 0.8, lean: 0.05 })],
      [0.55, pose({ twist: -s * 0.55, turn: -s * 0.8, lean: 0.05 })],
      [0.75, pose({ lean: 0.2, nod: 0.3 })],
      [1.02, pose({ lean: 0.38, nod: 0.6, turn: s * 0.2 })],
      [1.5, pose({ lean: 0.38, nod: 0.6, turn: s * 0.2 })],
      [1.85, pose({})],
    ];
    const scribble = (t) => (o) => {
      if (shop.pays) return;
      o.x += 0.03 * Math.sin(t * 26);
      o.z += 0.02 * Math.cos(t * 33);
    };
    const end = lastLeave(shop) - 1.1;
    const headHold = {
      lHand: { p: [0.1, 0.09, 0.02, 'head'], pole: [0.55, 0.8, 0.1, 'chest'] },
      rHand: { p: [-0.1, 0.09, 0.02, 'head'], pole: [-0.55, 0.8, 0.1, 'chest'] },
    };
    const armsCrossed = {
      lHand: { p: [-0.13, 0.3, 0.17, 'chest'], pole: [0.35, 0.2, 0.15, 'chest'] },
      rHand: { p: [0.13, 0.32, 0.19, 'chest'], pole: [-0.35, 0.2, 0.15, 'chest'] },
    };
    const base = { pos: [c, STAND_HIP, -0.38], yaw: s * 0.35, ground: 0 };
    return new Track(fig, [
      {
        name: 'work',
        d: end,
        fn: (u, lt, d, t) => {
          const { c: ct } = saleAt(shop, t);
          const p = { ...keyed(bodyKeys, ct) };
          breathe(p, t, 0.6);
          const ik = { [inner + 'Hand']: { p: along(innerKeys, ct, ct > 1.0 && ct < 1.5 ? scribble(t) : null) }, [outer + 'Hand']: { p: along(outerKeys, ct) } };
          return { ...base, pose: p, ik };
        },
      },
      shop.pays
        ? {
            name: 'proud',
            d: 6,
            blend: 0.45,
            fn: (u, lt, d, t) => ({ ...base, yaw: s * 0.15, pose: breathe(pose({ lean: -0.06, nod: -0.1 + 0.08 * Math.sin(lt * 3) }), t), ik: armsCrossed }),
          }
        : {
            name: 'look',
            d: 1.0,
            blend: 0.35,
            fn: (u, lt, d, t) => ({ ...base, yaw: lerp(s * 0.35, PI * 0.9, smooth(u)), pose: breathe(pose({ nod: 0.1 }), t) }),
          },
      ...(shop.pays
        ? []
        : [
            {
              name: 'despair',
              d: 6,
              blend: 0.4,
              fn: (u, lt, d, t) => ({ ...base, yaw: lerp(PI * 0.9, 0.1, smooth(lt / 0.8)), pose: breathe(pose({ lean: 0.18, nod: 0.45, turn: 0.3 * Math.sin(lt * 4) * Math.exp(-lt * 0.4) }), t), ik: headHold }),
            },
          ]),
    ]);
  });

  // Customers: two per shop take turns.
  const customerTracks = shops.flatMap((shop, si) => {
    const { c, s } = shop;
    const out = c + s * 2.75;
    const stop = c + s * 1.0;
    const faceIn = s < 0 ? PI / 2 : -PI / 2;
    const faceOut = -faceIn;
    // Hand nearest the camera while facing the counter.
    const near = s > 0 ? 'l' : 'r';
    const far = near === 'l' ? 'r' : 'l';
    const sx = (side) => (side === 'l' ? 1 : -1);
    const rest = (side) => [sx(side) * 0.2, -0.1, 0.06, 'root'];
    const spot = [c + s * 0.52, COUNTER_TOP + 0.03, 0.32, 'world'];
    const hold = (dz) => [c + s * 0.75, 1.06, 0.42 + dz, 'world'];
    const nearKeys = [[0, rest(near)], [0.15, rest(near)], [0.35, spot], [0.55, spot], [0.75, rest(near)], [0.88, hold(0.09)], [1.4, hold(0.09)]];
    const farKeys = [[0, rest(far)], [0.75, rest(far)], [0.88, hold(-0.09)], [1.4, hold(-0.09)]];
    return [0, 1].map((fi) => {
      const fig = customers[si][fi];
      const clips = [];
      let t = 0;
      for (let k = fi; k < CUSTOMERS; k += 2) {
        const a = arrive(shop, k);
        // The very first customer is already walking in when the video starts.
        const walkD = Math.min(1.1, a - t);
        const from = walkD < 1.1 ? stop + s * 0.45 : out;
        clips.push({ d: a - walkD - t, fn: stand({ x: out + s, yaw: faceIn, ground: 0 }) });
        clips.push({ d: walkD, blend: 0, fn: walkTo({ from: [from, 0.42], to: [stop, 0.42], yaw: faceIn, ground: 0, amp: 0.34 }) });
        clips.push({
          d: 1.4,
          fn: (u, lt, d, tt) => ({
            pos: [stop, STAND_HIP, 0.42],
            yaw: faceIn,
            pose: breathe(pose({ nod: 0.2 }), tt, 0.6),
            ik: { [near + 'Hand']: { p: along(nearKeys, lt) }, [far + 'Hand']: { p: along(farKeys, lt) } },
            ground: 0,
          }),
        });
        clips.push({ d: 1.1, blend: 0.3, fn: walkTo({ from: [stop, 0.42], to: [out, 0.42], yaw: faceOut, ground: 0, amp: 0.34 }) });
        t = a + 1.4 + 1.1;
      }
      clips.push({ d: 10, blend: 0, fn: stand({ x: out + s, yaw: faceIn, ground: 0 }) });
      return { shop, fig, track: new Track(fig, clips), ks: Array.from({ length: CUSTOMERS }, (_, k) => k).filter((k) => k % 2 === fi) };
    });
  });

  // ---- coins, sounds, text ---------------------------------------------------------------
  const coinMat = new THREE.MeshStandardMaterial({ color: 0xe8b443, emissive: 0x3a2600, metalness: 0.85, roughness: 0.3, envMapIntensity: 2.4 });
  const coins = Array.from({ length: CUSTOMERS }, () => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 20), coinMat);
    m.visible = false;
    scene.add(m);
    return m;
  });
  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));

  const sfx = [];
  for (const shop of shops) {
    for (let k = 0; k < CUSTOMERS; k++) {
      const a = arrive(shop, k);
      sfx.push({ t: a + 0.86, type: 'rustle', gain: 0.8 });
      if (shop.pays) {
        sfx.push({ t: a + 0.38, type: 'clink', gain: 0.6 }, { t: a + 1.1, type: 'register', gain: 0.9 });
        // Restock right after the customer walks off.
        shop.items.slice(2 * k, 2 * k + 2).forEach((it, j) => {
          const r = mulberry32(70 + k * 2 + j);
          const parts = Array.from({ length: 8 }, () => ({ x: it.home.x, y: it.home.y, z: -0.68, vx: (r() - 0.5) * 1.2, vy: 0.4 + r(), vz: r() * 0.4, delay: 0, r: 0.012 + r() * 0.01 }));
          world.addBurst('glints', { t0: a + 1.9 + j * 0.12, parts, life: 0.5, gravity: 2 });
        });
      } else {
        sfx.push({ t: a + 1.05, type: 'scribble', gain: 0.9 });
      }
    }
  }
  const closeAt = keeperTracks[0].at('look') + 1.0;
  sfx.push({ t: closeAt, type: 'click', gain: 1 });

  world.addLabel('VERESİYE VEREN', [-1.6, 6.45, 0]);
  world.addLabel('PEŞİN SATAN', [1.6, 6.45, 0]);
  const debtCount = world.addLabel('KASA: 0 TL', [-1.6, 6.05, 0], { cls: 'label counter' });
  const cashCount = world.addLabel('KASA: 0 TL', [1.6, 6.05, 0], { cls: 'label counter gold' });
  const debtCustomers = customerTracks.filter((c) => !c.shop.pays);
  for (let k = 0; k < CUSTOMERS; k += 2) {
    const ct = debtCustomers.find((c) => c.ks.includes(k));
    world.addThought('deftere yaz!', ct.fig, arrive(debtShop, k) + 0.15, arrive(debtShop, k) + 1.1);
  }
  world.addThought('yarın verir', keepers[0], arrive(debtShop, 0) + 1.15, arrive(debtShop, 0) + 2.3);
  world.addThought('komşu, ayıp olur', keepers[0], arrive(debtShop, 1) + 1.15, arrive(debtShop, 1) + 2.3);
  world.addThought('ay başı öder...', keepers[0], arrive(debtShop, 3) + 1.15, arrive(debtShop, 3) + 2.3);
  world.addThought('alacaklarım ne olacak?', keepers[0], closeAt + 0.3, closeAt + 2.6);
  world.setCaption('Bugün peşin, yarın veresiye.', closeAt + 0.6, { top: 470 });
  const tl = (n) => `KASA: ${(n * PRICE).toLocaleString('tr-TR')} TL`;
  const signClosed = signTex('KAPANDI', '#d4362a', '#ffffff');

  // ---- per frame ------------------------------------------------------------------------
  const v = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const arc = (from, to, u, h, outV) => outV.lerpVectors(from, to, u).setY(lerp(from.y, to.y, u) + h * 4 * u * (1 - u));
  const carrier = (shop, k) => customerTracks.find((c) => c.shop === shop && c.ks.includes(k)).fig;

  world.onUpdate((t) => {
    keeperTracks.forEach((tr) => tr.apply(t));
    customerTracks.forEach((c) => c.track.apply(t));

    for (const shop of shops) {
      const { c, s } = shop;
      for (let k = 0; k < CUSTOMERS; k++) {
        const ct = t - arrive(shop, k);
        const fig = carrier(shop, k);
        const bag = shop.bags[k];
        const counterMid = v.set(c + s * 0.02, COUNTER_TOP + 0.16, 0.3);

        // Goods fly off the shelf into the bag; the cash shop restocks.
        shop.items.slice(2 * k, 2 * k + 2).forEach((it, j) => {
          const t0 = 0.3 + j * 0.12;
          const restock = shop.pays ? 1.9 + j * 0.12 : Infinity;
          it.mesh.visible = ct < t0 + 0.3 || ct >= restock;
          if (ct >= restock) {
            it.mesh.position.copy(it.home);
            it.mesh.scale.setScalar(Math.max(0.001, smoothstep(restock, restock + 0.15, ct)));
          } else if (ct >= t0 && ct < t0 + 0.3) {
            arc(it.home, counterMid, (ct - t0) / 0.3, 0.35, it.mesh.position);
            it.mesh.scale.setScalar(1);
          } else {
            it.mesh.position.copy(it.home);
            it.mesh.scale.setScalar(1);
          }
        });

        // The bag.
        bag.visible = ct >= 0.25 && ct < 2.5;
        if (bag.visible) {
          bag.scale.setScalar(smoothstep(0.25, 0.35, ct));
          const counterEnd = v2.set(c + s * 0.5, COUNTER_TOP + 0.16, 0.3);
          if (ct < 0.72) bag.position.set(c + s * 0.02, COUNTER_TOP + 0.16, 0.3);
          else if (ct < 0.85) bag.position.lerpVectors(counterMid, counterEnd, smooth((ct - 0.72) / 0.13));
          else if (ct < 1.4) bag.position.lerpVectors(counterEnd, v.set(c + s * 0.75, 1.06, 0.42), smooth((ct - 0.85) / 0.15));
          else {
            const hand = s > 0 ? 'r' : 'l';
            fig.handWorld(hand, v2).add(v.set(0, -0.18, 0));
            bag.position.lerpVectors(new THREE.Vector3(c + s * 0.75, 1.06, 0.42), v2, smoothstep(1.4, 1.65, ct));
          }
          bag.rotation.y = ct < 1.4 ? 0 : -s * 0.5;
        }

        // Cash: coin on the counter, then into the till.
        const coin = coins[k];
        coin.visible = shop.pays && ct >= 0.15 && ct < 1.25;
        if (coin.visible) {
          const spot = v2.set(c + s * 0.52, COUNTER_TOP + 0.012, 0.32);
          if (ct < 0.35) {
            fig.handWorld(s > 0 ? 'l' : 'r', coin.position);
            coin.rotation.set(PI / 2, 0, 0);
          } else if (ct < 1.05) {
            coin.position.copy(spot);
            coin.rotation.set(0, 0, 0);
          } else {
            arc(spot, shop.till, (ct - 1.05) / 0.2, 0.1, coin.position);
          }
        }
      }
      if (!shop.pays) {
        // Debt strip grows while the book is written in.
        let len = 0.12;
        for (let k = 0; k < CUSTOMERS; k++) len += PER_SALE * smoothstep(arrive(shop, k) + 1.02, arrive(shop, k) + 1.5, t);
        const down = Math.min(len, COUNTER_TOP);
        stripDown.scale.y = down;
        stripDown.position.set(stripX, COUNTER_TOP - down / 2, 0.545);
        stripDown.material.map.repeat.set(1, down / 0.35);
        const flat = Math.max(len - COUNTER_TOP, 0.001);
        stripFloor.scale.y = flat;
        stripFloor.position.set(stripX + 0.04 * Math.sin(flat * 3), 0.004, 0.55 + flat / 2);
        stripFloor.rotation.z = 0.08 * Math.sin(flat * 2);
        stripFloor.material.map.repeat.set(1, flat / 0.35);

        // Lights out, sign flips.
        const off = smoothstep(closeAt, closeAt + 0.05, t);
        const flicker = t > closeAt - 0.5 && t < closeAt ? (Math.sin(t * 60) > 0.2 ? 1 : 0.15) : 1;
        const on = (1 - off) * flicker;
        shop.lamp.intensity = 6 * on;
        shop.bulb.material.emissiveIntensity = 2.5 * on;
        shop.beam.visible = on > 0.5;
        const closed = t >= closeAt + 0.25;
        shop.sign.material.map = closed ? signClosed : shop.signOpen;
        shop.sign.material.emissiveMap = shop.sign.material.map;
      }
    }

    const paid = shops[1];
    let n = 0;
    for (let k = 0; k < CUSTOMERS; k++) if (t >= arrive(paid, k) + 1.15) n++;
    cashCount.el.textContent = tl(n);
    debtCount.el.textContent = tl(0);
  });

  const markers = Object.fromEntries([...keeperTracks.flatMap((tr, i) => tr.clips.map((c) => [`K${i}.${c.name}`, +c.t0.toFixed(2)])), ['closeAt', +closeAt.toFixed(2)]]);
  return { duration: 16, sfx, markers };
}
