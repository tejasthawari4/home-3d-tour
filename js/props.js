// Procedural furniture and fittings. Each builder returns a Group in the item's local frame:
// metres, origin at the footprint centre on the base, width along X, front facing +Z, height up Y.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FT } from './util.js';
import guest from './props/guest.js';
import core from './props/core.js';
import site from './props/site.js';
import shops from './props/shops.js';
import roof from './props/roof.js';

function box(w, h, d, mat, x = 0, y = 0, z = 0, r = 0) {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// World plan coordinate (ft) along an item's width -> its local X in metres. faceToRotY turns local +X to
// +x (face 270), -x (face 90), +y (face 0) or -y (face 180); ignoring this mirrors features about the centre.
function localX(it, v) {
  const f = ((Math.round(it.face) % 360) + 360) % 360;
  const [c, sgn] = { 270: [it.x, 1], 90: [it.x, -1], 0: [it.y, 1], 180: [it.y, -1] }[f];
  return (v - c) * sgn * FT;
}

const B = {
  rug(it, M) {
    const w = it.w * FT, d = it.d * FT, t = 0.012, b = 0.1;
    const g = new THREE.Group();
    g.add(box(w, t, d, M.wool_border, 0, 0, 0, 0.004));
    g.add(box(w - 2 * b, t + 0.002, d - 2 * b, M.wool, 0, 0, 0, 0.004));
    g.traverse((o) => { o.castShadow = false; });
    return g;
  },

  fluted_panel(it, M) {                 // walnut slats on a backing board, proud of the wall by d
    const w = it.w * FT, h = it.h * FT, d = it.d * FT, pitch = 0.06, sw = 0.038;
    const back = new THREE.BoxGeometry(w, h, d * 0.3).translate(0, h / 2, -d * 0.35);
    const n = Math.floor(w / pitch), parts = [back];
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n);
      parts.push(new RoundedBoxGeometry(sw, h, d * 0.7, 2, 0.012).translate(x, h / 2, d * 0.15));
    }
    const mesh = new THREE.Mesh(mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p))), M.walnut);
    mesh.castShadow = mesh.receiveShadow = true;
    return new THREE.Group().add(mesh);
  },

  tv(it, M) {
    const w = it.w * FT, h = it.h * FT, d = it.d * FT;
    const g = new THREE.Group();
    g.add(box(w, h, d * 0.8, M.black_metal, 0, 0, -d * 0.1, 0.004));
    const screen = box(w - 0.012, h - 0.012, 0.002, M.screen, 0, 0.006, d * 0.31);
    g.add(screen);
    return g;
  },

  ac_split(it, M) {                     // 1.5 t split indoor unit: rounded body, air slot, display
    const w = it.w * FT, h = it.h * FT, d = it.d * FT;
    const g = new THREE.Group();
    g.add(box(w, h, d, M.white_plastic, 0, 0, 0, 0.03));
    g.add(box(w * 0.86, 0.035, 0.02, M.black_metal, 0, h * 0.14, d / 2 - 0.004));
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.018),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0x6fd3ff, emissiveIntensity: 0.6 }));
    disp.position.set(w * 0.34, h * 0.55, d / 2 + 0.0015);
    g.add(disp);
    return g;
  },

  cove(it, M) {                         // gypsum bands around the room + LED strip on the inner lip
    const g = new THREE.Group(), drop = it.h * FT, led = 0.02;
    for (const [x0, y0, x1, y1] of it.bands) {
      const w = (x1 - x0) * FT, d = (y1 - y0) * FT;
      const cx = ((x0 + x1) / 2 - it.x) * FT, cz = -((y0 + y1) / 2 - it.y) * FT;
      g.add(box(w, drop, d, M.gypsum, cx, 0, cz));
      // inner lip = the long edge nearer the room centre; the strip sits on top of it and washes the ceiling
      if (w >= d) {
        const ez = Math.abs(cz - d / 2) < Math.abs(cz + d / 2) ? cz - d / 2 : cz + d / 2;
        g.add(box(w, led, led, M.led, cx, drop, ez));
      } else {
        const ex = Math.abs(cx - w / 2) < Math.abs(cx + w / 2) ? cx - w / 2 : cx + w / 2;
        g.add(box(led, led, d, M.led, ex, drop, cz));
      }
    }
    g.traverse((o) => { o.castShadow = false; });
    return g;
  },

  roman_blind(it, M) {
    const w = it.w * FT, h = it.h * FT, folds = 5, fh = h / folds;
    const g = new THREE.Group();
    for (let i = 0; i < folds; i++) {
      const bulge = i === 0 ? 0.03 : 0.022;
      g.add(box(w, fh * 1.02, bulge, M.linen, 0, i * fh, 0, 0.01));
    }
    return g;
  },

  curtain_rod(it, M) {
    const w = it.w * FT, g = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w, 16), M.black_metal);
    rod.rotation.z = Math.PI / 2;
    rod.position.y = 0.015;
    g.add(rod);
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), M.brass);
      f.position.set((s * w) / 2, 0.015, 0);
      g.add(f);
    }
    return g;
  },

  banquette(it, M) {                    // built-in: walnut plinth, linen seat (top 1'-8"), upholstered back
    const w = it.w * FT, d = it.d * FT, back = (it.back ?? 1.64) * FT;
    const g = new THREE.Group();
    g.add(box(w, 0.08, d - 0.06, M.black_metal, 0, 0, 0.0));
    g.add(box(w, 0.33, d, M.walnut, 0, 0.08, 0, 0.006));
    g.add(box(w - 0.02, 0.1, d - 0.03, M.linen, 0, 0.41, 0.01, 0.035));
    g.add(box(w - 0.02, back, 0.13, M.linen, 0, 0.5, -d / 2 + 0.08, 0.05));
    return g;
  },

  dining_table(it, M) {                 // marble top on two black steel slab legs
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, top = 0.03;
    const g = new THREE.Group();
    g.add(box(w, top, d, M.marble, 0, h - top, 0, 0.006));
    for (const s of [-1, 1]) g.add(box(0.05, h - top, d * 0.62, M.black_metal, (s * w) / 2 * 0.72, 0, 0));
    g.add(box(w * 0.72, 0.04, 0.05, M.black_metal, 0, h - top - 0.1, 0));
    return g;
  },

  desk(it, M) {                          // walnut top, slim black metal legs
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, top = 0.035;
    const g = new THREE.Group();
    g.add(box(w, top, d, M.walnut, 0, h - top, 0, 0.006));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(box(0.04, h - top, 0.04, M.black_metal, (sx * w) / 2 * 0.92, 0, (sz * d) / 2 * 0.85));
    }
    return g;
  },

  plinth(it, M) {
    return new THREE.Group().add(box(it.w * FT, it.h * FT, it.d * FT, M[it.material] || M.marble, 0, 0, 0, 0.004));
  },

  // Slim wall mandir (floor to 7'-6", 1'-0" deep): teak drawer base + marble top, backlit onyx back panel,
  // CNC teak jaali sides and canopy fascia (LED-backed), floating teak deity shelf at it.shelf ft, two brass
  // bells from the canopy, LED strips under the canopy and the shelf. Glow follows the dusk lamp switch.
  mandir_modern(it, M) {
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, t = 0.06 * FT * 1.5;
    const baseH = (it.base ?? 2.5) * FT, shelfY = (it.shelf ?? 3.5) * FT, canY = h - 1.0 * FT;
    const g = new THREE.Group();
    // onyx: marble veining that glows warm at dusk, tied to the lamp-shade switch (app.js sets M.shade)
    const onyx = M.marble.clone();
    onyx.color.setHex(0xf3dfc0);
    onyx.emissive.setHex(0xffb468);
    onyx.map = M.marble.map.clone();                  // zoom into one slab of the tiled marble texture
    onyx.map.repeat.set(0.3, 0.55);
    onyx.map.needsUpdate = true;
    onyx.emissiveMap = onyx.map;
    onyx.normalMap = onyx.roughnessMap = null;
    onyx.roughness = 0.15;
    Object.defineProperty(onyx, 'emissiveIntensity', { get: () => M.shade.emissiveIntensity * 1.6, set() {} });
    // drawer base: recessed black kick, teak carcass, two drawers with brass pulls, marble top
    g.add(box(w - 0.04, 0.08, d - 0.06, M.black_metal, 0, 0, -0.02));
    g.add(box(w, baseH - 0.08 - 0.025, d, M.teak, 0, 0.08, 0, 0.006));
    const dh = (baseH - 0.08 - 0.025 - 0.012) / 2;
    for (let i = 0; i < 2; i++) {
      const y = 0.08 + 0.004 + i * (dh + 0.004);
      g.add(box(w - 0.012, dh - 0.004, 0.018, M.teak, 0, y, d / 2 - 0.004, 0.004));
      g.add(box(w * 0.4, 0.01, 0.008, M.brass, 0, y + dh - 0.05, d / 2 + 0.008));
    }
    g.add(box(w + 0.01, 0.025, d + 0.01, M.marble, 0, baseH - 0.025, 0, 0.004));
    // backlit onyx back panel between the base and the canopy
    g.add(box(w - 2 * t, canY - baseH, 0.02, onyx, 0, baseH, -d / 2 + 0.03));
    g.add(box(w, canY - baseH, 0.02, M.teak, 0, baseH, -d / 2 + 0.01));
    // CNC jaali: teak lattice (square grid + diamond at every node) merged into one mesh
    const jaali = (pw, ph) => {
      const bar = 0.012, n = Math.max(3, Math.round(pw / 0.07)), m = Math.max(3, Math.round(ph / 0.07));
      const parts = [];
      for (let i = 0; i <= n; i++) parts.push(new THREE.BoxGeometry(bar, ph, t).translate(-pw / 2 + (i * pw) / n, ph / 2, 0));
      for (let j = 0; j <= m; j++) parts.push(new THREE.BoxGeometry(pw, bar, t).translate(0, (j * ph) / m, 0));
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        parts.push(new THREE.BoxGeometry(0.022, 0.022, t).rotateZ(Math.PI / 4)
          .translate(-pw / 2 + ((i + 0.5) * pw) / n, ((j + 0.5) * ph) / m, 0));
      }
      const mesh = new THREE.Mesh(mergeGeometries(parts.map((p) => p.toNonIndexed())), M.teak);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    for (const s of [-1, 1]) {                         // side panels: solid teak stile at the front + jaali
      const side = jaali(d - 0.04, canY - baseH);
      side.rotation.y = Math.PI / 2;
      side.position.set((s * (w - t)) / 2, baseH, -0.02);
      g.add(side);
      g.add(box(t, canY - baseH, 0.04, M.teak, (s * (w - t)) / 2, baseH, d / 2 - 0.02));
    }
    // canopy: teak box, jaali fascia with an LED panel behind it, LED strip on the underside front edge
    g.add(box(w, h - canY, d - 0.06, M.teak, 0, canY, -0.03, 0.006));
    const fascia = jaali(w - 0.06, h - canY - 0.06);
    fascia.position.set(0, canY + 0.03, d / 2 - t / 2);
    g.add(fascia);
    g.add(box(w - 0.06, h - canY - 0.06, 0.004, M.led, 0, canY + 0.03, d / 2 - t - 0.004));
    g.add(box(w - 2 * t - 0.02, 0.012, 0.012, M.led, 0, canY - 0.012, d / 2 - 0.06));
    // floating teak shelf for the deity, LED strip under its front edge
    const sd = d - 0.06;
    g.add(box(w - 2 * t, 0.04, sd, M.teak, 0, shelfY - 0.04, -d / 2 + 0.04 + sd / 2 - 0.02, 0.004));
    g.add(box(w - 2 * t - 0.04, 0.01, 0.01, M.led, 0, shelfY - 0.05, d / 2 - 0.05));
    // brass bells on chains from the canopy
    for (const s of [-1, 1]) {
      const x = s * (w / 2 - t - 0.09), len = 0.16;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, len, 6), M.brass);
      chain.position.set(x, canY - len / 2, d / 2 - 0.12);
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.04, 0.07, 20, 1, true), M.brass);
      bell.position.set(x, canY - len - 0.035, d / 2 - 0.12);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 8), M.brass);
      top.position.set(x, canY - len, d / 2 - 0.12);
      g.add(chain, bell, top);
    }
    return g;
  },

  // Single bed (3'-0" x 6'-6" mattress): walnut platform on a recessed kick, low channel-tufted oat
  // headboard at the back (-Z), white sheet, oat duvet, rust throw at the foot, one pillow.
  bed_single(it, M) {
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, hb = 0.25 * FT;
    const bd = d - hb, bz = -d / 2 + hb + bd / 2;          // platform depth / centre in front of the headboard
    const g = new THREE.Group();
    g.add(box(w - 0.1, 0.09, bd - 0.1, M.black_metal, 0, 0, bz));
    g.add(box(w, 0.2, bd, M.walnut, 0, 0.09, bz, 0.008));
    const mt = 0.29 + 0.2;                                  // mattress top ~1'-7"
    const sheet = M.white_plastic.clone();
    sheet.roughness = 0.9;
    g.add(box(w - 0.04, 0.2, bd - 0.03, sheet, 0, 0.29, bz, 0.05));
    const duv = bd * 0.66;
    g.add(box(w, 0.05, duv, M.oat, 0, mt - 0.02, d / 2 - duv / 2, 0.02));
    g.add(box(w + 0.01, 0.06, 0.45, M.velvet_rust, 0, mt - 0.015, d / 2 - 0.35, 0.02));
    g.add(box(w * 0.7, 0.11, 0.4, M.linen, 0, mt, -d / 2 + hb + 0.3, 0.05));
    // headboard: walnut back board + oat channels
    const n = 6, cw = w / n;
    g.add(box(w, h, hb * 0.4, M.walnut, 0, 0, -d / 2 + hb * 0.2));
    for (let i = 0; i < n; i++) {
      g.add(box(cw - 0.008, h - 0.06, hb * 0.6, M.oat, -w / 2 + cw / 2 + i * cw, 0.03, -d / 2 + hb * 0.7, 0.03));
    }
    return g;
  },

  wardrobe(it, M) {                      // handle-less walnut shutters, shadow-gap joints, brass pull strips
    // optional: loft = ft of loft shutters at the top; slide = sliding shutters (~3 ft, on two tracks); finish = 'oak'
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, loft = (it.loft || 0) * FT;
    const n = Math.max(2, Math.round(w / ((it.slide ? 3 : 2) * FT))), hb = h - loft;
    const g = new THREE.Group(), S = it.finish === 'oak' ? (M._paleOak ||= new THREE.MeshStandardMaterial({ color: 0xdcc8a8, roughness: 0.55 })) : M.walnut;
    g.add(box(w, h, d, S, 0, 0, 0, 0.006));
    const sw = (w - 0.008 * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + sw / 2 + i * (sw + 0.008), z = it.slide && i % 2 ? -0.022 : 0;
      g.add(box(sw - 0.004 + (it.slide ? 0.02 : 0), hb - 0.03, 0.018, S, x, 0.015, d / 2 - 0.005 + z, 0.004));
      const pl = hb > 1.2 ? hb - 0.5 : hb * 0.4;           // short cabinets get a short, centred pull
      g.add(box(0.012, pl, 0.006, M.brass, x + sw / 2 - 0.03, hb > 1.2 ? 0.015 : (hb - pl) / 2, d / 2 + 0.006 + z));
      if (loft > 0) {
        g.add(box(sw - 0.004, loft - 0.02, 0.018, S, x, hb + 0.005, d / 2 - 0.005, 0.004));
        g.add(box(sw * 0.4, 0.01, 0.006, M.brass, x, hb + 0.04, d / 2 + 0.006));
      }
    }
    return g;
  },

  shoe_cabinet(it, M) {                  // low entry cabinet, flap-up shutters, brass pull strips
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, n = Math.max(2, Math.round(w / (1.3 * FT)));
    const g = new THREE.Group();
    g.add(box(w, h, d, M.walnut, 0, 0, 0, 0.01));
    const sw = (w - 0.006 * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + sw / 2 + i * (sw + 0.006);
      g.add(box(sw - 0.004, h - 0.03, 0.016, M.walnut, x, 0.015, d / 2 - 0.004, 0.004));
      g.add(box(sw * 0.5, 0.01, 0.006, M.brass, x, h - 0.06, d / 2 + 0.005));
    }
    return g;
  },

  // ---- v08 kitchen. A base run is a list of modules [a, b, type, opts] in world ft along the run:
  // drawers {rows: heights top-first (ft), open: row shown pulled out}, shutters {n}, sink {bowl, drain: [a, b] world
  // ft, deep, ro}, hob, lpg, pullout, magic {hinge: world ft} (corner mechanism shown open), blind (hidden corner).
  // splash = [[a, b, top ft], ...] tiled backsplash on the wall behind the run.
  kitchen_counter(it, M) {
    const K = B._kit(M), g = new THREE.Group();
    const d = it.d * FT, h = it.h * FT, top = 0.04, kick = 0.1, fz = d / 2 - 0.04, Y1 = h - top - 0.003;
    const span = (a, b) => [localX(it, a), localX(it, b)].sort((p, q) => p - q);
    const holes = [];
    for (const [a, b, type, o = {}] of it.mods) {
      const [x0, x1] = span(a, b), mw = x1 - x0, cx = (x0 + x1) / 2;
      const sunk = type === 'sink' ? (o.deep ? 0.3 : 0.24) + 0.01 : 0;
      g.add(box(mw, kick, d - 0.12, M.black_metal, cx, 0, -0.06));                 // recessed plinth
      if (type === 'magic') {                                                         // open carcass, white inside
        g.add(box(mw, h - top - kick, 0.02, M.white_plastic, cx, kick, -d / 2 + 0.03));
        for (const x of [x0 + 0.009, x1 - 0.009]) g.add(box(0.018, h - top - kick, d - 0.04, M.walnut, x, kick, -0.02));
        g.add(box(mw, 0.018, d - 0.04, M.white_plastic, cx, kick, -0.02));
      } else {
        g.add(box(mw, h - top - kick - sunk, d - 0.04, M.walnut, cx, kick, -0.02));
      }
      if (type === 'drawers' || type === 'hob') {
        const rows = o.rows || [0.9, 1.35], sum = rows.reduce((p, q) => p + q, 0);
        let y = Y1;
        rows.forEach((r, i) => {
          const rh = (r / sum) * (Y1 - kick), out = o.open === i ? 0.34 : 0;
          K.front(g, x0, x1, y - rh, y, fz + out, 'drawer');
          if (out) K.drawer(g, x0, x1, y - rh, y, fz, out);
          y -= rh;
        });
      } else if (type === 'pullout') {
        K.front(g, x0, x1, kick, Y1, fz, 'drawer');
      } else if (type === 'lpg') {                                                    // ventilated cylinder shutter
        K.front(g, x0, x1, kick, Y1, fz, 'shutter', -1);
        for (let i = 0; i < 6; i++) g.add(box(mw * 0.6, 0.008, 0.004, M.black_metal, cx, kick + 0.05 + i * 0.03, fz + 0.019));
        for (let i = 0; i < 4; i++) g.add(box(mw * 0.6, 0.008, 0.004, M.black_metal, cx, Y1 - 0.2 - i * 0.03, fz + 0.019));
      } else if (type === 'magic') {
        K.magic(g, x0, x1, kick, Y1, fz, localX(it, o.hinge));
      } else if (type !== 'blind') {                                                  // shutters (also under sinks)
        const n = o.n ?? (mw > 0.75 ? 2 : 1);
        for (let i = 0; i < n; i++) {
          K.front(g, x0 + (i * mw) / n, x0 + ((i + 1) * mw) / n, kick, Y1, fz, 'shutter', n === 2 ? (i ? -1 : 1) : 1);
        }
      }
      if (type === 'sink') holes.push(K.sink(g, span(...o.bowl), span(...o.drain), h, d, sunk - 0.01, o.ro));
      if (type === 'hob') K.hob(g, cx, h);
    }
    // white quartz worktop, cut around the sink bowls; 3/4" overhang past the shutters
    const tz0 = -d / 2, tz1 = d / 2 + 0.02, piece = (x0, x1, z0, z1) => {
      if (x1 - x0 > 0.002 && z1 - z0 > 0.002) g.add(box(x1 - x0, top, z1 - z0, K.quartz, (x0 + x1) / 2, h - top, (z0 + z1) / 2, 0.004));
    };
    let from = -it.w * FT / 2;
    for (const [hx0, hx1, hz0, hz1] of holes.sort((p, q) => p[0] - q[0])) {
      piece(from, hx0, tz0, tz1);
      piece(hx0, hx1, tz0, hz0);
      piece(hx0, hx1, hz1, tz1);
      from = hx1;
    }
    piece(from, it.w * FT / 2, tz0, tz1);
    for (const [a, b, zt] of it.splash || []) {
      const [x0, x1] = span(a, b);
      g.add(K.tiles(x1 - x0, zt * FT - h, 0.012, (x0 + x1) / 2, h, -d / 2 + 0.006));
    }
    return g;
  },

  // Shared kitchen parts (not a placeable kind): brushed-brass pulls, glazed ivory 4" x 8" tile, fronts, sink, hob.
  _kit(M) {
    if (M._kit) return M._kit;
    const pull = M.brass.clone();
    pull.roughness = 0.45;
    const c = document.createElement('canvas');
    c.width = c.height = 512;                                    // 2 ft x 2 ft: 3 x 6 tiles, running bond
    const x = c.getContext('2d'), tw = 512 / 3, th = 512 / 6;
    x.fillStyle = '#cbbda7';
    x.fillRect(0, 0, 512, 512);
    let seed = 5;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let r = 0; r < 6; r++) {
      for (let k = -1; k < 4; k++) {
        const l = 228 + Math.round(rnd() * 10);
        x.fillStyle = `rgb(${l + 11}, ${l + 4}, ${l - 10})`;
        x.fillRect(k * tw + (r % 2) * tw / 2 + 2, r * th + 2, tw - 4, th - 4);
      }
    }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 8;
    const tile = new THREE.MeshStandardMaterial({ map, roughness: 0.42 });
    const quartz = M.marble.clone();                             // plain white quartz: no stretched marble veins
    quartz.map = quartz.normalMap = quartz.roughnessMap = null;
    quartz.color.setHex(0xf1eee8);
    quartz.roughness = 0.22;
    const K = {
      pull, tile, quartz,
      tiles(w, h, t, cx, y, z) {                                 // tiled panel with UVs in 2 ft repeats
        const m = box(w, h, t, tile, cx, y, z);
        const uv = m.geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / (2 * FT), (uv.getY(i) * h) / (2 * FT));
        m.castShadow = false;
        return m;
      },
      // walnut front (3 mm shadow gaps) with a brushed-brass bar pull: along the top of drawers, upright by the
      // opening edge of shutters (side = +1 right edge, -1 left edge)
      front(g, x0, x1, y0, y1, z, kind, side = 1, hy = y1 - 0.05, ph = Math.min(0.2, (y1 - y0) * 0.35)) {
        const gp = 0.0015, w = x1 - x0 - 2 * gp, hh = y1 - y0 - 2 * gp, cx = (x0 + x1) / 2, hz = z + 0.03;
        g.add(box(w, hh, 0.018, M.walnut, cx, y0 + gp, z + 0.009, 0.003));
        if (kind === 'drawer') g.add(box(Math.min(0.3, w * 0.55), 0.012, 0.014, pull, cx, y1 - 0.05, hz, 0.003));
        else g.add(box(0.012, ph, 0.014, pull, cx + side * (w / 2 - 0.035), hy - ph, hz, 0.003));
      },
      drawer(g, x0, x1, y0, y1, z, out) {                        // the pulled-out part: steel sides, cutlery tray
        const ix0 = x0 + 0.03, ix1 = x1 - 0.03, iw = ix1 - ix0, cx = (ix0 + ix1) / 2, zb = z + out, len = out + 0.02;
        const zc = zb - len / 2, sh = y1 - y0 - 0.05;
        for (const s of [ix0 + 0.006, ix1 - 0.006]) g.add(box(0.012, sh, len, M.steel, s, y0 + 0.02, zc));
        g.add(box(iw, 0.01, len, M.white_plastic, cx, y0 + 0.02, zc));
        const ty = y0 + 0.03, dh = sh * 0.55;                    // organiser: 5 long bays + a cross tray
        for (let i = 0; i <= 5; i++) g.add(box(0.006, dh, len, M.white_plastic, ix0 + 0.01 + (i * (iw - 0.02)) / 5, ty, zc));
        const bay = (iw - 0.02) / 5;
        for (let i = 0; i < 5; i++) {                            // spoons, forks, ladles: steel bars in each bay
          for (let j = 0; j < 3; j++) {
            const bx = ix0 + 0.01 + bay * (i + 0.3 + j * 0.2);
            g.add(box(0.012, 0.006, 0.2, M.steel, bx, ty + 0.012 + j * 0.004, zb - 0.04 - 0.1));
            g.add(box(0.028, 0.01, 0.045, M.steel, bx, ty + 0.012 + j * 0.004, zb - 0.04 - 0.03, 0.004));
          }
        }
      },
      // magic corner: shutter swung open on the corner-side hinge, two wire baskets slid out with dabbas on them
      magic(g, x0, x1, y0, y1, z, hx) {
        const s = Math.abs(hx - x0) < Math.abs(hx - x1) ? 1 : -1, w = x1 - x0 - 0.004, hh = y1 - y0 - 0.004;
        const pivot = new THREE.Group();
        pivot.position.set(hx, 0, z + 0.02);
        pivot.rotation.y = -s * THREE.MathUtils.degToRad(80);   // clear of the next run
        pivot.add(box(w, hh, 0.018, M.walnut, (s * w) / 2, y0 + 0.002, -0.009, 0.003));
        pivot.add(box(0.012, 0.18, 0.014, pull, s * (w - 0.035), y1 - 0.23, 0.012, 0.003));
        g.add(pivot);
        const bw = w - 0.07, cx = (x0 + x1) / 2, bd = 0.42, zc = z + 0.3 - bd / 2;
        for (const by of [y0 + 0.06, y0 + 0.33]) {
          g.add(box(bw, 0.006, bd, M.steel, cx, by, zc));
          for (const sx of [-1, 1]) g.add(box(0.008, 0.008, bd, M.steel, cx + (sx * bw) / 2, by + 0.07, zc));
          for (const sz of [-1, 1]) g.add(box(bw, 0.008, 0.008, M.steel, cx, by + 0.07, zc + (sz * bd) / 2));
          for (let i = 0; i < 3; i++) {
            const can = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 24), M.steel);
            can.position.set(cx + (i - 1) * bw * 0.32, by + 0.076, zc + (i % 2 ? 0.08 : -0.05));
            g.add(can);
          }
        }
      },
      // inset steel sink: bowl in a hole cut in the quartz, grooved drainboard, gooseneck tap, RO tap.
      // Returns the worktop hole [x0, x1, z0, z1] in local metres.
      sink(g, [bx0, bx1], [dx0, dx1], h, d, depth, ro) {
        const bz0 = -d / 2 + 0.12, bz1 = d / 2 - 0.05, bw = bx1 - bx0, bd = bz1 - bz0, cx = (bx0 + bx1) / 2, zc = (bz0 + bz1) / 2;
        const t = 0.004, yb = h - depth;
        g.add(box(bw, t, bd, M.steel, cx, yb, zc));
        for (const s of [-1, 1]) {
          g.add(box(t, depth, bd, M.steel, cx + (s * (bw - t)) / 2, yb, zc));
          g.add(box(bw, depth, t, M.steel, cx, yb, zc + (s * (bd - t)) / 2));
        }
        const waste = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.004, 24), M.black_metal);
        waste.position.set(cx, yb + t, zc);
        g.add(waste);
        for (const s of [-1, 1]) {                               // flush steel rim round the cut-out
          g.add(box(bw + 0.03, 0.003, 0.015, M.steel, cx, h, zc + s * (bd / 2 + 0.0075)));
          g.add(box(0.015, 0.003, bd, M.steel, cx + s * (bw / 2 + 0.0075), h, zc));
        }
        const dw = dx1 - dx0, dcx = (dx0 + dx1) / 2;
        g.add(box(dw, 0.004, bd, M.steel, dcx, h, zc, 0.002));   // drainboard with pressed grooves
        for (let i = 1; i < 7; i++) g.add(box(0.006, 0.0015, bd * 0.8, M.black_metal, dx0 + (i * dw) / 7, h + 0.004, zc));
        const tz = bz0 - 0.055;                                  // gooseneck: stem, half-loop, spout
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.3, 20), M.steel);
        stem.position.set(cx, h + 0.15, tz);
        const r = 0.09, arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 12, 24, Math.PI), M.steel);
        arc.rotation.y = Math.PI / 2;
        arc.position.set(cx, h + 0.3, tz + r);
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 16), M.steel);
        spout.position.set(cx, h + 0.275, tz + 2 * r);
        const lever = box(0.012, 0.012, 0.08, M.steel, cx + 0.03, h + 0.12, tz + 0.03);
        g.add(stem, arc, spout, lever);
        if (ro) {                                                // slim RO tap, spout over the bowl corner
          const rx = bx1 - 0.06;
          const rs = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.22, 16), M.steel);
          rs.position.set(rx, h + 0.11, tz);
          g.add(rs, box(0.012, 0.012, 0.1, M.steel, rx, h + 0.21, tz + 0.05), box(0.02, 0.018, 0.02, M.steel, rx, h + 0.195, tz + 0.1));
        }
        return [bx0, bx1, bz0, bz1];
      },
      hob(g, cx, h) {                                            // 3-burner black-glass hob, brass burners, knobs
        const y = h;
        g.add(box(0.74, 0.008, 0.46, M.screen, cx, y, 0.0, 0.004));
        for (const dx of [-0.23, 0, 0.23]) {
          const big = dx === 0 ? 1.25 : 1;
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * big, 0.055 * big, 0.018, 28), M.brass);
          ring.position.set(cx + dx, y + 0.017, -0.04);
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * big, 0.03 * big, 0.01, 24), M.black_metal);
          cap.position.set(cx + dx, y + 0.029, -0.04);
          g.add(ring, cap);
          for (const a of [0, Math.PI / 2]) {
            const bar = box(0.17 * big, 0.01, 0.012, M.black_metal, cx + dx, y + 0.034, -0.04);
            bar.rotation.y = a + Math.PI / 4;
            g.add(bar);
          }
          const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.022, 20), M.black_metal);
          knob.position.set(cx + dx, y + 0.019, 0.17);
          g.add(knob);
        }
      },
    };
    return (M._kit = K);
  },

  kitchen_wall_cab(it, M) {              // wall cabinets: walnut shutters, pulls on the bottom edge, LED strip under
    const K = B._kit(M), w = it.w * FT, d = it.d * FT, h = it.h * FT, g = new THREE.Group();
    const [r0, r1] = it.rack ? [localX(it, it.rack[0]), localX(it, it.rack[1])].sort((p, q) => p - q) : [w / 2, w / 2];
    for (const [x0, x1] of [[-w / 2, r0], [r1, w / 2]]) {
      if (x1 - x0 < 0.05) continue;
      g.add(box(x1 - x0, h, d - 0.03, M.walnut, (x0 + x1) / 2, 0, -0.015));
      const n = Math.max(1, Math.round((x1 - x0) / (1.6 * FT))), sw = (x1 - x0) / n;
      for (let i = 0; i < n; i++) {
        const cx = x0 + sw * (i + 0.5);
        g.add(box(sw - 0.003, h - 0.003, 0.018, M.walnut, cx, 0.0015, d / 2 - 0.021, 0.003));
        g.add(box(Math.min(0.22, sw * 0.5), 0.012, 0.014, K.pull, cx, 0.03, d / 2 + 0.01, 0.003));
      }
    }
    if (it.rack) {                        // open plate + cup rack over the drainboard: steel thalis stand on a drip tray
      const rw = r1 - r0, cx = (r0 + r1) / 2;
      g.add(box(rw, 0.018, d - 0.03, M.walnut, cx, h - 0.018, -0.015));
      for (const x of [r0 + 0.009, r1 - 0.009]) g.add(box(0.018, h, d - 0.03, M.walnut, x, 0, -0.015));
      g.add(box(rw - 0.036, 0.02, d - 0.05, M.steel, cx, 0.005, -0.015));
      const plate = new THREE.CylinderGeometry(0.13, 0.13, 0.006, 32);
      const np = Math.floor((rw - 0.08) / 0.035);
      for (let i = 0; i < np; i++) {
        const p = new THREE.Mesh(plate, M.steel);
        p.rotation.z = Math.PI / 2;
        p.position.set(r0 + 0.04 + (i + 0.5) * ((rw - 0.08) / np), 0.025 + 0.13, 0);
        g.add(p);
      }
      for (const z of [-d * 0.3, d * 0.3]) g.add(box(rw - 0.036, 0.006, 0.006, M.steel, cx, 0.09, z));
      const sy = h * 0.66;                // cup shelf
      g.add(box(rw - 0.036, 0.006, d - 0.06, M.steel, cx, sy, -0.02));
      const cup = new THREE.CylinderGeometry(0.035, 0.03, 0.08, 20);
      for (let i = 0; i < 5; i++) {
        const c = new THREE.Mesh(cup, M.steel);
        c.position.set(r0 + 0.05 + (i * (rw - 0.1)) / 4, sy + 0.046, i % 2 ? 0.03 : -0.06);
        g.add(c);
      }
    }
    g.add(box(w - 0.04, 0.008, 0.015, M.led, 0, -0.008, d / 2 - 0.05));   // under-cabinet LED strip
    return g;
  },

  chimney(it, M) {                       // 3 ft black-glass hood with two lamps under it, box flue to the ceiling
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, g = new THREE.Group();
    g.add(box(w, 0.16, d, M.black_metal, 0, 0, 0, 0.01));
    g.add(box(w - 0.01, 0.12, 0.008, M.screen, 0, 0.02, d / 2 + 0.002));
    g.add(box(0.3, h - 0.16, 0.26, M.black_metal, 0, 0.16, -d / 2 + 0.13));
    for (const s of [-1, 1]) g.add(box(0.05, 0.004, 0.05, M.led, s * w * 0.3, -0.004, d * 0.15));
    return g;
  },

  tall_cab(it, M) {                      // tall walnut cabinet: `doors` shutters, optional loft split at `loft` ft
    const K = B._kit(M), w = it.w * FT, d = it.d * FT, h = it.h * FT, kick = 0.1, g = new THREE.Group();
    g.add(box(w, kick, d - 0.12, M.black_metal, 0, 0, -0.06));
    g.add(box(w, h - kick, d - 0.04, M.walnut, 0, kick, -0.02));
    const n = it.doors ?? Math.max(1, Math.round(w / (1.6 * FT))), sw = w / n;
    const bands = it.loft ? [[kick, it.loft * FT], [it.loft * FT, h]] : [[kick, h]];
    bands.forEach(([y0, y1], b) => {
      for (let i = 0; i < n; i++) {      // long pull at hand height on the main doors, short one low on the loft
        const side = n === 1 ? 1 : i < n / 2 ? 1 : -1, x0 = -w / 2 + i * sw;
        if (b) K.front(g, x0, x0 + sw, y0, y1, d / 2 - 0.04, 'shutter', side, y0 + 0.25, 0.18);
        else K.front(g, x0, x0 + sw, y0, y1, d / 2 - 0.04, 'shutter', side, 1.35, 0.5);
      }
    });
    return g;
  },

  kitchen_tall(it, M) {                  // NW tall unit: drawers, tea-station niche, OTG, microwave, loft shutter
    const K = B._kit(M), w = it.w * FT, d = it.d * FT, h = it.h * FT, kick = 0.1, t = 0.018, fz = d / 2 - 0.04;
    const f = (v) => v * FT, g = new THREE.Group();
    g.add(box(w, kick, d - 0.12, M.black_metal, 0, 0, -0.06));
    g.add(box(w, f(2.71) - kick, d - 0.04, M.walnut, 0, kick, -0.02));
    K.front(g, -w / 2, w / 2, f(1.6), f(2.71), fz, 'drawer');
    K.front(g, -w / 2, w / 2, kick, f(1.6), fz, 'drawer');
    g.add(box(w, f(0.04), d, K.quartz, 0, f(2.71), 0, 0.004));
    for (const s of [-1, 1]) g.add(box(t, f(4.0) - f(2.75), d - 0.04, M.walnut, s * (w - t) / 2, f(2.75), -0.02));
    g.add(K.tiles(w - 2 * t, f(4.0) - f(2.75), 0.012, 0, f(2.75), -d / 2 + 0.006));
    for (let i = 0; i < 3; i++) {        // chai / sugar / coffee canisters
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.13 - i * 0.015, 24), M.steel);
      c.position.set(-w / 2 + 0.07 + i * 0.1, f(2.75) + (0.13 - i * 0.015) / 2, -0.12);
      g.add(c);
    }
    g.add(box(w, h - f(4.0), d - 0.04, M.walnut, 0, f(4.0), -0.02));
    g.add(box(w - 2 * t, 0.008, 0.015, M.led, 0, f(4.0) - 0.008, d / 2 - 0.06));
    for (const [y0, y1] of [[f(4.1), f(5.0)], [f(5.1), f(6.2)]]) {   // OTG below, microwave at eye level
      const aw = w - 0.1, ah = y1 - y0;
      g.add(box(aw, ah, 0.02, M.black_metal, 0, y0, fz + 0.01, 0.004));
      g.add(box(aw * 0.72, ah * 0.7, 0.004, M.screen, -aw * 0.12, y0 + ah * 0.15, fz + 0.021));
      g.add(box(aw * 0.18, ah * 0.8, 0.004, M.steel, aw * 0.38, y0 + ah * 0.1, fz + 0.021));
      g.add(box(0.012, ah * 0.6, 0.016, M.steel, aw * 0.22, y0 + ah * 0.2, fz + 0.035, 0.004));
    }
    K.front(g, -w / 2, w / 2, f(6.3), h, fz, 'shutter');
    return g;
  },

  tile_panel(it, M) {                    // tiled dado (wash zone): same glazed tile as the backsplash
    return new THREE.Group().add(B._kit(M).tiles(it.w * FT, it.h * FT, it.d * FT, 0, 0, 0));
  },

  nahani_drain(it, M) {                   // nahani trap: square steel grating flush with the floor
    const w = it.w * FT, g = new THREE.Group();
    g.add(box(w, 0.006, w, M.steel, 0, 0, 0, 0.002));
    for (let i = -3; i <= 3; i++) g.add(box(w * 0.75, 0.002, 0.008, M.black_metal, 0, 0.006, (i * w) / 9));
    g.traverse((o) => { o.castShadow = false; });
    return g;
  },

  ceiling_light(it, M) {                 // flush round LED panel; the light itself comes from the item's `lamp`
    const r = (it.w * FT) / 2, h = it.h * FT, g = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), M.white_plastic);
    rim.position.y = h / 2;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(r * 0.86, 40), M.led);
    lens.rotation.x = Math.PI / 2;
    lens.position.y = -0.001;
    g.add(rim, lens);
    return g;
  },

  drying_rack(it, M) {                   // folding steel cloth-drying stand (wings open) with the day's washing
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, g = new THREE.Group();
    const bar = (len, x, y, z) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 10), M.steel);
      m.rotation.z = Math.PI / 2;
      m.position.set(x, y, z);
      return m;
    };
    for (const sx of [-1, 1]) {          // end frames: two legs + top bar
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, h, 10), M.steel);
        leg.position.set((sx * w) / 2 * 0.96, h / 2, sz * d * 0.18);
        g.add(leg);
      }
      g.add(box(0.02, 0.02, d * 0.36, M.steel, (sx * w) / 2 * 0.96, h - 0.02, 0));
    }
    const rails = [];
    for (let i = 0; i < 5; i++) rails.push([h, -d * 0.16 + (i * d * 0.32) / 4]);
    for (const sz of [-1, 1]) for (let i = 1; i <= 3; i++) rails.push([h - 0.03 * i, sz * (d * 0.18 + (i * d * 0.32) / 3)]);
    for (const [y, z] of rails) g.add(bar(w * 0.96, 0, y, z));
    for (const sz of [-1, 1]) g.add(box(w * 0.9, 0.012, 0.012, M.steel, 0, h - 0.1, sz * d * 0.34));
    const cloth = [                                       // [x, rail, width, drop, material]
      [-0.45, 0, 0.4, 0.45, M.linen], [0.05, 2, 0.5, 0.35, M.velvet_rust], [0.42, 4, 0.3, 0.55, M.oat],
      [-0.2, 6, 0.55, 0.3, M.linen_dark], [0.35, 9, 0.45, 0.4, M.wool_border], [-0.5, 10, 0.3, 0.5, M.terracotta],
    ];
    for (const [x, ri, cw, drop, mat] of cloth) {
      const [y, z] = rails[ri];
      g.add(box(cw, drop, 0.008, mat, x * w * 0.8, y - drop + 0.01, z));
    }
    return g;
  },

  wall_box(it, M) {                      // small wall-mounted appliance (RO purifier, water heater base)
    const w = it.w * FT, d = it.d * FT, h = it.h * FT;
    const g = new THREE.Group();
    g.add(box(w, h, d, M[it.material] || M.white_plastic, 0, 0, 0, 0.03));
    if (it.accent) g.add(box(w * 0.7, h * 0.4, 0.004, M[it.accent], 0, h * 0.5, d / 2 + 0.002, 0.01));
    return g;
  },

  geyser(it, M) {                        // wall-mounted cylindrical water heater
    const r = (it.w * FT) / 2, h = it.h * FT;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), M.white_plastic);
    body.position.y = h / 2;
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.002, r + 0.002, 0.03, 24), M.brass);
    band.position.y = h * 0.2;
    g.add(band);
    return g;
  },

  headboard_wall(it, M) {                // upholstered channel panel, floor to door-head height, walnut cap
    const w = it.w * FT, h = it.h * FT, d = it.d * FT, n = Math.max(4, Math.round(w / 0.3));
    const g = new THREE.Group();
    g.add(box(w, h, d * 0.4, M.walnut, 0, 0, -d * 0.3));
    const cw = w / n;
    for (let i = 0; i < n; i++) {
      g.add(box(cw - 0.008, h - 0.06, d * 0.6, M.linen, -w / 2 + cw / 2 + i * cw, 0.03, d * 0.2, 0.03));
    }
    g.add(box(w + 0.02, 0.03, d + 0.02, M.walnut, 0, h - 0.03, 0, 0.004));
    return g;
  },

  table_lamp(it, M) {                    // brass stem on a marble foot, linen drum shade (glows at dusk)
    const h = it.h * FT, r = (it.w * FT) / 2;
    const g = new THREE.Group();
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.5, 0.03, 32), M.marble);
    foot.position.y = 0.015;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, h * 0.62, 12), M.brass);
    stem.position.y = h * 0.31;
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, h * 0.42, 40, 1, true), M.shade);
    shade.position.y = h * 0.79;
    g.add(foot, stem, shade);
    g.traverse((o) => { o.castShadow = o.receiveShadow = o.isMesh; });
    shade.castShadow = false;
    return g;
  },

  mirror(it, M) {                        // silvered glass on a thin brass frame
    const w = it.w * FT, h = it.h * FT, d = it.d * FT, f = 0.015;
    const g = new THREE.Group();
    g.add(box(w, h, d * 0.6, M.brass, 0, 0, -d * 0.2, 0.004));
    g.add(box(w - 2 * f, h - 2 * f, 0.004, M.mirror, 0, f, d * 0.1 + 0.002));
    return g;
  },

  bookshelf(it, M) {                     // open walnut shelving, book blocks and a few objects
    const w = it.w * FT, h = it.h * FT, d = it.d * FT, t = 0.022, rows = Math.max(3, Math.round(it.h / 1.25));
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(box(t, h, d, M.walnut, (s * (w - t)) / 2, 0, 0));
    g.add(box(w, h, 0.012, M.walnut, 0, 0, -d / 2 + 0.006));
    const pitch = (h - t) / rows;
    const books = [M.linen_dark, M.terracotta, M.linen, M.oat, M.wool_border];
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let r = 0; r <= rows; r++) {
      const y = r * pitch;
      g.add(box(w - 2 * t, t, d - 0.012, M.walnut, 0, y, 0.006));
      if (r === rows || r === 0) continue;
      let x = -w / 2 + t + 0.02 + rnd() * 0.1;
      const stop = x + (w - 2 * t) * (0.45 + rnd() * 0.3);
      while (x < stop) {
        const bw = 0.018 + rnd() * 0.02, bh = pitch * (0.55 + rnd() * 0.25);
        g.add(box(bw, bh, d * 0.7, books[Math.floor(rnd() * books.length)], x + bw / 2, y + t, 0.01));
        x += bw + 0.002;
      }
    }
    return g;
  },

  tall_unit(it, M) {                     // walnut larder column + fridge bay with a cabinet over it
    const w = it.w * FT, h = it.h * FT, d = it.d * FT, nb = it.niche * FT, fh = it.fridgeH * FT;
    const cw = w - nb, cx = -w / 2 + cw / 2, nx = w / 2 - nb / 2;
    const g = new THREE.Group();
    g.add(box(cw, h, d, M.walnut, cx, 0, 0, 0.006));
    g.add(box(cw - 0.01, h - 0.03, 0.018, M.walnut, cx, 0.015, d / 2 - 0.005, 0.004));
    g.add(box(0.012, h - 0.6, 0.006, M.brass, cx + cw / 2 - 0.035, 0.3, d / 2 + 0.006));
    g.add(box(nb, h - fh - 0.03, d, M.walnut, nx, fh + 0.03, 0, 0.006));
    g.add(box(nb - 0.01, h - fh - 0.06, 0.018, M.walnut, nx, fh + 0.045, d / 2 - 0.005, 0.004));
    return g;
  },

  glass_screen(it, M) {                  // fixed 8 mm clear shower screen in a slim black channel
    const w = it.w * FT, h = it.h * FT;
    const g = new THREE.Group();
    g.add(box(w, h, 0.008, M.glass, 0, 0, 0));
    g.add(box(w, 0.02, 0.02, M.black_metal, 0, 0, 0));
    g.add(box(0.02, h, 0.02, M.black_metal, w / 2 - 0.01, 0, 0));
    return g;
  },

  vanity(it, M) {                        // wall-hung walnut vanity 6" off the floor, white marble top, counter-top
    // ceramic basin with its rim at h (2'-9"), brushed-brass wall mixer. Back on the wall at -d/2.
    const w = it.w * FT, d = it.d * FT, rim = it.h * FT, lift = 0.5 * FT, top = 0.03, bowlH = 0.13;
    const ctop = rim - bowlH, cab = ctop - top - lift, dh = 0.13;
    const brass = M.brass.clone(); brass.roughness = 0.42;                 // brushed
    const ceramic = M.white_plastic.clone(); ceramic.roughness = 0.12; ceramic.side = THREE.DoubleSide;
    const g = new THREE.Group();
    g.add(box(w, cab, d - 0.02, M.walnut, 0, lift, -0.01, 0.006));
    g.add(box(w - 0.01, dh, 0.018, M.walnut, 0, ctop - top - dh - 0.003, d / 2 - 0.01, 0.004));          // drawer
    g.add(box(w - 0.01, cab - dh - 0.012, 0.018, M.walnut, 0, lift + 0.003, d / 2 - 0.01, 0.004));       // shutter
    g.add(box(w * 0.4, 0.012, 0.012, brass, 0, ctop - top - dh / 2 - 0.009, d / 2 + 0.005, 0.004));
    g.add(box(w, top, d, M.marble, 0, ctop - top, 0, 0.004));
    const r = Math.min(0.2, d * 0.4, w * 0.35), zc = -d / 2 + r + 0.07;
    const prof = [[0.001, 0], [r * 0.55, 0], [r * 0.85, 0.025], [r, 0.08], [r, bowlH], [r - 0.01, bowlH],
      [r - 0.012, 0.08], [r * 0.8, 0.035], [r * 0.5, 0.018], [0.001, 0.018]].map(([x, y]) => new THREE.Vector2(x, y));
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), ceramic);
    bowl.position.set(0, ctop, zc);
    bowl.castShadow = bowl.receiveShadow = true;
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 16), brass);
    plug.position.set(0, ctop + 0.02, zc);
    // wall mixer: round plate with a lever above a square spout that ends just behind the bowl centre
    const sy = rim + 0.12, sl = zc + d / 2 - r * 0.3;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 32), brass);
    plate.rotation.x = Math.PI / 2;
    plate.position.set(0, sy + 0.035, -d / 2 + 0.004);
    g.add(bowl, plug, plate);
    g.add(box(0.022, 0.018, sl, brass, 0, sy, -d / 2 + sl / 2, 0.006));
    g.add(box(0.012, 0.012, 0.07, brass, 0, sy + 0.05, -d / 2 + 0.04, 0.004));
    return g;
  },

  towel_rail(it, M) {                    // brushed-brass bar on two stand-offs, with a folded towel
    const w = it.w * FT, d = it.d * FT, h = it.h * FT;
    const brass = M.brass.clone(); brass.roughness = 0.42;
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, w, 12), brass);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, h - 0.02, d / 2 - 0.015);
    g.add(bar);
    for (const s of [-1, 1]) g.add(box(0.016, 0.016, d - 0.015, brass, s * (w / 2 - 0.03), h - 0.028, -0.0075));
    g.add(box(w * 0.55, h - 0.02, 0.025, M.oat, 0, 0, d / 2 - 0.015, 0.008));
    return g;
  },

  floor_drain(it, M) {                   // linear stainless grating, flush with the shower floor
    const w = it.w * FT, d = it.d * FT, n = Math.floor(w / 0.025);
    const g = new THREE.Group();
    g.add(box(w, 0.004, d, M.steel));
    for (let i = 0; i < n; i++) g.add(box(0.008, 0.005, d * 0.6, M.black_metal, -w / 2 + (i + 0.5) * (w / n), 0, 0));
    g.traverse((o) => { o.castShadow = false; });
    return g;
  },

  grab_bar(it, M) {                      // 32 mm brushed-steel grab bar on two stand-offs (aging in place, D-002)
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, w, 16), M.steel);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, h / 2, d / 2 - 0.02);
    g.add(bar);
    for (const s of [-1, 1]) g.add(box(0.03, 0.03, d - 0.02, M.steel, s * (w / 2 - 0.02), h / 2 - 0.015, -0.01));
    return g;
  },
};

// Area builder modules (one per Section 2 agent). A clashing name throws instead of silently overriding.
for (const [area, mod] of Object.entries({ guest, core, site, shops, roof })) {
  for (const [name, fn] of Object.entries(mod)) {
    if (B[name]) throw new Error(`builder ${name} in props/${area}.js already exists`);
    B[name] = fn;
  }
}
const H = { THREE, FT, box, localX };

export function buildProp(it, M) {
  const f = B[it.kind];
  if (!f) throw new Error(`no builder for ${it.kind}`);
  return f(it, M, H);
}

// Floating marigold heads and a few mango leaves on water in the urli.
export function urliFlowers(M, dia) {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CircleGeometry(dia * 0.4, 48), M.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.075;
  g.add(water);
  const head = new THREE.IcosahedronGeometry(0.038, 2);
  const leaf = new THREE.SphereGeometry(0.05, 12, 6);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f5f2a, roughness: 0.6 });
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.4, r = i === 0 ? 0 : dia * (0.14 + rnd() * 0.16);
    const f = new THREE.Mesh(head, i % 3 === 0 ? M.flower_white : M.flower_marigold);
    f.scale.set(1, 0.6, 1);
    f.position.set(Math.cos(a) * r, 0.088, Math.sin(a) * r);
    g.add(f);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4, l = new THREE.Mesh(leaf, leafMat);
    l.scale.set(1.6, 0.08, 0.55);
    l.rotation.y = -a;
    l.position.set(Math.cos(a) * dia * 0.3, 0.078, Math.sin(a) * dia * 0.3);
    g.add(l);
  }
  return g;
}
