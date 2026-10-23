import * as THREE from 'three';
import { clamp, lerp } from './math.js';

// Body proportions in metres. A standing figure is about 1.85 tall.
export const DIM = {
  headR: 0.17,
  limbR: 0.047,
  torsoR: 0.05,
  torso: 0.55,
  neck: 0.07,
  upperArm: 0.32,
  foreArm: 0.3,
  thigh: 0.46,
  shin: 0.46,
  foot: 0.13,
  shoulderY: 0.52,
  hipX: 0.055,
};

// Pelvis height above the floor when standing with straight legs.
export const STAND_HIP = DIM.thigh + DIM.shin + DIM.limbR;

export const JOINTS = ['spine', 'neck', 'lSh', 'lEl', 'rSh', 'rEl', 'lHip', 'lKnee', 'lAnk', 'rHip', 'rKnee', 'rAnk'];

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();

// A rigged stick figure. Every part is a capsule hanging off a joint group,
// so poses are plain joint rotations and can be blended by lerping numbers.
export class StickFigure {
  constructor(material) {
    const root = new THREE.Group();
    root.rotation.order = 'YXZ';
    this.root = root;
    this.j = {};

    const capsule = (parent, len, r, y) => {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), material);
      mesh.position.y = y;
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const joint = (name, parent, x, y, z) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      parent.add(g);
      this.j[name] = g;
      return g;
    };

    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(DIM.torsoR * 1.15, 16, 12), material);
    pelvis.castShadow = true;
    root.add(pelvis);

    const spine = joint('spine', root, 0, 0, 0);
    capsule(spine, DIM.torso, DIM.torsoR, DIM.torso / 2);

    const neck = joint('neck', spine, 0, DIM.torso, 0);
    capsule(neck, DIM.neck, DIM.limbR * 0.9, DIM.neck / 2);
    const head = new THREE.Mesh(new THREE.SphereGeometry(DIM.headR, 32, 24), material);
    head.position.y = DIM.neck + DIM.headR * 0.85;
    head.castShadow = true;
    neck.add(head);
    this.head = head;

    for (const [side, sx] of [['l', 1], ['r', -1]]) {
      const sh = joint(side + 'Sh', spine, sx * 0.025, DIM.shoulderY, 0);
      capsule(sh, DIM.upperArm, DIM.limbR, -DIM.upperArm / 2);
      const el = joint(side + 'El', sh, 0, -DIM.upperArm, 0);
      capsule(el, DIM.foreArm, DIM.limbR * 0.95, -DIM.foreArm / 2);

      const hip = joint(side + 'Hip', root, sx * DIM.hipX, 0, 0);
      capsule(hip, DIM.thigh, DIM.limbR * 1.1, -DIM.thigh / 2);
      const knee = joint(side + 'Knee', hip, 0, -DIM.thigh, 0);
      capsule(knee, DIM.shin, DIM.limbR, -DIM.shin / 2);
      const ank = joint(side + 'Ank', knee, 0, -DIM.shin, 0);
      const foot = capsule(ank, DIM.foot, DIM.limbR, 0);
      foot.rotation.x = Math.PI / 2;
      foot.position.z = DIM.foot / 2 - 0.02;
    }
  }

  setAngles(p) {
    for (const name of JOINTS) {
      const g = this.j[name];
      g.rotation.set(p[name + 'X'] || 0, p[name + 'Y'] || 0, p[name + 'Z'] || 0);
    }
  }

  // Turns an authored state into a snapshot of raw joint angles. Authored
  // states may use IK targets and floor contact; snapshots never do, which is
  // what makes them safe to blend.
  resolve(s) {
    const r = this.root;
    r.position.set(s.pos[0], s.pos[1], s.pos[2]);
    r.rotation.set(s.pitch || 0, s.yaw || 0, s.roll || 0);
    this.setAngles(s.pose);

    if (s.ik) {
      for (const limb of ['lHand', 'rHand', 'lFoot', 'rFoot']) {
        if (s.ik[limb]) {
          r.updateMatrixWorld(true);
          this.solve(limb, s.ik[limb]);
        }
      }
    }
    if (s.ground !== undefined) {
      r.updateMatrixWorld(true);
      r.position.y += s.ground - this.lowestFoot();
    }
    if (s.lift) r.position.y += s.lift;
    return this.snapshot();
  }

  toWorld(spec, out) {
    out.set(spec[0], spec[1], spec[2]);
    const space = spec[3] || 'root';
    if (space === 'root') this.root.localToWorld(out);
    else if (space === 'chest') this.j.spine.localToWorld(out);
    else if (space === 'head') this.head.localToWorld(out);
    return out;
  }

  // Puts a prop (tool, object) in a hand. The prop's origin sits in the fist
  // and its -y axis continues along the forearm.
  attach(side, obj) {
    obj.position.set(0, -DIM.foreArm, 0);
    this.j[side + 'El'].add(obj);
    return obj;
  }

  // Analytic two-bone IK. `t.p` is the hand/foot target as [x, y, z, space]
  // or a function (figure, out) => world point; `t.pole` is where the
  // elbow/knee should point, as [x, y, z, space].
  solve(limb, t) {
    const side = limb[0];
    const sx = side === 'l' ? 1 : -1;
    const isLeg = limb.endsWith('Foot');
    const upper = this.j[side + (isLeg ? 'Hip' : 'Sh')];
    const lower = this.j[side + (isLeg ? 'Knee' : 'El')];
    const a = isLeg ? DIM.thigh : DIM.upperArm;
    const b = isLeg ? DIM.shin : DIM.foreArm;
    const pole = t.pole || (isLeg ? [sx * 0.1, -0.45, 1, 'root'] : [sx * 0.3, 0.15, -0.55, 'chest']);

    const T = typeof t.p === 'function' ? t.p(this, _v1) : this.toWorld(t.p, _v1);
    const P = this.toWorld(pole, _v2);
    _m.copy(upper.parent.matrixWorld).invert();
    T.applyMatrix4(_m);
    P.applyMatrix4(_m);

    const S = upper.position;
    const d = T.clone().sub(S);
    const dh = d.clone().normalize();
    const dist = clamp(d.length(), Math.abs(a - b) + 1e-3, a + b - 1e-4);
    const cosA = clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1);
    const sinA = Math.sqrt(1 - cosA * cosA);

    const n = P.clone().sub(S);
    n.addScaledVector(dh, -n.dot(dh));
    if (n.lengthSq() < 1e-8) n.set(0, 0, isLeg ? 1 : -1);
    n.normalize();

    const E = S.clone().addScaledVector(dh, a * cosA).addScaledVector(n, a * sinA);
    const reach = S.clone().addScaledVector(dh, dist);
    const u = E.clone().sub(S).normalize();
    const f = reach.sub(E).normalize();

    const zl = f.clone().addScaledVector(u, -f.dot(u));
    if (zl.lengthSq() < 1e-8) zl.copy(n).negate();
    zl.normalize();
    if (isLeg) zl.negate();
    const yl = u.clone().negate();
    const xl = new THREE.Vector3().crossVectors(yl, zl).normalize();
    zl.crossVectors(xl, yl);

    upper.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xl, yl, zl));
    const bend = Math.acos(clamp(u.dot(f), -1, 1));
    lower.rotation.set(isLeg ? bend : -bend, 0, 0);
    if (isLeg) this.j[side + 'Ank'].rotation.set(-(upper.rotation.x + bend), 0, 0);
  }

  lowestFoot() {
    let min = Infinity;
    for (const side of ['l', 'r']) {
      const ank = this.j[side + 'Ank'];
      for (const z of [-0.03, DIM.foot - 0.02]) {
        const p = ank.localToWorld(_v1.set(0, 0, z));
        min = Math.min(min, p.y);
      }
    }
    return min - DIM.limbR;
  }

  snapshot() {
    const a = new Float64Array(JOINTS.length * 3);
    JOINTS.forEach((name, i) => {
      const r = this.j[name].rotation;
      a[i * 3] = r.x;
      a[i * 3 + 1] = r.y;
      a[i * 3 + 2] = r.z;
    });
    const r = this.root;
    return { pos: r.position.toArray(), rot: [r.rotation.x, r.rotation.y, r.rotation.z], a };
  }

  apply(snap) {
    const r = this.root;
    r.position.fromArray(snap.pos);
    r.rotation.set(snap.rot[0], snap.rot[1], snap.rot[2]);
    JOINTS.forEach((name, i) => {
      this.j[name].rotation.set(snap.a[i * 3], snap.a[i * 3 + 1], snap.a[i * 3 + 2]);
    });
    r.updateMatrixWorld(true);
  }

  headWorld(out = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    return this.head.getWorldPosition(out);
  }

  // World position of a hand (end of forearm).
  handWorld(side, out = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    return this.j[side + 'El'].localToWorld(out.set(0, -DIM.foreArm, 0));
  }
}

export function lerpSnap(A, B, w) {
  const a = new Float64Array(A.a.length);
  for (let i = 0; i < a.length; i++) a[i] = lerp(A.a[i], B.a[i], w);
  return {
    pos: A.pos.map((v, i) => lerp(v, B.pos[i], w)),
    rot: A.rot.map((v, i) => lerp(v, B.rot[i], w)),
    a,
  };
}
