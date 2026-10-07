// Procedural builders for the guest area (Section 2). Same contract as web/js/props.js builders:
// name(it, M, H) returns a THREE.Group in metres, origin at the footprint centre on the floor, front facing +z.
// H = { THREE, FT, box, localX }. A name that already exists anywhere else throws at load (no silent override).
export default {
  guest_console(it, M, H) {              // passage console: walnut top + low shelf on a slim brushed-brass frame
    const { THREE, FT, box } = H, w = it.w * FT, d = it.d * FT, h = it.h * FT, g = new THREE.Group();
    g.add(box(w, 0.035, d, M.walnut, 0, h - 0.035, 0, 0.006));
    g.add(box(w - 0.08, 0.025, d - 0.06, M.walnut, 0, 0.14, 0, 0.004));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(box(0.02, h - 0.035, 0.02, M.brass, sx * (w / 2 - 0.03), 0, sz * (d / 2 - 0.03)));
    }
    return g;
  },

  guest_rack(it, M, H) {                 // slotted-angle steel shelving with stored boxes and cans
    const { THREE, FT, box } = H, w = it.w * FT, d = it.d * FT, h = it.h * FT, g = new THREE.Group();
    const n = Math.max(3, Math.round(it.h / 1.6));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(box(0.035, h, 0.035, M.steel, sx * (w / 2 - 0.018), 0, sz * (d / 2 - 0.018)));
    }
    const load = [M.linen_dark, M.oat, M.terracotta, M.white_plastic, M.linen];
    for (let i = 0; i < n; i++) {
      const y = 0.08 + (i * (h - 0.12)) / (n - 1);
      g.add(box(w, 0.012, d, M.steel, 0, y, 0));
      if (i === n - 1) break;
      for (let k = 0, x = -w / 2 + 0.06; k < 4; k++) {       // a few cartons / tins per shelf
        const bw = 0.18 + ((i * 3 + k * 5) % 4) * 0.05, bh = 0.14 + ((i + k) % 3) * 0.07;
        if (x + bw > w / 2 - 0.05) break;
        g.add(box(bw, bh, d * 0.7, load[(i + k) % load.length], x + bw / 2, y + 0.012, 0, 0.004));
        x += bw + 0.05;
      }
    }
    return g;
  },

  guest_pump(it, M, H) {                 // 0.5 hp pressure booster: blue motor + pump head on a base, small tank
    const { THREE, FT, box } = H, w = it.w * FT, d = it.d * FT, g = new THREE.Group();
    const blue = (M._guestPump ||= new THREE.MeshStandardMaterial({ color: 0x2f5d8a, roughness: 0.45, metalness: 0.2 }));
    g.add(box(w, 0.04, d, M.concrete, 0, 0, 0));
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, w * 0.45, 24), blue);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(-w * 0.18, 0.16, d * 0.15);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 24), M.steel);
    head.rotation.z = Math.PI / 2;
    head.position.set(w * 0.1, 0.16, d * 0.15);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 24), blue);
    tank.position.set(w * 0.3, 0.21, -d * 0.2);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 12), M.white_plastic);
    pipe.position.set(w * 0.1, 0.45, -d * 0.35);
    g.add(motor, head, tank, pipe);
    g.traverse((o) => { o.castShadow = o.receiveShadow = o.isMesh; });
    return g;
  },

  guest_inverter(it, M, H) {             // steel trolley: two tall tubular batteries below, the inverter on top shelf
    const { THREE, FT, box } = H, w = it.w * FT, d = it.d * FT, h = it.h * FT, g = new THREE.Group();
    const shelf = h * 0.62;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(box(0.03, h, 0.03, M.black_metal, sx * (w / 2 - 0.015), 0, sz * (d / 2 - 0.015)));
    }
    g.add(box(w, 0.015, d, M.black_metal, 0, 0.05, 0));
    g.add(box(w, 0.015, d, M.black_metal, 0, shelf, 0));
    for (const sx of [-1, 1]) {
      g.add(box(w * 0.4, shelf - 0.1, d * 0.75, M.white_plastic, sx * w * 0.23, 0.065, 0, 0.01));
      g.add(box(w * 0.4, 0.03, d * 0.75, M.velvet_rust, sx * w * 0.23, shelf - 0.065, 0, 0.005));   // terminal caps
    }
    g.add(box(w * 0.6, h - shelf - 0.03, d * 0.7, M.charcoal, 0, shelf + 0.015, 0, 0.02));
    g.add(box(w * 0.2, 0.05, 0.004, M.led, 0, h - 0.12, d * 0.35 + 0.002));                         // display
    return g;
  },
};
