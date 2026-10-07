// Procedural builders for the core area (Section 2). Same contract as web/js/props.js builders:
// name(it, M, H) returns a THREE.Group in metres, origin at the footprint centre on the floor, front facing +z.
// H = { THREE, FT, box, localX }. A name that already exists anywhere else throws at load (no silent override).

// Straight bar (box) or rod (cylinder) between two points in the item's local X-Y plane, at local depth z.
function bar(THREE, a, b, t, dz, mat, z) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const m = new THREE.Mesh(new THREE.BoxGeometry(L, t, dz), mat);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
  m.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function rod(THREE, a, b, r, mat, z) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L + r, 16), mat);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
  m.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2;
  m.castShadow = true;
  return m;
}
// Local height of a polyline at local x (pts sorted or not).
function yAt(p, x) {
  for (let i = 0; i < p.length - 1; i++) {
    const [a, b] = p[i][0] <= p[i + 1][0] ? [p[i], p[i + 1]] : [p[i + 1], p[i]];
    if (x >= a[0] - 1e-6 && x <= b[0] + 1e-6) return b[0] === a[0] ? Math.max(a[1], b[1]) : a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }
  return p[0][1];
}
const textTex = {};
function label(THREE, text, bg, fg, w, h) {
  const key = `${text}|${bg}|${fg}|${w}|${h}`;
  if (!textTex[key]) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = Math.max(64, Math.round(512 * h / w));
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = text.split('\n');
    const fs = Math.min(c.height / (lines.length + 0.6), 512 / (Math.max(...lines.map((l) => l.length)) * 0.62));
    g.font = `600 ${fs}px Georgia, serif`;
    lines.forEach((l, i) => g.fillText(l, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * fs * 1.1));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    textTex[key] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
  }
  return textTex[key];
}

export default {
  // Stair handrail / balustrade along a polyline. it.pts = [[u, z], ...]: u in world ft along the item's width
  // axis, z in ft above the item's base = the nosing (pitch) line. mount 'wall': 1.5" brushed-steel rail on
  // brackets to the wall behind, top it.top above the nosings, LED strip under it (washes the treads at dusk).
  // mount 'glass': 12 mm toughened glass in a steel shoe (LED in the shoe), round teak rail on top at it.top;
  // with it.cap (level top, ft above base) the glass rises to a flat teak cap (a guard over a void) and the
  // handrail runs on stand-offs on the front face instead.
  core_rail(it, M, H) {
    const { THREE, FT, localX } = H, g = new THREE.Group();
    const d = it.d * FT, top = (it.top ?? 2.9) * FT, drop = (it.drop ?? 0.2) * FT;
    const p = it.pts.map(([u, z]) => [localX(it, u), z * FT]).sort((a, b) => a[0] - b[0]);
    const up = (k) => p.map(([x, y]) => [x, y + k]);
    M._coreTeak ||= M.teak;
    const r = 0.019;
    if (it.mount === 'wall') {
      const zr = d / 2 - r - 0.005, rail = up(top);
      for (let i = 0; i < rail.length - 1; i++) {
        g.add(rod(THREE, rail[i], rail[i + 1], r, M.steel, zr));
        g.add(bar(THREE, [rail[i][0], rail[i][1] - r - 0.006], [rail[i + 1][0], rail[i + 1][1] - r - 0.006], 0.006, 0.012, M.led, zr));
      }
      const x0 = p[0][0], x1 = p[p.length - 1][0], n = Math.max(2, Math.ceil((x1 - x0) / 1.1) + 1);
      for (let i = 0; i < n; i++) {                         // brackets every ~3'-7"
        const x = x0 + 0.08 + (x1 - x0 - 0.16) * i / (n - 1), y = yAt(rail, x);
        g.add(bar(THREE, [x, y - r - 0.05], [x, y - r], 0.012, 0.012, M.steel, zr));
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, d - 0.02), M.steel);
        arm.position.set(x, y - r - 0.05, 0);
        g.add(arm);
        const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 20), M.steel);
        rose.rotation.x = Math.PI / 2;
        rose.position.set(x, y - r - 0.05, -d / 2 + 0.005);
        g.add(rose);
      }
      return g;
    }
    // glass balustrade
    const zg = it.cap != null ? -d / 2 + 0.03 : 0, t = 0.012;
    const topLine = it.cap != null ? p.map(([x]) => [x, it.cap * FT]) : up(top - r);
    const shape = new THREE.Shape();
    const bot = up(-drop);
    shape.moveTo(...bot[0]);
    bot.slice(1).forEach((q) => shape.lineTo(...q));
    [...topLine].reverse().forEach((q) => shape.lineTo(...q));
    const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false }), M.glass);
    glass.position.z = zg - t / 2;
    g.add(glass);
    for (let i = 0; i < bot.length - 1; i++) {                 // base shoe with an LED lip
      g.add(bar(THREE, [bot[i][0], bot[i][1] - 0.03], [bot[i + 1][0], bot[i + 1][1] - 0.03], 0.1, 0.05, M.steel, zg));
      g.add(bar(THREE, [bot[i][0], bot[i][1] + 0.02], [bot[i + 1][0], bot[i + 1][1] + 0.02], 0.006, 0.052, M.led, zg));
      if (it.cap != null) g.add(bar(THREE, topLine[i], topLine[i + 1], 0.03, 0.07, M._coreTeak, zg));
      else g.add(rod(THREE, topLine[i], topLine[i + 1], r + 0.004, M._coreTeak, zg));
    }
    if (it.cap != null) {                                   // sloped handrail on stand-offs, front face
      const rail = up(top), zr = zg + 0.07;
      for (let i = 0; i < rail.length - 1; i++) g.add(rod(THREE, rail[i], rail[i + 1], r, M._coreTeak, zr));
      const x0 = p[0][0], x1 = p[p.length - 1][0], n = Math.max(2, Math.ceil((x1 - x0) / 1.1) + 1);
      for (let i = 0; i < n; i++) {
        const x = x0 + 0.08 + (x1 - x0 - 0.16) * i / (n - 1);
        const so = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 10), M.steel);
        so.rotation.x = Math.PI / 2;
        so.position.set(x, yAt(rail, x), zg + 0.035);
        g.add(so);
      }
    }
    return g;
  },

  // Flat plate with engraved-looking text (nameplate, lift sign, letter-box labels): it.text, it.bg, it.fg.
  core_sign(it, M, H) {
    const { THREE, FT, box } = H, w = it.w * FT, h = it.h * FT, d = it.d * FT, g = new THREE.Group();
    g.add(box(w, h, d * 0.6, M[it.frame || 'brass'], 0, 0, -d * 0.2));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.012, h - 0.012), label(THREE, it.text, it.bg || '#2b2c2e', it.fg || '#d9b56e', w, h));
    face.position.set(0, h / 2, d * 0.1 + 0.001);
    g.add(face);
    return g;
  },

  // Lift call station (future car, D-013): brushed-steel plate, up/down buttons, floor indicator.
  core_lift_panel(it, M, H) {
    const { THREE, FT, box } = H, w = it.w * FT, h = it.h * FT, d = it.d * FT, g = new THREE.Group();
    g.add(box(w, h, d, M.steel, 0, 0, 0, 0.004));
    g.add(box(w * 0.6, h * 0.14, 0.004, M.black_metal, 0, h * 0.74, d / 2));
    for (const y of [0.42, 0.26]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.16, w * 0.16, 0.008, 24), M.led);
      b.rotation.x = Math.PI / 2;
      b.position.set(0, h * y, d / 2 + 0.004);
      g.add(b);
    }
    return g;
  },

  // Four lockable letter boxes (2 x 2), powder-coated charcoal with brass slots and teak label strips.
  core_letterbox(it, M, H) {
    const { THREE, FT, box } = H, w = it.w * FT, h = it.h * FT, d = it.d * FT, g = new THREE.Group();
    g.add(box(w, h, d, M.charcoal, 0, 0, 0, 0.004));
    const names = it.names || ['FLAT 101', 'FLAT 201', 'SHOP 1', 'SHOP 2'];
    const cw = w / 2, ch = h / 2;
    names.forEach((n, i) => {
      const cx = -w / 4 + (i % 2) * cw, cy = ch * (1 - Math.floor(i / 2));
      g.add(box(cw - 0.012, ch - 0.012, 0.006, M.charcoal, cx, cy + 0.006, d / 2));
      g.add(box(cw * 0.6, 0.012, 0.004, M.brass, cx, cy + ch * 0.72, d / 2 + 0.006));
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(cw * 0.62, ch * 0.2), label(THREE, n, '#f3ede2', '#2b2c2e', cw * 0.62, ch * 0.2));
      lab.position.set(cx, cy + ch * 0.4, d / 2 + 0.0065);
      g.add(lab);
      g.add(box(0.01, 0.01, 0.006, M.brass, cx + cw * 0.36, cy + ch * 0.3, d / 2 + 0.006));
    });
    return g;
  },

  // Lobby bench: teak slatted seat on a steel frame, open shoe shelf below.
  core_bench(it, M, H) {
    const { THREE, FT, box } = H, w = it.w * FT, h = it.h * FT, d = it.d * FT, g = new THREE.Group();
    const n = 7;
    for (let i = 0; i < n; i++) g.add(box(w, 0.03, d / n - 0.008, M.teak, 0, h - 0.03, -d / 2 + (i + 0.5) * d / n, 0.004));
    g.add(box(w - 0.04, 0.02, d - 0.04, M.teak, 0, 0.12, 0));
    for (const sx of [-1, 1]) {
      g.add(box(0.03, h - 0.03, 0.03, M.black_metal, sx * (w / 2 - 0.03), 0, d / 2 - 0.03));
      g.add(box(0.03, h - 0.03, 0.03, M.black_metal, sx * (w / 2 - 0.03), 0, -d / 2 + 0.03));
      g.add(box(0.03, 0.03, d - 0.06, M.black_metal, sx * (w / 2 - 0.03), h - 0.06, 0));
    }
    return g;
  },

  // Wall sconce by the flat door: brass back plate, opal-glass up/down cylinder (glows at dusk).
  core_sconce(it, M, H) {
    const { THREE, FT, box } = H, h = it.h * FT, d = it.d * FT, g = new THREE.Group();
    g.add(box(0.07, h * 0.5, 0.01, M.brass, 0, h * 0.25, -d / 2 + 0.005));
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, h * 0.9, 24), M.shade);
    c.position.set(0, h * 0.45, 0);
    g.add(c);
    g.add(box(0.1, 0.012, 0.1, M.brass, 0, h * 0.9, 0));
    g.add(box(0.1, 0.012, 0.1, M.brass, 0, 0, 0));
    return g;
  },

  // Door-bell push + light switch plate.
  core_bell(it, M, H) {
    const { THREE, FT, box } = H, w = it.w * FT, h = it.h * FT, d = it.d * FT, g = new THREE.Group();
    g.add(box(w, h, d, M.white_plastic, 0, 0, 0, 0.003));
    const b = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.2, w * 0.2, 0.006, 20), M.brass);
    b.rotation.x = Math.PI / 2;
    b.position.set(0, h * 0.62, d / 2 + 0.003);
    g.add(b, box(w * 0.4, h * 0.18, 0.004, M.led, 0, h * 0.22, d / 2 + 0.001));
    return g;
  },
};
