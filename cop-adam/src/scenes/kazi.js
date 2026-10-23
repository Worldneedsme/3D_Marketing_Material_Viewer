// PES EDEN vs DEVAM EDEN
// Cross-section of the ground. Both dig straight down towards a diamond. The
// quitter stops one swing short, climbs out and walks away; the other one
// keeps going and finds it.
import * as THREE from 'three';
import { StickFigure } from '../rig.js';
import { Track } from '../timeline.js';
import { pose } from '../poses.js';
import { stand, walkTo, breathe } from '../moves.js';
import { PI, lerp, smooth, smoothstep, easeInOut, easeIn, easeOut, clamp, mulberry32 } from '../math.js';

const S = 5; // ground surface
const SHAFT = 1.3;
const PERIOD = 0.62; // one pickaxe swing
const HIT = 0.62; // phase of the swing where the pick lands
const BITE = 0.2; // depth removed per swing
const DIAMOND_Y = 0.05;
const DIAMOND_TOP = DIAMOND_Y + 0.28;

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 4.2, 20.5], target: [0, 3.0, 0], fov: 35 });

  // Shafts: the quitter digs on the left, facing outwards (-x); the other
  // one mirrors him on the right.
  const shafts = [
    { x0: -1.05 - SHAFT, x1: -1.05, dir: -1 },
    { x0: 1.05, x1: 1.05 + SHAFT, dir: 1 },
  ];
  for (const sh of shafts) {
    sh.stand = sh.dir > 0 ? sh.x0 + 0.38 : sh.x1 - 0.38;
    sh.strikeX = sh.stand + sh.dir * 0.62;
  }

  // ---- ground -----------------------------------------------------------------
  const LAYERS = [
    [4.75, S, 0x4b3e34],
    [3.4, 4.75, 0x3c3129],
    [2.0, 3.4, 0x342b25],
    [0.9, 2.0, 0x2e2621],
    [-0.6, 0.9, 0x28211d],
    [-4.6, -0.6, 0x221c19],
  ];
  const layerMats = LAYERS.map(([, , c]) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const DEPTH = 1.3;
  const block = (x0, x1) => {
    const g = new THREE.Group();
    const parts = LAYERS.map(([y0, y1], i) => {
      const m = new THREE.Mesh(unit, layerMats[i]);
      m.scale.set(x1 - x0, y1 - y0, DEPTH);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
      m.receiveShadow = true;
      g.add(m);
      return m;
    });
    scene.add(g);
    // Cut the block down to `top`, for the ground under a shaft.
    g.userData.setTop = (top) => {
      LAYERS.forEach(([y0, y1], i) => {
        const h = Math.min(y1, top) - y0;
        parts[i].visible = h > 0.001;
        parts[i].scale.y = Math.max(h, 0.001);
        parts[i].position.y = y0 + parts[i].scale.y / 2;
      });
    };
    return g;
  };
  block(-6, shafts[0].x0);
  block(shafts[0].x1, shafts[1].x0);
  block(shafts[1].x1, 6);
  for (const sh of shafts) sh.ground = block(sh.x0, sh.x1);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), new THREE.MeshStandardMaterial({ color: 0x15110f, roughness: 1 }));
  backWall.position.set(0, S - 5, -DEPTH / 2 + 0.01);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x8c8073, roughness: 0.8 });
  for (const [x0, x1] of [[-6, shafts[0].x0], [shafts[0].x1, shafts[1].x0], [shafts[1].x1, 6]]) {
    const m = new THREE.Mesh(unit, edgeMat);
    m.scale.set(x1 - x0, 0.04, DEPTH + 0.02);
    m.position.set((x0 + x1) / 2, S, 0);
    scene.add(m);
  }

  // Pebbles on the cut face, kept clear of anything that gets dug.
  const rand = mulberry32(5);
  const pebbleGeo = new THREE.SphereGeometry(1, 8, 6);
  const pebbleMats = [0x5a5049, 0x1a1513, 0x6e6259].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  for (let i = 0; i < 140; i++) {
    const x = -3.9 + rand() * 7.8;
    const y = -3.6 + rand() * 8.4;
    const inShaft = shafts.some((sh) => x > sh.x0 - 0.06 && x < sh.x1 + 0.06 && y > 0.1);
    const nearGem = shafts.some((sh) => Math.hypot(x - sh.strikeX, y - DIAMOND_Y) < 0.5);
    if (inShaft || nearGem) continue;
    const p = new THREE.Mesh(pebbleGeo, pebbleMats[i % 3]);
    const r = 0.03 + rand() * 0.07;
    p.scale.set(r * (1 + rand()), r, r * 0.5);
    p.rotation.z = rand() * PI;
    p.position.set(x, y, DEPTH / 2 + 0.005);
    scene.add(p);
  }

  // ---- diamonds -------------------------------------------------------------------
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(200,245,255,1)');
    grad.addColorStop(0.25, 'rgba(120,220,255,0.45)');
    grad.addColorStop(1, 'rgba(60,160,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const gemMat = () => new THREE.MeshStandardMaterial({ color: 0xaeeeff, emissive: 0x2a9fd6, emissiveIntensity: 0.6, roughness: 0.08, metalness: 0.2, flatShading: true });
  const makeGem = (x) => {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), gemMat());
    mesh.scale.set(1, 1.28, 1);
    g.add(mesh);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(0.9);
    g.add(glow);
    const light = new THREE.PointLight(0x7fd8ff, 0, 6, 1.6);
    g.add(light);
    g.position.set(x, DIAMOND_Y, DEPTH / 2);
    scene.add(g);
    return { group: g, mesh, glow, light };
  };
  const gemL = makeGem(shafts[0].strikeX);
  const gemR = makeGem(shafts[1].strikeX);

  // ---- pickaxes -------------------------------------------------------------------
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xcbbba4, roughness: 0.7 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x6b6e75, roughness: 0.35, metalness: 0.6 });
  const makePick = () => {
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.84, 10), woodMat);
    handle.position.y = -0.34;
    g.add(handle);
    const head = new THREE.Group();
    head.position.y = -0.72;
    g.add(head);
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.36, 8), ironMat);
    point.rotation.x = -PI / 2 - 0.12;
    point.position.set(0, -0.02, -0.18);
    head.add(point);
    const chisel = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.24, 4), ironMat);
    chisel.rotation.x = PI / 2 + 0.12;
    chisel.position.set(0, -0.015, 0.12);
    head.add(chisel);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.08), ironMat);
    head.add(eye);
    g.traverse((o) => (o.castShadow = true));
    return g;
  };

  const Q = new StickFigure(mat.figure); // quitter, left
  const D = new StickFigure(mat.figure); // doer, right
  scene.add(Q.root, D.root);
  const pickQ = Q.attach('r', makePick());
  const pickD = D.attach('r', makePick());
  // Loose copies for after they let go.
  const droppedQ = makePick();
  const droppedD = makePick();
  scene.add(droppedQ, droppedD);

  // ---- digging --------------------------------------------------------------------
  const strikes = { q: 9, d: 11 };
  const floor0 = DIAMOND_TOP + 0.25 + strikes.q * BITE;
  const t0 = 0.1;
  const impactAt = (k) => t0 + (k + HIT) * PERIOD;
  // Shaft floor height after the strikes that landed before t.
  const floorAt = (n) => (t) => {
    let f = floor0;
    for (let k = 0; k < n; k++) f -= BITE * smoothstep(impactAt(k), impactAt(k) + 0.06, t);
    return f;
  };
  const floorQ = floorAt(strikes.q);
  const floorD = (t) => Math.max(floorAt(strikes.d)(t), DIAMOND_TOP + 0.05);

  const swing = (phase, tired = 0) => {
    const f = phase - Math.floor(phase);
    const up = { a: 3.0 - tired * 0.9, l: -0.12, k: 0.12, e: 0.45 };
    const hit = { a: 0.05, l: 0.62, k: 0.55, e: 0.05 };
    let k;
    if (f < 0.5) k = 1 - easeInOut(f / 0.5);
    else if (f < HIT) k = easeIn((f - 0.5) / (HIT - 0.5));
    else k = 1 - 0.08 * Math.sin(((f - HIT) / (1 - HIT)) * PI);
    const a = lerp(up.a, hit.a, k);
    return pose({
      lean: lerp(up.l, hit.l, k),
      nod: lerp(-0.2, 0.45, k),
      rArm: a,
      rEl: lerp(up.e, hit.e, k),
      rOut: 0.05,
      lLeg: lerp(0.35, 0.65, k),
      rLeg: lerp(-0.1, 0.15, k),
      lKnee: lerp(0.4, 0.8, k),
      rKnee: lerp(k * 0.2, 0.75, k),
    });
  };
  const leftGrip = (pick) => ({ p: (fig, out) => pick.localToWorld(out.set(0, -0.2, 0)), pole: [0.3, 0.05, 0.1, 'chest'] });

  const digClip = (sh, pick, n, floor, tiredFrom = Infinity) => ({
    d: impactAt(n - 1) + (1 - HIT) * PERIOD * 0.5,
    fn: (u, lt, d, t) => ({
      pos: [sh.stand, 0, 0],
      yaw: sh.dir * PI / 2,
      pose: swing((t - t0) / PERIOD, smoothstep(tiredFrom, tiredFrom + 1.5, t)),
      ik: { lHand: leftGrip(pick) },
      ground: floor(t),
    }),
  });

  // ---- PES EDEN ---------------------------------------------------------------------
  const sq = shafts[0];
  const ropeX = sq.x0 + 0.16;
  const ropeZ = -0.3;
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, S - floor0 + 2.6, 6), new THREE.MeshStandardMaterial({ color: 0xbfae94, roughness: 0.9 }));
  rope.position.set(ropeX, (S + 0.25 + floor0 - 2.35) / 2, ropeZ);
  scene.add(rope);
  const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8), woodMat);
  stake.position.set(sq.x0 - 0.12, S + 0.12, ropeZ);
  scene.add(stake);
  const ropeTop = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 6), rope.material);
  ropeTop.rotation.z = PI / 2;
  ropeTop.position.set(sq.x0 + 0.02, S + 0.24, ropeZ);
  scene.add(ropeTop);

  const qFloor = floorQ(99);
  const climbStep = 0.34;
  const climbY0 = qFloor + 0.75;
  const climbY1 = S + 0.55;
  const ropeGrip = (y, offset, phase) => {
    const q = (y + offset) / (climbStep * 2) + phase;
    const k = Math.floor(q);
    return (k + smoothstep(0.5, 1, q - k) - phase) * climbStep * 2;
  };
  const wallX = sq.x0 + 0.02;

  const qTrack = new Track(Q, [
    { name: 'dig', ...digClip(sq, pickQ, strikes.q, floorQ, 3.4) },
    {
      name: 'tired',
      d: 0.6,
      blend: 0.35,
      fn: (u, lt, d, t) => {
        // Leans on the handle, head hanging.
        const p = pose({ lean: 0.35, nod: 0.7, rArm: 0.75, rEl: 0.25, lLeg: 0.1, rLeg: -0.05, lKnee: 0.15, rKnee: 0.15 });
        breathe(p, t, 2.5);
        return { pos: [sq.stand, 0, 0], yaw: -PI / 2, pose: p, ik: { lHand: leftGrip(pickQ) }, ground: qFloor };
      },
    },
    {
      name: 'drop',
      d: 0.44,
      blend: 0.15,
      fn: (u) => {
        const p = pose({ lean: 0.05, nod: 0.25, lArm: 0.1, rArm: 0.1, turn: -0.3 * smooth(u) });
        return { pos: [lerp(sq.stand, sq.stand - 0.15, u), 0, 0], yaw: -PI / 2, pose: p, ground: qFloor };
      },
    },
    {
      name: 'climb',
      d: 2.3,
      blend: 0.3,
      fn: (u) => {
        const y = lerp(climbY0, climbY1, easeInOut(u) * 0.8 + u * 0.2);
        return {
          pos: [ropeX + 0.48, y, 0],
          yaw: -PI / 2,
          pitch: -0.35,
          pose: pose({ lean: 0.1, nod: -0.25, lLeg: 0.9, rLeg: 0.9 }),
          ik: {
            lHand: { p: [ropeX, ropeGrip(y, 0.95, 0), ropeZ + 0.03, 'world'] },
            rHand: { p: [ropeX, ropeGrip(y, 0.95, 0.5), ropeZ - 0.03, 'world'] },
            lFoot: { p: [wallX + 0.06, ropeGrip(y, -0.35, 0.5) - 0.05, 0.12, 'world'] },
            rFoot: { p: [wallX + 0.06, ropeGrip(y, -0.35, 0), -0.12, 'world'] },
          },
        };
      },
    },
    {
      name: 'over',
      d: 0.6,
      blend: 0.25,
      fn: walkTo({ from: [sq.x0 + 0.1, 0], to: [sq.x0 - 0.45, 0], yaw: -PI / 2, ground: S, amp: 0.35, ease: easeOut }),
    },
    {
      name: 'leave',
      d: 1.8,
      fn: walkTo({ from: [sq.x0 - 0.45, 0], to: [-4.6, 0], yaw: -PI / 2, ground: S, amp: 0.26, opts: { lean: 0.12, nod: 0.5, arm: 0.12 } }),
    },
    { name: 'gone', d: 5, fn: stand({ x: -5.5, yaw: -PI / 2, ground: S }) },
  ]);

  // ---- DEVAM EDEN -------------------------------------------------------------------
  const sd = shafts[1];
  const dFloor = DIAMOND_TOP + 0.05;
  const gemHome = gemR.group.position.clone();
  const lift = new THREE.Vector3();
  // Where the doer's hands hold the gem while lifting it.
  const holdPoint = (t) => {
    const k = smoothstep(dTrack.at('lift'), dTrack.at('lift') + 1.0, t);
    lift.set(lerp(gemHome.x, sd.stand + 0.12, k), lerp(gemHome.y + 0.05, dFloor + 2.25, easeInOut(k)), lerp(gemHome.z, 0.25, k));
    return lift;
  };

  const dTrack = new Track(D, [
    { name: 'dig', ...digClip(sd, pickD, strikes.d, floorD) },
    {
      name: 'stunned',
      d: 0.6,
      blend: 0.12,
      fn: () => {
        const p = swing(HIT, 0);
        p.neckX += 0.25;
        return { pos: [sd.stand, 0, 0], yaw: PI / 2, pose: p, ik: { lHand: leftGrip(pickD) }, ground: dFloor };
      },
    },
    {
      name: 'kneel',
      d: 0.6,
      blend: 0.3,
      fn: () => ({
        pos: [sd.stand + 0.05, 0, 0],
        yaw: PI / 2,
        pose: pose({ lean: 0.5, nod: 0.6, lLeg: 1.45, lKnee: 1.75, rLeg: -0.25, rKnee: 1.85, rAnk: 0.9 }),
        ik: {
          lHand: { p: [gemHome.x - 0.05, gemHome.y + 0.12, 0.1, 'world'] },
          rHand: { p: [gemHome.x - 0.05, gemHome.y + 0.12, -0.1, 'world'] },
        },
        ground: dFloor,
      }),
    },
    {
      name: 'lift',
      d: 6,
      blend: 0.35,
      fn: (u, lt, d, t) => {
        const k = smoothstep(0, 1, lt);
        const p = pose({ lean: lerp(0.45, -0.12, k), nod: lerp(0.5, -0.45, k), lLeg: lerp(1.2, 0.08, k), lKnee: lerp(1.5, 0.08, k), rLeg: lerp(-0.2, 0, k), rKnee: lerp(1.6, 0.05, k) });
        breathe(p, t, k);
        const h = holdPoint(t);
        // Turns towards the camera while raising the gem.
        const yaw = lerp(PI / 2, 0.35, smoothstep(0.3, 1.3, lt));
        return {
          pos: [sd.stand + 0.05, 0, 0],
          yaw,
          pose: p,
          ik: {
            lHand: { p: [h.x + 0.1, h.y - 0.18, h.z, 'world'] },
            rHand: { p: [h.x - 0.1, h.y - 0.18, h.z, 'world'] },
          },
          ground: dFloor,
        };
      },
    },
  ]);

  // ---- timing, effects ------------------------------------------------------------------
  const found = impactAt(strikes.d - 1);
  const qDrop = qTrack.at('drop') + 0.2;
  const dDrop = dTrack.at('kneel');
  const sfx = [];
  const dirt = new THREE.MeshStandardMaterial({ color: 0x8a7462, roughness: 0.9 });
  world.makeParticles('dirt', new THREE.BoxGeometry(1, 1, 1), dirt);
  world.makeParticles('sparks', new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc8f4ff }));
  const burst = (x, y, t, seed, n = 26) => {
    const r = mulberry32(seed);
    const parts = [];
    for (let i = 0; i < n; i++) {
      const a = (r() - 0.5) * PI * 0.9;
      const sp = 0.6 + r() * 1.6;
      parts.push({ x, y: y + 0.02, z: (r() - 0.5) * 0.5, vx: Math.sin(a) * sp, vy: 1.2 + r() * 2.2, vz: (r() - 0.5) * 0.6, delay: r() * 0.05, r: 0.02 + r() * 0.03 });
    }
    return parts;
  };
  for (let k = 0; k < strikes.d; k++) {
    const t = impactAt(k);
    const last = k === strikes.d - 1;
    const fD = floorAt(strikes.d)(t + 0.1);
    if (!last) world.addBurst('dirt', { t0: t, parts: burst(sd.strikeX, fD, t, 100 + k), floor: Math.max(fD, dFloor), life: 1.4, settle: true });
    sfx.push({ t, type: last ? 'chime' : 'dig', gain: 0.9 });
    if (k < strikes.q) {
      world.addBurst('dirt', { t0: t, parts: burst(sq.strikeX, floorQ(t + 0.1), t, 200 + k), floor: floorQ(t + 0.1), life: 1.4, settle: true });
      sfx.push({ t: t + 0.012, type: 'dig', gain: 0.7 });
    }
  }
  world.addBurst('sparks', { t0: found, parts: burst(sd.strikeX, dFloor - 0.05, found, 999, 60).map((p) => ({ ...p, r: p.r * 0.5, vy: p.vy * 1.4 })), life: 0.9, gravity: 4 });

  // ---- text --------------------------------------------------------------------------
  world.addLabel('PES EDEN', [-1.75, 7.05, 0]);
  world.addLabel('DEVAM EDEN', [1.75, 6.7, 0]);
  world.addThought('bu iş olmuyor', Q, 2.2, 3.4);
  world.addThought('boşuna uğraşıyorum', Q, 3.4, 4.7);
  world.addThought('bıraksam artık...', Q, 4.75, qTrack.at('climb'));
  world.setCaption('Bıraktığın yer,\nbelki de son kazmaydı.', qTrack.at('gone') + 0.3, { top: 470 });

  // ---- per frame -----------------------------------------------------------------------
  const placeDropped = (obj, pick, tDrop, t, restX, restY, dir) => {
    pick.visible = t < tDrop;
    obj.visible = t >= tDrop;
    if (!obj.visible) return;
    // Falls flat onto the floor.
    const k = easeIn(clamp((t - tDrop) / 0.35));
    obj.position.set(restX, lerp(restY + 0.7, restY + 0.04, k), 0.25);
    obj.rotation.set(0, 0, dir * lerp(0.4, PI / 2, k));
  };

  world.onUpdate((t) => {
    sq.ground.userData.setTop(floorQ(t));
    sd.ground.userData.setTop(floorD(t));
    qTrack.apply(t);
    dTrack.apply(t);
    placeDropped(droppedQ, pickQ, qDrop, t, sq.stand - 0.05, qFloor, -1);
    placeDropped(droppedD, pickD, dDrop, t, sd.stand - 0.25, dFloor, 1);

    // The found gem: flash, then rides in the doer's hands, glowing.
    const shine = smoothstep(found, found + 0.15, t);
    const pulse = 0.85 + 0.15 * Math.sin(t * 5);
    if (t >= dTrack.at('lift')) {
      gemR.group.position.copy(holdPoint(t));
      gemR.mesh.rotation.y = (t - dTrack.at('lift')) * 1.5;
    } else {
      gemR.group.position.copy(gemHome);
    }
    gemR.light.intensity = shine * 6 * pulse;
    gemR.glow.scale.setScalar(0.9 + shine * (0.9 + 2.2 * Math.exp(-(t - found) * 3)) * pulse);
    gemR.mesh.material.emissiveIntensity = 0.6 + shine * 1.6;

    // The missed gem keeps a faint heartbeat after the quitter leaves.
    const miss = smoothstep(qTrack.at('gone') - 0.5, qTrack.at('gone') + 0.5, t);
    gemL.glow.scale.setScalar(0.9 + miss * 0.5 * (0.5 + 0.5 * Math.sin(t * 3.2)));
    gemL.light.intensity = miss * 1.5 * (0.6 + 0.4 * Math.sin(t * 3.2));
  });

  const markers = Object.fromEntries([...qTrack.clips.map((c) => ['Q.' + c.name, +c.t0.toFixed(2)]), ...dTrack.clips.map((c) => ['D.' + c.name, +c.t0.toFixed(2)]), ['found', +found.toFixed(2)]]);
  return { duration: 15, sfx, markers };
}
