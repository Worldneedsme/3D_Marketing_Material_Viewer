// YETENEKLİ vs EMEKÇİ
// Two kids with a ball against a wall. The gifted one juggles effortlessly and
// decides he is good enough; he grows up lying on a bench with his phone. The
// clumsy one kicks the ball at a target on the wall every day, through the rain,
// and stops missing. Years pass; floodlights come on over him, he lifts a cup
// and his teammates run in to celebrate around him. The gifted one kicks his
// ball at the wall once, it rolls away, and he sits down.
import * as THREE from 'three';
import { StickFigure, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, walkTo, runTo } from '../moves.js';
import { PI, lerp, clamp, smooth, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const CHILD = 0.68;
const T = {
  grow: [3.6, 5.2],
  rain: [4.2, 8.0],
  star: 9.0,
  cup: 10.0, // cup goes up
  caption: 11.6,
  end: 14.0,
};
// Teammates: [spot x, spot z, start delay after the floodlights].
const MATES = [
  [1.0, 1.3, 0.35],
  [2.8, 1.3, 0.5],
  [1.25, 0.25, 0.65],
  [2.55, 0.25, 0.8],
  [3.05, 0.85, 0.95],
];
const AGE = [10, 22];
const BALL_R = 0.11;
const LEFT = { x: -1.7, z: 0.5 };
const BENCH = { x: -1.95, z: -0.4, top: 0.45 };
const KICK = { x: 1.9, z: 0.75 };
const TARGET = new THREE.Vector3(1.9, 0.75, WALL_Z + 0.02);
const PERIOD = 0.8;

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

  // ---- street wall with a chalk target ----------------------------------------------------------------
  const brick = canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#2a2420';
    g.fillRect(0, 0, w, h);
    const rand = mulberry32(4);
    for (let row = 0; row < 12; row++) {
      for (let col = -1; col < 5; col++) {
        const x = col * 128 + (row % 2) * 64;
        const s = 58 + Math.floor(rand() * 16);
        g.fillStyle = `rgb(${s + 8},${s - 2},${s - 10})`;
        g.fillRect(x + 4, row * 32 + 4, 120, 26);
      }
    }
  });
  brick.wrapS = brick.wrapT = THREE.RepeatWrapping;
  brick.repeat.set(3, 3);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95 }));
  wall.position.set(0, 3.25, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);
  const chalk = canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(240,240,232,0.9)';
    g.lineWidth = 10;
    for (const r of [110, 70, 30]) {
      g.beginPath();
      g.arc(128, 128, r, 0, PI * 2);
      g.stroke();
    }
  });
  const target = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: chalk, transparent: true, depthWrite: false }));
  target.position.copy(TARGET);
  scene.add(target);
  const spot = new THREE.SpotLight(0xfff2e0, 9, 14, 0.6, 0.6, 1.2);
  spot.position.set(0, 7.5, 4);
  spot.target.position.set(0, 0.5, 0);
  scene.add(spot, spot.target);

  // Bench on the left.
  const wood = std(0x6b5442, { roughness: 0.85 });
  box(wood, 1.7, 0.08, 0.5, BENCH.x, BENCH.top - 0.04, BENCH.z);
  for (const dx of [-0.75, 0.75]) box(std(0x3a3d40, { metalness: 0.4 }), 0.06, BENCH.top - 0.08, 0.4, BENCH.x + dx, (BENCH.top - 0.08) / 2, BENCH.z);

  // Floodlights for the end, hidden until then.
  const lights = new THREE.Group();
  const poleMat = std(0x9aa0a6, { metalness: 0.6, roughness: 0.35 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: 0 });
  const beams = [];
  for (const x of [0.75, 3.05]) {
    box(poleMat, 0.08, 4.5, 0.08, x, 2.25, -0.85, lights);
    box(lampMat, 0.7, 0.4, 0.1, x, 4.55, -0.78, lights);
    const s = new THREE.SpotLight(0xfff4d6, 0, 14, 0.5, 0.5, 1.0);
    s.position.set(x, 4.5, -0.6);
    s.target.position.set(1.9, 0, 0.6);
    lights.add(s, s.target);
    beams.push(s);
  }
  scene.add(lights);

  // Balls: white with dark patches.
  const ballTex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f2f2ee';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d1d1f';
    for (const [x, y] of [[30, 30], [100, 70], [170, 25], [230, 80], [60, 100], [140, 110]]) {
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * PI * 2;
        g.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16);
      }
      g.fill();
    }
  });
  const makeBall = () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 16), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.5 }));
    m.castShadow = true;
    scene.add(m);
    return m;
  };
  const ballL = makeBall();
  const ballR = makeBall();

  // The cup: a plain gold cup of my own on a dark base.
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe0b23c, metalness: 0.9, roughness: 0.22, emissive: 0x3a2a05 });
  const cup = new THREE.Group();
  const bowl = [[0, 0], [0.05, 0], [0.05, 0.03], [0.02, 0.06], [0.02, 0.14], [0.07, 0.17], [0.12, 0.24], [0.14, 0.34], [0.13, 0.35]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(bowl, 28), goldMat);
  body.castShadow = true;
  cup.add(body);
  for (const s of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, PI), goldMat);
    handle.rotation.z = (s * PI) / 2;
    handle.position.set(s * 0.13, 0.26, 0);
    cup.add(handle);
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.13), std(0x222326, { roughness: 0.4 }));
  base.position.y = -0.02;
  cup.add(base);
  scene.add(cup);

  const phone = new THREE.Group();
  box(std(0x1a1a1e), 0.075, 0.14, 0.012, 0, 0, 0, phone);
  scene.add(phone);

  // ---- figures ------------------------------------------------------------------------------------
  const L = new StickFigure(mat.figure); // yetenekli
  const R = new StickFigure(mat.figure); // emekçi
  scene.add(L.root, R.root);
  const sizeAt = (t) => lerp(CHILD, 1, smoothstep(...T.grow, t));

  // Left: juggles as a kid, then the bench and the phone, then one sad kick.
  const juggle = (t) => {
    const u = (t * 2.0) % 1;
    return { u, y: BALL_R + 0.62 * 4 * u * (1 - u) * sizeAt(t) };
  };
  const phoneHands = { lHand: { p: [0.045, 0.27, 0.32, 'chest'] }, rHand: { p: [-0.045, 0.27, 0.32, 'chest'] } };
  const lTrack = new Track(L, [
    {
      name: 'juggle',
      d: T.grow[0],
      fn: (u, lt, d, t) => {
        const { u: b } = juggle(t);
        const tap = Math.exp(-((b / 0.12) ** 2)) + Math.exp(-(((1 - b) / 0.12) ** 2));
        return { pos: [LEFT.x, STAND_HIP, LEFT.z], yaw: 0.2, pose: breathe(pose({ nod: 0.35, lean: 0.05, lLeg: 0.75 * tap, lKnee: 0.5 * tap, lArm: 0.3, rArm: 0.3, lOut: 0.6, rOut: 0.6 }), t, 0.4), ground: 0 };
      },
    },
    { name: 'toBench', d: 0.6, blend: 0.3, fn: walkTo({ from: [LEFT.x, LEFT.z], to: [BENCH.x + 0.3, BENCH.z + 0.45], yaw: -2.6, ground: 0, amp: 0.3 }) },
    {
      name: 'bench',
      d: T.star - T.grow[0] - 0.6,
      blend: 0.45,
      fn: (u, lt, d, t) => ({ pos: [BENCH.x, BENCH.top + 0.07, BENCH.z], yaw: PI / 2, pitch: -PI / 2, pose: breathe(pose({ nod: 0.4, lLeg: 0.15, rLeg: 0.6, rKnee: 1.2 }), t, 0.4), ik: phoneHands }),
    },
    { name: 'getUp', d: 0.6, blend: 0.4, fn: stand({ x: LEFT.x, z: LEFT.z, yaw: 0.3, ground: 0, pose: { nod: 0.3 } }) },
    {
      name: 'kick',
      d: 0.7,
      blend: 0.2,
      fn: (u, lt) => {
        const k = Math.exp(-(((lt - 0.3) / 0.1) ** 2));
        return { pos: [LEFT.x, STAND_HIP, LEFT.z], yaw: PI - 0.3, pose: pose({ lean: 0.1, nod: 0.3, rLeg: 0.9 * k, rKnee: 0.3 }), ground: 0 };
      },
    },
    { name: 'watch', d: 0.8, blend: 0.3, fn: stand({ x: LEFT.x, z: LEFT.z, yaw: -1.2, ground: 0, pose: { nod: 0.2, lArm: 0.3, rArm: 0.3, lOut: 0.5, rOut: 0.5 } }) },
    {
      name: 'sit',
      d: 10,
      blend: 0.5,
      fn: (u, lt, d, t) => ({ pos: [LEFT.x - 0.1, 0.1, WALL_Z + 0.3], yaw: 0, pose: breathe(pose({ lean: 0.35, nod: 0.6, lLeg: 1.9, rLeg: 1.9, lKnee: 2.3, rKnee: 2.3, lArm: 0.9, rArm: 0.9, lEl: 1.2, rEl: 1.2 }), t, 0.4) }),
    },
  ]);

  // Right: kicks at the wall from the first second to the floodlights.
  const kickAt = (t) => {
    const n = Math.floor(t / PERIOD);
    return { n, u: (t - n * PERIOD) / PERIOD };
  };
  const rTrack = new Track(R, [
    {
      name: 'train',
      d: T.star,
      fn: (u, lt, d, t) => {
        const { u: k } = kickAt(t);
        const swing = Math.exp(-((k / 0.1) ** 2)) + Math.exp(-(((1 - k) / 0.1) ** 2));
        const wet = smoothstep(T.rain[0], T.rain[0] + 0.5, t) * (1 - smoothstep(T.rain[1] - 0.5, T.rain[1], t));
        return { pos: [KICK.x, STAND_HIP, KICK.z], yaw: PI, pose: breathe(pose({ lean: 0.12 + 0.08 * wet, nod: 0.15 + 0.15 * wet, rLeg: 1.0 * swing - 0.25 * (1 - swing), rKnee: 0.35 * (1 - swing), lArm: 0.3, rArm: -0.3 * swing, lOut: 0.4, rOut: 0.4 }), t, 0.3), ground: 0 };
      },
    },
    {
      name: 'star',
      d: T.cup - T.star,
      blend: 0.4,
      fn: (u, lt, d, t) => {
        const j = Math.abs(Math.sin(lt * 2 * PI * 1.1));
        return { pos: [KICK.x, STAND_HIP, KICK.z], yaw: 0, pose: breathe(pose({ nod: -0.15, lean: -0.05, lArm: 0.2, rArm: 0.2, lOut: 0.3, rOut: 0.3, rLeg: 0.5 * j, rKnee: 0.6 * j }), t, 0.3), ground: 0 };
      },
    },
    {
      // Cup held high in both hands.
      name: 'cup',
      d: 10,
      blend: 0.35,
      fn: (u, lt, d, t) => {
        const pump = 0.06 * Math.sin(lt * 2 * PI * 1.2);
        return {
          pos: [KICK.x, STAND_HIP, KICK.z],
          yaw: 0,
          pose: breathe(pose({ nod: -0.35, lean: -0.08 }), t, 0.3),
          ik: { lHand: { p: [0.1, 1.08 + pump, 0.06, 'chest'], pole: [0.8, 0, 0, 'chest'] }, rHand: { p: [-0.1, 1.08 + pump, 0.06, 'chest'], pole: [-0.8, 0, 0, 'chest'] } },
          ground: 0,
          lift: 0.05 * Math.max(0, Math.sin(lt * 2 * PI * 1.2)),
        };
      },
    },
  ]);

  // Teammates run in from the right and jump around him.
  const mates = MATES.map(([x, z, delay], i) => {
    const fig = new StickFigure(mat.figure);
    scene.add(fig.root);
    const from = [4.5 + 0.3 * i, z + 0.2];
    const yawRun = Math.atan2(x - from[0], z - from[1]);
    const face = Math.atan2(KICK.x - x, KICK.z - z);
    const dist = Math.hypot(x - from[0], z - from[1]);
    const track = new Track(fig, [
      { name: 'off', d: T.star + delay, fn: stand({ x: 7, z, yaw: 0, ground: 0 }) },
      { name: 'run', d: dist / 4.2, fn: runTo({ from, to: [x, z], yaw: yawRun, ground: 0 }) },
      {
        name: 'party',
        d: 10,
        blend: 0.25,
        fn: (u, lt) => {
          const ph = lt * 2 * PI * 1.5 + i;
          const o = 0.5 + 0.5 * Math.sin(ph);
          return { pos: [x, STAND_HIP, z], yaw: face, pose: pose({ nod: -0.3, lean: -0.05, lArm: 0.2, rArm: 0.2, lOut: 2.1 + 0.5 * o, rOut: 2.1 + 0.5 * (1 - o), lEl: 0.2, rEl: 0.2, lKnee: 0.3 * o, rKnee: 0.3 * o }), ground: 0, lift: 0.16 * Math.abs(Math.sin(ph)) };
        },
      },
    ]);
    return track;
  });

  // ---- text --------------------------------------------------------------------------------------
  for (const [text, x] of [['YETENEKLİ', -1.6], ['EMEKÇİ', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '38px', letterSpacing: '0.08em' });
  }
  const meter = (x, color) => {
    const l = world.addLabel('', [x, 5.55, 0]);
    Object.assign(l.el.style, { fontSize: '36px', color });
    return l;
  };
  const lMeter = meter(-1.6, '#ff5a4a');
  const rMeter = meter(1.6, '#7ddc7d');
  const age = world.addLabel('', [0, 4.75, 0], { t1: T.star + 0.8 });
  Object.assign(age.el.style, { fontSize: '44px', color: '#e8c15a' });
  world.addThought('ben zaten iyiyim', L, 1.0, 2.6);
  world.addThought('antrenman sıkıcı', L, 5.2, 6.6);
  world.addThought('yarın giderim...', L, 7.0, 8.6);
  world.addThought('keşke çalışsaydım', L, T.star + 1.9, T.end);
  world.setCaption('Emek olmadan\nyemek olmaz.', T.caption, { top: 470 });

  // ---- sounds and particles ---------------------------------------------------------------------------
  const sfx = [];
  for (let n = 0; n * PERIOD < T.star - 0.3; n++) {
    sfx.push({ t: n * PERIOD + 0.02, type: 'board', gain: 0.5 });
    sfx.push({ t: n * PERIOD + 0.45 * PERIOD, type: 'block', gain: 0.35 });
  }
  for (let t = 0; t < T.grow[0]; t += 0.5) sfx.push({ t, type: 'step', gain: 1.4 });
  sfx.push({ t: T.rain[0], type: 'splash', gain: 0.5 }, { t: T.rain[0] + 1.7, type: 'splash', gain: 0.4 });
  sfx.push({ t: T.star, type: 'click', gain: 1.2 }, { t: T.star + 0.05, type: 'whoosh', gain: 1.2 });
  sfx.push({ t: T.cup, type: 'chime', gain: 0.9 }, { t: T.cup + 0.05, type: 'crowd', gain: 1.3 }, { t: T.cup + 1.6, type: 'crowd', gain: 0.9 });
  sfx.push({ t: lTrack.at('kick') + 0.3, type: 'board', gain: 0.4 });

  world.makeParticles('rain', new THREE.BoxGeometry(0.05, 1, 0.05), new THREE.MeshBasicMaterial({ color: 0xb4c8dc, transparent: true, opacity: 0.55, depthWrite: false }), 1600);
  const rand = mulberry32(21);
  for (let t = T.rain[0] - 0.4; t < T.rain[1]; t += 0.05) {
    const parts = Array.from({ length: 8 }, () => ({ x: 0.35 + rand() * 2.9, y: 6.4, z: -0.6 + rand() * 1.8, vx: -0.3, vy: -8, vz: 0, delay: rand() * 0.05, r: 0.3 }));
    world.addBurst('rain', { t0: t, parts, life: 0.85, floor: 0, gravity: 4 });
  }
  world.makeParticles('confetti', new THREE.BoxGeometry(1, 0.4, 1), new THREE.MeshBasicMaterial({ color: 0xffe28a }));
  for (let k = 0; k < 3; k++) {
    const parts = Array.from({ length: 30 }, () => ({ x: KICK.x + (rand() - 0.5) * 1.6, y: 5.6, z: KICK.z - 0.4 + rand() * 0.8, vx: (rand() - 0.5) * 0.8, vy: rand() * 0.5, vz: 0, delay: rand() * 0.6, r: 0.03 + rand() * 0.02 }));
    world.addBurst('confetti', { t0: T.cup + k * 0.5, parts, life: 2.4, gravity: 1.2 });
  }
  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  const r3 = mulberry32(77);
  const cupGlints = Array.from({ length: 26 }, () => ({ x: KICK.x, y: 3.0, z: KICK.z + 0.1, vx: (r3() - 0.5) * 2.4, vy: 0.4 + r3() * 1.8, vz: r3() * 0.6, delay: r3() * 0.15, r: 0.014 + r3() * 0.014 }));
  world.addBurst('glints', { t0: T.cup + 0.1, parts: cupGlints, life: 0.9, gravity: 2 });
  for (let n = 0; n * PERIOD < T.star - 0.3; n++) {
    const hitT = n * PERIOD + 0.45 * PERIOD;
    if (hitT < 6) continue;
    const r2 = mulberry32(100 + n);
    const parts = Array.from({ length: 6 }, () => ({ x: TARGET.x, y: TARGET.y, z: TARGET.z + 0.12, vx: (r2() - 0.5) * 1.2, vy: (r2() - 0.2) * 1.2, vz: r2() * 0.8, delay: 0, r: 0.012 + r2() * 0.01 }));
    world.addBurst('glints', { t0: hitT, parts, life: 0.4, gravity: 2 });
  }

  // ---- per frame ----------------------------------------------------------------------------------------
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const miss = mulberry32(8);
  const offsets = Array.from({ length: 20 }, () => [(miss() - 0.5) * 1.1, (miss() - 0.4) * 0.8]);
  world.onUpdate((t) => {
    const s = sizeAt(t);
    L.root.scale.setScalar(s);
    R.root.scale.setScalar(s);
    lTrack.apply(t);
    rTrack.apply(t);

    const yrs = Math.round(lerp(AGE[0], AGE[1], smoothstep(T.grow[0], T.star, t)));
    age.el.textContent = `${yrs} YAŞ`;
    const hours = Math.round(10000 * smoothstep(0.3, T.star, t) / 100) * 100;
    lMeter.el.textContent = '0 SAAT';
    rMeter.el.textContent = `${hours.toLocaleString('tr-TR')} SAAT`;

    // Left ball: juggled, then lying by the bench, then kicked away.
    if (t < T.grow[0]) {
      const { y } = juggle(t);
      ballL.position.set(LEFT.x + 0.1 * s, y, LEFT.z + 0.32 * s);
    } else if (t < lTrack.at('kick') + 0.3) {
      ballL.position.set(LEFT.x + 0.25, BALL_R, LEFT.z + 0.35);
    } else {
      const u = clamp((t - lTrack.at('kick') - 0.3) / 1.6);
      ballL.position.set(lerp(LEFT.x + 0.25, -4.2, Math.sqrt(u)), BALL_R, LEFT.z + 0.35 + 0.3 * u);
    }
    ballL.rotation.z = -ballL.position.x / BALL_R;

    // Right ball: foot to wall and back; misses as a kid, dead centre later.
    if (t < T.star) {
      const { n, u } = kickAt(t);
      const skill = smoothstep(2.5, 6.0, n * PERIOD);
      const [ox, oy] = offsets[n % offsets.length];
      const hit = v2.set(TARGET.x + ox * (1 - skill), TARGET.y + oy * (1 - skill) * s, TARGET.z + BALL_R);
      const foot = v1.set(KICK.x - 0.05, BALL_R, KICK.z - 0.3 * s);
      const k = u < 0.45 ? u / 0.45 : 1 - (u - 0.45) / 0.55;
      ballR.position.lerpVectors(foot, hit, k).setY(lerp(foot.y, hit.y, k) + 0.25 * Math.sin(k * PI));
      ballR.rotation.x = t * 12;
    } else if (t < T.cup) {
      const j = ((t - T.star) * 2.2) % 1;
      ballR.position.set(KICK.x + 0.1, BALL_R + 0.7 * 4 * j * (1 - j), KICK.z + 0.35);
    } else {
      ballR.position.set(KICK.x + 0.35, BALL_R, KICK.z + 0.3);
    }

    // The cup appears in his hands and goes up; teammates pile in.
    cup.visible = t >= T.cup - 0.05;
    if (cup.visible) {
      cup.position.copy(R.handWorld('l', v1)).add(R.handWorld('r', v2)).multiplyScalar(0.5).add(v2.set(0, -0.06, 0));
      cup.scale.setScalar(Math.max(0.001, smoothstep(T.cup - 0.05, T.cup + 0.2, t)) * 1.8);
    }
    for (const m of mates) m.apply(t);

    // Phone on the bench years.
    phone.visible = t > lTrack.at('bench') + 0.3 && t < lTrack.at('getUp');
    if (phone.visible) {
      phone.position.copy(L.handWorld('l', v1)).add(L.handWorld('r', v2)).multiplyScalar(0.5);
      phone.lookAt(L.headWorld(v1));
    }

    // Floodlights rise and switch on.
    const on = smoothstep(T.star, T.star + 0.3, t);
    lights.visible = t > T.star - 0.4;
    lights.position.y = lerp(-6, 0, smoothstep(T.star - 0.4, T.star, t));
    lampMat.emissiveIntensity = 3 * on;
    for (const b of beams) b.intensity = 40 * on;
    spot.intensity = lerp(9, 5, on);
  });

  return { duration: T.end, sfx };
}
