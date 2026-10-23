import * as THREE from 'three';

function box(mat, w, h, d, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// A bar between two points.
function strut(mat, a, b, t, parent) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.BoxGeometry(t, len, t), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Steel diving tower: four legs with X bracing, a deck, a railing cage on the
// outer side and an optional ladder on the front face. `side` is +1 for a
// tower on the right (board points left), -1 for one on the left.
export function makeTower({ mat, cx, side, topY = 4, bottomY = -1.8, hw = 0.55, hd = 0.55, ladder = false }) {
  const g = new THREE.Group();
  const leg = 0.075;
  for (const x of [cx - hw, cx + hw]) {
    for (const z of [-hd, hd]) box(mat, leg, topY - bottomY, leg, x, (topY + bottomY) / 2, z, g);
  }

  const levels = [];
  for (let y = topY - 0.12; y > bottomY; y -= 1.15) levels.push(y);
  const faces = [
    // [from, to] corner pairs per face
    [[cx - hw, hd], [cx + hw, hd]],
    [[cx - hw, -hd], [cx + hw, -hd]],
    [[cx - hw, -hd], [cx - hw, hd]],
    [[cx + hw, -hd], [cx + hw, hd]],
  ];
  for (const [p, q] of faces) {
    levels.forEach((y, i) => {
      strut(mat, [p[0], y, p[1]], [q[0], y, q[1]], 0.05, g);
      const y2 = levels[i + 1];
      if (y2 === undefined) return;
      strut(mat, [p[0], y, p[1]], [q[0], y2, q[1]], 0.035, g);
      strut(mat, [q[0], y, q[1]], [p[0], y2, p[1]], 0.035, g);
    });
  }

  box(mat, hw * 2 + 0.22, 0.09, hd * 2 + 0.22, cx, topY - 0.045, 0, g);

  // Railing cage on the outer half.
  const ox = cx + side * (hw + 0.08);
  const railTop = topY + 1.0;
  const ix = cx - side * 0.05;
  strut(mat, [ox, railTop, -hd - 0.08], [ox, railTop, hd + 0.08], 0.04, g);
  strut(mat, [ox, topY + 0.5, -hd - 0.08], [ox, topY + 0.5, hd + 0.08], 0.03, g);
  for (let z = -hd - 0.08; z <= hd + 0.081; z += 0.138) strut(mat, [ox, topY, z], [ox, railTop, z], 0.022, g);
  for (const z of [-hd - 0.08, hd + 0.08]) {
    if (ladder && z > 0) continue;
    strut(mat, [ox, railTop, z], [ix, railTop, z], 0.04, g);
    strut(mat, [ox, topY + 0.5, z], [ix, topY + 0.5, z], 0.03, g);
    strut(mat, [ix, topY, z], [ix, railTop, z], 0.035, g);
    for (let x = ox; side * (x - ix) > 0.05; x -= side * 0.138) strut(mat, [x, topY, z], [x, railTop, z], 0.022, g);
  }

  let ladderInfo = null;
  if (ladder) {
    const lz = hd + 0.14;
    const half = 0.24;
    for (const x of [cx - half, cx + half]) {
      box(mat, 0.045, topY + 1.0 - bottomY, 0.045, x, (topY + 1.0 + bottomY) / 2, lz, g);
      strut(mat, [x, topY + 1.0, lz], [x, topY + 1.0, hd - 0.1], 0.045, g);
    }
    const rungs = [];
    for (let y = bottomY + 0.3; y < topY - 0.05; y += 0.3) {
      box(mat, half * 2, 0.035, 0.035, cx, y, lz, g);
      rungs.push(y);
    }
    ladderInfo = { x: cx, z: lz, half, rungs, step: 0.3 };
  }
  return { group: g, ladder: ladderInfo, topY, cx, hw, hd };
}

// Springboard hinged at the deck edge. Rotate `pivot` to bounce it.
export function makeBoard({ mat, tipMat, edgeX, side, topY = 4, length = 1.45 }) {
  const pivot = new THREE.Group();
  pivot.position.set(edgeX, topY, 0);
  const dir = -side;
  const t = 0.07;
  const plank = box(mat, length - 0.13, t, 0.42, (dir * (length - 0.13)) / 2, -t / 2, 0, pivot);
  plank.receiveShadow = true;
  box(tipMat, 0.13, t + 0.005, 0.425, dir * (length - 0.065), -t / 2, 0, pivot);
  const tipX = edgeX + dir * length;
  // Height of the board's top surface at world x, following the bounce.
  const topAt = (x) => topY + Math.tan(pivot.rotation.z) * (x - edgeX);
  // Positive amount pushes the tip down.
  const bend = (amount) => {
    pivot.rotation.z = side * amount;
  };
  return { group: pivot, tipX, edgeX, topAt, bend };
}
