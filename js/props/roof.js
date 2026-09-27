// Procedural builders for the roof area (Section 2). Same contract as web/js/props.js builders:
// name(it, M, H) returns a THREE.Group in metres, origin at the footprint centre on the floor, front facing +z.
// H = { THREE, FT, box, localX }. A name that already exists anywhere else throws at load (no silent override).

// White china mosaic: broken glazed tile shards in grey lime-cement joints. One canvas = 1 m x 1 m.
function mosaicMat(THREE) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#a9a59c'; g.fillRect(0, 0, S, S);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const n = 18, cell = S / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cx = (i + 0.5) * cell, cy = (j + 0.5) * cell, k = 4 + Math.floor(rnd() * 3), a0 = rnd() * 6;
      const v = 232 + Math.floor(rnd() * 20);
      g.fillStyle = `rgb(${v},${v},${v - 4 - Math.floor(rnd() * 8)})`;
      g.beginPath();
      for (let q = 0; q < k; q++) {
        const a = a0 + (q / k) * Math.PI * 2, r = cell * (0.36 + rnd() * 0.16);
        g[q ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });
}

// Tube along a polyline of plan-ft points relative to (ox, oy), in a face-270 (identity) item frame.
function tube(H, pts, ox, oy, dia, mat) {
  const { THREE, FT } = H;
  const v = pts.map(([x, y, z]) => new THREE.Vector3((x - ox) * FT, z * FT, -(y - oy) * FT));
  const path = new THREE.CurvePath();
  for (let i = 1; i < v.length; i++) path.add(new THREE.LineCurve3(v[i - 1], v[i]));
  const m = new THREE.Mesh(new THREE.TubeGeometry(path, v.length * 8, (dia / 2) * FT, 10, false), mat);
  m.castShadow = true;
  return m;
}

export default {
  roof_mosaic(it, M, H) {                  // flat finish slab, UVs in metres so every rectangle tiles alike
    const { THREE, FT } = H;
    M._roofMosaic ||= mosaicMat(THREE);
    const w = it.w * FT, d = it.d * FT, h = it.h * FT;
    const geo = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
    const m = new THREE.Mesh(geo, M._roofMosaic);
    m.receiveShadow = true;
    return new THREE.Group().add(m);
  },

  roof_khurra(it, M, H) {                  // cement-plaster dish falling to the outlet + CI dome grating
    const { THREE, FT } = H;
    M._roofCement ||= new THREE.MeshStandardMaterial({ color: 0x9d9a93, roughness: 0.95, side: THREE.DoubleSide });
    M._roofGrate ||= new THREE.MeshStandardMaterial({ color: 0x26272a, roughness: 0.6, metalness: 0.6, wireframe: true });
    const w = (it.w * FT) / 2, d = (it.d * FT) / 2, rim = 0.08 * FT, low = 0.045 * FT;
    const o = [it.outlet[0] * FT, low, -it.outlet[1] * FT];
    const c = [[-w, d], [w, d], [w, -d], [-w, -d]].map(([x, z]) => [x, rim, z]);
    const pos = [];
    for (let i = 0; i < 4; i++) pos.push(...c[i], ...c[(i + 1) % 4], ...o);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const g = new THREE.Group();
    const dish = new THREE.Mesh(geo, M._roofCement);
    dish.receiveShadow = true;
    g.add(dish);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * FT, 0.17 * FT, 0.02 * FT, 20), M.black_metal);
    ring.position.set(o[0], low, o[2]);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.14 * FT, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), M._roofGrate);
    dome.position.set(o[0], low, o[2]);
    g.add(ring, dome);
    return g;
  },

  roof_pipes(it, M, H) {                   // uPVC pipes (face 270 only: runs are absolute plan points)
    const { THREE, FT } = H;
    M._roofPvc ||= new THREE.MeshStandardMaterial({ color: 0xd8d6cf, roughness: 0.5 });
    const g = new THREE.Group();
    for (const r of it.runs) {
      g.add(tube(H, r.pts, it.x, it.y, r.dia, M._roofPvc));
      if (r.valve) {                       // ball valve on the down-take, red lever
        const [x, y, z] = r.valve;
        const b = new THREE.Mesh(new THREE.SphereGeometry(r.dia * 0.85 * FT, 12, 8), M.brass);
        b.position.set((x - it.x) * FT, z * FT, -(y - it.y) * FT);
        const lever = H.box(0.35 * FT, 0.04 * FT, 0.06 * FT, M.terracotta, 0.2 * FT, 0, 0);
        lever.position.y = 0.1 * FT;
        b.add(lever);
        g.add(b);
      }
    }
    return g;
  },

  roof_dcdb(it, M, H) {                    // grey powder-coated DC junction box, window, conduit to the array
    const { THREE, FT, box } = H;
    const w = it.w * FT, h = it.h * FT, d = it.d * FT;
    M._roofBox ||= new THREE.MeshStandardMaterial({ color: 0xb9bcbc, roughness: 0.55, metalness: 0.2 });
    const g = new THREE.Group();
    g.add(box(w, h, d * 0.8, M._roofBox, 0, 0, -d * 0.1, 0.01));
    g.add(box(w * 0.5, h * 0.18, 0.004, M.screen, 0, h * 0.62, d * 0.31));
    g.add(box(0.05, it.z * FT, 0.05, M._roofBox, -w * 0.3, -it.z * FT, 0));   // conduit down to the floor
    return g;
  },

  roof_ladder(it, M, H) {                  // MS cat ladder: stiles 1'-6" apart, 12" rungs, wall brackets
    const { FT, box } = H;
    const w = it.w * FT, h = it.h * FT, d = it.d * FT, z = d / 2 - 0.05;
    const g = new H.THREE.Group();
    for (const s of [-1, 1]) g.add(box(0.05, h, 0.012, M.charcoal, s * (w / 2 - 0.03), 0, z));
    for (let y = 1.0; y < it.h - 0.2; y += 1.0) g.add(box(w - 0.06, 0.025, 0.025, M.charcoal, 0, y * FT, z));
    for (const y of [1.5, 5.0, 8.0]) {
      for (const s of [-1, 1]) g.add(box(0.03, 0.04, d - 0.05, M.charcoal, s * (w / 2 - 0.03), y * FT, 0));
    }
    return g;
  },

  roof_rail(it, M, H) {                    // on the parapet top: 40 mm posts at ~4 ft, top rail + mid rail
    const { FT, box } = H;
    const L = it.w * FT + 0.375 * FT, h = it.h * FT, z = -it.back * FT;
    const g = new H.THREE.Group();
    g.add(box(L, 0.04, 0.05, M.charcoal, 0, h - 0.04, z));
    g.add(box(L, 0.025, 0.025, M.charcoal, 0, h * 0.5, z));
    const n = Math.max(1, Math.round(it.w / 4));
    for (let i = 0; i <= n; i++) g.add(box(0.035, h - 0.04, 0.035, M.charcoal, -L / 2 + 0.03 + (i * (L - 0.06)) / n, 0, z));
    return g;
  },

  roof_pergola(it, M, H) {                 // MS box posts + beams, teak-finish WPC slats running E-W
    const { FT, box } = H;
    const w = it.w * FT, d = it.d * FT, h = it.h * FT, p = 0.1, bw = 0.06, bh = 0.15;
    const g = new H.THREE.Group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(p, h, p, M.charcoal, sx * (w / 2 - p / 2), 0, sz * (d / 2 - p / 2)));
    for (const sz of [-1, 1]) g.add(box(w, bh, bw, M.charcoal, 0, h - bh, sz * (d / 2 - p / 2)));
    for (const sx of [-1, 1]) g.add(box(bw, bh, d, M.charcoal, sx * (w / 2 - p / 2), h - bh, 0));
    const n = Math.floor(d / 0.16);
    for (let i = 0; i <= n; i++) g.add(box(w + 0.1, 0.03, 0.09, M.wood, 0, h, -d / 2 + (i * d) / n));
    return g;
  },

  roof_festoon(it, M, H) {                 // festoon string: sagging cable with warm bulbs (M.shade glows at dusk)
    const { THREE, FT } = H;
    const L = it.w * FT, sag = it.h * FT, n = 9;
    const g = new THREE.Group();
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push(new THREE.Vector3(-L / 2 + t * L, sag * 4 * t * (1 - t) * -1 + sag, 0));
    }
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.004, 5), M.black_metal);
    g.add(cable);
    const bulb = new THREE.SphereGeometry(0.03, 10, 8);
    for (let i = 1; i < n; i++) {
      const t = i / n, b = new THREE.Mesh(bulb, M.shade);
      b.position.set(-L / 2 + t * L, sag - sag * 4 * t * (1 - t) - 0.05, 0);
      b.castShadow = false;
      g.add(b);
    }
    return g;
  },
};

