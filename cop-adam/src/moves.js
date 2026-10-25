import * as THREE from 'three';
import { pose, walk, run, strideOf } from './poses.js';
import { STAND_HIP } from './rig.js';
import { lerp, noise1, smooth, PI } from './math.js';

const groundAt = (ground, x) => (typeof ground === 'function' ? ground(x) : ground);

// Breathing, weight shifts: keeps a standing figure from looking frozen.
export function breathe(p, t, k = 1) {
  p.spineX += 0.015 * k * Math.sin(t * 2.1);
  p.neckX += 0.02 * k * noise1(t * 0.6, 3);
  p.neckY += 0.05 * k * noise1(t * 0.35, 5);
  p.lShX += 0.02 * k * Math.sin(t * 2.1 + 0.4);
  p.rShX += 0.02 * k * Math.sin(t * 2.1 + 0.9);
  return p;
}

// Nervous shaking.
export function tremble(p, t, a = 0.03) {
  p.spineX += a * noise1(t * 22, 1);
  p.spineZ += a * 0.6 * noise1(t * 19, 2);
  p.neckX += a * noise1(t * 25, 4);
  p.lShX += a * 1.5 * noise1(t * 21, 6);
  p.rShX += a * 1.5 * noise1(t * 23, 7);
  p.lKneeX += a * noise1(t * 18, 8);
  p.rKneeX += a * noise1(t * 17, 9);
  return p;
}

export function stand({ x, z = 0, yaw, ground, pose: p = {}, ik, breath = 1, shake = 0 }) {
  return (u, lt, d, t) => {
    const raw = pose(p);
    if (breath) breathe(raw, t, breath);
    if (shake) tremble(raw, t, shake);
    return { pos: [x, groundAt(ground, x) + STAND_HIP, z], yaw, pose: raw, ik, ground: groundAt(ground, x) };
  };
}

// Walks in a straight line. Leg phase follows distance, so feet don't skate.
export function walkTo({ from, to, yaw, ground, amp = 0.32, ease = (u) => u, backwards = false, opts = {}, mover = walk }) {
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const stride = strideOf(amp);
  return (u) => {
    const e = ease(u);
    const x = lerp(from[0], to[0], e);
    const z = lerp(from[1], to[1], e);
    const phase = ((e * dist) / stride) * 2 * PI * (backwards ? -1 : 1);
    const raw = mover(phase, { amp, ...opts });
    const g = groundAt(ground, x);
    const lift = mover === run ? 0.07 * Math.abs(Math.sin(phase)) : 0;
    return { pos: [x, g + STAND_HIP, z], yaw: typeof yaw === 'function' ? yaw(u) : yaw, pose: raw, ground: g, lift };
  };
}

export function runTo(o) {
  return walkTo({ amp: 0.62, mover: run, ...o });
}

// Ballistic flight. `p0` is the pelvis at take-off, `v` the launch velocity,
// `pitch(lt)` the somersault angle and `poseAt(lt)` the body shape.
export function fly({ p0, v, yaw, pitch, poseAt }) {
  return (u, lt) => ({
    pos: [p0[0] + v[0] * lt, p0[1] + v[1] * lt - 4.9 * lt * lt, p0[2] + (v[2] || 0) * lt],
    yaw,
    pitch: pitch(lt),
    pose: poseAt(lt),
  });
}

// IK target that travels through key points: keys are [[time, [x, y, z, space]], ...]
// with space 'root', 'chest', 'head' or 'world'. `c` is the clip-local time;
// `wobble(out)` can nudge the result (e.g. scribbling).
const _a = new THREE.Vector3();
export function along(keys, c, wobble) {
  return (fig, out) => {
    let i = keys.findIndex(([kt]) => c <= kt);
    if (i < 0) fig.toWorld(keys[keys.length - 1][1], out);
    else if (i === 0) fig.toWorld(keys[0][1], out);
    else {
      const [t0, a] = keys[i - 1];
      const [t1, b] = keys[i];
      fig.toWorld(a, _a);
      fig.toWorld(b, out);
      out.lerp(_a, 1 - smooth((c - t0) / (t1 - t0)));
    }
    if (wobble) wobble(out);
    return out;
  };
}
