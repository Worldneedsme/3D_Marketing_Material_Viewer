// SAYAÇ SAYAN vs SORU ÇÖZEN
// Two study desks under a big "days left" counter. On the right, the student
// solves test sheets from the first second; every finished sheet lands on a
// pile that keeps growing. On the left, the student scrolls his phone waiting
// for the exam calendar and keeps glancing at the counter. The months run in
// fast forward: the counter races down to 30 days, the right pile towers up,
// the left desk stays empty. The left student jumps up in panic, then sits
// back down and opens his first book.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe } from '../moves.js';
import { PI, lerp, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const DESK_Y = 0.78;
const SEAT_Y = 0.48;
const SEAT_HIP = SEAT_Y + DIM.limbR * 1.2;
const WORK_X = 1.3; // students sit at ±WORK_X, facing their desks
const WORK_Z = 0.2;
const DESK_X = 2.18;
const PILE = [2.48, WORK_Z - 0.2];
const SHEET_H = 0.012;
const FF = [5.0, 9.4];
const PANIC = 9.7;
const SIT = 11.4;
const CAPTION = 12.5;
const DURATION = 14.6;
const MONTHS = ['KASIM', 'ARALIK', 'OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS'];
const SEATED = { lLeg: 1.5, rLeg: 1.5, lKnee: 1.5, rKnee: 1.5 };

// Days left on the wall counter.
const daysAt = (t) => (t < FF[0] ? 234 - Math.floor(t / 1.25) : t < FF[1] ? Math.round(lerp(230, 30, smoothstep(FF[0], FF[1], t))) : 30);

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.22, swell: 0.05 });
  world.key.intensity = 1.6;

  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { g: c.getContext('2d'), t };
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

  // ---- room and counter ---------------------------------------------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 6.5), std(0x4a5560, { roughness: 0.95 }));
  wall.position.set(0, 3.25, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);

  const board = canvas(512, 300);
  let shown = null;
  const drawBoard = (days, alarm) => {
    const key = `${days}|${alarm}`;
    if (key === shown) return;
    shown = key;
    const g = board.g;
    g.fillStyle = '#121216';
    g.fillRect(0, 0, 512, 300);
    g.strokeStyle = alarm ? '#ff4a3a' : '#3a3a44';
    g.lineWidth = 10;
    g.strokeRect(5, 5, 502, 290);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#e8e2d0';
    g.font = '700 50px Pixel';
    g.fillText("YKS'YE", 256, 52);
    g.fillStyle = alarm ? '#ff4a3a' : '#ff6a4a';
    g.font = '700 150px Pixel';
    g.fillText(String(days), 256, 160);
    g.fillStyle = '#e8e2d0';
    g.font = '700 50px Pixel';
    g.fillText('GÜN', 256, 258);
    board.t.needsUpdate = true;
  };
  drawBoard(234, false);
  const boardMat = new THREE.MeshStandardMaterial({ map: board.t, emissive: 0xffffff, emissiveMap: board.t, emissiveIntensity: 0.55 });
  box(std(0x1c1c20), 2.0, 1.2, 0.06, 0, 3.0, WALL_Z + 0.03);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.11), boardMat);
  face.position.set(0, 3.0, WALL_Z + 0.065);
  scene.add(face);

  // Desks and chairs, mirrored; a desk lamp and a few closed books on each.
  const wood = std(0x9a7a58, { roughness: 0.55 });
  const steel = std(0x3a3e44, { metalness: 0.5, roughness: 0.4 });
  const bookMats = [std(0x3d6aa8), std(0xc0503e), std(0x5a9a5a), std(0xd8b04a)];
  for (const s of [-1, 1]) {
    const dx = s * DESK_X;
    box(wood, 0.95, 0.05, 0.9, dx, DESK_Y - 0.025, WORK_Z);
    for (const lx of [-0.42, 0.42]) for (const lz of [-0.4, 0.4]) box(steel, 0.04, DESK_Y - 0.05, 0.04, dx + lx, (DESK_Y - 0.05) / 2, WORK_Z + lz);
    // Lamp at the back edge, its arm reaching forward over the paper.
    const lx = s * 1.98;
    const lz = WORK_Z - 0.32;
    box(steel, 0.14, 0.03, 0.14, lx, DESK_Y + 0.015, lz);
    box(steel, 0.03, 0.5, 0.03, lx, DESK_Y + 0.27, lz);
    box(steel, 0.03, 0.03, 0.32, lx, DESK_Y + 0.52, lz + 0.15);
    box(std(0xf0d890, { emissive: 0xffd070, emissiveIntensity: 0.6 }), 0.14, 0.08, 0.14, lx, DESK_Y + 0.48, lz + 0.3);
    const glow = new THREE.PointLight(0xffd8a0, 1.6, 2.2, 1.5);
    glow.position.set(lx, DESK_Y + 0.4, lz + 0.3);
    scene.add(glow);
    // Closed books at the front corner.
    for (let k = 0; k < 3; k++) box(bookMats[(k + (s > 0 ? 1 : 0)) % 4], 0.28, 0.05, 0.2, s * 2.42, DESK_Y + 0.025 + k * 0.05, WORK_Z + 0.42).rotation.y = (k - 1) * 0.12;
    // Chair: seat, post, base and a backrest behind the student.
    const cx = s * WORK_X;
    box(std(0x23262c), 0.44, 0.06, 0.44, cx, SEAT_Y - 0.03, WORK_Z);
    box(steel, 0.05, SEAT_Y - 0.1, 0.05, cx, (SEAT_Y - 0.1) / 2 + 0.04, WORK_Z);
    box(steel, 0.46, 0.04, 0.06, cx, 0.03, WORK_Z);
    box(steel, 0.06, 0.04, 0.46, cx, 0.03, WORK_Z);
    box(std(0x23262c), 0.06, 0.5, 0.42, cx - s * 0.25, SEAT_Y + 0.33, WORK_Z);
  }

  // ---- sheets -------------------------------------------------------------------------------------
  // An answer sheet: rows of bubbles, one filled per row.
  const formTex = canvas(128, 168);
  {
    const g = formTex.g;
    g.fillStyle = '#f4f2ea';
    g.fillRect(0, 0, 128, 168);
    g.fillStyle = '#2a2a2a';
    g.fillRect(10, 8, 108, 8);
    const rf = mulberry32(3);
    for (let r = 0; r < 9; r++) {
      const pick = Math.floor(rf() * 5);
      for (let c = 0; c < 5; c++) {
        g.beginPath();
        g.arc(22 + c * 21, 32 + r * 15, 5, 0, 2 * PI);
        if (c === pick) g.fill();
        else {
          g.lineWidth = 1.5;
          g.strokeStyle = '#2a2a2a';
          g.stroke();
        }
      }
    }
    formTex.t.needsUpdate = true;
  }
  const sheetMat = new THREE.MeshStandardMaterial({ map: formTex.t, side: THREE.DoubleSide, roughness: 0.8, emissive: 0xffffff, emissiveMap: formTex.t, emissiveIntensity: 0.15 });
  const makeSheet = () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), sheetMat);
    m.castShadow = true;
    scene.add(m);
    return m;
  };
  const PAPER_R = [1.95, WORK_Z + 0.2];
  const PAPER_L = [-1.95, WORK_Z + 0.2];
  const paperR = makeSheet();
  paperR.position.set(PAPER_R[0], DESK_Y + 0.004, PAPER_R[1]);
  paperR.rotation.set(-PI / 2, 0, 0.2);
  const paperL = makeSheet();
  paperL.position.set(PAPER_L[0], DESK_Y + 0.004, PAPER_L[1]);
  paperL.rotation.set(-PI / 2, 0, -0.2);
  // The left student's first book, opened at the end.
  const openBook = new THREE.Group();
  box(std(0xd8b04a), 0.42, 0.02, 0.3, 0, 0.01, 0, openBook);
  openBook.position.set(PAPER_L[0], DESK_Y, PAPER_L[1] - 0.05);
  scene.add(openBook);

  // Finished sheets fly from the right desk onto the pile. Before the fast
  // forward each one is a separate flick; during it the pile just grows.
  const flicks = [0.85, 1.75, 2.65, 3.55, 4.45];
  const after = [10.2, 11.1, 12.0, 12.9];
  const ffSheets = 95;
  const pileH = (t) => {
    let n = flicks.filter((f) => t > f + 0.3).length;
    n += ffSheets * smoothstep(FF[0], FF[1], t);
    n += after.filter((f) => t > f + 0.3).length;
    return n * SHEET_H;
  };
  const pileMat = std(0xeeeae0, { roughness: 0.85 });
  const pile = box(pileMat, 0.2, 1, 0.26, PILE[0], DESK_Y, PILE[1]);
  const pileTop = makeSheet();
  const flyer = makeSheet();
  const solved = (t) => Math.round(pileH(t) / SHEET_H) * 40;

  // ---- figures ------------------------------------------------------------------------------------
  const L = new StickFigure(mat.figure);
  const R = new StickFigure(mat.figure);
  scene.add(L.root, R.root);

  // Seated, writing on a sheet with one hand and holding it with the other.
  const writing = (s, at, speed = 1) => (u, lt, d, t) => ({
    pos: [s * WORK_X, SEAT_HIP, WORK_Z],
    yaw: s * PI / 2,
    pose: breathe(pose({ lean: 0.3, nod: 0.35, ...SEATED }), t, 0.4),
    ik: {
      [s > 0 ? 'rHand' : 'lHand']: { p: [at[0] + 0.03 * Math.sin(t * 31 * speed), DESK_Y + 0.03 + 0.01 * Math.abs(Math.sin(t * 17 * speed)), at[1] + 0.05 * Math.sin(t * 9 * speed), 'world'] },
      [s > 0 ? 'lHand' : 'rHand']: { p: [at[0] - s * 0.1, DESK_Y + 0.03, at[1] - 0.3, 'world'] },
    },
  });

  // Left student: phone in both hands, chair swivelled towards the camera.
  const PHONE_HANDS = { lHand: { p: [0.07, 0.3, 0.3, 'chest'] } };
  const phoning = (speed = 1) => (u, lt, d, t) => ({
    pos: [-WORK_X, SEAT_HIP, WORK_Z],
    yaw: -1.05,
    pose: breathe(pose({ lean: -0.04, nod: 0.5, ...SEATED }), t, 0.5),
    ik: { ...PHONE_HANDS, rHand: { p: [-0.05, 0.31 + 0.025 * Math.max(0, Math.sin(t * 8 * speed)), 0.31, 'chest'] } },
  });
  const LOOK = { lean: 0.02, nod: -0.2, turn: 0.75, twist: 0.2, ...SEATED };
  const looking = (u, lt, d, t) => ({ pos: [-WORK_X, SEAT_HIP, WORK_Z], yaw: -0.55, pose: breathe(pose(LOOK), t, 0.6), ik: { ...PHONE_HANDS, rHand: { p: [-0.05, 0.31, 0.31, 'chest'] } } });
  const STAND_AT = [-1.3, 0.78];
  const HEAD_HANDS = {
    lHand: { p: [0.15, 0.1, 0.02, 'head'], pole: [0.7, 0.3, 0.1, 'chest'] },
    rHand: { p: [-0.15, 0.1, 0.02, 'head'], pole: [-0.7, 0.3, 0.1, 'chest'] },
  };
  const lTrack = new Track(L, [
    { name: 'phone', d: 2.0, fn: phoning() },
    { name: 'look', d: 1.1, blend: 0.35, fn: looking },
    { name: 'phone2', d: FF[0] - 3.1, blend: 0.35, fn: phoning() },
    { name: 'ff', d: FF[1] - FF[0], blend: 0.2, fn: phoning(2.2) },
    { name: 'look2', d: PANIC - FF[1], blend: 0.25, fn: looking },
    {
      name: 'panic',
      d: SIT - PANIC,
      blend: 0.35,
      fn: stand({ x: STAND_AT[0], z: STAND_AT[1], yaw: 0.35, ground: 0, pose: { nod: -0.3, turn: 0.55, lean: -0.05 }, ik: HEAD_HANDS, shake: 0.035 }),
    },
    { name: 'study', d: 10, blend: 0.5, fn: writing(-1, PAPER_L) },
  ]);
  // Right student never stops; in the fast forward the pen just runs faster.
  const rTrack = new Track(R, [
    { name: 'write', d: FF[0], fn: writing(1, PAPER_R) },
    { name: 'ff', d: FF[1] - FF[0], blend: 0.2, fn: writing(1, PAPER_R, 2) },
    { name: 'write2', d: 10, blend: 0.2, fn: writing(1, PAPER_R) },
  ]);
  const tracks = [lTrack, rTrack];

  // The phone: a thin glowing slab between the hands, dropped on the desk in the panic.
  const phone = new THREE.Group();
  box(std(0x18181c), 0.09, 0.012, 0.16, 0, 0, 0, phone);
  box(new THREE.MeshStandardMaterial({ color: 0x6aa8ff, emissive: 0x6aa8ff, emissiveIntensity: 1.2 }), 0.078, 0.004, 0.145, 0, 0.007, 0, phone).castShadow = false;
  scene.add(phone);
  const PHONE_DESK = [-2.3, DESK_Y + 0.006, WORK_Z - 0.05];

  // ---- text ---------------------------------------------------------------------------------------
  for (const [text, x] of [['SAYAÇ SAYAN', -1.6], ['SORU ÇÖZEN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '38px', letterSpacing: '0.08em' });
  }
  const counters = [-1.6, 1.6].map((x) => {
    const l = world.addLabel('', [x, 5.75, 0]);
    Object.assign(l.el.style, { fontSize: '34px', color: '#f2c14e' });
    return l;
  });
  const month = world.addLabel('', [0, 4.75, 0], { t0: FF[0] - 0.2, t1: FF[1] + 0.5 });
  Object.assign(month.el.style, { fontSize: '40px', color: '#e8e2d0' });

  world.addThought('takvim çıktı mı? yenile...', L, 0.2, 2.0);
  world.addThought('takvim çıksın, başlarım', L, 2.2, 3.9);
  world.addThought('daha 230 gün var', L, 4.0, 5.3);
  world.addThought('yarın kesin başlarım', L, 6.2, 7.8);
  world.addThought('30 GÜN MÜ?!', L, PANIC + 0.1, SIT - 0.1);
  world.addThought('bugün başlıyorum...', L, SIT + 0.5, DURATION);
  world.setCaption('Bugünün işini\nyarına bırakma.', CAPTION, { top: 470 });

  // ---- sounds -------------------------------------------------------------------------------------
  const sfx = [];
  for (let t = 0.1; t < DURATION; t += t > FF[0] && t < FF[1] ? 0.35 : 0.6) sfx.push({ t, type: 'scribble', gain: 0.55 });
  for (const f of [...flicks, ...after]) sfx.push({ t: f + 0.25, type: 'rustle', gain: 0.6 });
  for (const t of [0.4, 0.9, 1.4, 3.3, 3.8, 4.3]) sfx.push({ t, type: 'click', gain: 0.15 });
  sfx.push({ t: FF[0], type: 'whoosh', gain: 0.8 });
  for (let k = 0; k < 16; k++) sfx.push({ t: FF[0] + 0.15 + k * 0.27, type: 'tick', gain: 0.6 });
  sfx.push({ t: FF[1] + 0.05, type: 'block', gain: 0.7 });
  sfx.push({ t: PANIC + 0.15, type: 'click', gain: 0.8 });
  sfx.push({ t: SIT + 0.3, type: 'rustle', gain: 0.9 });
  sfx.push({ t: CAPTION, type: 'chime', gain: 0.6 });

  // ---- per frame ----------------------------------------------------------------------------------
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const fmt = (n) => `${n.toLocaleString('tr-TR')} SORU`;
  world.onUpdate((t) => {
    for (const tr of tracks) tr.apply(t);

    const alarm = t >= FF[1] && Math.floor((t - FF[1]) * 3) % 2 === 0 && t < SIT + 1;
    drawBoard(daysAt(t), alarm);
    const m = Math.min(MONTHS.length - 1, Math.floor(smoothstep(FF[0], FF[1], t) * MONTHS.length));
    month.el.textContent = t < FF[1] ? `▶▶ ${MONTHS[m]}` : MONTHS[MONTHS.length - 1];

    // Pile of finished sheets with a sheet on top.
    const h = Math.max(0.002, pileH(t));
    pile.scale.y = h;
    pile.position.y = DESK_Y + h / 2;
    pileTop.position.set(PILE[0], DESK_Y + h + 0.002, PILE[1]);
    pileTop.rotation.set(-PI / 2, 0, 0.1);
    pileTop.visible = h > 0.005;

    // A finished sheet flying from the desk to the pile.
    const f = [...flicks, ...after].find((f0) => t > f0 && t < f0 + 0.3);
    flyer.visible = f !== undefined;
    if (f !== undefined) {
      const u = (t - f) / 0.3;
      flyer.position.set(lerp(PAPER_R[0], PILE[0], u), lerp(DESK_Y + 0.01, DESK_Y + pileH(f) + 0.01, u) + 0.25 * Math.sin(u * PI), lerp(PAPER_R[1], PILE[1], u));
      flyer.rotation.set(-PI / 2 + 0.6 * Math.sin(u * PI), 0, lerp(0.2, 0.1, u));
    }

    // Phone in the hands until the panic, then on the desk.
    if (t < PANIC) {
      L.handWorld('l', a);
      L.handWorld('r', b);
      phone.position.copy(a).add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.02, 0));
      L.j.spine.getWorldQuaternion(q);
      phone.quaternion.copy(q);
      phone.rotateX(-0.9);
    } else {
      phone.position.set(...PHONE_DESK);
      phone.rotation.set(0, 0.4, 0);
    }
    paperL.visible = t > SIT + 0.2;
    openBook.visible = t > SIT + 0.2;

    counters[0].el.textContent = fmt(0);
    counters[1].el.textContent = fmt(solved(t));
  });

  const markers = Object.fromEntries(
    [['L', lTrack], ['R', rTrack]].flatMap(([n, tr]) => tr.clips.map((c) => [`${n}.${c.name}`, +c.t0.toFixed(2)])),
  );
  return { duration: DURATION, sfx, markers };
}
