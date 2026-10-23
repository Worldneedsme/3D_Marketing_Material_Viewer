// Profile picture for the account: render as a square still.
//   node render.mjs profil --size 1080x1080 --stills 0
// Two figures in the channel's look: one stuck, one winning, and the
// question the channel keeps asking.
import * as THREE from 'three';
import { StickFigure, STAND_HIP } from '../rig.js';
import { pose } from '../poses.js';

// Bolder limbs so the figures still read at avatar size.
function thicken(fig, k) {
  fig.root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.geometry.type === 'CapsuleGeometry') o.scale.set(k, 1, k);
    else if (o === fig.head) o.scale.setScalar(1.12);
    else o.scale.setScalar(k);
  });
}

export default function build(world) {
  const { scene, mat } = world;
  world.setCamera({ pos: [0, 1.35, 5.3], target: [0, 1.15, 0], fov: 35 });
  world.makeWater({ tint: 0.26, swell: 0.08 });

  const dim = new THREE.MeshStandardMaterial({ color: 0x66666b, roughness: 0.45 });
  const left = new StickFigure(dim);
  const right = new StickFigure(mat.figure);
  thicken(left, 1.35);
  thicken(right, 1.35);
  scene.add(left.root, right.root);

  // Slumped, head down.
  left.apply(left.resolve({ pos: [-0.74, STAND_HIP, 0], yaw: 0.6, pose: pose({ lean: 0.32, nod: 0.75, lArm: 0.1, rArm: 0.1, lOut: 0.05, rOut: 0.05, lEl: 0.15, rEl: 0.15, lKnee: 0.12, rKnee: 0.12 }), ground: 0 }));
  // Arms up, chest out.
  right.apply(right.resolve({ pos: [0.74, STAND_HIP, 0], yaw: -0.35, pose: pose({ lean: -0.12, nod: -0.3, lArm: 2.55, rArm: 2.55, lOut: 0.85, rOut: 0.85, lEl: 0.2, rEl: 0.2, lLeg: 0.15, rLeg: -0.1 }), ground: 0 }));

  const mark = world.addLabel('?', [0, 1.4, 0]);
  Object.assign(mark.el.style, { fontSize: '250px', letterSpacing: '0', color: '#e0402f', textShadow: '0 0 40px rgba(224, 64, 47, 0.45)' });

  return { duration: 1, sfx: [] };
}
