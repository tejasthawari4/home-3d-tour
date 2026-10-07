// Procedural commercial-gym equipment for the b01 viewer. Feet; model centred on x/z, base at y=0, the USER FACES LOCAL +z
// (same as furnish.js: place with rotation.y = face+90 deg). One merged mesh per material; templates, geometry, materials and
// the tiny (<=128px) generated canvas textures are cached module-wide, so every instance is a cheap clone.
// buildGymProp(kind, item, THREE, mats?) -> Object3D.  item.w/d/h/color used by the sized kinds (zone, mat, mirror, lockers, barre).
// Materials are private ('gym_<key>' in mats overrides one) so the viewer's own steel/mirror/screen never clobber them.
const C = new Map(), MC = new Map(), TX = {};
const PI = Math.PI;
// [color, metalness, roughness, bumpTexture?, bumpScale?, repeatU?, repeatV?]
const SPEC = {
  steel: [0x1c1e22, 0.4, 0.55], graphite: [0x4b5058, 0.4, 0.55], chrome: [0xdadde0, 1, 0.2], knurl: [0xcdd0d3, 1, 0.34, 'knurl', 0.8, 4, 24],
  rubber: [0x141414, 0, 0.9, 'grain', 0.6, 3, 3], leather: [0x1f1f23, 0, 0.55, 'grain', 0.7, 2, 2], seam: [0x08080a, 0, 0.9],
  screen: [0x04070b, 0.3, 0.1], display: [0x05080d, 0.2, 0.2], tv: [0x05080d, 0.2, 0.2], accent: [0x8f1d1d, 0.25, 0.5],
  plate: [0x1b1b1d, 0.7, 0.42], plateg: [0x7d8187, 0.8, 0.3], wood: [0xb48a5c, 0, 0.7, 'grain', 0.3, 2, 2],
  mirror: [0xf2f5f6, 1, 0.03], locker: [0x4a6378, 0.45, 0.5], white: [0xe9e9e6, 0, 0.6], tile: [0x2a2b2e, 0, 0.95, 'grain', 0.5, 4, 4],
  tileseam: [0x3d3e42, 0, 0.95], blue: [0x1f4f8f, 0.2, 0.5], yellow: [0xd9a521, 0.2, 0.5], teal: [0x2a7f8f, 0, 0.8], belt: [0x18191b, 0, 0.85, 'belt', 0.9, 1, 3],
  towel: [0xe8e4da, 0, 1], jug: [0x6fb7e9, 0, 0.15], pearl: [0xe6e8ea, 0.3, 0.35], paintk: [0x131416, 0.5, 0.3], alloy: [0x6d7279, 0.8, 0.35],
  lamp: [0xfff3d0, 0, 0.2], lampr: [0xb01010, 0, 0.3], amber: [0xe08a10, 0, 0.3], foam: [0x2b3340, 0, 0.85, 'grain', 0.5, 2, 2],
};
function mat(T, k, mats) {
  if (mats && mats['gym_' + k]) return mats['gym_' + k];
  if (!MC.has(k)) {
    const [c, m, r, b, bs, ru, rv] = SPEC[k] || [k, 0, 0.7];
    const o = { color: c, metalness: m, roughness: r }, bt = b && tex(T, b);
    if (bt) { bt.repeat.set(ru, rv); o.bumpMap = bt; o.bumpScale = bs; }
    if (k === 'display' || k === 'tv') { const d = tex(T, k); if (d) { o.map = d; o.emissiveMap = d; o.emissive = 0xffffff; o.emissiveIntensity = 0.85; } }
    if (k === 'lamp' || k === 'lampr') { o.emissive = c; o.emissiveIntensity = 0.5; }
    if (k === 'jug') { o.transparent = true; o.opacity = 0.55; }
    MC.set(k, new T.MeshStandardMaterial(o));
  }
  return MC.get(k);
}
// tiny canvas textures, built once
function tex(T, k) {
  if (k in TX) return TX[k];
  let t = null;
  if (typeof document !== 'undefined') {
    const S = k === 'display' ? [128, 72] : k === 'tv' ? [128, 72] : [64, 64], cv = document.createElement('canvas'); cv.width = S[0]; cv.height = S[1];
    const g = cv.getContext('2d'); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    if (k === 'grain') { for (let i = 0; i < 64 * 64; i++) { const v = 100 + rnd() * 70; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i % 64, (i / 64) | 0, 1, 1); } }
    else if (k === 'knurl') { g.fillStyle = '#888'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#ddd'; g.lineWidth = 2; for (let i = -64; i < 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); } }
    else if (k === 'belt') { g.fillStyle = '#999'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#333'; for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 2); }
    else if (k === 'display') {
      g.fillStyle = '#06121c'; g.fillRect(0, 0, 128, 72); g.fillStyle = '#12395a'; g.fillRect(0, 0, 128, 12);
      g.fillStyle = '#7fe3ff'; g.font = 'bold 26px sans-serif'; g.fillText('12.5', 8, 42); g.font = '9px sans-serif'; g.fillText('km/h   18:42   312 kcal', 8, 9); g.fillText('SPEED', 8, 52);
      g.fillStyle = '#ff5a4d'; g.fillText('142 bpm', 82, 30); g.strokeStyle = '#38d996'; g.lineWidth = 2; g.beginPath(); g.moveTo(4, 66); for (let x = 4; x < 124; x += 6) g.lineTo(x, 62 + rnd() * 6 - (x > 70 ? 6 : 0)); g.stroke();
    } else if (k === 'tv') {
      const gr = g.createLinearGradient(0, 0, 128, 72); gr.addColorStop(0, '#0b1c33'); gr.addColorStop(1, '#3a0d12'); g.fillStyle = gr; g.fillRect(0, 0, 128, 72);
      g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif'; g.fillText('MOVE', 10, 38); g.font = '9px sans-serif'; g.fillStyle = '#cfe'; g.fillText('HIIT  20:00', 10, 54);
    }
    t = new T.CanvasTexture(cv); t.anisotropy = 4;
    if (k === 'display' || k === 'tv') t.colorSpace = T.SRGBColorSpace; else t.wrapS = t.wrapT = T.RepeatWrapping;
  }
  return (TX[k] = t);
}
// ---- geometry accumulator with a local-transform stack ----
class Acc {
  constructor(T) { this.T = T; this.g = {}; this.M = new T.Matrix4(); this.st = []; }
  at(x, y, z, rx, ry, rz, fn) {
    const T = this.T; this.st.push(this.M);
    this.M = this.M.clone().multiply(new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(1, 1, 1)));
    fn(); this.M = this.st.pop(); return this;
  }
  put(k, geo, pos, q) {
    const T = this.T; geo.applyMatrix4(this.M.clone().multiply(new T.Matrix4().compose(pos, q, new T.Vector3(1, 1, 1)))); (this.g[k] ||= []).push(geo); return this;
  }
  add(k, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const T = this.T; return this.put(k, geo, new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)));
  }
  box(k, w, h, d, x, y, z, rx, ry, rz) { return this.add(k, new this.T.BoxGeometry(w, h, d), x, y, z, rx, ry, rz); }
  // rounded box: 3x3x3 grid, outer ring pulled onto a radius-r sphere/cylinder shell (108 tris) - use for visible hero parts
  rb(k, w, h, d, r, x, y, z, rx, ry, rz) {
    const T = this.T; if (Math.min(w, h, d) < 0.16) return this.box(k, w, h, d, x, y, z, rx, ry, rz);   // too slim to see a bevel
    r = Math.min(r, w * 0.47, h * 0.47, d * 0.47);
    const g = new T.BoxGeometry(w, h, d, 3, 3, 3), p = g.attributes.position, n = g.attributes.normal, v = new T.Vector3(), c = new T.Vector3(), H = [w / 2, h / 2, d / 2];
    const fx = (a, i) => (Math.abs(a) > H[i] - 1e-6 ? a : Math.sign(a) * (H[i] - r));
    for (let i = 0; i < p.count; i++) {
      v.set(fx(p.getX(i), 0), fx(p.getY(i), 1), fx(p.getZ(i), 2));
      c.set(Math.max(-(H[0] - r), Math.min(H[0] - r, v.x)), Math.max(-(H[1] - r), Math.min(H[1] - r, v.y)), Math.max(-(H[2] - r), Math.min(H[2] - r, v.z)));
      v.sub(c); const l = v.length();
      if (l > 1e-6) { v.divideScalar(l); n.setXYZ(i, v.x, v.y, v.z); v.multiplyScalar(r); }
      p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
    }
    return this.add(k, g, x, y, z, rx, ry, rz);
  }
  // cylinder along axis 'x'|'y'|'z' (length l)
  cyl(k, r, l, x, y, z, ax = 'y', seg = 12) {
    return this.add(k, new this.T.CylinderGeometry(r, r, l, seg), x, y, z, ax === 'z' ? PI / 2 : 0, 0, ax === 'x' ? PI / 2 : 0);
  }
  // round tube between two points
  tube(k, x1, y1, z1, x2, y2, z2, r, seg = 8) {
    const T = this.T, a = new T.Vector3(x1, y1, z1), b = new T.Vector3(x2, y2, z2), d = b.clone().sub(a);
    return this.put(k, new T.CylinderGeometry(r, r, d.length(), seg, 1), a.add(b).multiplyScalar(0.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()));
  }
  ball(k, r, x, y, z, s = 10) { return this.add(k, new this.T.SphereGeometry(r, s, Math.max(6, s - 3)), x, y, z); }
  disp(k, w, h, x, y, z, ry = 0, rx = 0) { return this.add(k, new this.T.PlaneGeometry(w, h), x, y, z, rx, ry, 0); }
  // weight plate along x: iron body, pale lettering ring, dark inner, raised hub
  plate(k, r, t, x, y, z) {
    return this.cyl(k, r, t, x, y, z, 'x', 14).cyl('plateg', r * 0.72, t + 0.012, x, y, z, 'x', 10).cyl('plate', r * 0.55, t + 0.02, x, y, z, 'x', 10).cyl('plate', r * 0.26, t + 0.05, x, y, z, 'x', 8);
  }
  // upholstered pad with bevel, two cross seams and piping
  pad(w, h, d, x, y, z, rx, ry, rz) {
    return this.at(x, y, z, rx, ry, rz, () => {
      this.rb('leather', w, h, d, Math.min(0.1, h * 0.4), 0, 0, 0);
      const t = h / 2 + 0.003;
      for (const s of [-1, 1]) this.box('seam', w * 0.84, 0.007, 0.014, 0, t, s * d * 0.3).box('seam', 0.012, 0.007, d * 0.84, s * (w / 2 - 0.13), t, 0);
    });
  }
  // fixed-weight dumbbell along z: hex heads + knurled chrome handle
  db(r, x, y, z, rubber) {
    const k = rubber ? 'rubber' : 'plate';
    this.tube('knurl', x, y, z - 0.44, x, y, z + 0.44, 0.042, 8);
    for (const s of [-1, 1]) this.cyl(k, r, 0.3, x, y, z + s * 0.33, 'z', 6).cyl('chrome', r * 0.5, 0.014, x, y, z + s * 0.485, 'z', 8);
    return this;
  }
  // selectorised weight stack: n plates, selected one red, guide rods + selector pin
  stack(x, y, z, w, d, n, sel, wide) {
    for (let i = 0; i < n; i++) this.box(i === sel ? 'accent' : 'plate', w, 0.26, d, x, y + 0.15 + i * 0.3, z);
    for (const s of [-1, 1]) this.tube('chrome', x + s * w * 0.36, y, z, x + s * w * 0.36, y + n * 0.3 + 0.4, z, 0.04, 8);
    return this.tube('chrome', x, y + 0.15 + sel * 0.3, z + d / 2 - 0.02, x, y + 0.15 + sel * 0.3, z + d / 2 + 0.3, 0.03, 6).box('accent', 0.14, 0.09, 0.1, x, y + 0.15 + sel * 0.3, z + d / 2 + 0.3);
  }
  pulley(x, y, z, r = 0.26) { return this.cyl('graphite', r, 0.08, x, y, z, 'x', 14).cyl('chrome', r * 0.35, 0.1, x, y, z, 'x', 8); }
  build(mats, castKeys = ['steel', 'graphite']) {
    const T = this.T, grp = new T.Group();
    for (const [k, list] of Object.entries(this.g)) {
      let nv = 0, ni = 0;
      for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
      let vo = 0, io = 0;
      for (const g of list) {
        pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2);
        for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo;
        vo += g.attributes.position.count; io += g.index.count; g.dispose();
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.setIndex(new T.BufferAttribute(idx, 1));
      const m = new T.Mesh(geo, mat(T, k, mats)); m.castShadow = castKeys.includes(k); m.receiveShadow = true; m.name = k; grp.add(m);
    }
    return grp;
  }
}
const sym = (fn) => { fn(-1); fn(1); };
function wheel(a, z, R, t) {                                  // wheel with axis x: tyre, alloy rim, 6 spokes, hub, brake disc
  a.add('rubber', new a.T.TorusGeometry(R - t, t, 6, 20), 0, R, z, 0, PI / 2, 0).add('alloy', new a.T.TorusGeometry(R - t - 0.02, 0.03, 4, 16), 0, R, z, 0, PI / 2, 0);
  for (let i = 0; i < 6; i++) a.at(0, R, z, (i * PI) / 3, 0, 0, () => a.box('alloy', 0.06, (R - t) * 0.92, 0.07, 0, (R - t) * 0.46, 0));
  a.cyl('chrome', 0.13, 0.32, 0, R, z, 'x', 10).cyl('chrome', R * 0.42, 0.02, 0.17, R, z, 'x', 14);
}
// ---- builders: (a, it) draw into the accumulator ----
const B = {
  treadmill(a) {                                            // 2.8 x 6.5 x 4.6 ; console + motor hood at +z, belt runs back
    a.rb('graphite', 2.3, 0.5, 5.3, 0.12, 0, 0.62, -0.45).box('belt', 1.9, 0.05, 5.0, 0, 0.9, -0.5);
    for (const z of [-3.05, 2.1]) a.cyl('belt', 0.17, 1.9, 0, 0.78, z, 'x', 12);
    sym((s) => {
      a.rb('steel', 0.3, 0.2, 5.5, 0.07, s * 1.1, 0.88, -0.4).rb('rubber', 0.18, 0.06, 5.2, 0.02, s * 1.1, 1.0, -0.4).rb('rubber', 0.45, 0.22, 0.6, 0.06, s * 1.0, 0.11, -2.9).rb('rubber', 0.45, 0.22, 0.6, 0.06, s * 1.0, 0.11, 2.9)
       .tube('steel', s * 1.15, 1.0, 2.6, s * 1.1, 3.95, 2.1, 0.09, 10).tube('steel', s * 1.2, 3.3, 2.2, s * 1.28, 3.0, 0.0, 0.055, 8).tube('rubber', s * 1.2, 3.3, 2.2, s * 1.26, 3.05, 0.5, 0.078, 8)
       .tube('steel', s * 1.12, 1.9, 2.45, s * 1.2, 1.1, 0.4, 0.05, 6);
    });
    a.rb('graphite', 2.5, 0.95, 1.35, 0.22, 0, 0.85, 2.55).box('accent', 2.0, 0.04, 0.02, 0, 1.18, 3.235);
    for (let i = 0; i < 4; i++) a.box('seam', 1.3, 0.035, 0.02, 0, 0.55 + i * 0.1, 3.235);
    a.tube('chrome', -1.0, 3.55, 2.25, 1.0, 3.55, 2.25, 0.05, 8).tube('chrome', 0, 3.5, 2.25, 0, 3.1, 2.4, 0.04, 6);
    a.at(0, 4.2, 2.05, 0.55, 0, 0, () => {
      a.rb('graphite', 2.3, 0.85, 0.5, 0.15, 0, 0, 0).disp('display', 1.1, 0.52, -0.2, 0.05, -0.255, PI);
      for (let i = 0; i < 3; i++) a.box('steel', 0.2, 0.12, 0.03, 0.62 + i * 0.25, -0.2, -0.255).box('steel', 0.2, 0.12, 0.03, 0.62 + i * 0.25, 0.0, -0.255);
      a.cyl('accent', 0.08, 0.05, -0.95, -0.2, -0.265, 'z', 10).rb('graphite', 1.9, 0.05, 0.3, 0.02, 0, 0.45, 0.05);
    });
  },
  cross_trainer(a) {                                        // 2.3 x 6.0 x 5.6 ; flywheel housing + console at +z
    sym((s) => {
      a.rb('steel', 0.3, 0.2, 5.7, 0.06, s * 0.95, 0.12, -0.1).rb('rubber', 0.4, 0.22, 0.5, 0.05, s * 0.95, 0.11, -2.8)
       .cyl('graphite', 0.85, 0.12, s * 1.02, 1.2, 1.95, 'x', 20).cyl('chrome', 0.2, 0.15, s * 1.04, 1.2, 1.95, 'x', 12)
       .tube('steel', s * 0.8, 0.95, 1.9, s * 0.8, 0.55, -1.7, 0.06).rb('rubber', 0.55, 0.14, 1.3, 0.05, s * 0.8, 0.62, -1.9).box('steel', 0.5, 0.05, 1.2, s * 0.8, 0.7, -1.9)
       .tube('steel', s * 1.12, 1.6, 2.0, s * 1.12, 4.7, 0.6, 0.06).tube('rubber', s * 1.12, 4.1, 0.9, s * 1.12, 4.85, 0.55, 0.085)
       .tube('steel', s * 0.4, 3.9, 2.3, s * 0.95, 3.3, 0.9, 0.055).tube('rubber', s * 0.93, 3.33, 1.1, s * 0.95, 3.3, 0.8, 0.075);
    });
    a.rb('graphite', 2.0, 1.55, 1.8, 0.28, 0, 1.0, 2.0).rb('steel', 2.3, 0.2, 0.3, 0.05, 0, 0.12, 2.75).rb('steel', 2.3, 0.2, 0.3, 0.05, 0, 0.12, -2.85)
     .rb('graphite', 0.7, 3.0, 0.5, 0.15, 0, 3.1, 2.3).box('accent', 0.4, 0.05, 0.02, 0, 1.0, 2.905);
    a.at(0, 5.0, 2.05, 0.5, 0, 0, () => a.rb('graphite', 1.9, 0.7, 0.35, 0.12, 0, 0, 0).disp('display', 1.2, 0.45, 0, 0.03, -0.18, PI));
  },
  upright_bike(a) {                                         // 2.0 x 4.0 x 4.4 ; flywheel + console at +z
    a.rb('steel', 2.0, 0.15, 0.4, 0.05, 0, 0.1, 1.7).rb('steel', 2.0, 0.15, 0.4, 0.05, 0, 0.1, -1.6).rb('steel', 0.3, 0.15, 3.6, 0.05, 0, 0.18, 0)
     .cyl('graphite', 0.78, 0.5, 0, 1.2, 0.95, 'x', 22).cyl('graphite', 0.62, 0.64, 0, 1.2, 0.95, 'x', 18).cyl('chrome', 0.16, 0.7, 0, 1.2, 0.95, 'x', 10)
     .tube('steel', 0, 1.0, 0.55, 0, 2.6, -0.95, 0.1, 10).tube('chrome', 0, 2.55, -0.95, 0, 3.0, -1.0, 0.07, 8).tube('steel', 0, 1.5, 1.0, 0, 3.9, 0.7, 0.1, 10)
     .tube('steel', 0, 0.3, -1.4, 0, 1.0, 0.6, 0.07, 8).tube('chrome', -0.85, 3.8, 0.78, 0.85, 3.8, 0.78, 0.045, 8);
    a.pad(0.95, 0.24, 1.05, 0, 3.12, -1.12, 0.08, 0, 0).rb('graphite', 0.4, 0.2, 0.7, 0.07, 0, 2.95, -0.95);
    sym((s) => {
      a.tube('rubber', s * 0.85, 3.8, 0.78, s * 0.62, 3.8, 0.78, 0.07, 8).tube('graphite', s * 0.45, 1.2, 0.95, s * 0.45, 0.7, 0.45, 0.05, 6).rb('rubber', 0.5, 0.1, 0.9, 0.03, s * 0.78, 0.7, 0.45)
       .tube('graphite', s * 0.45, 1.2, 0.95, s * 0.45, 1.7, 1.45, 0.05, 6).rb('rubber', 0.5, 0.1, 0.9, 0.03, s * 0.78, 1.7, 1.45);
    });
    a.at(0, 4.15, 0.6, 0.5, 0, 0, () => a.rb('graphite', 1.2, 0.6, 0.3, 0.1, 0, 0, 0).disp('display', 0.9, 0.38, 0, 0.02, -0.155, PI));
  },
  power_rack(a) {                                           // 7.2 x 4.6 x 7.8 (incl. bar overhang)
    const X = 2.0, Z = 2.1;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.rb('steel', 0.22, 7.8, 0.22, 0.05, sx * X, 3.9, sz * Z);
    for (const sx of [-1, 1]) {
      a.rb('steel', 0.22, 0.22, 4.6, 0.05, sx * X, 0.12, 0).rb('steel', 0.22, 0.22, 4.2, 0.05, sx * X, 7.7, 0).rb('accent', 0.3, 0.14, 0.4, 0.04, sx * (X - 0.18), 4.15, 1.9).rb('accent', 0.3, 0.14, 0.4, 0.04, sx * (X - 0.18), 4.15, -1.9)
       .rb('accent', 0.2, 0.1, 3.8, 0.03, sx * (X - 0.1), 1.9, 0);
      for (let i = 0; i < 9; i++) for (const sz of [-1, 1]) a.cyl('seam', 0.035, 0.24, sx * X, 1.0 + i * 0.65, sz * (Z + 0.02), 'z', 6);   // hole pattern
    }
    a.box('steel', 4.2, 0.22, 0.22, 0, 7.7, 2.1).box('steel', 4.2, 0.22, 0.22, 0, 7.7, -2.1).box('steel', 4.2, 0.22, 0.22, 0, 0.3, -2.1).tube('knurl', -2.1, 7.3, -1.2, 2.1, 7.3, -1.2, 0.06, 10)
     .rb('accent', 1.0, 0.3, 0.06, 0.02, 0, 7.5, 2.22);
    a.tube('knurl', -3.6, 4.4, -1.9, 3.6, 4.4, -1.9, 0.045, 10);                          // barbell on the rear hooks
    for (const s of [-1, 1]) {
      a.tube('chrome', s * 2.6, 4.4, -1.9, s * 3.6, 4.4, -1.9, 0.075, 10);
      [0.74, 0.74, 0.58, 0.4].forEach((r, i) => a.plate('plate', r, i < 3 ? 0.14 : 0.1, s * (2.65 + i * 0.16), 4.4, -1.9));
      a.cyl('chrome', 0.1, 0.1, s * 3.4, 4.4, -1.9, 'x', 10);
    }
  },
  lifting_platform(a, it) {                                 // 8 x 7 x 0.1
    const w = it.w || 8, d = it.d || 7;
    a.rb('rubber', w, 0.1, d, 0.03, 0, 0.05, 0).rb('wood', w * 0.5, 0.04, d, 0.012, 0, 0.115, 0).box('seam', 0.03, 0.045, d, -w * 0.25, 0.115, 0).box('seam', 0.03, 0.045, d, w * 0.25, 0.115, 0);
  },
  dumbbell_rack(a) {                                        // 5.5 x 1.9 x 2.9, two sloping tiers
    sym((s) => { a.rb('steel', 0.18, 2.4, 1.9, 0.04, s * 2.6, 1.3, 0).rb('rubber', 0.3, 0.2, 2.1, 0.05, s * 2.6, 0.1, 0); });
    a.box('steel', 5.4, 0.1, 0.12, 0, 0.5, -0.9).box('steel', 5.4, 0.1, 0.12, 0, 1.55, -0.9);
    for (const [ty, tilt] of [[0.62, -0.12], [1.62, -0.12]]) {
      a.rb('graphite', 5.2, 0.07, 1.7, 0.025, 0, ty, 0, tilt).rb('steel', 5.2, 0.16, 0.08, 0.03, 0, ty - 0.02, 0.88, tilt).box('chrome', 5.0, 0.12, 0.012, 0, ty + 0.02, 0.9 + 0.045, tilt);
      for (let i = 0; i < 12; i++) a.db(0.1 + i * 0.008 + (ty > 1 ? 0.07 : 0), -2.4 + i * 0.436, ty + (0.1 + i * 0.008 + (ty > 1 ? 0.07 : 0)) + 0.09, 0);
    }
  },
  dumbbell_tower(a) {                                       // 4.6 x 1.7 x 3.6, three-tier A-frame, rubber hex dumbbells
    sym((s) => { a.rb('steel', 0.22, 3.4, 1.5, 0.05, s * 2.2, 1.8, 0).rb('rubber', 0.3, 0.2, 1.7, 0.05, s * 2.2, 0.1, 0).rb('steel', 0.22, 0.22, 1.7, 0.05, s * 2.2, 3.4, 0); });
    for (let t = 0; t < 3; t++) {
      const y = 0.55 + t * 1.05;
      a.rb('graphite', 4.3, 0.07, 1.5, 0.025, 0, y, 0, -0.1).box('chrome', 4.0, 0.14, 0.012, 0, y + 0.03, 0.78 + 0.07, -0.1).box('steel', 4.3, 0.1, 0.1, 0, y - 0.04, -0.75);
      for (let i = 0; i < 7; i++) { const r = 0.13 + (i + t * 3) * 0.012; a.db(r, -1.8 + i * 0.6, y + r + 0.08, 0, true); }
    }
  },
  flat_bench(a) {                                           // 1.1 x 4.2 x 1.5
    a.pad(1.0, 0.25, 3.9, 0, 1.375, 0).rb('steel', 0.8, 0.08, 3.7, 0.03, 0, 1.2, 0).rb('steel', 0.22, 0.22, 3.6, 0.06, 0, 0.62, 0);
    for (const z of [-1.2, 1.2]) a.rb('steel', 0.2, 1.0, 0.2, 0.05, 0, 0.7, z).rb('steel', 1.4, 0.14, 0.3, 0.05, 0, 0.1, z).rb('rubber', 0.18, 0.15, 0.34, 0.04, -0.7, 0.1, z).rb('rubber', 0.18, 0.15, 0.34, 0.04, 0.7, 0.1, z);
  },
  adjustable_bench(a) {                                     // 1.1 x 4.4 x 1.9 ; back pad inclined, head end (-z) high
    a.pad(1.0, 0.25, 1.1, 0, 1.375, 0.75).at(0, 2.2, -0.96, 0.6, 0, 0, () => { a.pad(1.0, 0.25, 2.7, 0, 0, 0).rb('steel', 0.8, 0.06, 2.5, 0.02, 0, -0.16, 0); });
    a.rb('steel', 0.22, 0.22, 3.4, 0.06, 0, 0.35, -0.2).tube('steel', 0, 0.4, 0.9, 0, 1.2, 0.75, 0.09).tube('steel', 0, 0.4, -1.25, 0, 2.0, -1.0, 0.08).rb('steel', 0.8, 0.06, 1.0, 0.02, 0, 1.2, 0.75);
    for (const z of [0.95, -1.35]) a.rb('steel', 1.4, 0.14, 0.3, 0.05, 0, 0.1, z).rb('rubber', 0.18, 0.15, 0.34, 0.04, -0.7, 0.1, z).rb('rubber', 0.18, 0.15, 0.34, 0.04, 0.7, 0.1, z);
    a.cyl('rubber', 0.14, 0.12, 0.2, 0.15, -1.9, 'x', 10).cyl('rubber', 0.14, 0.12, -0.2, 0.15, -1.9, 'x', 10);
  },
  cable_crossover(a) {                                      // 9.0 x 3.0 x 7.5
    sym((s) => {
      const x = s * 3.6;
      for (const dx of [-0.8, 0.8]) for (const dz of [-1.2, 1.2]) a.rb('steel', 0.2, 7.5, 0.2, 0.05, x + dx, 3.75, dz);
      a.rb('steel', 2.0, 0.2, 2.8, 0.05, x, 0.12, 0).rb('steel', 2.0, 0.2, 2.8, 0.05, x, 7.4, 0).rb('graphite', 1.4, 4.4, 0.1, 0.03, x, 2.4, -1.28).stack(x, 0.35, -0.95, 1.1, 0.9, 12, 5);
      a.pulley(x, 6.8, 0.2).pulley(x, 0.9, 0.2).tube('chrome', x, 3.85, 0.2, x, 6.8, 0.2, 0.012, 4).tube('chrome', x, 0.9, 0.2, x, 2.2, 0.25, 0.012, 4)
       .rb('graphite', 0.3, 0.9, 0.2, 0.05, x, 3.85, 0.2).rb('accent', 0.3, 0.08, 0.205, 0.02, x, 3.55, 0.2).tube('chrome', x, 2.2, 0.25, x + 0.3, 2.0, 0.35, 0.02, 4).tube('rubber', x + 0.3, 2.0, 0.35, x + 0.55, 2.0, 0.35, 0.05, 8);
      a.rb('graphite', 0.9, 0.5, 0.06, 0.02, x, 5.3, -1.25).disp('display', 0.7, 0.3, x, 5.3, -1.215);
    });
    a.box('steel', 7.4, 0.2, 0.2, 0, 7.4, -1.2).box('steel', 7.4, 0.2, 0.2, 0, 7.4, 1.2).tube('knurl', -2.2, 7.0, 1.2, 2.2, 7.0, 1.2, 0.05, 10).box('steel', 7.6, 0.2, 0.2, 0, 0.1, 1.2);
  },
  leg_press(a) {                                            // 4.0 x 7.0 x 4.6, 45-degree sled, user lies head-low at -z
    sym((s) => {
      a.rb('steel', 0.22, 0.22, 6.8, 0.05, s * 1.5, 0.12, 0).tube('graphite', s * 1.1, 0.5, -1.4, s * 1.1, 4.4, 2.8, 0.11, 10).tube('steel', s * 1.5, 0.12, 3.0, s * 1.1, 4.25, 2.75, 0.09).tube('steel', s * 1.5, 0.12, -0.7, s * 1.1, 1.45, -0.35, 0.09)
       .tube('steel', s * 1.5, 0.12, 1.2, s * 1.1, 2.9, 1.0, 0.07).rb('graphite', 0.2, 0.9, 0.2, 0.04, s * 1.35, 0.6, -2.4);
    });
    a.rb('steel', 3.4, 0.2, 0.3, 0.05, 0, 0.12, 3.3).rb('steel', 3.4, 0.2, 0.3, 0.05, 0, 0.12, -3.3);
    a.at(0, 1.55, -1.9, -0.75, 0, 0, () => { a.pad(1.8, 0.28, 2.6, 0, 0, 0).rb('steel', 1.4, 0.06, 2.5, 0.02, 0, -0.17, 0); });
    a.pad(1.8, 0.28, 1.0, 0, 1.0, -0.15).rb('steel', 0.3, 0.9, 0.3, 0.05, 0, 0.5, -0.15);
    a.at(0, 3.3, 1.6, 0.82, 0, 0, () => { a.rb('graphite', 2.7, 0.2, 2.0, 0.06, 0, 0, 0).rb('chrome', 2.1, 0.04, 1.5, 0.015, 0, -0.12, 0).rb('rubber', 2.0, 0.03, 1.4, 0.01, 0, -0.13, 0); });
    a.tube('knurl', -1.6, 3.0, 1.8, 1.6, 3.0, 1.8, 0.07, 10);
    sym((s) => { a.tube('chrome', s * 1.5, 3.0, 1.8, s * 2.05, 3.0, 1.8, 0.085, 10); [0.74, 0.74, 0.58].forEach((r, i) => a.plate('plate', r, 0.14, s * (1.9 + i * 0.16), 3.0, 1.8)); });
    for (const s of [-1, 1]) a.tube('accent', s * 0.9, 0.9, -0.2, s * 0.9, 1.2, 0.0, 0.05, 6);
  },
  lat_pulldown(a) {                                         // 4.3 x 5.0 x 7.2 ; tower at +z
    a.rb('steel', 2.4, 0.2, 5.0, 0.05, 0, 0.12, 0).rb('steel', 3.6, 0.2, 0.4, 0.05, 0, 0.12, -2.3);
    sym((s) => { a.rb('steel', 0.22, 7.0, 0.22, 0.05, s * 0.95, 3.6, 2.1); });
    a.rb('graphite', 2.0, 6.6, 0.1, 0.03, 0, 3.3, 2.5).rb('steel', 2.2, 0.22, 0.9, 0.05, 0, 7.05, 1.9).rb('steel', 0.25, 0.2, 3.6, 0.05, 0, 7.05, 0.5).rb('steel', 0.22, 6.9, 0.22, 0.05, 0, 3.5, 0.6);
    a.pulley(0, 7.05, -1.1, 0.35).pulley(0, 7.05, 1.9, 0.3).tube('chrome', 0, 4.7, -1.1, 0, 7.05, -1.1, 0.012, 4).tube('chrome', 0, 7.05, -1.1, 0, 7.05, 1.9, 0.012, 4).tube('chrome', 0, 4.7, -1.1, -0.9, 4.45, -1.1, 0.012, 4)
     .tube('chrome', 0, 4.7, -1.1, 0.9, 4.45, -1.1, 0.012, 4).tube('knurl', -1.5, 4.4, -1.1, 1.5, 4.4, -1.1, 0.045, 8).tube('chrome', -1.5, 4.4, -1.1, -1.1, 4.7, -1.1, 0.04, 6).tube('chrome', 1.5, 4.4, -1.1, 1.1, 4.7, -1.1, 0.04, 6);
    a.stack(0, 0.45, 1.6, 1.7, 0.9, 14, 6);
    a.pad(1.2, 0.3, 1.0, 0, 1.75, -0.6).rb('steel', 0.3, 1.5, 0.3, 0.05, 0, 0.9, -0.6);
    for (const s of [-1, 1]) a.tube('steel', s * 0.5, 2.3, -0.95, s * 0.5, 2.9, -0.2, 0.07).cyl('leather', 0.2, 0.95, s * 0.45, 2.75, -0.2, 'z', 12);
  },
  chest_press(a) {                                          // 4.5 x 5.0 x 5.8 ; stack behind (-z)
    a.rb('steel', 3.0, 0.2, 5.0, 0.05, 0, 0.12, 0).rb('graphite', 2.0, 5.2, 1.3, 0.12, 0, 2.7, -1.9).rb('steel', 0.3, 3.6, 0.3, 0.06, 0, 2.2, -0.9, 0.1).box('accent', 1.2, 0.26, 0.05, 0, 4.5, -1.26);
    a.pad(1.2, 2.2, 0.32, 0, 3.0, -1.0, -0.12).pad(1.3, 0.3, 1.3, 0, 1.6, 0.0).rb('steel', 0.3, 1.5, 0.3, 0.05, 0, 0.9, 0.1);
    sym((s) => {
      a.tube('steel', s * 1.0, 3.4, -0.8, s * 1.0, 3.4, 1.0, 0.08).tube('rubber', s * 1.0, 3.4, 0.9, s * 1.0, 3.4, 1.6, 0.085).tube('steel', s * 1.0, 4.1, -0.7, s * 1.0, 3.4, -0.7, 0.07)
       .rb('steel', 0.18, 0.18, 2.1, 0.04, s * 1.1, 0.5, 0.8).rb('rubber', 0.2, 0.08, 0.5, 0.03, s * 1.1, 0.14, 1.7);
    });
    a.rb('graphite', 0.8, 0.5, 0.06, 0.02, 0, 5.2, -1.25).disp('display', 0.6, 0.3, 0, 5.2, -1.215);
  },
  smith_machine(a) {                                        // 7.2 x 4.2 x 7.6
    sym((s) => {
      a.rb('steel', 0.25, 7.6, 0.25, 0.05, s * 2.75, 3.8, -1.2).rb('steel', 0.22, 0.22, 4.2, 0.05, s * 2.75, 0.12, 0).tube('chrome', s * 2.55, 0.4, -0.95, s * 2.55, 7.4, -0.95, 0.05)
       .rb('accent', 0.3, 0.14, 0.4, 0.04, s * 2.55, 1.6, -0.6).rb('accent', 0.3, 0.14, 0.4, 0.04, s * 2.55, 2.2, -0.6).rb('graphite', 0.3, 0.3, 0.3, 0.05, s * 2.55, 4.5, -0.8);
      a.tube('chrome', s * 2.55, 4.5, -0.6, s * 3.4, 4.5, -0.6, 0.085, 10); [0.74, 0.58].forEach((r, i) => a.plate('plate', r, 0.14, s * (3.0 + i * 0.16), 4.5, -0.6));
    });
    a.rb('steel', 5.8, 0.25, 0.25, 0.05, 0, 7.5, -1.2).rb('steel', 5.8, 0.22, 0.25, 0.05, 0, 0.12, -1.2).rb('steel', 5.8, 0.22, 0.25, 0.05, 0, 0.12, 1.5).tube('knurl', -3.2, 4.5, -0.6, 3.2, 4.5, -0.6, 0.05, 10)
     .rb('graphite', 0.25, 7, 0.1, 0.03, -1.0, 3.7, -1.35).rb('graphite', 0.25, 7, 0.1, 0.03, 1.0, 3.7, -1.35).rb('steel', 5.8, 0.15, 0.15, 0.04, 0, 4.5, -1.2);
  },
  rubber_tile_zone(a, it) {
    const w = it.w || 10, d = it.d || 10;
    a.box('tile', w, 0.04, d, 0, 0.02, 0);
    for (let x = -w / 2 + 3; x < w / 2 - 0.5; x += 3) a.box('tileseam', 0.025, 0.045, d, x, 0.02, 0);
    for (let z = -d / 2 + 3; z < d / 2 - 0.5; z += 3) a.box('tileseam', w, 0.045, 0.025, 0, 0.02, z);
  },
  yoga_mat(a, it) { a.rb(it.color || 'accent', it.w || 2.0, 0.05, it.d || 6.0, 0.02, 0, 0.025, 0); },
  mirror_wall(a, it) {                                      // w x 7 high, thin, faces +z; panels with joints + plinth rail
    const w = it.w || 10, h = it.h || 7, n = Math.max(1, Math.round(w / 3.5)), pw = w / n;
    for (let i = 0; i < n; i++) a.box('mirror', pw - 0.02, h, 0.05, -w / 2 + pw * (i + 0.5), 0.3 + h / 2, 0);
    a.rb('steel', w + 0.1, 0.3, 0.14, 0.03, 0, 0.15, 0.02).rb('steel', w + 0.1, 0.1, 0.1, 0.03, 0, 0.3 + h, 0).rb('steel', 0.1, h, 0.1, 0.03, -w / 2, 0.3 + h / 2, 0).rb('steel', 0.1, h, 0.1, 0.03, w / 2, 0.3 + h / 2, 0);
    for (let i = 1; i < n; i++) a.box('steel', 0.04, h, 0.07, -w / 2 + pw * i, 0.3 + h / 2, 0.01);
  },
  locker_bank(a, it) {                                      // w x 1.5 x 6.0, doors face +z, 2 tiers
    const w = it.w || 12, n = Math.max(1, Math.round(w / 1.0)), cw = w / n, c = it.color || 'locker';
    a.box('graphite', w, 5.8, 1.4, 0, 3.0, -0.05).rb('steel', w, 0.2, 1.5, 0.04, 0, 0.1, 0).rb('steel', w + 0.04, 0.1, 1.5, 0.04, 0, 5.98, 0);
    for (let i = 0; i < n; i++) for (const y of [0.3, 3.2]) {
      const x = -w / 2 + cw * (i + 0.5);
      a.box(c, cw - 0.04, 2.7, 0.05, x, y + 1.55, 0.72).box('seam', cw * 0.55, 0.03, 0.01, x, y + 2.35, 0.748).box('seam', cw * 0.55, 0.03, 0.01, x, y + 2.27, 0.748).box('seam', cw * 0.55, 0.03, 0.01, x, y + 2.19, 0.748)
       .box('chrome', 0.05, 0.3, 0.05, x + cw * 0.3, y + 1.35, 0.76).box('white', 0.22, 0.1, 0.01, x, y + 2.6, 0.748);
    }
  },
  trainer_desk(a) {                                         // 5.0 x 2.2 x 3.0 ; user sits at -z, facing +z
    a.rb('wood', 5.0, 0.12, 2.2, 0.03, 0, 2.5, 0).rb('graphite', 0.12, 2.45, 2.0, 0.03, -2.4, 1.22, 0).rb('graphite', 0.12, 2.45, 2.0, 0.03, 2.4, 1.22, 0).box('graphite', 4.7, 1.3, 0.08, 0, 1.6, 0.85)
     .rb('graphite', 1.4, 1.8, 1.8, 0.04, 1.65, 1.5, -0.05).box('chrome', 0.04, 0.4, 0.04, 1.0, 1.5, -0.97)
     .rb('graphite', 1.4, 0.04, 0.6, 0.015, -0.5, 2.58, -0.1).rb('graphite', 0.14, 0.4, 0.3, 0.03, 0.0, 2.75, 0.4).rb('graphite', 1.8, 1.05, 0.06, 0.02, 0.0, 3.2, 0.45).disp('display', 1.7, 0.95, 0, 3.2, 0.483, 0)
     .rb('graphite', 0.4, 0.04, 0.4, 0.015, 0.0, 2.58, 0.45).rb('graphite', 0.3, 0.2, 0.7, 0.05, -1.7, 2.62, -0.3);
  },
  kettlebell_rack(a) {                                      // 5.0 x 1.6 x 3.0
    sym((s) => { a.rb('steel', 0.14, 2.9, 1.4, 0.03, s * 2.4, 1.5, 0).rb('steel', 0.14, 0.14, 1.6, 0.03, s * 2.4, 0.1, 0); });
    a.rb('graphite', 4.9, 0.12, 1.4, 0.03, 0, 0.5, 0).rb('graphite', 4.9, 0.12, 1.4, 0.03, 0, 1.55, 0).rb('steel', 4.9, 0.12, 0.1, 0.03, 0, 2.7, -0.65);
    const cols = ['plate', 'plate', 'accent', 'blue', 'yellow'];
    for (const [row, y] of [[0, 0.56], [1, 1.61]]) for (let i = 0; i < 5; i++) {
      const r = 0.2 + (row * 5 + i) * 0.012, x = -1.9 + i * 0.95, k = cols[(i + row * 2) % 5];
      a.ball(k, r, x, y + r, 0.0, 10);
      a.add('chrome', new a.T.TorusGeometry(r * 0.6, 0.045, 4, 10), x, y + 2 * r + r * 0.3, 0);
    }
  },
  wall_ball_rack(a) {                                       // 4.0 x 1.7 x 3.6
    sym((s) => { a.rb('steel', 0.14, 3.4, 1.6, 0.03, s * 1.9, 1.8, 0).rb('steel', 0.14, 0.14, 1.7, 0.03, s * 1.9, 0.1, 0); });
    a.rb('graphite', 3.9, 0.12, 1.5, 0.03, 0, 0.8, 0).rb('graphite', 3.9, 0.12, 1.5, 0.03, 0, 2.15, 0).rb('steel', 3.9, 0.2, 0.1, 0.03, 0, 3.45, -0.7);
    const cols = ['accent', 'blue', 'yellow'];
    for (const [row, y] of [[0, 0.86], [1, 2.21]]) for (let i = 0; i < 3; i++) {
      const r = 0.55 - row * 0.06, x = -1.15 + i * 1.15;
      a.ball(cols[(i + row) % 3], r, x, y + r, 0.0, 12).add('seam', new a.T.TorusGeometry(r * 1.002, 0.012, 3, 14), x, y + r, 0).add('seam', new a.T.TorusGeometry(r * 1.002, 0.012, 3, 14), x, y + r, 0, 0, PI / 2);
    }
  },
  two_wheeler(a) {                                          // 125 cc commuter motorcycle 1.4 x 6.0 x 3.4, nose at +z
    wheel(a, 2.05, 1.0, 0.24); wheel(a, -2.05, 1.0, 0.24);
    sym((s) => {
      a.tube('chrome', s * 0.18, 1.0, 2.05, s * 0.16, 3.0, 1.5, 0.05).tube('chrome', s * 0.2, 1.1, -2.05, s * 0.2, 1.05, -0.3, 0.05).tube('steel', s * 0.24, 1.2, -1.7, s * 0.2, 2.35, -1.35, 0.045).tube('accent', s * 0.24, 1.35, -1.65, s * 0.21, 2.1, -1.4, 0.07)
       .rb('paintk', 0.08, 0.5, 0.9, 0.04, s * 0.3, 1.85, -1.1).cyl('alloy', 0.27, 0.08, s * 0.31, 1.2, -0.1, 'x', 12).tube('chrome', s * 0.62, 3.2, 1.55, s * 0.64, 3.62, 1.5, 0.018, 5).rb('mirror', 0.26, 0.19, 0.03, 0.01, s * 0.64, 3.72, 1.5, 0, 0, s * 0.2)
       .tube('rubber', s * 0.7, 3.2, 1.55, s * 0.5, 3.2, 1.55, 0.065).tube('chrome', s * 0.17, 1.0, 0.6, s * 0.4, 1.0, 0.3, 0.025).rb('amber', 0.1, 0.1, 0.1, 0.03, s * 0.35, 2.65, -2.9);
    });
    a.tube('chrome', -0.7, 3.2, 1.55, 0.7, 3.2, 1.55, 0.04).rb('paintk', 0.38, 0.07, 1.0, 0.03, 0, 2.2, 2.2, 0.12).rb('paintk', 0.5, 0.5, 0.55, 0.18, 0, 2.85, 1.85).add('lamp', new a.T.SphereGeometry(0.15, 10, 8), 0, 2.85, 2.1)
     .rb('paintk', 0.5, 0.25, 0.3, 0.1, 0, 3.38, 1.4, 0.4).rb('paintk', 0.62, 0.78, 1.5, 0.28, 0, 2.75, 0.55, -0.12).rb('accent', 0.66, 0.12, 1.1, 0.04, 0, 2.55, 0.55, -0.12)
     .rb('leather', 0.55, 0.22, 2.1, 0.1, 0, 2.62, -0.9, 0.04).rb('alloy', 0.5, 0.9, 1.2, 0.15, 0, 1.3, 0.1).tube('steel', 0, 2.8, 1.55, 0, 1.0, 0.7, 0.06).tube('steel', 0, 2.3, 0.4, 0, 1.6, -1.8, 0.05)
     .tube('chrome', 0.3, 1.0, 0.5, 0.32, 0.95, -1.3, 0.07, 10).cyl('chrome', 0.14, 1.5, 0.33, 1.0, -1.9, 'z', 12).rb('paintk', 0.4, 0.07, 1.0, 0.03, 0, 2.3, -2.5, 0.25)
     .tube('steel', 0.22, 2.7, -1.5, 0.22, 2.75, -2.7, 0.035).tube('steel', -0.22, 2.7, -1.5, -0.22, 2.75, -2.7, 0.035).rb('lampr', 0.35, 0.14, 0.1, 0.03, 0, 2.5, -3.02);
  },
  scooter(a) {                                              // Activa-style 110 cc scooter 1.4 x 6.0 x 3.6, nose at +z
    wheel(a, 2.0, 0.72, 0.2); wheel(a, -1.75, 0.72, 0.2);
    sym((s) => {
      a.tube('chrome', s * 0.15, 0.72, 2.0, s * 0.15, 2.7, 1.55, 0.045).rb('pearl', 0.1, 0.3, 2.0, 0.04, s * 0.5, 1.0, 0.0).tube('rubber', s * 0.7, 3.2, 1.5, s * 0.5, 3.2, 1.5, 0.065)
       .tube('chrome', s * 0.62, 3.2, 1.5, s * 0.64, 3.6, 1.45, 0.018, 5).rb('mirror', 0.26, 0.19, 0.03, 0.01, s * 0.64, 3.7, 1.45, 0, 0, s * 0.2).rb('amber', 0.14, 0.1, 0.1, 0.03, s * 0.42, 3.1, 1.8)
       .tube('chrome', s * 0.3, 2.55, -1.6, s * 0.3, 2.5, -2.8, 0.035).rb('graphite', 0.1, 0.5, 1.0, 0.04, s * 0.3, 0.8, -1.3);
    });
    a.tube('chrome', -0.7, 3.2, 1.5, 0.7, 3.2, 1.5, 0.04).rb('pearl', 0.4, 0.06, 1.2, 0.03, 0, 1.55, 2.0).rb('pearl', 0.9, 2.0, 0.35, 0.14, 0, 2.0, 1.4, -0.25).rb('pearl', 1.0, 0.2, 2.0, 0.06, 0, 0.95, 0.0).rb('rubber', 0.8, 0.03, 1.6, 0.01, 0, 1.07, -0.05)
     .rb('pearl', 0.85, 1.2, 2.0, 0.25, 0, 1.55, -1.15).rb('pearl', 0.85, 0.8, 1.4, 0.25, 0, 1.75, -1.95, 0.1).rb('leather', 0.7, 0.25, 2.4, 0.11, 0, 2.35, -1.15).rb('pearl', 1.0, 0.5, 0.65, 0.2, 0, 3.4, 1.5)
     .rb('pearl', 0.6, 0.45, 0.4, 0.14, 0, 3.0, 1.95).add('lamp', new a.T.SphereGeometry(0.12, 10, 8), 0, 3.0, 2.12).rb('graphite', 0.2, 0.2, 0.1, 0.04, 0, 3.5, 1.2, 0.5).cyl('chrome', 0.16, 1.3, 0.46, 0.75, -1.85, 'z', 12)
     .rb('lampr', 0.5, 0.14, 0.1, 0.03, 0, 2.25, -2.82).rb('accent', 0.5, 0.05, 0.02, 0.01, 0, 2.0, 1.575, -0.25);
  },
  plates_tree(a) {                                          // 1.7 x 1.7 x 4.6
    a.rb('steel', 1.6, 0.14, 1.6, 0.04, 0, 0.07, 0).rb('steel', 0.3, 4.4, 0.3, 0.06, 0, 2.3, 0);
    for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1, y = 1.0 + (i >> 1) * 1.1;
      a.tube('chrome', s * 0.15, y, 0, s * 0.8, y, 0, 0.075, 10);
      [0.74, 0.58].forEach((r, j) => { if ((i + j) % 3 !== 2) a.plate('plate', r, 0.14, s * (0.38 + j * 0.16), y, 0); });
    }
    a.rb('accent', 0.3, 0.1, 0.32, 0.03, 0, 4.4, 0);
  },
  floor_plates(a) {                                         // 1.7 x 1.7 x 0.6, three plates stacked flat + one leaning
    [0.74, 0.74, 0.58].forEach((r, i) => a.at(0, 0.07 + i * 0.145, 0, 0, 0, PI / 2, () => a.plate('plate', r, 0.14, 0, 0, 0)));
  },
  floor_dumbbells(a) {                                      // 2.2 x 1.1 x 0.4, pair lying on the floor
    a.at(0, 0, 0, 0, 0.1, 0, () => { a.db(0.2, -0.55, 0.2, 0.0); a.db(0.2, 0.55, 0.2, 0.0); });
  },
  water_dispenser(a) {                                      // 1.3 x 1.3 x 4.4, bottled cooler with taps
    a.rb('pearl', 1.2, 3.0, 1.2, 0.12, 0, 1.5, 0).rb('steel', 1.0, 0.7, 0.04, 0.02, 0, 1.7, 0.61).box('seam', 0.9, 0.04, 0.12, 0, 0.9, 0.62)
     .cyl('jug', 0.5, 1.25, 0, 3.6, 0, 'y', 16).cyl('jug', 0.18, 0.35, 0, 4.4, 0, 'y', 12).rb('graphite', 1.0, 0.1, 1.0, 0.04, 0, 3.0, 0)
     .rb('blue', 0.14, 0.14, 0.2, 0.04, -0.25, 2.3, 0.66).rb('accent', 0.14, 0.14, 0.2, 0.04, 0.25, 2.3, 0.66).rb('rubber', 0.8, 0.12, 0.6, 0.03, 0, 1.85, 0.6);
  },
  towel_stack(a) {                                          // 1.2 x 0.9 x 0.5, folded gym towels (sits on a locker top)
    for (let i = 0; i < 4; i++) a.rb(i === 1 ? 'teal' : 'towel', 1.1 - (i % 2) * 0.05, 0.12, 0.8, 0.04, 0, 0.06 + i * 0.12, 0, 0, i * 0.04, 0);
  },
  foam_roller(a) {                                          // 3.0 x 0.5 x 0.5
    a.cyl('foam', 0.25, 3.0, 0, 0.25, 0, 'x', 14).cyl('graphite', 0.2, 3.01, 0, 0.25, 0, 'x', 10);
  },
  med_ball(a) {                                             // 0.9 x 0.9 x 0.9
    a.ball('blue', 0.45, 0, 0.45, 0, 12).add('seam', new a.T.TorusGeometry(0.452, 0.012, 3, 14), 0, 0.45, 0).add('seam', new a.T.TorusGeometry(0.452, 0.012, 3, 14), 0, 0.45, 0, 0, PI / 2);
  },
  wall_tv(a, it) {                                          // 3.6 x 0.2 x 2.1, wall-mounted (or ceiling pendant with item.pole = pole top, ft), faces +z
    a.rb('steel', 3.6, 2.05, 0.1, 0.03, 0, 1.05, 0.1).disp('tv', 3.5, 1.97, 0, 1.05, 0.152, 0).rb('graphite', 0.6, 0.6, 0.1, 0.03, 0, 1.05, 0.0);
    if (it.pole) a.tube('graphite', 0, 2.07, 0.1, 0, it.pole, 0.1, 0.05, 8).rb('graphite', 0.8, 0.06, 0.4, 0.02, 0, it.pole, 0.1);
  },
  speaker(a) {                                              // 0.7 x 0.6 x 1.0, wall/ceiling-mount cabinet speaker, faces +z
    a.rb('white', 0.7, 1.0, 0.5, 0.08, 0, 0.5, 0).cyl('seam', 0.22, 0.04, 0, 0.3, 0.26, 'z', 14).cyl('seam', 0.12, 0.04, 0, 0.75, 0.26, 'z', 12).rb('steel', 0.2, 0.2, 0.15, 0.03, 0, 0.5, -0.3);
  },
  bt_speaker(a) {                                           // 0.8 x 0.8 x 2.8 floor-standing PA tower for the studio
    a.rb('paintk', 0.8, 2.7, 0.8, 0.1, 0, 1.45, 0).rb('rubber', 0.9, 0.1, 0.9, 0.03, 0, 0.05, 0).cyl('seam', 0.24, 0.04, 0, 0.8, 0.41, 'z', 14).cyl('seam', 0.14, 0.04, 0, 1.65, 0.41, 'z', 12)
     .cyl('chrome', 0.05, 0.03, 0, 2.1, 0.41, 'z', 8).rb('accent', 0.14, 0.05, 0.03, 0.01, 0.25, 2.35, 0.41);
  },
  ballet_barre(a, it) {                                     // w x 0.5 x 3.7, wall-mounted double wooden barre, faces +z
    const w = it.w || 10;
    a.tube('wood', -w / 2, 3.6, 0.4, w / 2, 3.6, 0.4, 0.075, 12).tube('wood', -w / 2, 2.9, 0.4, w / 2, 2.9, 0.4, 0.075, 12);
    for (let x = -w / 2 + 0.6; x < w / 2; x += 2.4) { a.tube('chrome', x, 3.6, 0.4, x, 3.6, 0.0, 0.03, 6).tube('chrome', x, 2.9, 0.4, x, 2.9, 0.0, 0.03, 6).box('chrome', 0.12, 0.8, 0.03, x, 3.25, 0.0); }
  },
  stacked_mats(a) {                                         // 2.2 x 5.0 x 1.2, folded studio mats in a pile
    const cols = ['teal', 'accent', 'blue', 'yellow', 'teal', 'tile', 'accent', 'blue'];
    cols.forEach((c, i) => a.rb(c, 2.0 + (i % 3) * 0.08, 0.13, 4.8 - (i % 2) * 0.1, 0.04, 0, 0.07 + i * 0.14, 0, 0, ((i % 3) - 1) * 0.03, 0));
  },
};
export const GYM_KINDS = Object.keys(B).map((k) => 'gym:' + k);
const BIG = ['power_rack', 'cable_crossover', 'smith_machine', 'leg_press', 'lat_pulldown', 'chest_press', 'treadmill', 'cross_trainer'];
export function buildGymProp(kind, item = {}, THREE, mats) {
  const n = kind.replace(/^gym:/, ''), f = B[n];
  if (!f) throw new Error('no gym prop ' + kind);
  const key = `${n}|${item.w || ''}|${item.d || ''}|${item.h || ''}|${item.color || ''}|${item.pole || ''}`;
  let tpl = mats ? null : C.get(key);
  if (!tpl) {
    const a = new Acc(THREE); f(a, item);
    tpl = a.build(mats, BIG.includes(n) ? ['steel', 'graphite'] : []);
    tpl.name = kind; if (!mats) C.set(key, tpl);
  }
  return tpl.clone();
}
