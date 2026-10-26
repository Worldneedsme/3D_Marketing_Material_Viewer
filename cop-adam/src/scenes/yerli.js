// "DIŞARISI DAHA İYİ" DİYEN vs YERLİ ÜRETEN
// Under the flag, one sits on the couch with his phone while boxes stamped
// İTHAL pile up around him. The other welds a car together on a production
// line and drives it off, builds a UAV and sends it flying over the flag,
// then stamps crates MADE IN TÜRKİYE. One crate lands at the first one's
// feet. He reads it, puts the phone down, and both salute the flag.
// The car and the UAV are original shapes: no real logos or designs.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, walkTo } from '../moves.js';
import { PI, lerp, clamp, smooth, smoothstep, easeIn, easeOut, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const RED = '#e30a17';
const GOLD = '#e8c15a';

// Production line along the right half; it runs off the right edge.
const LINE = { x0: 0.7, x1: 4.6, z: 0.5, top: 0.12 };
const CAR = { x: 1.9, z: 0.6, park: 2.1, away: 5.8 };
const DRONE = { x: 1.9, y: 1.12, z: 0.25 };
const COUCH = { x: -1.85, z: -0.45, seat: 0.42 };

// Story beats (seconds).
const T = {
  chassis: [0.3, 0.5],
  shell: [1.0, 1.4],
  glass: [2.0, 2.2],
  lights: [2.6, 2.8],
  carGo: [3.6, 4.6],
  body: [4.95, 5.15],
  wings: [5.4, 5.7],
  tail: [5.85, 6.0],
  prop: [6.1, 6.2],
  spin: 6.3,
  fly: [6.85, 9.1],
  stamps: [9.15, 9.65, 10.15],
  toss: [10.35, 10.95],
  carBack: [11.3, 12.4],
  flyBack: [11.3, 12.9],
  salute: 12.6,
};
// Welding: [from, to, figure x, target x from, target x to, target y].
const WELDS = [
  [0.25, 1.0, 1.35, 1.2, 1.6, 0.42],
  [1.0, 1.25, 1.35, 1.6, 1.7, 0.75],
  [1.5, 2.75, 2.45, 2.2, 2.7, 0.85],
  [4.95, 6.3, 1.6, 1.55, 2.15, DRONE.y],
];
const FALLS = [
  { t: 0.5, x: -3.0, y: 0.2, z: 0.55, ry: 0.2 },
  { t: 1.2, x: -2.55, y: 0.2, z: 0.75, ry: -0.15 },
  { t: 1.9, x: -2.8, y: 0.6, z: 0.62, ry: 0.1 },
  { t: 2.6, x: -2.4, y: 0.6, z: 0.72, ry: -0.25 },
];
const CRATE = 0.4;
const LAND = new THREE.Vector3(-0.95, CRATE / 2, 0.9);

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.2, swell: 0.08 });
  world.key.intensity = 1.6;

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
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

  // ---- room and flag -----------------------------------------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), std(0x23261f, { roughness: 0.95 }));
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
  const flagPole = box(std(0xc9a54a, { metalness: 0.7, roughness: 0.3 }), 0.05, FLAG_H + 0.5, 0.05, -FLAG_W / 2 - 0.03, 3.6, WALL_Z + 0.12);
  flagPole.castShadow = false;
  const spot = new THREE.SpotLight(0xfff2e0, 14, 14, 0.42, 0.6, 1.2);
  spot.position.set(0, 7.5, 4);
  spot.target = flag;
  scene.add(spot, spot.target);
  // Work light over the line; it grows as the workshop turns into a factory.
  const shopLight = new THREE.SpotLight(0xfff6e6, 4, 12, 0.5, 0.7, 1.2);
  shopLight.position.set(2.0, 6.5, 3.5);
  shopLight.target.position.set(2.0, 0.5, 0.4);
  scene.add(shopLight, shopLight.target);

  // ---- left: couch, phone, imported boxes ---------------------------------------------------------
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

  const stampTex = (lines, ink, paper, size) =>
    canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = paper;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = ink;
      g.lineWidth = 9;
      g.strokeRect(22, 58, w - 44, h - 116);
      g.fillStyle = ink;
      g.font = `700 ${size}px Pixel`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
    });
  const crateGeo = new THREE.BoxGeometry(CRATE * 1.15, CRATE, CRATE);
  const crateMats = (front, base) => [base, base, base, base, new THREE.MeshStandardMaterial({ map: front, roughness: 0.8 }), base];
  const gray = std(0x8d8f93, { roughness: 0.85 });
  const ithal = crateMats(stampTex(['İTHAL'], '#2b2b2e', '#8d8f93', 52), gray);
  const fallen = FALLS.map(() => {
    const m = new THREE.Mesh(crateGeo, ithal);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  });

  // ---- right: production line, car, UAV, crates -------------------------------------------------
  const steel = std(0x3e444a, { metalness: 0.5, roughness: 0.45 });
  box(steel, LINE.x1 - LINE.x0, LINE.top, 1.25, (LINE.x0 + LINE.x1) / 2, LINE.top / 2, LINE.z);
  const beltTex = canvasTex(64, 16, (g, w, h) => {
    g.fillStyle = '#2a2d30';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a4f55';
    g.fillRect(0, 0, 6, h);
  });
  beltTex.wrapS = THREE.RepeatWrapping;
  beltTex.repeat.set(40, 1);
  const belt = new THREE.Mesh(new THREE.PlaneGeometry(LINE.x1 - LINE.x0, 1.1), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.7 }));
  belt.rotation.x = -PI / 2;
  belt.position.set((LINE.x0 + LINE.x1) / 2, LINE.top + 0.002, LINE.z);
  belt.receiveShadow = true;
  scene.add(belt);

  // Car: a crossover silhouette of my own, deep red, glass strip and light bars.
  const car = new THREE.Group();
  const carRed = std(0xa3202a, { metalness: 0.55, roughness: 0.3, emissive: 0x1a0306 });
  const dark = std(0x16181b, { roughness: 0.5 });
  const chassis = new THREE.Group();
  box(dark, 2.0, 0.14, 0.86, 0, 0.24, 0, chassis);
  const wheels = [];
  for (const wx of [-0.66, 0.68]) {
    for (const wz of [-0.42, 0.42]) {
      const pivot = new THREE.Group();
      pivot.position.set(wx, 0.21, wz);
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.13, 24), dark);
      tyre.rotation.x = PI / 2;
      tyre.castShadow = true;
      pivot.add(tyre);
      box(std(0xb8bcc2, { metalness: 0.6, roughness: 0.3 }), 0.24, 0.05, 0.02, 0, 0, Math.sign(wz) * 0.07, pivot);
      chassis.add(pivot);
      wheels.push(pivot);
    }
  }
  car.add(chassis);
  const profile = new THREE.Shape();
  [[-1.0, 0], [1.02, 0], [1.06, 0.22], [0.88, 0.33], [0.4, 0.38], [0.12, 0.68], [-0.62, 0.7], [-0.96, 0.44], [-1.03, 0.26]].forEach(([x, y], i) => (i ? profile.lineTo(x, y) : profile.moveTo(x, y)));
  const shellGeo = new THREE.ExtrudeGeometry(profile, { depth: 0.84, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
  shellGeo.translate(0, 0, -0.42);
  const shell = new THREE.Group();
  shell.position.y = 0.3;
  const shellMesh = new THREE.Mesh(shellGeo, carRed);
  shellMesh.castShadow = true;
  shell.add(shellMesh);
  car.add(shell);
  const glass = new THREE.Group();
  const glassMat = std(0x1d2836, { metalness: 0.7, roughness: 0.12, emissive: 0x05080c });
  for (const s of [-1, 1]) box(glassMat, 0.78, 0.2, 0.02, -0.24, 0.84, s * 0.45, glass);
  car.add(glass);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff2020, emissiveIntensity: 0 });
  box(lampMat, 0.34, 0.03, 0.9, 0.86, 0.6, 0, car);
  box(tailMat, 0.2, 0.035, 0.9, -0.92, 0.66, 0, car);
  scene.add(car);

  // UAV: long straight wings, V tail, pusher propeller. Outer group tilts it
  // towards the camera; inner group turns the nose most of the way to the
  // camera, so the wings read as a wide horizontal span (side-on, they would
  // stand vertical and look like a cross).
  const droneMat = std(0xc9cdd2, { metalness: 0.3, roughness: 0.4, emissive: 0x111214 });
  const NOSE_LEFT = 0.95;
  const NOSE_RIGHT = PI - 0.95;
  const drone = new THREE.Group();
  drone.rotation.x = 0.3;
  const craft = new THREE.Group();
  drone.add(craft);
  const fuselage = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 1.0, 6, 16), droneMat);
  hull.rotation.z = PI / 2;
  hull.castShadow = true;
  fuselage.add(hull);
  const pod = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), std(0x2a2d31, { roughness: 0.25 }));
  pod.position.set(-0.36, -0.09, 0);
  fuselage.add(pod);
  craft.add(fuselage);
  const wings = new THREE.Group();
  box(droneMat, 0.2, 0.025, 2.6, -0.02, 0.07, 0, wings);
  craft.add(wings);
  const tail = new THREE.Group();
  for (const s of [-1, 1]) {
    const fin = box(droneMat, 0.2, 0.3, 0.02, 0.5, 0.15, s * 0.1, tail);
    fin.rotation.x = s * 0.7;
  }
  craft.add(tail);
  const prop = new THREE.Group();
  prop.position.x = 0.62;
  const blades = new THREE.Group();
  for (const r of [0, PI / 2]) {
    const b = box(std(0x2a2d31), 0.02, 0.34, 0.04, 0, 0, 0, blades);
    b.rotation.x = r;
  }
  prop.add(blades);
  const blur = new THREE.Mesh(new THREE.CircleGeometry(0.19, 24), new THREE.MeshBasicMaterial({ color: 0xd8dde3, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
  blur.rotation.y = PI / 2;
  prop.add(blur);
  craft.add(prop);
  // Its shadow on the wall reads as a cross, so the UAV casts none.
  drone.traverse((o) => (o.castShadow = false));
  scene.add(drone);
  const droneStand = new THREE.Group();
  for (const dx of [-0.25, 0.25]) box(steel, 0.05, DRONE.y - LINE.top - 0.08, 0.05, DRONE.x + dx, (DRONE.y + LINE.top - 0.08) / 2, DRONE.z, droneStand);
  scene.add(droneStand);

  // Export crates, stamped on the line.
  const cardboard = std(0xb98d5a, { roughness: 0.9 });
  const blank = crateMats(canvasTex(8, 8, (g) => ((g.fillStyle = '#b98d5a'), g.fillRect(0, 0, 8, 8))), cardboard);
  const stamped = crateMats(stampTex(['MADE IN', 'TÜRKİYE'], RED, '#b98d5a', 38), cardboard);
  const CRATE_X = 1.55;
  const crates = T.stamps.map(() => {
    const m = new THREE.Mesh(crateGeo, blank);
    m.castShadow = true;
    scene.add(m);
    return m;
  });

  // ---- figures ------------------------------------------------------------------------------
  const L = new StickFigure(mat.figure); // dışarısı daha iyi diyen
  const R = new StickFigure(mat.figure); // yerli üreten
  scene.add(L.root, R.root);
  const salute = { rHand: { p: [-0.11, 0.07, 0.11, 'head'], pole: [-0.6, 0.35, 0.15, 'chest'] } };
  const saluting = (x, z) => (u, lt, d, t) => ({ pos: [x, 0, z], yaw: -PI, pose: breathe(pose({ nod: -0.25, lean: -0.05, lArm: 0, lOut: 0.05, lEl: 0.05 }), t, 0.3), ik: salute, ground: 0 });

  // Welding torch in the right hand; sparks where it touches.
  const torch = new THREE.Group();
  box(std(0x2f3338, { metalness: 0.6 }), 0.035, 0.035, 0.2, 0, 0, 0.1, torch);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xbfe4ff }));
  flame.position.z = 0.22;
  torch.add(flame);
  const torchLight = new THREE.PointLight(0x9fd0ff, 0, 2.5, 2);
  torchLight.position.z = 0.22;
  torch.add(torchLight);
  scene.add(torch);

  const weldAt = (t, out) => {
    const w = WELDS.find(([a, b]) => t >= a && t < b);
    if (!w) return null;
    const [a, b, , x0, x1, y] = w;
    const u = (t - a) / (b - a);
    return out.set(lerp(x0, x1, u) + 0.03 * Math.sin(t * 23), y + 0.03 * Math.sin(t * 31), w[5] === DRONE.y ? DRONE.z + 0.05 : 0.28);
  };
  const tip = new THREE.Vector3();
  const welding = (x) => (u, lt, d, t) => {
    const hit = weldAt(t, tip) || tip.set(x + 0.2, 0.7, 0.28);
    const hand = hit.clone().add(new THREE.Vector3(0, 0.1, -0.2));
    return {
      pos: [x, 0, -0.35],
      yaw: 0,
      pose: breathe(pose({ lean: 0.5, nod: 0.45, lLeg: 0.2, lKnee: 0.25, rKnee: 0.15 }), t, 0.3),
      ik: { rHand: { p: [hand.x, hand.y, hand.z, 'world'], pole: [-0.5, -0.2, -0.2, 'chest'] }, lHand: { p: [hand.x + 0.3, hand.y - 0.05, hand.z - 0.05, 'world'], pole: [0.5, -0.2, -0.2, 'chest'] } },
      ground: 0,
    };
  };
  const stampHit = (t) => T.stamps.reduce((a, s) => Math.max(a, Math.exp(-(((t - s) / 0.07) ** 2))), 0);
  const stamping = (u, lt, d, t) => {
    const hit = stampHit(t);
    return {
      pos: [1.45, 0, -0.15],
      yaw: 0,
      pose: breathe(pose({ lean: 0.45 + 0.1 * hit, nod: 0.5 }), t, 0.3),
      ik: { rHand: { p: [CRATE_X, LINE.top + CRATE + 0.06 + 0.32 * (1 - hit), LINE.z - 0.05, 'world'], pole: [-0.5, 0, -0.3, 'chest'] } },
      ground: 0,
    };
  };

  const rTrack = new Track(R, [
    { name: 'weldA', d: 1.25, fn: welding(1.35) },
    { name: 'shift', d: 0.25, blend: 0.1, fn: walkTo({ from: [1.35, -0.35], to: [2.45, -0.35], yaw: PI / 2, ground: 0, amp: 0.4 }) },
    { name: 'weldB', d: 1.3, blend: 0.15, fn: welding(2.45) },
    { name: 'admire', d: 0.8, blend: 0.3, fn: stand({ x: 2.45, z: -0.35, yaw: 0, ground: 0, pose: { lean: -0.1, nod: 0.15, lArm: 0.1, rArm: 0.1, lOut: 0.35, rOut: 0.35, lEl: 1.6, rEl: 1.6 } }) },
    { name: 'seeOff', d: 1.0, blend: 0.3, fn: stand({ x: 2.45, z: -0.35, yaw: 0.6, ground: 0, pose: { nod: 0.05, turn: 0.5, rArm: 2.5, rOut: 0.5, rEl: 0.3 } }) },
    { name: 'toDrone', d: 0.35, blend: 0.2, fn: walkTo({ from: [2.45, -0.35], to: [1.6, -0.35], yaw: -PI / 2, ground: 0, amp: 0.4 }) },
    { name: 'weldC', d: 1.35, blend: 0.15, fn: welding(1.6) },
    { name: 'stepBack', d: 0.55, blend: 0.3, fn: stand({ x: 1.6, z: -0.55, yaw: 0, ground: 0, pose: { lean: -0.1, nod: -0.1 } }) },
    { name: 'watch', d: 1.95, blend: 0.3, fn: stand({ x: 1.6, z: -0.55, yaw: -0.5, ground: 0, pose: { lean: -0.15, nod: -0.55, rArm: 2.9, rOut: 0.3, rEl: 0.15 } }) },
    { name: 'toLine', d: 0.25, blend: 0.2, fn: walkTo({ from: [1.6, -0.55], to: [1.45, -0.15], yaw: 0, ground: 0, amp: 0.3 }) },
    { name: 'stamp', d: 1.25, blend: 0.2, fn: stamping },
    {
      name: 'toss',
      d: 0.6,
      blend: 0.2,
      fn: (u, lt) => {
        const k = smooth(lt / 0.35);
        return { pos: [1.45, 0, -0.15], yaw: -PI / 2 + 0.3, pose: pose({ lean: lerp(0.3, -0.05, k), nod: -0.2, rArm: lerp(-0.4, 2.3, k), lArm: lerp(-0.4, 1.6, k), rEl: 0.2, lEl: 0.2 }), ground: 0 };
      },
    },
    { name: 'nod', d: 0.85, blend: 0.3, fn: stand({ x: 1.45, z: -0.15, yaw: -PI / 2 + 0.3, ground: 0, pose: { nod: 0.2, lean: -0.05 } }) },
    { name: 'walkIn', d: 0.8, blend: 0.2, fn: walkTo({ from: [1.45, -0.15], to: [0.45, 0.3], yaw: Math.atan2(-1.0, 0.45), ground: 0, amp: 0.34 }) },
    { name: 'salute', d: 8, blend: 0.4, fn: saluting(0.45, 0.3) },
  ]);

  // Left: sits on the couch with the phone until the UAV and the crate get him up.
  const sitPos = [COUCH.x, COUCH.seat + DIM.limbR * 1.2, COUCH.z + 0.12];
  const phoneHands = { lHand: { p: [0.045, 0.27, 0.32, 'chest'] }, rHand: { p: [-0.045, 0.27, 0.32, 'chest'] } };
  const STAND_AT = [-1.6, 0.35];
  const toCrate = Math.atan2(LAND.x - STAND_AT[0], LAND.z - STAND_AT[1]);
  const lTrack = new Track(L, [
    {
      name: 'couch',
      d: 9.3,
      fn: (u, lt, d, t) => {
        const up = smoothstep(7.3, 7.6, t) * (1 - smoothstep(8.9, 9.2, t));
        return {
          pos: sitPos,
          yaw: 0,
          pose: breathe(pose({ lean: lerp(-0.08, -0.25, up), nod: lerp(0.55, -0.75, up), turn: 0.25 * up, lLeg: PI / 2 - 0.1, rLeg: PI / 2 - 0.15, lKnee: PI / 2, rKnee: PI / 2 - 0.1 }), t, 0.4),
          ik: phoneHands,
        };
      },
    },
    { name: 'getUp', d: 0.5, blend: 0.5, fn: stand({ x: STAND_AT[0], z: STAND_AT[1], yaw: 0.7, ground: 0, pose: { nod: 0.1 } }) },
    { name: 'watchCrate', d: 1.1, blend: 0.3, fn: stand({ x: STAND_AT[0], z: STAND_AT[1], yaw: 0.9, ground: 0, pose: { nod: -0.35, lean: -0.1 } }) },
    { name: 'read', d: 0.9, blend: 0.3, fn: stand({ x: STAND_AT[0], z: STAND_AT[1], yaw: toCrate, ground: 0, pose: { nod: 0.7, lean: 0.35, lArm: 0.5, rArm: 0.5, lEl: 0.4, rEl: 0.4 } }) },
    { name: 'walkIn', d: 0.8, blend: 0.2, fn: walkTo({ from: STAND_AT, to: [-0.45, 0.3], yaw: PI / 2, ground: 0, amp: 0.34 }) },
    { name: 'salute', d: 8, blend: 0.4, fn: saluting(-0.45, 0.3) },
  ]);

  // ---- text ------------------------------------------------------------------------------------
  const top1 = world.addLabel('"DIŞARISI DAHA İYİ" DİYEN', [-1.6, 6.45, 0]);
  Object.assign(top1.el.style, { fontSize: '27px', letterSpacing: '0.04em' });
  const top2 = world.addLabel('YERLİ ÜRETEN', [1.6, 6.45, 0]);
  Object.assign(top2.el.style, { fontSize: '34px', letterSpacing: '0.08em' });
  const gold = (label) => Object.assign(label.el.style, { fontSize: '40px', color: GOLD, textShadow: '0 0 22px rgba(232, 193, 90, 0.55)' });
  gold(world.addLabel('YERLİ OTOMOBİL', () => car.position.clone().add(new THREE.Vector3(0, 1.75, 0)), { t0: T.lights[1], t1: T.carGo[0] + 0.7 }));
  gold(world.addLabel('YERLİ İHA', () => drone.position.clone().add(new THREE.Vector3(0, 0.75, 0)), { t0: T.prop[1] + 0.2, t1: 8.6 }));
  world.addThought('dışarısı daha iyi...', L, 0.6, 2.0);
  world.addThought('yerlisi olmaz ki...', L, 2.9, 4.4);
  world.addThought('bu kimin?!', L, 7.5, 9.0);
  world.addThought('...bizimmiş!', L, 11.0, 12.4);
  world.setCaption('Yerli malı yurdun malı,\nherkes onu kullanmalı.', 12.9, { top: 470 });

  // ---- sounds and particles ------------------------------------------------------------------------
  const sfx = [];
  for (const [a] of WELDS) if (a !== 1.0) sfx.push({ t: a, type: 'grind', gain: 1.2 });
  for (const f of FALLS) sfx.push({ t: f.t + Math.sqrt((6.5 - f.y) / 7), type: 'block', gain: 0.6 });
  sfx.push({ t: T.lights[0] + 0.1, type: 'chime', gain: 0.7 });
  sfx.push({ t: T.carGo[0], type: 'whir', gain: 1.0 });
  sfx.push({ t: T.spin, type: 'whir', gain: 1.2 }, { t: T.fly[0] + 0.6, type: 'whoosh', gain: 1.4 });
  for (const s of T.stamps) sfx.push({ t: s, type: 'block', gain: 0.8 });
  sfx.push({ t: T.toss[1], type: 'block', gain: 0.9 });
  sfx.push({ t: T.carBack[0], type: 'whir', gain: 0.9 }, { t: T.flyBack[0] + 0.3, type: 'whoosh', gain: 1.2 });
  sfx.push({ t: T.salute, type: 'bugle', gain: 1 });

  world.makeParticles('sparks', new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
  const rand = mulberry32(7);
  const sp = new THREE.Vector3();
  for (const [a, b] of WELDS) {
    for (let t = a; t < b; t += 0.06) {
      weldAt(t, sp);
      const parts = Array.from({ length: 7 }, () => ({ x: sp.x, y: sp.y, z: sp.z, vx: (rand() - 0.5) * 2.2, vy: 0.6 + rand() * 1.8, vz: (rand() - 0.2) * 1.4, delay: 0, r: 0.008 + rand() * 0.008 }));
      world.addBurst('sparks', { t0: t, parts, life: 0.45, gravity: 9.8 });
    }
  }
  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  const glints = (at, t0, seed, n = 12) => {
    const r = mulberry32(seed);
    const parts = Array.from({ length: n }, () => ({ x: at.x, y: at.y, z: at.z + 0.1, vx: (r() - 0.5) * 1.6, vy: 0.4 + r() * 1.3, vz: r() * 0.5, delay: 0, r: 0.012 + r() * 0.014 }));
    world.addBurst('glints', { t0, parts, life: 0.7, gravity: 2 });
  };
  glints(new THREE.Vector3(CAR.x + 0.8, 0.9, CAR.z + 0.4), T.lights[0] + 0.1, 61, 16);
  T.stamps.forEach((s, i) => glints(new THREE.Vector3(CRATE_X, LINE.top + CRATE, LINE.z + 0.2), s, 70 + i, 8));
  glints(LAND.clone().setY(0.5), T.toss[1] + 0.05, 80, 14);

  // ---- per frame -------------------------------------------------------------------------------------
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const grow = (obj, [a, b], t, axis = 'y') => {
    const k = smoothstep(a, b, t);
    obj.visible = k > 0;
    obj.scale.set(1, 1, 1);
    obj.scale[axis] = Math.max(k, 0.001);
    return k;
  };
  const carX = (t) => {
    if (t < T.carGo[0]) return CAR.x;
    if (t < T.carBack[0]) return lerp(CAR.x, CAR.away, easeIn((t - T.carGo[0]) / (T.carGo[1] - T.carGo[0])));
    return lerp(CAR.away, CAR.park, easeOut((t - T.carBack[0]) / (T.carBack[1] - T.carBack[0])));
  };

  world.onUpdate((t) => {
    rTrack.apply(t);
    lTrack.apply(t);

    // Flag waves; light swells at the salute.
    const pos = flagGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = flagBase[i * 3] + FLAG_W / 2;
      pos.setZ(i, Math.sin(bx * 3.2 - t * 3.2) * 0.06 * (bx / FLAG_W) + Math.sin(flagBase[i * 3 + 1] * 2 + t * 1.7) * 0.015 * (bx / FLAG_W));
    }
    pos.needsUpdate = true;
    flagGeo.computeVertexNormals();
    const glory = smoothstep(T.salute - 0.2, T.salute + 1.0, t);
    spot.intensity = 14 + 14 * glory;
    flagMat.emissiveIntensity = 0.04 + 0.06 * glory;
    shopLight.intensity = lerp(4, 18, smoothstep(0, 9, t));

    // Phone in hand on the couch, left on the seat after.
    if (t < lTrack.at('getUp') + 0.1) {
      phone.position.copy(L.handWorld('l', v1)).add(L.handWorld('r', v2)).multiplyScalar(0.5).add(v2.set(0, 0.06, 0));
      phone.lookAt(L.headWorld(v1));
    } else {
      phone.position.set(COUCH.x + 0.3, COUCH.seat + 0.01, COUCH.z + 0.1);
      phone.rotation.set(-PI / 2, 0, 0.4);
    }

    // Imported boxes drop out of the sky onto the pile.
    FALLS.forEach((f, i) => {
      const m = fallen[i];
      m.visible = t >= f.t;
      m.position.set(f.x, Math.max(f.y, 6.5 - 7 * (t - f.t) ** 2), f.z);
      m.rotation.set(0, f.ry, 0);
    });

    // Car: built in stages, driven off, driven back to park.
    const x = carX(t);
    car.visible = t >= T.chassis[0] && !(t > T.carGo[1] && t < T.carBack[0]);
    car.position.set(x, LINE.top, CAR.z);
    const chassisK = smoothstep(...T.chassis, t);
    chassis.scale.setScalar(Math.max(chassisK, 0.001));
    grow(shell, T.shell, t);
    grow(glass, T.glass, t);
    const lit = smoothstep(...T.lights, t);
    lampMat.emissiveIntensity = 2.2 * lit;
    tailMat.emissiveIntensity = 1.6 * lit;
    for (const w of wheels) w.rotation.z = -(x - CAR.x) / 0.21;

    // UAV: parts on the stand, propeller spins up, off it goes; one more pass at the end.
    droneStand.visible = t > T.body[0] - 0.1 && t < T.fly[0] + 0.4;
    droneStand.scale.y = droneStand.visible ? Math.max(0.001, smoothstep(T.body[0] - 0.1, T.body[0] + 0.1, t) * (1 - smoothstep(T.fly[0] + 0.1, T.fly[0] + 0.4, t))) : 1;
    const flying1 = clamp((t - T.fly[0]) / (T.fly[1] - T.fly[0]));
    const flying2 = clamp((t - T.flyBack[0]) / (T.flyBack[1] - T.flyBack[0]));
    drone.visible = t >= T.body[0] && (t < T.fly[1] || (t >= T.flyBack[0] && t < T.flyBack[1]));
    grow(fuselage, T.body, t, 'x');
    grow(wings, T.wings, t, 'z');
    grow(tail, T.tail, t);
    grow(prop, T.prop, t);
    // Climbs straight up on the right first, then crosses above the flag, never in front of it.
    if (t < T.flyBack[0]) {
      const u = flying1;
      drone.position.set(lerp(DRONE.x, -5.4, easeIn(smoothstep(0.38, 1, u))), lerp(DRONE.y, 5.15, smooth(u / 0.4)), lerp(DRONE.z, 0.8, smooth(u / 0.4)));
      craft.rotation.set(0, NOSE_LEFT, -0.12 * smoothstep(0.3, 0.5, u));
    } else {
      drone.position.set(lerp(-5.4, 5.6, flying2), 5.15 + 0.06 * Math.sin(flying2 * 6), 0.8);
      craft.rotation.set(0, NOSE_RIGHT, 0);
    }
    const spinning = t >= T.spin;
    blades.rotation.x = spinning ? (t - T.spin) * 70 : 0;
    blades.visible = !spinning || t < T.spin + 0.25;
    blur.visible = spinning;

    // Torch only while welding.
    const tipNow = weldAt(t, tip);
    torch.visible = !!tipNow;
    flame.scale.setScalar(0.8 + 0.4 * Math.abs(Math.sin(t * 40)));
    torchLight.intensity = tipNow ? 3 + 1.5 * Math.sin(t * 37) : 0;
    if (tipNow) {
      torch.position.copy(R.handWorld('r', v1));
      torch.lookAt(tipNow);
    }

    // Crates: appear blank, get stamped, ride off; the last one is tossed over.
    crates.forEach((m, i) => {
      const s = T.stamps[i];
      const k = smoothstep(s - 0.3, s - 0.15, t);
      m.visible = k > 0;
      m.material = t >= s ? stamped : blank;
      m.scale.setScalar(Math.max(k, 0.001));
      const rest = new THREE.Vector3(CRATE_X, LINE.top + CRATE / 2, LINE.z);
      m.rotation.set(0, 0, 0);
      if (i < crates.length - 1) {
        m.position.copy(rest).setX(lerp(CRATE_X, LINE.x1 + 0.4, easeIn((t - s - 0.15) / 0.9)));
      } else if (t < T.toss[0]) {
        m.position.copy(rest);
      } else {
        const u = clamp((t - T.toss[0]) / (T.toss[1] - T.toss[0]));
        m.position.lerpVectors(rest, LAND, u).setY(lerp(rest.y, LAND.y, u) + 2.0 * 4 * u * (1 - u));
        m.rotation.set(0.6 * Math.sin(u * PI), 2 * PI * u, 0);
      }
    });
  });

  const markers = Object.fromEntries([...rTrack.clips.map((c) => ['R.' + c.name, +c.t0.toFixed(2)]), ...lTrack.clips.map((c) => ['L.' + c.name, +c.t0.toFixed(2)])]);
  return { duration: 15.0, sfx, markers };
}
