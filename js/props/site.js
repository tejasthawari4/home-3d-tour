// Procedural builders for the site area (Section 2). Same contract as web/js/props.js builders:
// name(it, M, H) returns a THREE.Group in metres, origin at the footprint centre on the floor, front facing +z.
// H = { THREE, FT, box, localX }. A name that already exists anywhere else throws at load (no silent override).

function mats(M, THREE) {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  M._siteWhite ||= std(0xe9e6dc, { roughness: 0.6 });
  M._siteYellow ||= std(0xe0b21a, { roughness: 0.6 });
  M._siteRubber ||= std(0x1b1b1b, { roughness: 0.95 });
  M._siteIron ||= std(0x3a3835, { roughness: 0.55, metalness: 0.6 });
  M._siteSoil ||= std(0x4a3526, { roughness: 1 });
  M._siteLeaf ||= std(0x4f6b35, { roughness: 0.85, flatShading: true });
  M._siteLeafDark ||= std(0x34502a, { roughness: 0.9, flatShading: true });
  M._siteBark ||= std(0x6b5a4a, { roughness: 0.9 });
  M._siteBloom ||= std(0xfff6e0, { roughness: 0.5 });
  if (!M._siteGlow) {                   // warm lens that lights with the dusk lamp switch (app.js drives M.shade)
    M._siteGlow = std(0xfff1d6, { emissive: 0xffc98a, roughness: 0.3 });
    Object.defineProperty(M._siteGlow, 'emissiveIntensity', { get: () => M.shade.emissiveIntensity * 2, set() {} });
  }
  return M;
}

// flat painted strip, dx/dz in local metres
function strip(THREE, mat, w, d, x, z, rot = 0, y = 0.003) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.set(-Math.PI / 2, 0, rot);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

// crude seeded shrub: a few squashed icosahedra
function shrub(THREE, M, r, x, z, seed) {
  const g = new THREE.Group();
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (0.35 + rnd() * 0.3), 0), i % 2 ? M._siteLeaf : M._siteLeafDark);
    m.position.set(x + (rnd() - 0.5) * r, r * (0.5 + rnd() * 0.6), z + (rnd() - 0.5) * r * 0.6);
    m.scale.y = 0.8;
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

export default {
  // it.rects = [[x0, y0, x1, y1], ...] in plan feet, painted white on the floor
  site_paint(it, M, { THREE, FT }) {
    mats(M, THREE);
    const g = new THREE.Group();
    for (const [x0, y0, x1, y1] of it.rects) {
      g.add(strip(THREE, M._siteWhite, (x1 - x0) * FT, (y1 - y0) * FT, ((x0 + x1) / 2 - it.x) * FT, -((y0 + y1) / 2 - it.y) * FT));
    }
    return g;
  },

  // yellow outline + diagonal hatch + the driver door's swing arc (hinge at the zone's west edge, on the car side)
  site_door_zone(it, M, { THREE, FT }) {
    mats(M, THREE);
    const w = it.w * FT, d = it.d * FT, t = 0.06, g = new THREE.Group();   // local x = plan x (face 270), +z = south
    g.add(strip(THREE, M._siteYellow, w, t, 0, -d / 2 + t / 2), strip(THREE, M._siteYellow, w, t, 0, d / 2 - t / 2),
      strip(THREE, M._siteYellow, t, d, -w / 2 + t / 2, 0), strip(THREE, M._siteYellow, t, d, w / 2 - t / 2, 0));
    const n = 6, l = d * 0.9, half = w / 2 - l * 0.36;   // 45 degree stripes, kept inside the outline
    for (let i = 0; i < n; i++) g.add(strip(THREE, M._siteYellow, 0.04, l, -half + (2 * half * i) / (n - 1), 0, Math.PI / 4, 0.004));
    const r = 3.2 * FT;                           // door ~1 m, opened ~65 degrees
    const arc = new THREE.Mesh(new THREE.RingGeometry(r - 0.04, r, 32, 1, 0, (65 * Math.PI) / 180), M._siteYellow);
    arc.rotation.x = -Math.PI / 2;
    arc.position.set(-w / 2, 0.005, d / 2);
    g.add(arc);
    return g;
  },

  // two yellow-banded rubber blocks under the front wheels; width runs across the bay
  site_wheel_stop(it, M, { THREE, FT, box }) {
    mats(M, THREE);
    const h = it.h * FT, d = it.d * FT, seg = 1.8 * FT, g = new THREE.Group();
    for (const s of [-1, 1]) {
      const x = s * (it.w * FT / 2 - seg / 2);
      g.add(box(seg, h, d, M._siteRubber, x, 0, 0, 0.02));
      for (const b of [-1, 1]) g.add(box(0.12, h + 0.004, d + 0.004, M._siteYellow, x + b * seg * 0.25, 0, 0));
    }
    return g;
  },

  // flush cover: square cast-iron manhole (sump) or round (it.round) RWH bore cap
  site_cover(it, M, { THREE, FT, box }) {
    mats(M, THREE);
    const w = it.w * FT, h = it.h * FT, g = new THREE.Group();
    if (it.round) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 32), M._siteIron);
      m.position.y = h / 2;
      g.add(m);
    } else {
      g.add(box(w, h, w, M.steel, 0, 0, 0));
      g.add(box(w - 0.08, h + 0.004, w - 0.08, M._siteIron, 0, 0, 0));
      for (let i = -2; i <= 2; i++) g.add(box(w - 0.14, h + 0.008, 0.015, M.steel, 0, 0, i * 0.1));
    }
    return g;
  },

  // four grey meter doors (home, shop 1, shop 2, spare) with viewing windows
  site_meter_bank(it, M, { THREE, FT, box }) {
    mats(M, THREE);
    const w = it.w * FT, h = it.h * FT, d = it.d * FT, g = new THREE.Group();
    g.add(box(w, h, d, M.plaster_grey, 0, 0, 0, 0.01));
    for (let i = 0; i < 4; i++) {
      const x = -w / 2 + (i + 0.5) * (w / 4);
      g.add(box(w / 4 - 0.04, h - 0.1, 0.02, M.steel, x, 0.05, d / 2));
      g.add(box(0.12, 0.08, 0.01, M.glass, x, h * 0.62, d / 2 + 0.015));
      g.add(box(0.02, 0.1, 0.02, M.black_metal, x + w / 8 - 0.06, h * 0.45, d / 2 + 0.02));
    }
    return g;
  },

  // 7 kW wall box, status LED, holstered connector and a coiled cable on a hook below
  site_ev_charger(it, M, { THREE, FT, box }) {
    mats(M, THREE);
    const w = it.w * FT, h = it.h * FT, d = it.d * FT, g = new THREE.Group();
    const body = h * 0.45;
    g.add(box(w * 0.7, body, d * 0.6, M.white_plastic, 0, h - body, -d * 0.2, 0.03));
    g.add(box(w * 0.5, 0.02, 0.01, M._siteGlow, 0, h - body * 0.25, d * 0.1 + 0.005));
    g.add(box(0.07, 0.14, 0.1, M.black_metal, w * 0.25, h - body * 0.8, d * 0.15, 0.02));     // connector
    g.add(box(0.12, 0.03, 0.12, M.black_metal, 0, h * 0.3, -d * 0.3 + 0.06));               // hook
    const coil = new THREE.TorusGeometry(0.13, 0.012, 8, 32);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(coil, M.black_metal);
      c.position.set((i - 1) * 0.015, h * 0.3 - 0.13, -d * 0.3 + 0.12 + i * 0.02);
      c.castShadow = true;
      g.add(c);
    }
    const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h - body - h * 0.3 + 0.02, 8), M.black_metal);
    lead.position.set(w * 0.25, h * 0.3 + (h - body - h * 0.3) / 2, d * 0.1);
    g.add(lead);
    return g;
  },

  // brick planter in grey plaster with a stone coping, soil and a row of shrubs
  site_planter(it, M, { THREE, FT, box }) {
    mats(M, THREE);
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, g = new THREE.Group();
    g.add(box(w, h, d, M.plaster_grey, 0, 0, 0));
    g.add(box(w + 0.03, 0.05, d + 0.03, M.stone, 0, h, 0));
    g.add(box(w - 0.18, 0.02, d - 0.18, M._siteSoil, 0, h + 0.035, 0));
    const n = Math.max(2, Math.round(w / 0.7));
    for (let i = 0; i < n; i++) g.add(shrub(THREE, M, 0.2, -w / 2 + (i + 0.5) * (w / n), 0, 11 + i * 7).translateY(h));
    return g;
  },

  // champa (frangipani) in a round bed: forked trunk, clumped canopy with white flowers
  site_tree(it, M, { THREE, FT, box }) {
    mats(M, THREE);
    const w = it.w * FT, H = it.h * FT, g = new THREE.Group();
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.35, 24), M.plaster_grey);
    bed.position.y = 0.175;
    g.add(bed);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, H * 0.55, 10), M._siteBark);
    trunk.position.y = 0.35 + H * 0.27;
    g.add(trunk);
    let s = 5;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + rnd(), r = 0.2 + rnd() * 0.15, o = 0.25 + rnd() * 0.4;
      const x = Math.cos(a) * o, z = Math.sin(a) * o, y = H * (0.6 + rnd() * 0.3);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.8, 6), M._siteBark);
      br.position.set(x / 2, y - 0.3, z / 2);
      br.lookAt(x, y + 0.5, z);
      br.rotateX(Math.PI / 2);
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), i % 2 ? M._siteLeaf : M._siteLeafDark);
      c.position.set(x, y, z);
      c.scale.y = 0.45;
      c.castShadow = true;
      g.add(br, c);
      for (let k = 0; k < 3; k++) {
        const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), M._siteBloom);
        f.position.set(x + (rnd() - 0.5) * r, y + r * 0.45, z + (rnd() - 0.5) * r);
        g.add(f);
      }
    }
    g.add(shrub(THREE, M, 0.18, 0, 0, 3).translateY(0.35));
    return g;
  },

  // plastered gate pillar with stone cap, brass-lettered nameplate on the street face (+z = east), lantern on top
  site_gate_pillar(it, M, { THREE, FT, box }) {
    mats(M, THREE);
    const w = it.w * FT, h = it.h * FT, g = new THREE.Group();
    g.add(box(w, h, w, M.plaster, 0, 0, 0));
    g.add(box(w + 0.06, 0.08, w + 0.06, M.stone, 0, h, 0));
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 256;
    const x = cv.getContext('2d');
    x.fillStyle = '#2a2724'; x.fillRect(0, 0, 512, 256);
    x.fillStyle = '#d8b46a'; x.textAlign = 'center';
    x.font = 'bold 84px Georgia, serif'; x.fillText('HOME', 256, 140);      // owner to confirm the wording
    x.fillRect(96, 172, 320, 4);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.84, w * 0.42),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.3 }));
    plate.position.set(0, h - 0.45, w / 2 + 0.004);
    g.add(plate);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 16), M._siteGlow);
    lamp.position.y = h + 0.08 + 0.11;
    g.add(lamp, box(0.24, 0.03, 0.24, M.black_metal, 0, h + 0.3, 0));
    return g;
  },

  // low brick-light on the compound wall: black box, warm lens facing the drive
  site_wall_light(it, M, { THREE, FT, box }) {
    mats(M, THREE);
    const w = it.w * FT, h = it.h * FT, d = it.d * FT, g = new THREE.Group();
    g.add(box(w, h, d, M.black_metal, 0, 0, 0, 0.005));
    g.add(box(w * 0.8, h * 0.35, 0.01, M._siteGlow, 0, h * 0.15, d / 2));
    g.add(box(w * 0.9, 0.02, 0.05, M.black_metal, 0, h * 0.55, d / 2 + 0.02));   // glare hood
    return g;
  },
};
