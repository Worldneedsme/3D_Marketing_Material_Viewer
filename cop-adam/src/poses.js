import { DIM } from './rig.js';

// Builds raw joint angles from readable names. Arm/leg raises are positive
// forward, bends are positive in the natural direction, and `lOut`/`rOut`
// spread a limb away from the body. The character faces +z, its left is +x.
export function pose(p = {}) {
  const r = {
    spineX: p.lean ?? 0.03,
    spineY: p.twist ?? 0,
    spineZ: p.side ?? 0,
    neckX: p.nod ?? 0.05,
    neckY: p.turn ?? 0,
    neckZ: p.tilt ?? 0,
    lShX: -(p.lArm ?? 0.04),
    lShY: p.lArmTw ?? 0,
    lShZ: p.lOut ?? 0.13,
    lElX: -(p.lEl ?? 0.18),
    rShX: -(p.rArm ?? 0.04),
    rShY: -(p.rArmTw ?? 0),
    rShZ: -(p.rOut ?? 0.13),
    rElX: -(p.rEl ?? 0.18),
    lHipX: -(p.lLeg ?? 0),
    lHipZ: p.lLegOut ?? 0.03,
    lKneeX: p.lKnee ?? 0.03,
    rHipX: -(p.rLeg ?? 0),
    rHipZ: -(p.rLegOut ?? 0.03),
    rKneeX: p.rKnee ?? 0.03,
  };
  // Keep feet level unless told otherwise.
  r.lAnkX = p.lAnk ?? -(r.lHipX + r.lKneeX);
  r.rAnkX = p.rAnk ?? -(r.rHipX + r.rKneeX);
  return r;
}

export const STAND = pose();

// Distance covered by one full walk cycle (two steps) at a given leg swing.
export const strideOf = (amp) => 4 * (DIM.thigh + DIM.shin) * Math.sin(amp) * 0.92;

export function walk(phase, o = {}) {
  const { amp = 0.34, knee = 0.75, arm = 0.32, lean = 0.06, el = 0.25, ...rest } = o;
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  return pose({
    lean,
    nod: 0.05,
    lLeg: amp * s,
    rLeg: -amp * s,
    lKnee: 0.06 + knee * Math.max(0, c) ** 1.3,
    rKnee: 0.06 + knee * Math.max(0, -c) ** 1.3,
    lArm: -arm * s,
    rArm: arm * s,
    lEl: el + Math.max(0, -s) * 0.15,
    rEl: el + Math.max(0, s) * 0.15,
    ...rest,
  });
}

export function run(phase, o = {}) {
  const { amp = 0.62, lean = 0.26, arm = 0.85, ...rest } = o;
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  return pose({
    lean,
    nod: -0.08,
    lLeg: amp * s + 0.18,
    rLeg: -amp * s + 0.18,
    lKnee: 0.25 + 1.5 * Math.max(0, c) ** 1.1,
    rKnee: 0.25 + 1.5 * Math.max(0, -c) ** 1.1,
    lArm: -arm * s + 0.15,
    rArm: arm * s + 0.15,
    lEl: 1.5,
    rEl: 1.5,
    ...rest,
  });
}

// Arms straight overhead, body straight: diving line.
export const DIVE = pose({ lean: 0, nod: -0.1, lArm: 3.05, rArm: 3.05, lOut: 0.08, rOut: 0.08, lEl: 0.05, rEl: 0.05, lLeg: 0, rLeg: 0, lKnee: 0, rKnee: 0, lAnk: 0.9, rAnk: 0.9 });

// Tight tuck for a somersault.
export const TUCK = pose({ lean: 0.55, nod: 0.5, lArm: 1.1, rArm: 1.1, lEl: 1.9, rEl: 1.9, lOut: 0.25, rOut: 0.25, lLeg: 2.2, rLeg: 2.2, lKnee: 2.5, rKnee: 2.5 });

// Knees bent, arms swung back: loading up for a jump.
export const CROUCH = pose({ lean: 0.55, nod: -0.15, lArm: -0.85, rArm: -0.85, lEl: 0.15, rEl: 0.15, lLeg: 0.75, rLeg: 0.75, lKnee: 1.35, rKnee: 1.35 });

