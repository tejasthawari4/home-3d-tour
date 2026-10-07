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

// Returns the (empty) floor groups at once; procedural props are placed now and each GLB kind streams in as it
// loads, so the house is usable before the furniture arrives. `ready` resolves when everything is placed.
// opts: dir = model folder (full or lite), skip = RegExp of GLB kinds to leave out (small decor on low-end devices).
export function furnish(data, M, onProgress = () => {}, { dir = 'assets/models/', skip = null } = {}) {
  const items = data.items.filter((i) => !(skip && i.kind.startsWith('glb:') && skip.test(i.kind)));
  const kinds = [...new Set(items.filter((i) => i.kind.startsWith('glb:')).map((i) => i.kind.slice(4)))];
  let done = 0;
  const root = new THREE.Group();
  root.name = 'furniture';
  const floors = {};                                   // furn_GF / furn_FF / furn_ROOF, so views can hide floors
  for (const f of Object.keys(data.meta.level)) root.add(floors[f] = Object.assign(new THREE.Group(), { name: `furn_${f}` }));
  const byId = {};
  // Decorative/task lights: every item with lamp = [dx, dy, dz] (ft, in the item's own frame) gets a warm
  // 2700 K point light there. Off by day; app.js switches them on at dusk. No shadows (1 GB VRAM budget).
  const lamps = [];
  let ready = Promise.all(kinds.map(async (k) => {
    const g = await loader.loadAsync(`${dir}${k}.glb`);
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
    items.filter((it) => it.kind === `glb:${k}`).forEach((it) => place(it, g.scene));
    onProgress(++done / kinds.length);
  }));

  function place(it, model, gymBuild) {
    let obj;
    if (gymBuild) {
      obj = gymBuild(it.kind.slice(4), it, THREE, M);
      if (!obj) return;
      obj.scale.multiplyScalar(FT);                      // gym props are authored in feet
    } else if (model) {
      obj = model.clone(true);
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
    wrap.position.copy(P(it.x, it.y, data.meta.level[it.floor || 'TF'] + it.z));
    wrap.rotation.y = faceToRotY(it.face);
    wrap.userData.item = it;
    if (it.lamp) {
      const l = new THREE.PointLight(0xffc98a, 0, (it.lampReach || 12) * FT, 2);
      l.position.set(it.lamp[0] * FT, it.lamp[1] * FT, it.lamp[2] * FT);
      l.userData.on = it.lampCd || 25;             // candela when lit
      wrap.add(l);
      lamps.push(l);
    }
    floors[it.floor || 'TF'].add(wrap);
    byId[it.id] = wrap;
  }
  items.filter((it) => !it.kind.startsWith('glb:') && !it.kind.startsWith('gym:')).forEach((it) => place(it));
  const gymItems = items.filter((it) => it.kind.startsWith('gym:'));
  if (gymItems.length) {                              // gym equipment: lazy, skipped if the module is missing
    ready = ready.then(() => import('./gym_props.js')).then((m) => gymItems.forEach((it) => place(it, null, m.buildGymProp)))
      .catch((e) => console.warn('gym props unavailable', e));
  }
  return { root, byId, lamps, ready };
}
