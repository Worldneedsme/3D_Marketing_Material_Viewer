// ŞAFAK SAYAN vs ŞAFAĞI DEĞERLENDİREN
// A barracks room under a big Turkish flag. Every morning the bugle sounds.
// One soldier stays in bed scratching tally marks into the wall; the other
// salutes the flag and spends the day reading, training and studying, and
// leaves with a shelf full of things he earned. Both salute the flag at the end.
import * as THREE from 'three';
import { StickFigure, DIM } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, along } from '../moves.js';
import { PI, lerp, smoothstep, mulberry32 } from '../math.js';

const DAYS = 5;
const DAY = 2.6;
const FIRST = 0.35;
const dayAt = (d) => FIRST + d * DAY;
const END = dayAt(DAYS); // after the last day
const WALL_Z = -1.05;
const BED_TOP = 0.58;
const BED_Z = -0.55;
const RED = '#e30a17';

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.2, swell: 0.08 });
  world.key.intensity = 1.8;

  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return Object.assign(t, { canvas: c });
  };
  const box = (m, w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };

  // ---- room ------------------------------------------------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), new THREE.MeshStandardMaterial({ color: 0x23261f, roughness: 0.95 }));
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
  const flagPole = box(new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 0.7, roughness: 0.3 }), 0.05, FLAG_H + 0.5, 0.05, -FLAG_W / 2 - 0.03, 3.6, WALL_Z + 0.12);
  flagPole.castShadow = false;
  const spot = new THREE.SpotLight(0xfff2e0, 14, 14, 0.42, 0.6, 1.2);
  spot.position.set(0, 7.5, 4);
  spot.target = flag;
  scene.add(spot, spot.target);

  // Beds.
  const metal = new THREE.MeshStandardMaterial({ color: 0x3d4a32, roughness: 0.5, metalness: 0.4 });
  const sheet = new THREE.MeshStandardMaterial({ color: 0xe6e2d6, roughness: 0.85 });
  const blanket = new THREE.MeshStandardMaterial({ color: 0x55633f, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const cx = s * 2.05;
    box(metal, 1.95, 0.08, 0.84, cx, 0.4, BED_Z);
    for (const dx of [-0.93, 0.93]) for (const dz of [-0.38, 0.38]) box(metal, 0.05, 0.4, 0.05, cx + dx, 0.2, BED_Z + dz);
    box(metal, 0.05, 0.7, 0.84, cx + s * 0.95, 0.55, BED_Z);
    box(sheet, 1.88, 0.12, 0.78, cx, 0.5, BED_Z);
    box(sheet, 0.36, 0.1, 0.55, cx + s * 0.7, 0.61, BED_Z);
    box(blanket, 1.1, 0.03, 0.8, cx - s * 0.32, 0.575, BED_Z);
  }

  // Tally marks on the wall over the left bed.
  const TALLY = 60;
  const tallyTex = canvasTex(512, 220, () => {});
  const tallyMat = new THREE.MeshBasicMaterial({ map: tallyTex, transparent: true, depthWrite: false });
  const tally = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.75), tallyMat);
  tally.position.set(-2.05, 1.15, WALL_Z + 0.01);
  scene.add(tally);
  let drawn = -1;
  const drawTally = (n) => {
    if (n === drawn) return;
    drawn = n;
    const g = tallyTex.canvas.getContext('2d');
    g.clearRect(0, 0, 512, 220);
    g.strokeStyle = 'rgba(235,235,225,0.85)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    const rand = mulberry32(9);
    for (let i = 0; i < n; i++) {
      const group = Math.floor(i / 5);
      const k = i % 5;
      const gx = 18 + (group % 8) * 62;
      const gy = 20 + Math.floor(group / 8) * 70;
      const j = (rand() - 0.5) * 4;
      g.beginPath();
      if (k < 4) {
        g.moveTo(gx + k * 11 + j, gy);
        g.lineTo(gx + k * 11 - j, gy + 48);
      } else {
        g.moveTo(gx - 6, gy + 40);
        g.lineTo(gx + 44, gy + 8);
      }
      g.stroke();
    }
    tallyTex.needsUpdate = true;
  };

  // Shelf over the right bed and what ends up on it.
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b5442, roughness: 0.8 });
  box(wood, 1.7, 0.04, 0.24, 2.05, 1.5, WALL_Z + 0.12);
  const cardTex = (text, bg, fg, size) =>
    canvasTex(256, 160, (g, w, h) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = fg;
      g.font = `700 ${size}px Pixel`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2);
      g.strokeStyle = fg;
      g.lineWidth = 6;
      g.strokeRect(8, 8, w - 16, h - 16);
    });
  const makeBook = (color) => {
    const g = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.22), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    cover.castShadow = true;
    g.add(cover);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.28, 0.2), sheet);
    pages.position.z = 0.012;
    g.add(pages);
    scene.add(g);
    return g;
  };
  const makeCard = (text, bg, fg, w, h, size) => {
    const t = cardTex(text, bg, fg, size);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), [sheet, sheet, sheet, sheet, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), sheet]);
    m.castShadow = true;
    scene.add(m);
    return m;
  };
  const ACTIVITIES = ['read', 'pushups', 'study', 'read', 'study'];
  const rewards = [
    { obj: makeBook(0x8a2a22), x: 1.42, y: 1.67, rz: 0 },
    null,
    { obj: makeCard('EHLİYET', '#f3c9d4', '#7a1f35', 0.34, 0.22, 46), x: 1.85, y: 1.64, rz: -0.12 },
    { obj: makeBook(0x2c4f7a), x: 1.52, y: 1.67, rz: 0.08 },
    { obj: makeCard('SERTİFİKA', '#f7f1df', RED, 0.42, 0.3, 40), x: 2.35, y: 1.68, rz: 0.1 },
  ];
  // The book he reads and the clipboard he studies on.
  const handBook = makeBook(0x8a2a22);
  const clipboard = makeCard('', '#f4f1ea', '#999999', 0.24, 0.3, 10);

  // ---- soldiers ----------------------------------------------------------------------------
  const capMat = new THREE.MeshStandardMaterial({ color: 0x4b5a3a, roughness: 0.8 });
  const addCap = (fig) => {
    const cap = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.185, 0.09, 20), capMat);
    cap.add(crown);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.12), capMat);
    visor.position.set(0, -0.035, 0.17);
    cap.add(visor);
    cap.position.y = DIM.headR * 0.62;
    cap.rotation.x = -0.12;
    fig.head.add(cap);
  };
  const L = new StickFigure(mat.figure);
  const R = new StickFigure(mat.figure);
  addCap(L);
  addCap(R);
  scene.add(L.root, R.root);

  const lieY = BED_TOP + DIM.torsoR + 0.02;
  const lying = (s, extra = {}) => ({
    pos: [s * 1.95, lieY, BED_Z],
    yaw: s < 0 ? PI / 2 : -PI / 2,
    pitch: -PI / 2,
    pose: pose({ nod: 0.15, lArm: 0.05, rArm: 0.05, lOut: 0.12, rOut: 0.12, lEl: 0.2, rEl: 0.2, ...extra }),
  });
  const salute = {
    rHand: { p: [-0.11, 0.07, 0.11, 'head'], pole: [-0.6, 0.35, 0.15, 'chest'] },
  };
  const sit = (x, extra = {}) => pose({ lean: 0.3, nod: 0.55, lLeg: PI / 2 - 0.1, rLeg: PI / 2 - 0.1, lKnee: PI / 2, rKnee: PI / 2, ...extra });
  const sitPos = (x) => [x, BED_TOP + DIM.limbR * 1.2, -0.3];

  // Right soldier: salute every morning, then the day's activity.
  const RX = 1.45;
  const rClips = [{ name: 'bed', d: FIRST + 0.05, fn: () => lying(1) }];
  for (let d = 0; d < DAYS; d++) {
    rClips.push({
      name: `salute${d}`,
      d: 0.85 - (d === 0 ? 0.05 : 0),
      blend: d === 0 ? 0.35 : 0.3,
      fn: (u, lt, dd, t) => ({ pos: [RX, 0, 0.2], yaw: -PI, pose: breathe(pose({ nod: -0.25, lean: -0.05, lArm: 0, lOut: 0.05, lEl: 0.05 }), t, 0.3), ik: salute, ground: 0 }),
    });
    const act = ACTIVITIES[d];
    if (act === 'read') {
      rClips.push({
        name: `read${d}`,
        d: 1.75,
        blend: 0.3,
        fn: (u, lt, dd, t) => ({
          pos: sitPos(1.75),
          yaw: 0,
          pose: breathe(sit(1.75), t, 0.4),
          ik: { lHand: { p: [0.1, 0.32, 0.3, 'chest'] }, rHand: { p: [-0.1, 0.32, 0.3, 'chest'] } },
        }),
      });
    } else if (act === 'study') {
      rClips.push({
        name: `study${d}`,
        d: 1.75,
        blend: 0.3,
        fn: (u, lt, dd, t) => ({
          pos: sitPos(1.75),
          yaw: 0,
          pose: breathe(sit(1.75, { nod: 0.7 }), t, 0.4),
          ik: {
            lHand: { p: [0.08, 0.05, 0.42, 'root'] },
            rHand: { p: along([[0, [-0.06, 0.06, 0.42, 'root']]], 0, (o) => o.add(new THREE.Vector3(0.03 * Math.sin(t * 24), 0, 0.02 * Math.cos(t * 31)))) },
          },
        }),
      });
    } else {
      rClips.push({
        name: `pushups${d}`,
        d: 1.75,
        blend: 0.35,
        fn: (u, lt) => {
          const bob = 0.5 + 0.5 * Math.cos(lt * 2 * PI * 1.8);
          const px = 1.35;
          return {
            pos: [px, 0.3 + 0.16 * bob, 0.65],
            yaw: -PI / 2,
            pitch: 1.33,
            pose: pose({ nod: -0.5, lLeg: 0, rLeg: 0, lKnee: 0, rKnee: 0, lAnk: 1.1, rAnk: 1.1 }),
            ik: {
              lHand: { p: [px - 0.62, 0.02, 0.8, 'world'], pole: [0.4, 0.2, -0.3, 'chest'] },
              rHand: { p: [px - 0.62, 0.02, 0.5, 'world'], pole: [-0.4, 0.2, -0.3, 'chest'] },
            },
          };
        },
      });
    }
  }
  rClips.push({ name: 'ready', d: 0.6, blend: 0.3, fn: stand({ x: RX, z: 0.2, yaw: 0, ground: 0, pose: { nod: -0.1, lean: -0.05 } }) });
  rClips.push({ name: 'finalSalute', d: 8, blend: 0.4, fn: (u, lt, d, t) => ({ pos: [RX - 0.25, 0, 0.2], yaw: -PI, pose: breathe(pose({ nod: -0.25, lean: -0.05, lArm: 0, lOut: 0.05, lEl: 0.05 }), t, 0.3), ik: salute, ground: 0 }) });
  const rTrack = new Track(R, rClips);

  // Left soldier: in bed all along, reaching to scratch the wall now and then.
  const markHand = (d, lt) => ({ p: along([[0, [0.25, -0.05, 0.05, 'root']], [0.25, [-2.05 + 0.5 - d * 0.12, 0.98, WALL_Z + 0.06, 'world']], [0.55, [-2.05 + 0.5 - d * 0.12, 0.9, WALL_Z + 0.06, 'world']], [0.8, [0.25, -0.05, 0.05, 'root']]], lt), pole: [0.4, 0.3, -0.2, 'chest'] });
  const lClips = [{ name: 'bed', d: FIRST + 1.1, fn: (u, lt, d, t) => lying(-1, { turn: 0.15 * Math.sin(t) }) }];
  for (let d = 0; d < DAYS; d++) {
    lClips.push({ name: `mark${d}`, d: 0.85, blend: 0.15, fn: (u, lt) => ({ ...lying(-1, { turn: 0.5 }), ik: { lHand: markHand(d, lt) } }) });
    lClips.push({ name: `idle${d}`, d: d < DAYS - 1 ? DAY - 0.85 : 0.6, blend: 0.2, fn: (u, lt, dd, t) => lying(-1, { turn: 0.3 * Math.sin(t * 0.7), lArm: 0.1 + (d % 2) * 0.4, lEl: 0.2 + (d % 2) * 1.6 }) });
  }
  const lUp = END - lClips.reduce((a, c) => a + c.d, 0);
  lClips.push({ name: 'wait', d: Math.max(0.1, lUp), fn: () => lying(-1) });
  lClips.push({ name: 'getup', d: 0.7, blend: 0.45, fn: stand({ x: -1.2, z: 0.2, yaw: PI / 2, ground: 0, pose: { nod: 0.35, lean: 0.1 } }) });
  lClips.push({ name: 'finalSalute', d: 8, blend: 0.4, fn: (u, lt, d, t) => ({ pos: [-1.2, 0, 0.2], yaw: PI, pose: breathe(pose({ nod: -0.25, lean: -0.05, lArm: 0, lOut: 0.05, lEl: 0.05 }), t, 0.3), ik: salute, ground: 0 }) });
  const lTrack = new Track(L, lClips);

  // ---- counter, text, sounds -------------------------------------------------------------------
  const marks = (t) => {
    let n = 0;
    for (let d = 0; d < DAYS; d++) n += Math.round((TALLY / DAYS) * smoothstep(0, 1, (t - lTrack.at(`mark${d}`) - 0.25) / 0.35));
    return n;
  };
  const safakAt = (t) => {
    if (t < FIRST) return 365;
    if (t < END) return Math.round(lerp(365, 50, (t - FIRST) / (END - FIRST)));
    return Math.max(0, Math.round(lerp(50, 0, (t - END) / 0.5)));
  };
  const counter = world.addLabel('ŞAFAK 365', [0, 5.55, 0], { t1: END + 2.0 });
  Object.assign(counter.el.style, { fontSize: '64px', color: RED, textShadow: '0 0 24px rgba(227, 10, 23, 0.55)' });
  for (const [text, x] of [['ŞAFAK SAYAN', -1.6], ['ŞAFAĞI DEĞERLENDİREN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '34px', letterSpacing: '0.08em' });
  }
  world.addThought('bitmedi mi daha?', L, dayAt(0) + 1.4, dayAt(0) + 2.7);
  world.addThought('şafak daha 290...', L, dayAt(1) + 1.4, dayAt(1) + 2.7);
  world.addThought('yat, kalk, say...', L, dayAt(2) + 1.4, dayAt(2) + 2.7);
  world.addThought('çabuk bitse...', L, dayAt(3) + 1.4, dayAt(3) + 2.7);
  world.addThought('ne yaptım ben bunca zaman?', L, lTrack.at('getup') + 0.1, lTrack.at('getup') + 1.7);
  world.setCaption('Askerlik vatan borcudur.\nDeğerlendirmek kendine borcun.', END + 2.2, { top: 470 });

  const sfx = [];
  for (let d = 0; d < DAYS; d++) {
    sfx.push({ t: dayAt(d), type: 'bugle', gain: 0.9 });
    sfx.push({ t: lTrack.at(`mark${d}`) + 0.3, type: 'scribble', gain: 0.7 });
    if (rewards[d]) sfx.push({ t: dayAt(d) + 2.35, type: 'clink', gain: 0.8 });
  }
  sfx.push({ t: END + 0.5, type: 'bugle', gain: 1 }, { t: END + 1.2, type: 'bugle', gain: 1 });
  world.makeParticles('glints', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  rewards.forEach((rw, d) => {
    if (!rw) return;
    const r = mulberry32(40 + d);
    const parts = Array.from({ length: 10 }, () => ({ x: rw.x, y: rw.y, z: WALL_Z + 0.25, vx: (r() - 0.5) * 1.4, vy: 0.4 + r() * 1.2, vz: r() * 0.5, delay: 0, r: 0.012 + r() * 0.012 }));
    world.addBurst('glints', { t0: dayAt(d) + 2.35, parts, life: 0.6, gravity: 2 });
  });

  // ---- per frame -----------------------------------------------------------------------------------
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const handsMid = (fig) => fig.handWorld('l', v1).add(fig.handWorld('r', v2)).multiplyScalar(0.5);
  world.onUpdate((t) => {
    rTrack.apply(t);
    lTrack.apply(t);
    drawTally(marks(t));
    const n = safakAt(t);
    counter.el.textContent = t >= END + 0.55 ? 'TEZKERE!' : `ŞAFAK ${n}`;

    // Flag waves; the light on it swells at the final salute.
    const pos = flagGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = flagBase[i * 3] + FLAG_W / 2;
      pos.setZ(i, Math.sin(bx * 3.2 - t * 3.2) * 0.06 * (bx / FLAG_W) + Math.sin(flagBase[i * 3 + 1] * 2 + t * 1.7) * 0.015 * (bx / FLAG_W));
    }
    pos.needsUpdate = true;
    flagGeo.computeVertexNormals();
    const glory = smoothstep(END + 0.4, END + 1.6, t);
    spot.intensity = 14 + 14 * glory;
    flagMat.emissiveIntensity = 0.04 + 0.06 * glory;

    // Rewards appear on the shelf at the end of each day.
    rewards.forEach((rw, d) => {
      if (!rw) return;
      const k = smoothstep(dayAt(d) + 2.3, dayAt(d) + 2.45, t);
      rw.obj.visible = k > 0;
      rw.obj.scale.setScalar(Math.max(k, 0.001));
      rw.obj.position.set(rw.x, rw.y, WALL_Z + 0.2);
      rw.obj.rotation.set(0, rw.obj.isGroup ? PI / 2 : 0, rw.rz);
    });

    // Book while reading, clipboard while studying.
    const act = (name) => rTrack.clips.find((c) => c.name === name && t >= c.t0 + 0.2 && t < c.t1);
    const reading = act('read0') || act('read3');
    const studying = act('study2') || act('study4');
    handBook.visible = !!reading;
    if (reading) {
      handBook.position.copy(handsMid(R)).add(v2.set(0, 0.06, 0.04));
      handBook.rotation.set(-0.5, PI / 2, 0);
    }
    clipboard.visible = !!studying;
    if (studying) {
      clipboard.position.set(1.75, BED_TOP + 0.38, 0.06);
      clipboard.rotation.set(-PI / 2 + 0.35, 0, 0);
    }
  });

  const markers = Object.fromEntries([...rTrack.clips.map((c) => ['R.' + c.name, +c.t0.toFixed(2)]), ['L.getup', +lTrack.at('getup').toFixed(2)], ['END', +END.toFixed(2)]]);
  return { duration: END + 5.0, sfx, markers };
}
