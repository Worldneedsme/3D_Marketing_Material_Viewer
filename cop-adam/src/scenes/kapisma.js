// DERBİ KAPIŞMASI: SARI-KIRMIZI vs SARI-LACİVERT
// Derby-night hype rather than a lesson: two fans in rival colours walk to the
// centre circle under red and blue light, trade boasts and score predictions
// to a drum beat, then both charge the ball. The frame freezes on the kick:
// "BU AKŞAM 21:30 / KİM KAZANIR?". Nobody wins; the comments decide.
// Colours only: no club names, crests or insults.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, walkTo } from '../moves.js';
import { PI, lerp, clamp, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const RED = ['#c8102e', '#f2b600'];
const NAVY = ['#1b2a6b', '#f2c200'];
const BALL_R = 0.11;
const BALL = new THREE.Vector3(0, BALL_R, 0.55);
const FACE_X = 0.8;
const Z = 0.45;
const T = {
  walk: [0.2, 1.4],
  boastL: 1.4,
  boastR: 2.7,
  scoreL: 4.0,
  scoreR: 5.3,
  ready: 6.6,
  charge: 7.6,
  freeze: 8.15,
  end: 12.5,
};

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.22, swell: 0.06 });
  world.key.intensity = 1.5;

  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

  // ---- stadium night: dark wall, pitch lines, two coloured lights ------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), std(0x121418, { roughness: 0.95 }));
  wall.position.set(0, 3.25, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e2, transparent: true, opacity: 0.85 });
  const circle = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.95, 64), lineMat);
  circle.rotation.x = -PI / 2;
  circle.position.set(0, 0.006, 0.55);
  scene.add(circle);
  const half = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 3.5), lineMat);
  half.rotation.x = -PI / 2;
  half.position.set(0, 0.006, 0.55);
  scene.add(half);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), lineMat);
  dot.rotation.x = -PI / 2;
  dot.position.set(0, 0.007, 0.55);
  scene.add(dot);

  const sideLight = (color, x) => {
    const s = new THREE.SpotLight(color, 0, 14, 0.55, 0.6, 1.0);
    s.position.set(x, 6.5, 3.0);
    s.target.position.set(x * 0.35, 0.5, 0.4);
    scene.add(s, s.target);
    return s;
  };
  const lightL = sideLight(0xff3a2a, -2.6);
  const lightR = sideLight(0x4a6cff, 2.6);
  const flash = new THREE.PointLight(0xffffff, 0, 10, 1.5);
  flash.position.set(0, 2.5, 2.5);
  scene.add(flash);

  // Ball on the centre spot.
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
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 16), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.5, emissive: 0x222222 }));
  ball.position.copy(BALL);
  ball.castShadow = true;
  scene.add(ball);

  // ---- fans with scarves -----------------------------------------------------------------------------
  const scarfTex = ([a, b]) =>
    canvasTex(32, 128, (g) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? b : a;
        g.fillRect(0, i * 16, 32, 16);
      }
    });
  const scarf = (fig, colours) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.034, 8, 20), std(colours[0], { roughness: 0.9 }));
    ring.rotation.x = PI / 2;
    ring.position.y = 0.02;
    fig.j.neck.add(ring);
    const tailMat = new THREE.MeshStandardMaterial({ map: scarfTex(colours), roughness: 0.9 });
    for (const dx of [-0.035, 0.035]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.34, 0.018), tailMat);
      tail.position.set(dx, DIM.torso - 0.2, DIM.torsoR + 0.03);
      tail.rotation.z = dx * 1.5;
      fig.j.spine.add(tail);
    }
  };
  const L = new StickFigure(mat.figure);
  const R = new StickFigure(mat.figure);
  scarf(L, RED);
  scarf(R, NAVY);
  scene.add(L.root, R.root);

  // s = +1 for the left fan (faces +x), -1 for the right one.
  const tracks = [L, R].map((fig, i) => {
    const s = i === 0 ? 1 : -1;
    const x = -s * FACE_X;
    const yaw = (s * PI) / 2;
    const at = (p, extra = {}) => (u, lt, d, t) => ({ pos: [x, STAND_HIP, Z], yaw, pose: breathe(pose(p), t, 0.4), ground: 0, ...extra });
    const crossed = { lHand: { p: [-0.13, 0.3, 0.17, 'chest'], pole: [0.35, 0.2, 0.15, 'chest'] }, rHand: { p: [0.13, 0.32, 0.19, 'chest'], pole: [-0.35, 0.2, 0.15, 'chest'] } };
    // Chest out, pointing at the rival.
    const boast = (u, lt, d, t) => {
      const jab = 0.15 * Math.sin(lt * 2 * PI * 2.2);
      return { pos: [x + s * 0.12, STAND_HIP, Z], yaw, pose: breathe(pose({ lean: -0.15, nod: -0.2, rArm: 1.45 + jab, rOut: 0.05, rEl: 0.05, lArm: -0.3, lOut: 0.35, lEl: 0.4 }), t, 0.3), ground: 0 };
    };
    // One hand up high: the score prediction floats above it.
    const predict = at({ lean: -0.05, nod: -0.25, rArm: 2.9, rOut: 0.2, rEl: 0.1, lArm: 0.1 });
    const myBoast = i === 0 ? T.boastL : T.boastR;
    const myScore = i === 0 ? T.scoreL : T.scoreR;
    const clips = [
      { name: 'walk', d: T.walk[1], fn: walkTo({ from: [-s * 2.9, Z], to: [x, Z], yaw, ground: 0, amp: 0.36, ease: (u) => 1 - (1 - u) ** 2 }) },
      { name: 'eye', d: myBoast - T.walk[1], blend: 0.3, fn: at({ nod: 0.05, lean: -0.05 }, { ik: crossed }) },
      { name: 'boast', d: 1.3, blend: 0.2, fn: boast },
      { name: 'listen', d: myScore - myBoast - 1.3, blend: 0.3, fn: at({ nod: 0.1, turn: 0.2, lean: -0.08 }, { ik: crossed }) },
      { name: 'predict', d: 1.3, blend: 0.2, fn: predict },
      { name: 'wait', d: T.ready - myScore - 1.3, blend: 0.3, fn: at({ nod: 0.05, turn: -0.15 }, { ik: crossed }) },
      { name: 'ready', d: T.charge - T.ready, blend: 0.3, fn: at({ lean: 0.45, nod: -0.25, lLeg: 0.5, rLeg: 0.35, lKnee: 0.9, rKnee: 0.7, lArm: -0.5, rArm: 0.7, lEl: 0.6, rEl: 0.6 }) },
      {
        name: 'charge',
        d: 10,
        blend: 0.1,
        fn: (u, lt) => {
          // Two quick strides in, then the kicking leg swings at the ball.
          const k = clamp(lt / (T.freeze - T.charge));
          // Stop a leg's length from the ball so the two never touch.
          const px = lerp(x, -s * 0.5, Math.min(1, k * 1.25));
          const swing = smoothstep(0.55, 1, k);
          return { pos: [px, STAND_HIP, Z], yaw, pose: pose({ lean: 0.3, nod: -0.1, rLeg: lerp(-0.6, 1.2, swing), rKnee: lerp(1.2, 0.15, swing), lLeg: 0.15, lKnee: 0.3, lArm: 0.9, rArm: -0.7, lOut: 0.5, rOut: 0.4, lEl: 0.4, rEl: 0.5 }), ground: 0 };
        },
      },
    ];
    return new Track(fig, clips);
  });

  // ---- text ---------------------------------------------------------------------------------------
  const top = (text, x, [a, b]) => Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '33px', letterSpacing: '0.06em', color: b, textShadow: `0 0 18px ${a}, 0 0 4px ${a}` });
  top('SARI-KIRMIZI', -1.6, RED);
  top('SARI-LACİVERT', 1.6, NAVY);
  const tonight = world.addLabel('BU AKŞAM 21:30', [0, 5.55, 0], { t1: T.freeze });
  Object.assign(tonight.el.style, { fontSize: '44px', color: '#ffffff', letterSpacing: '0.1em' });
  world.addThought('bu akşam bizim!', L, T.boastL + 0.1, T.boastL + 1.4);
  world.addThought('rüyanda görürsün!', R, T.boastR + 0.1, T.boastR + 1.4);
  const score = (fig, text, t0, colour) =>
    Object.assign(world.addLabel(text, () => fig.handWorld('r').add(new THREE.Vector3(0, 0.35, 0)), { t0, t1: t0 + 1.35 }).el.style, { fontSize: '58px', color: colour, textShadow: '0 0 20px rgba(0,0,0,0.8)' });
  score(L, '3-0', T.scoreL + 0.15, RED[1]);
  score(R, '4-0', T.scoreR + 0.15, NAVY[1]);
  world.setCaption('BU AKŞAM 21:30\nKİM KAZANIR?', T.freeze + 0.15, { top: 430 });
  Object.assign(world.captionEl.style, { fontSize: '70px', lineHeight: '1.25' });

  // ---- sounds ----------------------------------------------------------------------------------------
  const sfx = [{ t: 0.1, type: 'crowd', gain: 0.7 }, { t: 2.6, type: 'crowd', gain: 0.6 }, { t: 5.2, type: 'crowd', gain: 0.8 }];
  // Drum: a steady "dum dum dum" that speeds up before the charge.
  for (let t = 0.4, gap = 0.5; t < T.freeze; t += gap) {
    sfx.push({ t, type: 'block', gain: 1.1 });
    if (t > T.ready) gap = Math.max(0.16, gap * 0.82);
  }
  sfx.push({ t: T.freeze, type: 'crash', gain: 1.2 }, { t: T.freeze + 0.05, type: 'whistle', gain: 0.9 }, { t: T.freeze + 0.9, type: 'crowd', gain: 1.3 });

  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  const rand = mulberry32(31);
  const sparks = Array.from({ length: 40 }, () => ({ x: 0, y: 0.25, z: BALL.z, vx: (rand() - 0.5) * 3, vy: 0.5 + rand() * 2.2, vz: (rand() - 0.3) * 1.5, delay: 0, r: 0.015 + rand() * 0.015 }));
  world.addBurst('glints', { t0: T.freeze - 0.12, parts: sparks, life: 1.2, gravity: 2 });

  // ---- per frame --------------------------------------------------------------------------------------
  // After the freeze, people, ball and sparks hold still; only the lights and text keep going.
  world.onUpdate((t) => {
    const ft = Math.min(t, T.freeze);
    for (const tr of tracks) tr.apply(ft);
    ball.position.copy(BALL);
    ball.rotation.y = ft * 0.3;

    const on = smoothstep(0, 0.6, t);
    const pulse = 0.85 + 0.15 * Math.sin(t * 8);
    lightL.intensity = 48 * on * (t < T.freeze ? pulse : 1);
    lightR.intensity = 48 * on * (t < T.freeze ? pulse : 1);
    flash.intensity = t >= T.freeze ? 60 * Math.exp(-(t - T.freeze) * 6) : 0;
  });
  // Freeze the sparks too: wrap the particle update so it never runs past the freeze.
  const update = world.updateParticles.bind(world);
  world.updateParticles = (t) => update(Math.min(t, T.freeze + 0.02));

  return { duration: T.end, sfx };
}
