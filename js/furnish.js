// Places the checked furniture layout (web/data/house.json .items) in the scene.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { P, FT, faceToRotY } from './util.js';
import { buildProp, urliFlowers } from './props.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

// meshopt-compressed models arrive with quantized (normalized int) attributes. The path tracer merges all
// geometry into one buffer and silently drops meshes whose attribute types differ, so expand to Float32.
function dequantize(geo) {
  for (const [name, attr] of Object.entries(geo.attributes)) {
    if (attr.array instanceof Float32Array && !attr.normalized && !attr.isInterleavedBufferAttribute) continue;
    const out = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++) {
      for (let c = 0; c < attr.itemSize; c++) out[i * attr.itemSize + c] = attr.getComponent(i, c);
    }
    geo.setAttribute(name, new THREE.BufferAttribute(out, attr.itemSize, false));
  }
}

export async function furnish(data, M, onProgress = () => {}) {
  const kinds = [...new Set(data.items.filter((i) => i.kind.startsWith('glb:')).map((i) => i.kind.slice(4)))];
  const models = {};
  let done = 0;
  await Promise.all(kinds.map(async (k) => {
    const g = await loader.loadAsync(`assets/models/${k}.glb`);
    g.scene.traverse((o) => {
      if (o.isMesh) {
        dequantize(o.geometry);
        o.castShadow = o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (m.map) m.map.anisotropy = 8;
          // spec-gloss conversions leave specularColor black; the path tracer takes that literally (black wood)
          if (m.specularColor && m.specularColor.getHex() === 0) m.specularColor.setRGB(1, 1, 1);
        });
      }
    });
    models[k] = g.scene;
    onProgress(++done / kinds.length);
  }));

  const root = new THREE.Group();
  root.name = 'furniture';
  const floors = {};                                   // furn_GF / furn_FF / furn_ROOF, so views can hide floors
  for (const f of ['GF', 'FF', 'ROOF']) root.add(floors[f] = Object.assign(new THREE.Group(), { name: `furn_${f}` }));
  const byId = {};
  // Decorative/task lights: every item with lamp = [dx, dy, dz] (ft, in the item's own frame) gets a warm
  // 2700 K point light there. Off by day; app.js switches them on at dusk. No shadows (1 GB VRAM budget).
  const lamps = [];
  for (const it of data.items) {
    let obj;
    if (it.kind.startsWith('glb:')) {
      obj = models[it.kind.slice(4)].clone(true);
      const s = Array.isArray(it.s) ? it.s : [it.s, it.s, it.s];
      obj.scale.set(s[0], s[1], s[2]);
      obj.traverse((o) => {
        if (!o.isMesh) return;
        if (it.kind === 'glb:curtain_sheer') { o.material = M.sheer; o.castShadow = false; return; }
        if (it.fabric) { o.material = M[it.fabric]; return; }            // re-upholster the whole piece
        if (it.recolor) {
          for (const [key, mat] of Object.entries(it.recolor)) {
            if ((o.material.name || '').toLowerCase().includes(key)) o.material = M[mat];
          }
        }
      });
      if (it.flowers) obj.add(urliFlowers(M, 1.6 * FT / s[0]));
    } else {
      obj = buildProp(it, M);
    }
    const wrap = new THREE.Group();
    wrap.name = it.id;
    wrap.add(obj);
    wrap.position.copy(P(it.x, it.y, data.meta.level[it.floor || 'FF'] + it.z));
    wrap.rotation.y = faceToRotY(it.face);
    wrap.userData.item = it;
    if (it.lamp) {
      const l = new THREE.PointLight(0xffc98a, 0, (it.lampReach || 12) * FT, 2);
      l.position.set(it.lamp[0] * FT, it.lamp[1] * FT, it.lamp[2] * FT);
      l.userData.on = it.lampCd || 25;             // candela when lit
      wrap.add(l);
      lamps.push(l);
    }
    floors[it.floor || 'FF'].add(wrap);
    byId[it.id] = wrap;
  }
  return { root, byId, lamps };
}
