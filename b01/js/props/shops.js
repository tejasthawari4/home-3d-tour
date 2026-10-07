// Procedural builders for the shops area (Section 2). Same contract as web/js/props.js builders:
// name(it, M, H) returns a THREE.Group in metres, origin at the footprint centre on the floor, front facing +z.
// H = { THREE, FT, box, localX }. A name that already exists anywhere else throws at load (no silent override).

// Materials shared by the shop builders, cached on M.
function mats(M, THREE) {
  if (M._shops) return M._shops;
  const c = document.createElement('canvas');                // galvalume slat profile: 3" pitch
  c.width = 8; c.height = 64;
  const x = c.getContext('2d');
  const grd = x.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, '#6d7074'); grd.addColorStop(0.12, '#c9ccd0'); grd.addColorStop(0.55, '#aeb2b6');
  grd.addColorStop(0.88, '#8d9195'); grd.addColorStop(1, '#55585c');
  x.fillStyle = grd; x.fillRect(0, 0, 8, 64);
  const slat = new THREE.CanvasTexture(c);
  slat.colorSpace = THREE.SRGBColorSpace;
  slat.wrapT = THREE.RepeatWrapping;
  const ceramic = M.white_plastic.clone(); ceramic.roughness = 0.12;
  M._shops = {
    slat,
    alu: new THREE.MeshStandardMaterial({ color: 0xa9adb1, roughness: 0.35, metalness: 0.8 }),
    lam: new THREE.MeshStandardMaterial({ color: 0xdcd6cc, roughness: 0.55 }),     // warm-grey laminate
    rack: new THREE.MeshStandardMaterial({ color: 0xe6e4df, roughness: 0.4, metalness: 0.3 }),   // powder-coat
    ceramic,
    top: new THREE.MeshStandardMaterial({ color: 0xcdc6b8, roughness: 0.3 }),       // honed kota-grey stone
  };
  return M._shops;
}

export default {
  // Rolling shutter, drawn up: two guide channels and the bottom rail (with lock plate) under the signage band;
  // `down` ft of slat curtain showing below the band (0 = fully up). Roll box is hidden behind the band.
  shops_shutter(it, M, { THREE, FT, box }) {
    const S = mats(M, THREE), w = it.w * FT, d = it.d * FT, h = it.h * FT, gw = 0.25 * FT;
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(box(gw, h, d, S.alu, s * (w - gw) / 2, 0, 0));
    const inner = w - 2 * gw * 0.6, down = (it.down || 0) * FT, rail = 0.22 * FT;
    if (down > 0) {
      const tex = S.slat.clone();
      tex.repeat.set(1, (it.down || 0) / 0.25);
      tex.needsUpdate = true;
      const curtain = new THREE.Mesh(new THREE.BoxGeometry(inner, down, 0.012),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.6 }));
      curtain.position.set(0, h - down / 2, -d * 0.1);
      curtain.castShadow = curtain.receiveShadow = true;
      g.add(curtain);
    }
    const ry = h - down - rail;
    g.add(box(inner, rail, d * 0.7, S.alu, 0, ry, 0));
    g.add(box(0.12, 0.08, 0.01, M.black_metal, 0, ry + rail * 0.2, d * 0.35 + 0.005));   // lock plate
    for (const s of [-1, 1]) g.add(box(0.1, 0.025, 0.03, M.black_metal, s * inner * 0.3, ry + rail * 0.3, d * 0.4));   // pull handles
    return g;
  },

  // Lightbox on the charcoal band: aluminium frame, opal face with the shop name; glows with the dusk lamps.
  shops_sign(it, M, { THREE, FT, box }) {
    const w = it.w * FT, h = it.h * FT, d = it.d * FT, f = 0.02;
    const c = document.createElement('canvas');
    c.width = 1024; c.height = Math.round(1024 * it.h / it.w);
    const x = c.getContext('2d');
    x.fillStyle = '#1e1f21'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#fff4e2';
    x.font = `600 ${Math.round(c.height * 0.52)}px "Segoe UI", Arial, sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if ('letterSpacing' in x) x.letterSpacing = `${Math.round(c.height * 0.12)}px`;
    x.fillText(it.text || 'SHOP', c.width / 2, c.height * 0.53);
    x.fillRect(c.width * 0.08, c.height * 0.86, c.width * 0.84, 3);                // thin rule under the name
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const face = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffe6c4, roughness: 0.5 });
    Object.defineProperty(face, 'emissiveIntensity', { get: () => M.shade.emissiveIntensity * 2.2, set() {} });
    const g = new THREE.Group();
    g.add(box(w, h, d * 0.8, M.charcoal, 0, 0, -d * 0.1));
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * f, h - 2 * f), face);
    panel.position.set(0, h / 2, d / 2 - 0.004);
    g.add(panel);
    return g;
  },

  // Shop counter: warm-grey laminate carcass on a recessed black kick, stone top overhanging the customer side.
  shops_counter(it, M, { THREE, FT, box }) {
    const S = mats(M, THREE), w = it.w * FT, d = it.d * FT, h = it.h * FT, top = 0.04, kick = 0.1;
    const g = new THREE.Group();
    g.add(box(w - 0.06, kick, d - 0.1, M.black_metal, 0, 0, -0.03));
    g.add(box(w, h - top - kick, d - 0.04, S.lam, 0, kick, -0.02, 0.004));
    g.add(box(w - 0.04, 0.02, 0.01, M.charcoal, 0, h * 0.62, d / 2 - 0.035));   // shadow-line groove
    g.add(box(w + 0.02, top, d, S.top, 0, h - top, 0, 0.004));
    return g;
  },

  // Open shelving on the party wall: powder-coated uprights, five plain shelves, left empty for the tenant.
  shops_shelving(it, M, { THREE, FT, box }) {
    const S = mats(M, THREE), w = it.w * FT, d = it.d * FT, h = it.h * FT, n = 5, bays = Math.max(2, Math.round(it.w / 3));
    const g = new THREE.Group();
    for (let i = 0; i <= bays; i++) {
      const x = -w / 2 + 0.02 + (i * (w - 0.04)) / bays;
      for (const z of [-d / 2 + 0.02, d / 2 - 0.02]) g.add(box(0.035, h, 0.035, S.rack, x, 0, z));
    }
    for (let j = 0; j < n; j++) g.add(box(w, 0.025, d, S.rack, 0, 0.12 + (j * (h - 0.2)) / (n - 1), 0));
    return g;
  },

  // 2 x 2 ft LED panel, surface-mounted: slim white frame, opal diffuser lit at dusk.
  shops_led_panel(it, M, { THREE, FT, box }) {
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, g = new THREE.Group();
    const lens = box(w - 0.04, 0.004, d - 0.04, M.led, 0, -0.003, 0);
    lens.castShadow = false;
    g.add(box(w, h, d, M.white_plastic), lens);
    return g;
  },

  // Small wall-hung ceramic basin with a chrome pillar tap and bottle trap; top at z + h.
  shops_wall_basin(it, M, { THREE, FT, box }) {
    const S = mats(M, THREE), w = it.w * FT, d = it.d * FT, h = it.h * FT;
    const g = new THREE.Group();
    g.add(box(w, h * 0.35, d, S.ceramic, 0, h * 0.65, 0, 0.03));
    g.add(box(w * 0.7, h * 0.4, d * 0.75, S.ceramic, 0, h * 0.3, -d * 0.05, 0.05));
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.14, 16), M.steel);
    tap.position.set(0, h + 0.07, -d / 2 + 0.07);
    const spout = box(0.02, 0.02, 0.08, M.steel, 0, h + 0.12, -d / 2 + 0.1);
    const trap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, h * 0.9, 12), M.steel);
    trap.position.set(0, -h * 0.15, -d * 0.2);
    g.add(tap, spout, trap);
    return g;
  },

  // Ceiling exhaust grille (fan ducted to the front facade, D-012).
  shops_exhaust(it, M, { THREE, FT, box }) {
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, g = new THREE.Group();
    g.add(box(w, h, d, M.white_plastic));
    for (let i = 0; i < 6; i++) g.add(box(w * 0.8, 0.004, 0.008, M.black_metal, 0, -0.003, -d * 0.35 + (i * d * 0.7) / 5));
    return g;
  },
};
