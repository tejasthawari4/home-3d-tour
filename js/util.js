import * as THREE from 'three';

export const FT = 0.3048;                       // plan data is in feet; the scene is in metres

// plan (x east, y north, z up) in feet -> three.js (x east, y up, z south) in metres
export const P = (x, y, z = 0) => new THREE.Vector3(x * FT, z * FT, -y * FT);

// face = direction the front looks in plan degrees (0 E, 90 N, 180 W, 270 S); assets face +Z (south) at 0
export const faceToRotY = (face) => THREE.MathUtils.degToRad(face + 90);

// Blender-style lens (mm on a 36 mm sensor, horizontal fit) -> three.js vertical FOV
export function vfovFromLens(lens, aspect) {
  const h = 2 * Math.atan(18 / lens);
  return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / aspect));
}

export function ftin(ft) {
  const i = Math.round(ft * 12);
  return `${Math.floor(i / 12)}'-${i % 12}"`;
}

// point-in-polygon for rings [[x, y], ...]; parts = [[outer, hole, hole...], ...]
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function inParts(x, y, parts) {
  return parts.some(([outer, ...holes]) => inRing(x, y, outer) && !holes.some((h) => inRing(x, y, h)));
}
