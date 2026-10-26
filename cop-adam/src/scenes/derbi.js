// KÜSEN vs DOST KALAN
// Derby night, two living rooms. In each one a fan watches with a friend who
// supports the rival team; both fans wear the same colours, so no club gets
// the bad role. The rival scores. One throws the remote, argues, turns his
// back, and his friend leaves at full time. The other groans, laughs, pats his
// friend on the back and brings two glasses of tea when the whistle goes.
// Teams are hinted by scarf colours only: no names, no crests.
import * as THREE from 'three';
import { StickFigure, DIM, STAND_HIP } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, breathe, walkTo } from '../moves.js';
import { PI, lerp, clamp, smooth, smoothstep, mulberry32 } from '../math.js';

const WALL_Z = -1.05;
const COUCH_Z = -0.45;
const SEAT = 0.42;
const SEATS = { L1: -2.28, L2: -1.52, R1: 1.52, R2: 2.28 };
const TEAM_A = ['#1b2a6b', '#f2c200']; // both main characters
const TEAM_B = ['#c8102e', '#f2b600']; // both friends; this side scores
const T = {
  goal: 3.0,
  full: 7.6,
  caption: 11.0,
  end: 13.5,
};
const TABLE = new THREE.Vector3(0.62, 0.55, 0.35);

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 3.4, 18], target: [0, 2.6, 0], fov: 35 });
  world.makeWater({ tint: 0.2, swell: 0.08 });
  world.key.intensity = 1.6;

  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { c, g: c.getContext('2d'), t };
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

  // ---- two living rooms ------------------------------------------------------------------------------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), std(0x23262a, { roughness: 0.95 }));
  wall.position.set(0, 3.25, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);
  box(std(0x16181b), 0.06, 6.5, 0.1, 0, 3.25, WALL_Z + 0.05);
  const spot = new THREE.SpotLight(0xfff2e0, 9, 14, 0.6, 0.6, 1.2);
  spot.position.set(0, 7.5, 4);
  spot.target.position.set(0, 0.8, 0);
  scene.add(spot, spot.target);

  const fabric = std(0x4a5560, { roughness: 0.9 });
  for (const cx of [-1.9, 1.9]) {
    box(fabric, 1.7, SEAT, 0.8, cx, SEAT / 2, COUCH_Z);
    box(fabric, 1.7, 0.6, 0.2, cx, 0.7, COUCH_Z - 0.35);
    for (const dx of [-0.85, 0.85]) box(fabric, 0.18, 0.62, 0.82, cx + dx, 0.31, COUCH_Z);
  }

  // The match on two TVs (same broadcast).
  const tv = canvas(256, 144);
  let lastFrame = -1;
  const drawTV = (t) => {
    const f = Math.floor(t * 15);
    if (f === lastFrame) return;
    lastFrame = f;
    const { g } = tv;
    g.fillStyle = '#2f7d3a';
    g.fillRect(0, 0, 256, 144);
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 2;
    g.strokeRect(8, 8, 240, 128);
    g.beginPath();
    g.moveTo(128, 8);
    g.lineTo(128, 136);
    g.stroke();
    g.beginPath();
    g.arc(128, 72, 20, 0, PI * 2);
    g.stroke();
    // Ball runs about, then into the goal on the right.
    const bx = t < T.goal ? 128 + 80 * Math.sin(t * 1.3) + 20 * Math.sin(t * 3.1) : t < T.goal + 0.3 ? 236 : 128 + 60 * Math.sin(t * 1.1);
    const by = 72 + 40 * Math.sin(t * 1.7);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(bx, by, 4, 0, PI * 2);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(8, 8, 52, 20);
    g.fillStyle = '#ffffff';
    g.font = '700 14px Pixel';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(t >= T.goal ? '0 - 1' : '0 - 0', 34, 19);
    const big = (text, color) => {
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(0, 50, 256, 44);
      g.fillStyle = color;
      g.font = '700 36px Pixel';
      g.fillText(text, 128, 73);
    };
    if (t >= T.goal && t < T.goal + 1.6 && Math.floor(t * 6) % 2 === 0) big('GOL!', '#ffd84a');
    if (t >= T.full) big('MAÇ SONU', '#ffffff');
    tv.t.needsUpdate = true;
  };
  const screenMat = new THREE.MeshBasicMaterial({ map: tv.t });
  for (const cx of [-1.9, 1.9]) {
    box(std(0x111214, { roughness: 0.4 }), 1.3, 0.78, 0.06, cx, 2.45, WALL_Z + 0.04);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.675), screenMat);
    s.position.set(cx, 2.45, WALL_Z + 0.08);
    scene.add(s);
  }
  // Side table with the tea tray, in the right-hand room.
  box(std(0x6b5442, { roughness: 0.8 }), 0.5, 0.04, 0.4, TABLE.x, TABLE.y - 0.02, TABLE.z);
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.15, 0.15]) box(std(0x4a3a2e), 0.03, TABLE.y - 0.04, 0.03, TABLE.x + dx, (TABLE.y - 0.04) / 2, TABLE.z + dz);

  // Tea: tulip-shaped glasses on saucers, and the tray.
  const glassShape = [[0, 0], [0.032, 0], [0.034, 0.02], [0.026, 0.05], [0.024, 0.065], [0.03, 0.09], [0.036, 0.115], [0.034, 0.12]].map(([x, y]) => new THREE.Vector2(x, y));
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xa8401a, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88, emissive: 0x2a0a02 });
  const makeTea = () => {
    const g = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.LatheGeometry(glassShape, 20), glassMat);
    cup.position.y = 0.008;
    g.add(cup);
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.008, 20), std(0xf2f2ee, { roughness: 0.3 }));
    g.add(saucer);
    // Larger than life so it reads at phone size.
    g.scale.setScalar(1.7);
    scene.add(g);
    return g;
  };
  const teas = [makeTea(), makeTea()];
  const tray = new THREE.Group();
  box(std(0xc0c4ca, { metalness: 0.7, roughness: 0.3 }), 0.36, 0.015, 0.22, 0, 0, 0, tray);
  scene.add(tray);
  const remote = new THREE.Group();
  box(std(0x1a1a1e), 0.05, 0.02, 0.17, 0, 0, 0, remote);
  scene.add(remote);

  // ---- people, scarves -----------------------------------------------------------------------------
  const scarfTex = ([a, b]) => {
    const { g, t } = canvas(32, 128);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? b : a;
      g.fillRect(0, i * 16, 32, 16);
    }
    t.needsUpdate = true;
    return t;
  };
  const scarf = (fig, colours) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.032, 8, 20), std(colours[0], { roughness: 0.9 }));
    ring.rotation.x = PI / 2;
    ring.position.y = 0.02;
    fig.j.neck.add(ring);
    const tailMat = new THREE.MeshStandardMaterial({ map: scarfTex(colours), roughness: 0.9 });
    for (const dx of [-0.035, 0.035]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.018), tailMat);
      tail.position.set(dx, DIM.torso - 0.2, DIM.torsoR + 0.03);
      tail.rotation.z = dx * 1.5;
      fig.j.spine.add(tail);
    }
  };
  const figs = {};
  for (const [name, colours] of [['L1', TEAM_A], ['L2', TEAM_B], ['R1', TEAM_A], ['R2', TEAM_B]]) {
    figs[name] = new StickFigure(mat.figure);
    scarf(figs[name], colours);
    scene.add(figs[name].root);
  }
  const { L1, L2, R1, R2 } = figs;

  const sitY = SEAT + DIM.limbR * 1.2;
  const legs = { lLeg: PI / 2 - 0.1, rLeg: PI / 2 - 0.15, lKnee: PI / 2, rKnee: PI / 2 - 0.1 };
  const sitAt = (x, extra = {}, ik) => (u, lt, d, t) => ({ pos: [x, sitY, COUCH_Z + 0.12], yaw: 0, pose: breathe(pose({ lean: 0.2, nod: 0.05, ...legs, ...extra }), t, 0.5), ik: typeof ik === 'function' ? ik(lt, t) : ik });
  const celebrate = (x) => (u, lt) => {
    const j = Math.abs(Math.sin(lt * 2 * PI * 1.4));
    return { pos: [x, STAND_HIP, 0.25], yaw: 0, pose: pose({ nod: -0.3, lean: -0.08, lArm: 0.3, rArm: 0.3, lOut: 2.6, rOut: 2.6, lEl: 0.3, rEl: 0.3 }), ground: 0, lift: 0.14 * j };
  };
  const armsCrossed = {
    lHand: { p: [-0.13, 0.3, 0.17, 'chest'], pole: [0.35, 0.2, 0.15, 'chest'] },
    rHand: { p: [0.13, 0.32, 0.19, 'chest'], pole: [-0.35, 0.2, 0.15, 'chest'] },
  };
  const remoteHand = { rHand: { p: [-0.12, 0.12, 0.3, 'chest'] } };

  // KÜSEN: throws the remote, argues, turns his back; ends alone on the couch.
  const tL1 = new Track(L1, [
    { name: 'watch', d: T.goal, fn: sitAt(SEATS.L1, {}, remoteHand) },
    {
      // Up off the couch, winding back and throwing the remote down at the floor (not a cheer).
      name: 'jumpUp',
      d: 0.5,
      blend: 0.12,
      fn: (u, lt) => {
        const k = smoothstep(0.15, 0.35, lt);
        return { pos: [SEATS.L1, STAND_HIP, 0.25], yaw: 0.3, pose: pose({ lean: lerp(-0.1, 0.35, k), nod: 0.25, rArm: lerp(-0.9, 1.1, k), rOut: 0.3, rEl: lerp(1.2, 0.1, k), lArm: 0.2, lOut: 0.5, lEl: 0.8 }), ground: 0 };
      },
    },
    {
      name: 'argue',
      d: 2.1,
      blend: 0.15,
      fn: (u, lt, d, t) => {
        const w = Math.sin(lt * 2 * PI * 2.2);
        return { pos: [SEATS.L1, STAND_HIP, 0.3], yaw: PI / 2 - 0.3, pose: pose({ lean: 0.2, nod: 0.1, lArm: 1.2 + 0.5 * w, rArm: 1.0 - 0.5 * w, lOut: 0.6, rOut: 0.6, lEl: 0.6, rEl: 0.8 }), ground: 0 };
      },
    },
    { name: 'away', d: 0.7, blend: 0.2, fn: walkTo({ from: [SEATS.L1, 0.3], to: [-2.85, 0.55], yaw: -2.2, ground: 0, amp: 0.3 }) },
    { name: 'sulk', d: T.full + 1.6 - (T.goal + 3.3), blend: 0.3, fn: stand({ x: -2.85, z: 0.55, yaw: -0.8, ground: 0, pose: { nod: 0.3 }, ik: armsCrossed }) },
    { name: 'alone', d: 10, blend: 0.5, fn: sitAt(-1.9, { lean: -0.05, nod: 0.35 }, armsCrossed) },
  ]);
  // His friend: celebrates, shrugs, sits, leaves at full time.
  const tL2 = new Track(L2, [
    { name: 'watch', d: T.goal, fn: sitAt(SEATS.L2) },
    { name: 'celebrate', d: 1.5, blend: 0.15, fn: celebrate(SEATS.L2) },
    { name: 'shrug', d: 1.1, blend: 0.2, fn: stand({ x: SEATS.L2, z: 0.3, yaw: -PI / 2 + 0.3, ground: 0, pose: { nod: 0.1, lArm: 0.6, rArm: 0.6, lOut: 0.7, rOut: 0.7, lEl: 1.2, rEl: 1.2, lArmTw: -1, rArmTw: -1 } }) },
    { name: 'sitBack', d: T.full - T.goal - 2.6, blend: 0.4, fn: sitAt(SEATS.L2, { lean: 0.1 }) },
    { name: 'getUp', d: 0.4, blend: 0.3, fn: stand({ x: SEATS.L2, z: 0.25, yaw: -PI / 2, ground: 0 }) },
    { name: 'leave', d: 1.4, fn: walkTo({ from: [SEATS.L2, 0.25], to: [-4.4, 1.35], yaw: -PI / 2 - 0.3, ground: 0, amp: 0.38 }) },
    { name: 'gone', d: 10, fn: stand({ x: -6, z: 1.35, yaw: -PI / 2, ground: 0 }) },
  ]);

  // DOST KALAN: groans, laughs, pats his friend, brings tea at full time.
  const pat = (lt) => ({
    lHand: { p: (fig, out) => R2.j.spine.localToWorld(out.set(0.02, 0.48 + 0.04 * Math.sin(lt * 18), -0.02)), pole: [0.5, -0.3, 0.2, 'chest'] },
  });
  const headHands = { lHand: { p: [0.17, 0.05, 0.02, 'head'], pole: [0.6, 0.2, 0, 'chest'] }, rHand: { p: [-0.17, 0.05, 0.02, 'head'], pole: [-0.6, 0.2, 0, 'chest'] } };
  const T_TABLE = T.full + 0.25;
  const tR1 = new Track(R1, [
    { name: 'watch', d: T.goal, fn: sitAt(SEATS.R1, {}, remoteHand) },
    { name: 'groan', d: 1.0, blend: 0.15, fn: sitAt(SEATS.R1, { lean: -0.15, nod: -0.3 }, headHands) },
    { name: 'laugh', d: 0.6, blend: 0.2, fn: sitAt(SEATS.R1, { lean: 0.05, nod: -0.25, turn: -0.4 }) },
    { name: 'pat', d: 1.4, blend: 0.2, fn: sitAt(SEATS.R1, { lean: 0.1, nod: 0, turn: -0.5, side: -0.1 }, pat) },
    { name: 'watch2', d: T_TABLE - T.goal - 3.0, blend: 0.3, fn: sitAt(SEATS.R1, {}, remoteHand) },
    { name: 'toTable', d: 0.6, blend: 0.3, fn: walkTo({ from: [SEATS.R1, 0.25], to: [TABLE.x + 0.45, TABLE.z + 0.05], yaw: -PI / 2, ground: 0, amp: 0.34 }) },
    { name: 'pick', d: 0.35, blend: 0.15, fn: stand({ x: TABLE.x + 0.45, z: TABLE.z + 0.05, yaw: -PI / 2, ground: 0, pose: { lean: 0.35, nod: 0.4 }, ik: { lHand: { p: [TABLE.x + 0.12, TABLE.y + 0.03, TABLE.z - 0.1, 'world'] }, rHand: { p: [TABLE.x + 0.12, TABLE.y + 0.03, TABLE.z + 0.15, 'world'] } } }) },
    {
      name: 'carry',
      d: 0.8,
      blend: 0.2,
      fn: walkTo({ from: [TABLE.x + 0.45, TABLE.z + 0.05], to: [SEATS.R2 - 0.35, 0.45], yaw: PI / 2, ground: 0, amp: 0.3, opts: { lArm: 0.9, rArm: 0.9, lEl: 1.2, rEl: 1.2, lOut: 0.2, rOut: 0.2, arm: 0 } }),
    },
    { name: 'serve', d: 0.6, blend: 0.2, fn: stand({ x: SEATS.R2 - 0.35, z: 0.45, yaw: 0.6, ground: 0, pose: { lean: 0.2, nod: 0.3, rArm: 1.0, rEl: 0.3, lArm: 0.6, lEl: 1.0 } }) },
    { name: 'sitDown', d: 0.5, blend: 0.3, fn: sitAt(SEATS.R1, { turn: -0.3 }) },
    {
      name: 'sip',
      d: 10,
      blend: 0.3,
      fn: sitAt(SEATS.R1, { turn: -0.25, lean: 0.05 }, (lt) => {
        const clink = Math.exp(-(((lt - 0.35) / 0.18) ** 2));
        const sip = Math.max(0, Math.sin((lt - 1.2) * 1.6)) * (lt > 1.2 ? 1 : 0);
        return { lHand: { p: [0.22 + 0.12 * clink, 0.15 + 0.12 * clink + 0.25 * sip, 0.3 - 0.05 * sip, 'chest'] } };
      }),
    },
  ]);
  const T_SERVE = tR1.at('serve') + 0.35;
  const T_SIP = tR1.at('sip');
  const tR2 = new Track(R2, [
    { name: 'watch', d: T.goal, fn: sitAt(SEATS.R2) },
    { name: 'celebrate', d: 1.5, blend: 0.15, fn: celebrate(SEATS.R2) },
    { name: 'sitBack', d: T_SERVE - 0.4 - T.goal - 1.5, blend: 0.4, fn: sitAt(SEATS.R2, { turn: 0.3 }) },
    { name: 'take', d: 0.4 + (T_SIP - T_SERVE), blend: 0.3, fn: sitAt(SEATS.R2, { turn: 0.4 }, { rHand: { p: [-0.18, 0.15, 0.32, 'chest'] } }) },
    {
      name: 'sip',
      d: 10,
      blend: 0.3,
      fn: sitAt(SEATS.R2, { turn: 0.25, lean: 0.05 }, (lt) => {
        const clink = Math.exp(-(((lt - 0.35) / 0.18) ** 2));
        const sip = Math.max(0, Math.sin((lt - 1.6) * 1.6)) * (lt > 1.6 ? 1 : 0);
        return { rHand: { p: [-0.22 - 0.12 * clink, 0.15 + 0.12 * clink + 0.25 * sip, 0.3 - 0.05 * sip, 'chest'] } };
      }),
    },
  ]);

  // ---- text -----------------------------------------------------------------------------------------
  for (const [text, x] of [['KÜSEN', -1.6], ['DOST KALAN', 1.6]]) {
    Object.assign(world.addLabel(text, [x, 6.45, 0]).el.style, { fontSize: '38px', letterSpacing: '0.08em' });
  }
  world.addThought('bu gol sayılmaz!', L1, T.goal + 0.5, T.goal + 1.9);
  world.addThought('seninle maç izlemem!', L1, T.goal + 2.0, T.goal + 3.6);
  world.addThought('kimse kalmadı...', L1, T.full + 2.3, T.end);
  world.addThought('bu sefer sizin olsun', R1, T.goal + 1.2, T.goal + 2.9);
  world.setCaption('Maç 90 dakika,\ndostluk ömür boyu.', T.caption, { top: 470 });

  // ---- sounds ------------------------------------------------------------------------------------------
  const REMOTE_LAND = T.goal + 0.75;
  const sfx = [
    { t: T.goal, type: 'crowd', gain: 1.2 },
    { t: REMOTE_LAND, type: 'block', gain: 0.6 },
    { t: tR1.at('pat') + 0.2, type: 'step', gain: 1.5 },
    { t: T.full, type: 'whistle', gain: 1 },
    { t: tR1.at('pick') + 0.15, type: 'clink', gain: 0.6 },
    { t: T_SIP + 0.35, type: 'clink', gain: 1 },
    { t: T_SIP + 0.4, type: 'tick', gain: 1.5 },
    { t: T.caption, type: 'chime', gain: 0.5 },
  ];

  // ---- per frame ------------------------------------------------------------------------------------------
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const arc = (from, to, u, h, out) => out.lerpVectors(from, to, u).setY(lerp(from.y, to.y, u) + h * 4 * u * (1 - u));
  const remoteFrom = new THREE.Vector3();
  const remoteTo = new THREE.Vector3(-1.1, 0.02, 0.9);
  world.onUpdate((t) => {
    for (const tr of [tL1, tL2, tR1, tR2]) tr.apply(t);
    drawTV(t);

    // Remote: in his hand, thrown at the goal, lies on the floor after.
    const throwT = T.goal + 0.3;
    if (t < throwT) {
      remote.position.copy(L1.handWorld('r', v1));
      remoteFrom.copy(remote.position);
      remote.rotation.set(0, 0, 0);
    } else {
      const u = clamp((t - throwT) / (REMOTE_LAND - throwT));
      arc(remoteFrom, remoteTo, u, 0.6, remote.position);
      remote.rotation.set(u * 9, u * 5, 0);
    }

    // Tea: on the tray on the table, carried over, one glass each.
    const picked = t >= tR1.at('pick') + 0.2;
    const served = t >= T_SERVE;
    tray.visible = t < T_SERVE + 0.1;
    if (!picked) {
      tray.position.copy(TABLE).setY(TABLE.y + 0.008);
    } else {
      tray.position.copy(R1.handWorld('l', v1)).add(R1.handWorld('r', v2)).multiplyScalar(0.5).add(v2.set(0, 0.02, 0));
    }
    tray.rotation.set(0, 0, 0);
    teas.forEach((g, i) => {
      if (!served) {
        g.position.copy(tray.position).add(v1.set(i ? 0.08 : -0.08, 0.008, 0));
      } else if (t < T_SIP) {
        // Friend's glass in his hand; his own glass back on the table until he sits.
        if (i === 1) g.position.copy(R2.handWorld('r', v1)).add(v2.set(0, 0.01, 0));
        else g.position.copy(R1.handWorld('l', v1)).add(v2.set(0, 0.01, 0));
      } else {
        const hand = i === 1 ? R2.handWorld('r', v1) : R1.handWorld('l', v1);
        g.position.copy(hand).add(v2.set(0, 0.01, 0));
      }
      g.rotation.set(0, 0, 0);
    });
  });

  return { duration: T.end, sfx };
}
