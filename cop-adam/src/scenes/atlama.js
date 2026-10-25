// KAFASINDA KURAN vs YAPAN
// Two springboards over dark water. The doer dives, climbs back and flips in
// again; the overthinker walks up to the edge, imagines every way it could go
// wrong, and ends up sitting on the board.
import { StickFigure, STAND_HIP, DIM } from '../rig.js';
import { Track } from '../timeline.js';
import { pose, mixPose, DIVE, TUCK, CROUCH } from '../poses.js';
import { stand, walkTo, runTo, fly, breathe, tremble } from '../moves.js';
import { makeTower, makeBoard } from '../props.js';
import { PI, lerp, smooth, smoothstep, easeInOut, easeOut, clamp } from '../math.js';

const TOP = 4;

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 4.2, 20.5], target: [0, 3.0, 0], fov: 35 });
  world.makeWater({ tint: 0.3 });

  const leftTower = makeTower({ mat: mat.metal, cx: -2.85, side: -1, topY: TOP });
  const rightTower = makeTower({ mat: mat.metal, cx: 2.85, side: 1, topY: TOP, ladder: true });
  const lb = makeBoard({ mat: mat.board, tipMat: mat.red, edgeX: -2.19, side: -1, topY: TOP, length: 1.4 });
  const rb = makeBoard({ mat: mat.board, tipMat: mat.red, edgeX: 2.19, side: 1, topY: TOP, length: 1.4 });
  scene.add(leftTower.group, rightTower.group, lb.group, rb.group);
  const ladder = rightTower.ladder;

  const L = new StickFigure(mat.figure);
  const R = new StickFigure(mat.figure);
  scene.add(L.root, R.root);

  const FACE_L = PI / 2; // looking towards +x
  const FACE_R = -PI / 2; // looking towards -x
  const sfx = [];

  // ---------------------------------------------------------------- YAPAN --
  const rStart = 2.55;
  const rEdge = rb.tipX + 0.2;
  const LAUNCH1 = [rb.tipX + 0.16, TOP + STAND_HIP + 0.05, 0];
  const LAUNCH2 = [rb.tipX + 0.16, TOP + STAND_HIP + 0.05, 0];
  const swimFrom = [0.3, 0.45];
  const swimTo = [ladder.x, ladder.z + 0.3];
  const swimYaw = Math.atan2(swimTo[0] - swimFrom[0], swimTo[1] - swimFrom[1]);
  const climbFrom = -0.55;
  const climbTo = TOP + 0.86;

  // Pose for treading water: arms sculling under the surface.
  const tread = (t, k = 1) =>
    pose({ lean: 0.15, nod: -0.15, lArm: 0.9 + 0.3 * Math.sin(t * 5), rArm: 0.9 + 0.3 * Math.sin(t * 5 + 1), lOut: 0.7, rOut: 0.7, lEl: 0.8, rEl: 0.8, lLeg: 0.4 * k * Math.sin(t * 4), rLeg: -0.4 * k * Math.sin(t * 4), lKnee: 0.8, rKnee: 0.8 });

  const bob = (t) => 0.035 * Math.sin(t * 3.1);
  const HEAD_UP = -0.6; // pelvis height that leaves head and neck above water

  // Ladder stepping: a limb rests on a rung and jumps two rungs at a time.
  const rungY = (k) => ladder.rungs[0] + k * ladder.step;
  const grip = (pelvisY, offset, phase) => {
    const q = (pelvisY + offset - ladder.rungs[0]) / (ladder.step * 2) + phase;
    const k = Math.floor(q);
    const m = smoothstep(0.55, 1, q - k);
    return rungY((k + m - phase) * 2);
  };

  const rTrack = new Track(R, [
    { name: 'idle', d: 0.7, fn: stand({ x: rStart, yaw: FACE_R, ground: TOP }) },
    { name: 'run', d: 0.78, fn: runTo({ from: [rStart, 0], to: [rEdge, 0], yaw: FACE_R, ground: rb.topAt, ease: (u) => Math.pow(u, 1.25) }) },
    {
      name: 'load',
      d: 0.26,
      blend: 0.12,
      fn: (u) => ({ pos: [lerp(rEdge, LAUNCH1[0], u), 0, 0], yaw: FACE_R, pose: CROUCH, ground: rb.topAt(rEdge) }),
    },
    {
      name: 'dive',
      d: 1.75,
      blend: 0.1,
      fn: fly({
        p0: LAUNCH1,
        v: [-0.55, 3.9, 0],
        yaw: FACE_R,
        pitch: (lt) => 3.05 * Math.pow(smooth(lt / 1.42), 1.15),
        poseAt: (lt) => (lt < 0.12 ? pose({ lean: 0.2, lArm: 2.2, rArm: 2.2, lEl: 0.2, rEl: 0.2 }) : DIVE),
      }),
    },
    { name: 'under', d: 0.55, blend: 0, fn: () => ({ pos: [swimFrom[0], -3, swimFrom[1]], yaw: swimYaw, pose: tread(0) }) },
    {
      name: 'surface',
      d: 0.75,
      blend: 0,
      fn: (u, lt, d, t) => ({ pos: [swimFrom[0], lerp(-1.9, HEAD_UP, easeOut(u)) + bob(t), swimFrom[1]], yaw: swimYaw, pose: tread(t) }),
    },
    {
      name: 'swim',
      d: 1.45,
      fn: (u, lt, d, t) => {
        const e = easeInOut(u);
        const s = Math.sin(t * 7);
        return {
          pos: [lerp(swimFrom[0], swimTo[0], e), -0.3 + 0.03 * s, lerp(swimFrom[1], swimTo[1], e)],
          yaw: swimYaw,
          pitch: 1.15,
          pose: pose({ lean: -0.1, nod: -0.9, lArm: 1.6 + 0.9 * s, rArm: 1.6 + 0.9 * s, lOut: 0.5 - 0.4 * s, rOut: 0.5 - 0.4 * s, lEl: 0.6, rEl: 0.6, lLeg: 0.3 * Math.sin(t * 7 + 1.5), rLeg: 0.3 * Math.sin(t * 7 + 1.5), lKnee: 0.9, rKnee: 0.9, lLegOut: 0.3, rLegOut: 0.3 }),
        };
      },
    },
    {
      name: 'grab',
      d: 0.35,
      blend: 0.3,
      fn: () => ({
        pos: [ladder.x, climbFrom, ladder.z + 0.27],
        yaw: PI,
        pose: pose({ lean: 0.1, nod: -0.35, lKnee: 0.5, rKnee: 0.5 }),
        ik: {
          lHand: { p: [ladder.x - 0.18, grip(climbFrom, 0.95, 0), ladder.z, 'world'] },
          rHand: { p: [ladder.x + 0.18, grip(climbFrom, 0.95, 0.5), ladder.z, 'world'] },
        },
      }),
    },
    {
      name: 'climb',
      d: 2.55,
      blend: 0.1,
      fn: (u) => {
        const y = lerp(climbFrom, climbTo, u);
        // Character faces -z, so its left hand is on world -x.
        return {
          pos: [ladder.x, y, ladder.z + 0.27],
          yaw: PI,
          pose: pose({ lean: 0.12, nod: -0.4 }),
          ik: {
            lHand: { p: [ladder.x - 0.18, grip(y, 0.95, 0), ladder.z, 'world'] },
            rHand: { p: [ladder.x + 0.18, grip(y, 0.95, 0.5), ladder.z, 'world'] },
            lFoot: { p: [ladder.x - 0.1, grip(y, -0.3, 0.5) + 0.06, ladder.z + 0.05, 'world'] },
            rFoot: { p: [ladder.x + 0.1, grip(y, -0.3, 0) + 0.06, ladder.z + 0.05, 'world'] },
          },
        };
      },
    },
    {
      name: 'mount',
      d: 0.5,
      blend: 0.25,
      fn: walkTo({ from: [ladder.x, ladder.z + 0.2], to: [ladder.x, 0.3], yaw: PI, ground: TOP, amp: 0.4, ease: easeOut }),
    },
    {
      name: 'turn',
      d: 0.4,
      fn: walkTo({ from: [ladder.x, 0.3], to: [2.6, 0], yaw: (u) => lerp(PI, 1.5 * PI, smooth(u)), ground: TOP, amp: 0.3 }),
    },
    { name: 'run2', d: 0.62, fn: runTo({ from: [2.6, 0], to: [rEdge, 0], yaw: 1.5 * PI, ground: rb.topAt, ease: (u) => Math.pow(u, 1.15) }) },
    {
      name: 'load2',
      d: 0.24,
      blend: 0.1,
      fn: (u) => ({ pos: [lerp(rEdge, LAUNCH2[0], u), 0, 0], yaw: 1.5 * PI, pose: CROUCH, ground: rb.topAt(rEdge) }),
    },
    {
      name: 'flip',
      d: 1.85,
      blend: 0.08,
      fn: fly({
        p0: LAUNCH2,
        v: [-0.5, 4.5, 0],
        yaw: 1.5 * PI,
        pitch: (lt) => 2 * PI * 1.48 * smooth(clamp(lt / 1.4)) ** 0.9,
        poseAt: (lt) => {
          const k = smoothstep(0.05, 0.3, lt) * (1 - smoothstep(0.95, 1.2, lt));
          return mixPose(DIVE, TUCK, k);
        },
      }),
    },
    { name: 'under2', d: 0.5, blend: 0, fn: () => ({ pos: [0.2, -3, 0.6], yaw: 0.3, pose: tread(0) }) },
    {
      name: 'surface2',
      d: 0.7,
      blend: 0,
      fn: (u, lt, d, t) => ({ pos: [0.2, lerp(-1.9, HEAD_UP, easeOut(u)) + bob(t), 0.6], yaw: 0.3, pose: tread(t) }),
    },
    {
      name: 'cheer',
      d: 3,
      blend: 0.35,
      fn: (u, lt, d, t) => {
        const p = tread(t, 0.6);
        // Right arm up, waving side to side.
        p.rShX = -2.7;
        p.rShZ = -0.75 - 0.35 * Math.sin(t * 7);
        p.rElX = -0.2 - 0.15 * Math.sin(t * 7 + 1);
        return { pos: [0.2, HEAD_UP + 0.1 + bob(t), 0.6], yaw: 0.3 + 0.15 * Math.sin(t * 0.8), pose: p };
      },
    },
  ]);

  // Water entry: first moment a hand or the head goes under.
  const entry = (from, to) => {
    for (let t = from; t < to; t += 1 / 240) {
      R.apply(rTrack.sample(t));
      const hand = R.handWorld('l');
      const head = R.headWorld();
      if (Math.min(hand.y, head.y) <= 0) return { t, x: (hand.x + head.x) / 2, z: hand.z };
    }
    throw new Error('no water entry');
  };
  const dive1 = rTrack.at('dive');
  const flip2 = rTrack.at('flip');
  const e1 = entry(dive1, dive1 + 1.75);
  const e2 = entry(flip2, flip2 + 1.85);
  world.addSplash(e1.x, e1.z, e1.t, 1.0, 1);
  world.addSplash(e2.x, e2.z, e2.t, 1.15, 2);
  world.addSplash(swimFrom[0], swimFrom[1], rTrack.at('surface') + 0.35, 0.22, 3);
  world.addSplash(0.2, 0.6, rTrack.at('surface2') + 0.35, 0.22, 4);
  sfx.push(
    { t: dive1 - 0.05, type: 'board' },
    { t: dive1 + 0.15, type: 'whoosh' },
    { t: e1.t, type: 'splash', gain: 1 },
    { t: rTrack.at('surface') + 0.35, type: 'splash', gain: 0.25 },
    { t: flip2 - 0.05, type: 'board' },
    { t: flip2 + 0.2, type: 'whoosh' },
    { t: e2.t, type: 'splash', gain: 1.1 },
    { t: rTrack.at('surface2') + 0.35, type: 'splash', gain: 0.25 },
  );

  // Board bounce: pressed down while loading, then rings out after take-off.
  const bounce = (t, load, launch) => {
    if (t < load) return 0;
    if (t < launch) return 0.12 * smooth((t - load) / (launch - load));
    const dt = t - launch;
    return 0.12 * Math.cos(dt * 2 * PI * 3.4) * Math.exp(-dt * 3.2);
  };
  const rLoad1 = rTrack.at('load');
  const rLoad2 = rTrack.at('load2');

  // ------------------------------------------------------ KAFASINDA KURAN --
  const lStart = -2.55;
  const lEdge = lb.tipX - 0.2;
  const lBack = -1.55;
  const sitX = lb.tipX - 0.2;

  const chin = {
    rHand: { p: [-0.035, -0.18, 0.11, 'head'], pole: [-0.12, 0.05, 0.4, 'chest'] },
    lHand: { p: [-0.06, 0.24, 0.2, 'chest'], pole: [0.35, 0.2, 0.05, 'chest'] },
  };
  const headHold = {
    lHand: { p: [0.1, 0.09, 0.02, 'head'], pole: [0.55, 0.8, 0.1, 'chest'] },
    rHand: { p: [-0.1, 0.09, 0.02, 'head'], pole: [-0.55, 0.8, 0.1, 'chest'] },
  };
  const chinInHands = {
    lHand: { p: [0.07, -0.17, 0.09, 'head'], pole: [0.15, -0.3, 0.6, 'chest'] },
    rHand: { p: [-0.07, -0.17, 0.09, 'head'], pole: [-0.15, -0.3, 0.6, 'chest'] },
  };

  const lTrack = new Track(L, [
    { name: 'idle', d: 0.55, fn: stand({ x: lStart, yaw: FACE_L, ground: TOP }) },
    { name: 'walk', d: 1.9, fn: walkTo({ from: [lStart, 0], to: [lEdge, 0], yaw: FACE_L, ground: TOP, amp: 0.24, ease: (u) => easeInOut(u) * 0.85 + u * 0.15, opts: { lean: 0, arm: 0.2 } }) },
    {
      name: 'peek',
      d: 0.0, // length set below, so the flinch lands on the splash
      fn: (u, lt, d, t) => {
        const k = smooth(lt / 0.6);
        const p = pose({ lean: 0.45 * k, nod: 0.65 * k, lArm: -0.35 * k, rArm: -0.35 * k, lOut: 0.3, rOut: 0.3, lKnee: 0.2 * k, rKnee: 0.2 * k, lLeg: 0.12 * k, rLeg: 0.12 * k });
        tremble(p, t, 0.02 * k);
        return { pos: [lEdge, 0, 0], yaw: FACE_L, pose: p, ground: TOP };
      },
    },
    {
      name: 'flinch',
      d: 0.5,
      blend: 0.08,
      fn: (u, lt, d, t) => {
        // Startled backwards, arms flung out for balance.
        const flail = Math.sin(lt * 18) * (1 - u);
        const p = pose({ lean: -0.25, nod: -0.25, lArm: 0.7 + 0.3 * flail, rArm: 0.7 - 0.3 * flail, lOut: 1.15, rOut: 1.15, lEl: 0.5, rEl: 0.5, lLeg: -0.1, rLeg: 0.1 });
        tremble(p, t, 0.03);
        return { pos: [lEdge - 0.05, 0, 0], yaw: FACE_L, pose: p, ground: TOP };
      },
    },
    { name: 'back', d: 0.9, fn: walkTo({ from: [lEdge - 0.05, 0], to: [lBack, 0], yaw: FACE_L, ground: TOP, amp: 0.25, backwards: true, ease: easeOut, opts: { lean: -0.05, arm: 0.15 } }) },
    {
      name: 'think',
      d: 1.75,
      fn: (u, lt, d, t) => {
        const p = pose({ lean: 0.04, nod: 0.1, tilt: 0.18 + 0.05 * Math.sin(t * 1.3), turn: 0.15 * Math.sin(t * 0.9) });
        breathe(p, t);
        // Tapping the front foot.
        const tap = Math.max(0, Math.sin(t * 9));
        p.lAnkX -= 0.35 * tap;
        return { pos: [lBack, 0, 0], yaw: FACE_L, pose: p, ik: chin, ground: TOP };
      },
    },
    { name: 'walk2', d: 0.9, fn: walkTo({ from: [lBack, 0], to: [lEdge, 0], yaw: FACE_L, ground: TOP, amp: 0.26, opts: { lean: 0.02, arm: 0.2 } }) },
    {
      name: 'windup',
      d: 1.0,
      fn: (u, lt) => {
        // Swings the arms "one... two..." but never gets to three.
        const swing = Math.sin(lt * 2 * PI * 1.6);
        const k = smooth(lt / 0.3);
        const p = pose({ lean: 0.35 * k, nod: 0.25, lArm: 0.7 * swing - 0.1, rArm: 0.7 * swing - 0.1, lEl: 0.25, rEl: 0.25, lLeg: 0.45 * k, rLeg: 0.45 * k, lKnee: (0.8 + 0.25 * swing) * k, rKnee: (0.8 + 0.25 * swing) * k });
        return { pos: [lEdge, 0, 0], yaw: FACE_L, pose: p, ground: TOP };
      },
    },
    {
      name: 'freeze',
      d: 0.75,
      blend: 0.15,
      fn: (u, lt, d, t) => {
        const p = pose({ lean: 0.4, nod: 0.75, lArm: 0.6, rArm: 0.6, lEl: 0.3, rEl: 0.3, lLeg: 0.45, rLeg: 0.45, lKnee: 0.85, rKnee: 0.85 });
        tremble(p, t, 0.045);
        return { pos: [lEdge, 0, 0], yaw: FACE_L, pose: p, ground: TOP };
      },
    },
    { name: 'retreat', d: 0.6, fn: walkTo({ from: [lEdge, 0], to: [lBack, 0], yaw: FACE_L, ground: TOP, amp: 0.3, backwards: true, ease: easeOut, opts: { lean: -0.1 } }) },
    {
      name: 'despair',
      d: 1.55,
      blend: 0.3,
      fn: (u, lt, d, t) => {
        const p = pose({ lean: 0.12, nod: 0.35, turn: 0.35 * Math.sin(lt * 5) * (1 - smooth(u)) });
        breathe(p, t);
        return { pos: [lBack, 0, 0], yaw: FACE_L, pose: p, ik: headHold, ground: TOP };
      },
    },
    { name: 'shuffle', d: 0.7, fn: walkTo({ from: [lBack, 0], to: [sitX - 0.12, 0], yaw: FACE_L, ground: TOP, amp: 0.2, opts: { lean: 0.1, arm: 0.1, nod: 0.3 } }) },
    {
      name: 'sitdown',
      d: 0.7,
      blend: 0.1,
      fn: (u) => {
        const k = easeInOut(u);
        const p = pose({ lean: lerp(0.1, 0.45, k), nod: 0.3, lLeg: lerp(0, PI / 2, k), rLeg: lerp(0, PI / 2, k), lKnee: lerp(0.05, 1.6, k), rKnee: lerp(0.05, 1.6, k), lArm: 0.4 * k, rArm: 0.4 * k });
        const y = lerp(TOP + STAND_HIP, TOP + DIM.limbR * 1.15, k);
        return { pos: [lerp(sitX - 0.12, sitX, k), y, 0], yaw: FACE_L, pose: p };
      },
    },
    {
      name: 'sit',
      d: 4,
      blend: 0.45,
      fn: (u, lt, d, t) => {
        const p = pose({ lean: 0.55, nod: 0.25, lLeg: PI / 2 - 0.05, rLeg: PI / 2 - 0.05, lKnee: PI / 2 + 0.25 * Math.sin(t * 1.9), rKnee: PI / 2 + 0.25 * Math.sin(t * 1.9 + PI) });
        p.spineX += 0.012 * Math.sin(t * 1.6);
        return { pos: [sitX, TOP + DIM.limbR * 1.15, 0], yaw: FACE_L, pose: p, ik: chinInHands };
      },
    },
  ]);

  // Stretch the peek so the flinch starts as the doer hits the water.
  const peek = lTrack.clips.find((c) => c.name === 'peek');
  const peekLen = e1.t + 0.05 - peek.t0;
  const shift = peekLen - peek.d;
  peek.d = peekLen;
  peek.t1 = peek.t0 + peekLen;
  for (const c of lTrack.clips.slice(lTrack.clips.indexOf(peek) + 1)) {
    c.t0 += shift;
    c.t1 += shift;
  }

  // ----------------------------------------------------------------- text --
  world.addLabel('KAFASINDA KURAN', [-1.75, 7.0, 0]);
  world.addLabel('YAPAN', [1.75, 7.0, 0]);
  world.addThought('ya su soğuksa?', L, lTrack.at('peek') + 0.2, e1.t - 0.05);
  world.addThought('ya derinse?', L, lTrack.at('think') + 0.1, lTrack.at('think') + 0.95);
  world.addThought('ya herkes bakıyorsa?', L, lTrack.at('think') + 0.95, lTrack.at('walk2') + 0.3);
  world.addThought('bir... iki...', L, lTrack.at('windup') + 0.05, lTrack.at('freeze') + 0.1);
  world.addThought('ya beceremezsem?', L, lTrack.at('freeze') + 0.1, lTrack.at('despair') + 0.4);
  world.addThought('yarın atlarım.', L, lTrack.at('sit') - 0.1, lTrack.at('sit') + 1.6);
  world.setCaption('Ne kadar beklersen,\nsu o kadar soğuk görünür.', lTrack.at('sit') + 1.5, { top: 470 });

  world.onUpdate((t) => {
    rTrack.apply(t);
    lTrack.apply(t);
    rb.bend(bounce(t, rLoad1, dive1) + bounce(t, rLoad2, flip2));
    R.root.visible = R.root.position.y > -2.5;
  });

  const markers = Object.fromEntries([...rTrack.clips.map((c) => ['R.' + c.name, +c.t0.toFixed(2)]), ...lTrack.clips.map((c) => ['L.' + c.name, +c.t0.toFixed(2)]), ['splash1', +e1.t.toFixed(2)], ['splash2', +e2.t.toFixed(2)]]);
  return { duration: 16.5, sfx, markers };
}
