// DERBİ ATIŞMASI: SARI-KIRMIZI vs SARI-LACİVERT, sarı-kırmızı golüyle
// The same face-off as kapisma.js (boasts, score predictions, drums, both
// charge the ball), but this time the red-yellow fan wins the ball, dribbles
// past and scores; the navy-yellow fan drops to his knees: "yine mi?!".
// Playful rivalry: nobody is shown as a hooligan. Colours only, no names or crests.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { breathe, walkTo } from '../moves.js';
import { PI, lerp, clamp, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const RED = ['#c8102e', '#f2b600'];
const NAVY = ['#1b2a6b', '#f2c200'];
const BALL_R = 0.11;
const BALL = new THREE.Vector3(0, BALL_R, 0.55);
const FACE_X = 0.8;
const Z = 0.45;
const RUN_Z = 0.9; // the winner dribbles in front of the other
const GOAL = { x: 2.2, z0: 0.05, z1: 1.15, h: 0.9, depth: 0.45 };
const T = {
  walk: [0.2, 1.4],
  boastL: 1.4,
  boastR: 2.7,
  scoreL: 4.0,
  scoreR: 5.3,
  ready: 6.6,
  charge: 7.6,
  clash: 8.1,
  shot: 8.7,
  goal: 9.05,
  caption: 10.6,
  end: 13.5,
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
  const box = (m, w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  };

  // ---- stadium night ------------------------------------------------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), std(0x121418, { roughness: 0.95 }));
  wall.position.set(0, 3.25, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e2, transparent: true, opacity: 0.85 });
  const flat = (geo, x, z) => {
    const m = new THREE.Mesh(geo, lineMat);
    m.rotation.x = -PI / 2;
    m.position.set(x, 0.006, z);
    scene.add(m);
  };
  flat(new THREE.RingGeometry(0.9, 0.95, 64), 0, 0.55);
  flat(new THREE.PlaneGeometry(0.05, 3.5), 0, 0.55);
  flat(new THREE.CircleGeometry(0.06, 16), 0, 0.55);

  // Goal on the right: white frame, net.
  const post = std(0xf2f2ee, { roughness: 0.4 });
  for (const z of [GOAL.z0, GOAL.z1]) {
    box(post, 0.06, GOAL.h, 0.06, GOAL.x, GOAL.h / 2, z);
    box(post, GOAL.depth, 0.04, 0.04, GOAL.x + GOAL.depth / 2, 0.02, z);
  }
  box(post, 0.06, 0.06, GOAL.z1 - GOAL.z0 + 0.06, GOAL.x, GOAL.h, (GOAL.z0 + GOAL.z1) / 2);
  const netTex = canvasTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(235,235,230,0.55)';
    g.lineWidth = 2;
    for (let i = 0; i <= 128; i += 16) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 128);
      g.moveTo(0, i);
      g.lineTo(128, i);
      g.stroke();
    }
  });
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
  netTex.repeat.set(3, 2);
  const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(GOAL.z1 - GOAL.z0, GOAL.h, 8, 6), netMat);
  net.rotation.y = PI / 2;
  net.position.set(GOAL.x + GOAL.depth, GOAL.h / 2, (GOAL.z0 + GOAL.z1) / 2);
  scene.add(net);
  const netBase = net.geometry.attributes.position.array.slice();

  const sideLight = (color, x) => {
    const s = new THREE.SpotLight(color, 0, 14, 0.55, 0.6, 1.0);
    s.position.set(x, 6.5, 3.0);
    s.target.position.set(x * 0.35, 0.5, 0.4);
    scene.add(s, s.target);
    return s;
  };
  const lightL = sideLight(0xff3a2a, -2.6);
  const lightR = sideLight(0x4a6cff, 2.6);
  const flash = new THREE.PointLight(0xffd27a, 0, 10, 1.5);
  flash.position.set(1.6, 2.2, 2.0);
  scene.add(flash);

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
  ball.castShadow = true;
  scene.add(ball);

  // ---- fans --------------------------------------------------------------------------------------
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
  const L = new StickFigure(mat.figure); // sarı-kırmızı
  const R = new StickFigure(mat.figure); // sarı-lacivert
  scarf(L, RED);
  scarf(R, NAVY);
  scene.add(L.root, R.root);

  const crossed = { lHand: { p: [-0.13, 0.3, 0.17, 'chest'], pole: [0.35, 0.2, 0.15, 'chest'] }, rHand: { p: [0.13, 0.32, 0.19, 'chest'], pole: [-0.35, 0.2, 0.15, 'chest'] } };
  // Shared opening for both: walk in, boast, predict, get ready, charge.
  const opening = (i) => {
    const s = i === 0 ? 1 : -1;
    const x = -s * FACE_X;
    const yaw = (s * PI) / 2;
    const at = (p, extra = {}) => (u, lt, d, t) => ({ pos: [x, STAND_HIP, Z], yaw, pose: breathe(pose(p), t, 0.4), ground: 0, ...extra });
    const boast = (u, lt, d, t) => {
      const jab = 0.15 * Math.sin(lt * 2 * PI * 2.2);
      return { pos: [x + s * 0.12, STAND_HIP, Z], yaw, pose: breathe(pose({ lean: -0.15, nod: -0.2, rArm: 1.45 + jab, rOut: 0.05, rEl: 0.05, lArm: -0.3, lOut: 0.35, lEl: 0.4 }), t, 0.3), ground: 0 };
    };
    const myBoast = i === 0 ? T.boastL : T.boastR;
    const myScore = i === 0 ? T.scoreL : T.scoreR;
    return [
      { name: 'walk', d: T.walk[1], fn: walkTo({ from: [-s * 2.9, Z], to: [x, Z], yaw, ground: 0, amp: 0.36, ease: (u) => 1 - (1 - u) ** 2 }) },
      { name: 'eye', d: myBoast - T.walk[1], blend: 0.3, fn: at({ nod: 0.05, lean: -0.05 }, { ik: crossed }) },
      { name: 'boast', d: 1.3, blend: 0.2, fn: boast },
      { name: 'listen', d: myScore - myBoast - 1.3, blend: 0.3, fn: at({ nod: 0.1, turn: 0.2, lean: -0.08 }, { ik: crossed }) },
      { name: 'predict', d: 1.3, blend: 0.2, fn: at({ lean: -0.05, nod: -0.25, rArm: 2.9, rOut: 0.2, rEl: 0.1, lArm: 0.1 }) },
      { name: 'wait', d: T.ready - myScore - 1.3, blend: 0.3, fn: at({ nod: 0.05, turn: -0.15 }, { ik: crossed }) },
      { name: 'ready', d: T.charge - T.ready, blend: 0.3, fn: at({ lean: 0.45, nod: -0.25, lLeg: 0.5, rLeg: 0.35, lKnee: 0.9, rKnee: 0.7, lArm: -0.5, rArm: 0.7, lEl: 0.6, rEl: 0.6 }) },
      {
        name: 'charge',
        d: T.clash - T.charge,
        blend: 0.1,
        fn: (u, lt) => {
          const k = clamp(lt / (T.clash - T.charge));
          return { pos: [lerp(x, -s * 0.5, k), STAND_HIP, Z], yaw, pose: pose({ lean: 0.35, nod: -0.1, lLeg: 0.5 * Math.sin(k * 6), rLeg: -0.5 * Math.sin(k * 6), lKnee: 0.6, rKnee: 0.6, lArm: -0.6 * Math.sin(k * 6), rArm: 0.6 * Math.sin(k * 6), lEl: 1.2, rEl: 1.2 }), ground: 0 };
        },
      },
    ];
  };

  // Winner: takes the ball, dribbles out front, shoots, celebrates.
  const DRIBBLE_TO = 1.0;
  const tL = new Track(L, [
    ...opening(0),
    {
      name: 'dribble',
      d: T.shot - T.clash,
      blend: 0.12,
      fn: (u, lt) => {
        const k = clamp(lt / (T.shot - T.clash));
        const ph = k * 4 * PI;
        // Steps out in front first, so he never passes through the other one.
        return { pos: [lerp(-0.5, DRIBBLE_TO, smoothstep(0.15, 1, k)), STAND_HIP, lerp(Z, RUN_Z, Math.min(1, k * 4))], yaw: PI / 2 + 0.25 * (1 - k), pose: pose({ lean: 0.3, nod: 0.2, lLeg: 0.6 * Math.sin(ph), rLeg: -0.6 * Math.sin(ph), lKnee: 0.4 + 0.6 * Math.max(0, Math.cos(ph)), rKnee: 0.4 + 0.6 * Math.max(0, -Math.cos(ph)), lArm: -0.5 * Math.sin(ph), rArm: 0.5 * Math.sin(ph), lEl: 1.0, rEl: 1.0 }), ground: 0 };
      },
    },
    {
      name: 'shoot',
      d: 0.45,
      blend: 0.08,
      fn: (u, lt) => {
        const swing = smoothstep(0, 0.2, lt);
        return { pos: [DRIBBLE_TO, STAND_HIP, RUN_Z], yaw: PI / 2 + 0.25, pose: pose({ lean: 0.15, nod: 0.1, rLeg: lerp(-0.7, 1.3, swing), rKnee: lerp(1.1, 0.1, swing), lKnee: 0.25, lArm: 0.8, lOut: 0.6, rArm: -0.6, rOut: 0.4 }), ground: 0 };
      },
    },
    {
      // Arms out like a plane, running towards the camera, then jumping on the spot.
      name: 'celebrate',
      d: 10,
      blend: 0.2,
      fn: (u, lt) => {
        const k = clamp(lt / 0.9);
        const ph = lt * 2 * PI * 1.6;
        const jump = lt > 0.9 ? Math.abs(Math.sin(ph)) : 0;
        return {
          pos: [lerp(DRIBBLE_TO, 1.55, k), STAND_HIP, lerp(RUN_Z, 1.45, k)],
          yaw: lerp(PI / 2 + 0.25, -0.35, Math.min(1, k * 1.5)),
          pose: pose({ nod: -0.3, lean: 0.05, lArm: 0.1, rArm: 0.1, lOut: lt > 0.9 ? 2.6 : 1.5, rOut: lt > 0.9 ? 2.6 : 1.5, lEl: 0.1, rEl: 0.1, lLeg: k < 1 ? 0.5 * Math.sin(lt * 14) : 0, rLeg: k < 1 ? -0.5 * Math.sin(lt * 14) : 0, lKnee: 0.3, rKnee: 0.3 }),
          ground: 0,
          lift: 0.14 * jump,
        };
      },
    },
  ]);

  // The other: spins round as the ball goes past, drops to his knees, hands on head.
  const tR = new Track(R, [
    ...opening(1),
    {
      name: 'spin',
      d: T.goal - T.clash,
      blend: 0.12,
      fn: (u, lt) => {
        const k = clamp(lt / (T.goal - T.clash));
        return { pos: [0.5, STAND_HIP, Z], yaw: lerp(-PI / 2, PI / 2 + 0.3, k), pose: pose({ lean: 0.1, nod: 0.05, lArm: 0.4, rArm: 0.4, lOut: 0.7, rOut: 0.7, lEl: 0.3, rEl: 0.3 }), ground: 0 };
      },
    },
    {
      name: 'knees',
      d: 10,
      blend: 0.35,
      fn: (u, lt, d, t) => ({
        pos: [0.4, 0.62, Z],
        yaw: 0.5,
        pose: breathe(pose({ lean: 0.1, nod: -0.35, lLeg: 0.1, rLeg: 0.1, lKnee: 1.75, rKnee: 1.75 }), t, 0.6),
        ik: { lHand: { p: [0.17, 0.08, 0.02, 'head'], pole: [0.6, 0.3, 0, 'chest'] }, rHand: { p: [-0.17, 0.08, 0.02, 'head'], pole: [-0.6, 0.3, 0, 'chest'] } },
      }),
    },
  ]);

  // ---- text -----------------------------------------------------------------------------------------
  const top = (text, x, [a, b]) => Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '33px', letterSpacing: '0.06em', color: b, textShadow: `0 0 18px ${a}, 0 0 4px ${a}` });
  top('SARI-KIRMIZI', -1.6, RED);
  top('SARI-LACİVERT', 1.6, NAVY);
  const tonight = world.addLabel('BU AKŞAM 21:30', [0, 5.55, 0], { t1: T.goal });
  Object.assign(tonight.el.style, { fontSize: '44px', color: '#ffffff', letterSpacing: '0.1em' });
  world.addThought('bu akşam bizim!', L, T.boastL + 0.1, T.boastL + 1.4);
  world.addThought('rüyanda görürsün!', R, T.boastR + 0.1, T.boastR + 1.4);
  const score = (fig, text, t0, colour) =>
    Object.assign(world.addLabel(text, () => fig.handWorld('r').add(new THREE.Vector3(0, 0.35, 0)), { t0, t1: t0 + 1.35 }).el.style, { fontSize: '58px', color: colour, textShadow: '0 0 20px rgba(0,0,0,0.8)' });
  score(L, '3-0', T.scoreL + 0.15, RED[1]);
  score(R, '4-0', T.scoreR + 0.15, NAVY[1]);
  const gol = world.addLabel('GOOOL!', [0.6, 4.2, 0], { t0: T.goal, t1: T.caption + 0.2 });
  Object.assign(gol.el.style, { fontSize: '96px', color: RED[1], textShadow: `0 0 28px ${RED[0]}, 0 0 8px ${RED[0]}` });
  world.addThought('yine mi?!', R, T.goal + 0.5, T.end);
  world.setCaption('BU AKŞAM 21:30\nSEN SÖYLE: KİM KAZANIR?', T.caption, { top: 430 });
  Object.assign(world.captionEl.style, { fontSize: '58px', lineHeight: '1.25' });

  // ---- sounds and particles ---------------------------------------------------------------------------
  const sfx = [{ t: 0.1, type: 'crowd', gain: 0.7 }, { t: 2.6, type: 'crowd', gain: 0.6 }, { t: 5.2, type: 'crowd', gain: 0.8 }];
  for (let t = 0.4, gap = 0.5; t < T.clash; t += gap) {
    sfx.push({ t, type: 'block', gain: 1.1 });
    if (t > T.ready) gap = Math.max(0.16, gap * 0.82);
  }
  sfx.push({ t: T.clash, type: 'board', gain: 0.8 }, { t: T.shot + 0.15, type: 'board', gain: 1.2 });
  sfx.push({ t: T.goal, type: 'crowd', gain: 1.6 }, { t: T.goal + 0.1, type: 'chime', gain: 0.8 }, { t: T.goal + 1.4, type: 'crowd', gain: 1.2 });
  sfx.push({ t: tR.at('knees') + 0.3, type: 'block', gain: 0.8 });

  world.makeParticles('confetti', new THREE.BoxGeometry(1, 0.4, 1), new THREE.MeshBasicMaterial({ color: 0xf2b600 }));
  world.makeParticles('confetti2', new THREE.BoxGeometry(1, 0.4, 1), new THREE.MeshBasicMaterial({ color: 0xc8102e }));
  const rand = mulberry32(31);
  for (let k = 0; k < 3; k++) {
    for (const kind of ['confetti', 'confetti2']) {
      const parts = Array.from({ length: 26 }, () => ({ x: -0.5 + rand() * 3.2, y: 5.6, z: 0.2 + rand() * 1.2, vx: (rand() - 0.5) * 0.8, vy: rand() * 0.5, vz: 0, delay: rand() * 0.6, r: 0.03 + rand() * 0.02 }));
      world.addBurst(kind, { t0: T.goal + 0.1 + k * 0.5, parts, life: 2.6, gravity: 1.2 });
    }
  }

  // ---- per frame ------------------------------------------------------------------------------------------
  const v1 = new THREE.Vector3();
  const goalSpot = new THREE.Vector3(GOAL.x + GOAL.depth - 0.12, 0.45, 0.65);
  world.onUpdate((t) => {
    tL.apply(t);
    tR.apply(t);

    // Ball: centre spot, at the winner's feet while dribbling, shot into the net.
    if (t < T.clash) {
      ball.position.copy(BALL);
    } else if (t < T.shot + 0.15) {
      L.root.updateMatrixWorld(true);
      const feet = v1.copy(L.root.position);
      ball.position.set(feet.x + 0.32, BALL_R, feet.z + 0.05);
    } else {
      const u = clamp((t - T.shot - 0.15) / (T.goal - T.shot - 0.15));
      const from = v1.set(DRIBBLE_TO + 0.32, BALL_R, RUN_Z + 0.05);
      ball.position.lerpVectors(from, goalSpot, u).setY(lerp(BALL_R, goalSpot.y, u) + 0.35 * Math.sin(u * PI));
      if (t > T.goal + 0.4) ball.position.y = Math.max(BALL_R, goalSpot.y - (t - T.goal - 0.4) * 2.5);
    }
    ball.rotation.z = -ball.position.x / BALL_R;

    // Net bulges when the ball hits it.
    const bulge = t > T.goal ? 0.22 * Math.exp(-(t - T.goal) * 4) : 0;
    const pos = net.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lx = netBase[i * 3];
      const ly = netBase[i * 3 + 1];
      const w = Math.max(0, 1 - Math.hypot(lx / 0.6, (ly + 0.0) / 0.45));
      pos.setZ(i, -bulge * w);
    }
    pos.needsUpdate = true;

    const on = smoothstep(0, 0.6, t);
    const pulse = 0.85 + 0.15 * Math.sin(t * 8);
    const win = smoothstep(T.goal, T.goal + 0.5, t);
    lightL.intensity = 48 * on * pulse * (1 + 0.5 * win);
    lightR.intensity = 48 * on * pulse * (1 - 0.6 * win);
    flash.intensity = t >= T.goal ? 40 * Math.exp(-(t - T.goal) * 4) : 0;
  });

  return { duration: T.end, sfx };
}
