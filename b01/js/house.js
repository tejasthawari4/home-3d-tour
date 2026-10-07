// The architectural shell, straight from plan.py via web/data/house.json (same meshes as the Blender model).
import * as THREE from 'three';
import { FT } from './util.js';

// World-space box mapping in metres: each triangle projects onto the plane its normal faces.
function boxUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array((p.count * 2));
  for (let i = 0; i < p.count; i += 3) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    for (let k = i; k < i + 3; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      let u, v;
      if (ay >= ax && ay >= az) { u = x; v = -z; } else if (ax >= az) { u = -z; v = y; } else { u = x; v = y; }
      uv[k * 2] = u; uv[k * 2 + 1] = v;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function buildHouse(data, M) {
  const root = new THREE.Group();
  root.name = 'house';
  const colls = {};
  for (const m of data.meshes) {
    const pos = [];
    for (const f of m.faces) {
      for (let t = 1; t < f.length - 1; t++) {
        for (const i of [f[0], f[t], f[t + 1]]) {
          const v = m.verts[i];
          pos.push(v[0] * FT, v[2] * FT, -v[1] * FT);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    boxUV(geo);
    const mesh = new THREE.Mesh(geo, M.arch(m.mat));
    mesh.name = `${m.coll}__${m.mat}`;
    mesh.castShadow = !m.mat.startsWith('glass');
    mesh.receiveShadow = true;
    mesh.userData = { coll: m.coll, mat: m.mat };
    (colls[m.coll] ??= Object.assign(new THREE.Group(), { name: m.coll })).add(mesh);
  }
  Object.values(colls).forEach((g) => root.add(g));
  return { root, colls };
}
