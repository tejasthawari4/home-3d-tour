// Material library. Architectural meshes get world-space UVs in metres (see house.js), so every texture
// here is sized by `tile` = metres covered by one repeat.
import * as THREE from 'three';

const TEX = 'assets/textures/';
const loader = new THREE.TextureLoader();
let aniso = 8;
const pending = [];

function tex(name, kind, srgb, tile) {
  let done;
  pending.push(new Promise((res) => { done = res; }));
  const t = loader.load(`${TEX}${name}/${kind}.jpg`, () => done(), undefined, () => done());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  t.repeat.set(1 / tile, 1 / tile);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pbr(name, { tile = 1, color = 0xffffff, rough = 1, metal = 0, normal = 1, maps = 'dnr', ...rest } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...rest });
  if (maps.includes('d')) m.map = tex(name, 'diff', true, tile);
  if (maps.includes('n')) { m.normalMap = tex(name, 'nor', false, tile); m.normalScale.set(normal, normal); }
  if (maps.includes('r')) m.roughnessMap = tex(name, 'rough', false, tile);
  return m;
}

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

// Polished 800 x 1600 mm vitrified tile: marble grain per tile, 3 mm grout. One canvas = 3.2 m x 3.2 m.
async function largeTile() {
  const img = await loadImage(`${TEX}marble_01/diff.jpg`);
  const S = 2048, tileW = S / 2, tileH = S / 4;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const r = document.createElement('canvas'); r.width = r.height = S;
  const rg = r.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const x = col * tileW, y = row * tileH;
      g.save();
      g.beginPath(); g.rect(x, y, tileW, tileH); g.clip();
      const sx = rnd() * img.width * 0.5, sy = rnd() * img.height * 0.5;
      g.fillStyle = '#e4d3bb'; g.fillRect(x, y, tileW, tileH);
      g.globalAlpha = 0.28;
      g.drawImage(img, sx, sy, img.width * 0.5, img.height * 0.5, x, y, tileW, tileW);
      g.globalAlpha = 1;
      g.restore();
    }
  }
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = '#f4e8d6'; g.fillRect(0, 0, S, S);                      // warm beige body
  g.globalCompositeOperation = 'source-over';
  rg.fillStyle = '#2a2a2a'; rg.fillRect(0, 0, S, S);                    // polished: roughness ~0.16
  const grout = 3;
  for (const [ctx, col] of [[g, '#b9a88f'], [rg, '#b4b4b4']]) {
    ctx.fillStyle = col;
    for (let i = 0; i <= 2; i++) ctx.fillRect(i * tileW - grout / 2, 0, grout, S);
    for (let j = 0; j <= 4; j++) ctx.fillRect(0, j * tileH - grout / 2, S, grout);
  }
  const map = new THREE.CanvasTexture(c), rmap = new THREE.CanvasTexture(r);
  for (const t of [map, rmap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.repeat.set(1 / 3.2, 1 / 3.2); }
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughnessMap: rmap, roughness: 1, metalness: 0, envMapIntensity: 1 });
}

export async function createMaterials(renderer) {
  aniso = renderer.capabilities.getMaxAnisotropy();
  const M = {
    // architecture (names match plan/export material names)
    plaster: pbr('white_plaster_02', { tile: 2.4, color: 0xefe9df, rough: 0.92, normal: 0.12, maps: 'n' }),   // paint
    plaster_grey: pbr('white_stucco', { tile: 3, color: 0xb9b4ab, rough: 1, normal: 0.5 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xf3f0ea, roughness: 0.96 }),                            // painted slab soffits
    stone: pbr('rock_wall_08', { tile: 1.6, color: 0x55524f, rough: 0.9, normal: 1.0 }),
    wood: pbr('teak_veneer', { tile: 1.2, color: 0xc89a6e, rough: 0.55, normal: 0.4 }),
    charcoal: new THREE.MeshStandardMaterial({ color: 0x2b2c2e, roughness: 0.45, metalness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9a9da1, roughness: 0.3, metalness: 1 }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0x9b4e2f, roughness: 0.85 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xf4fbfb, roughness: 0.02, metalness: 0, transmission: 1, thickness: 0.006, ior: 1.5,
      specularIntensity: 1, envMapIntensity: 1, side: THREE.DoubleSide,
    }),
    glass_fluted: new THREE.MeshPhysicalMaterial({             // living->kitchen slider (D-021): hides the wash zone
      color: 0xf4f7f6, roughness: 0.45, metalness: 0, transmission: 0.9, thickness: 0.02, ior: 1.5,
      side: THREE.DoubleSide,
    }),
    floor_tile: await largeTile(),
    floor_wood: pbr('laminate_floor_02', { tile: 2.0, rough: 0.6, normal: 0.5 }),
    floor_wet: pbr('anti_skid_tiles', { tile: 1.2, color: 0xe9e4dc, rough: 0.8, normal: 0.6 }),
    paving: pbr('square_brick_paving', { tile: 2.5, color: 0xd9d0c4, rough: 0.95 }),
    asphalt: pbr('asphalt_02', { tile: 4, rough: 0.95 }),
    earth: pbr('dirt', { tile: 4, color: 0xc9b39b, rough: 1 }),
    neighbour: pbr('white_stucco', { tile: 3, color: 0xcfc9bf, rough: 1, normal: 0.4 }),
    tank: new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.6 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x14203d, roughness: 0.15, metalness: 0.3 }),
    // furniture / props
    walnut: pbr('american_walnut_veneer', { tile: 1.2, color: 0xb88d6c, rough: 0.5, normal: 0.3 }),
    teak: pbr('teak_veneer', { tile: 1.2, rough: 0.5, normal: 0.3 }),
    linen: pbr('rough_linen', { tile: 0.35, color: 0xd8cbb6, rough: 0.95, normal: 0.6, maps: 'n' }),
    linen_dark: pbr('rough_linen', { tile: 0.35, color: 0x6f6254, rough: 0.95, normal: 0.6, maps: 'n' }),
    velvet_rust: pbr('velour_velvet', { tile: 0.4, color: 0x8a3a1c, rough: 0.9, normal: 0.5, maps: 'n' }),
    oat: pbr('rough_linen', { tile: 0.3, color: 0xcdbb9f, rough: 0.95, normal: 0.8, maps: 'n' }),
    marble: pbr('marble_01', { tile: 1.0, color: 0xfbf8f3, rough: 0.12, normal: 0.2 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a35c, roughness: 0.28, metalness: 1 }),
    black_metal: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.45, metalness: 0.7 }),
    white_plastic: new THREE.MeshStandardMaterial({ color: 0xf1f1ef, roughness: 0.35 }),
    screen: new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 }),
    gypsum: new THREE.MeshStandardMaterial({ color: 0xf4f1eb, roughness: 0.95 }),
    led: new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0xffc98a, emissiveIntensity: 0 }),
    // lamp shades: warm linen that glows when the lamps are on (dusk); emissive toggled in app.js
    shade: new THREE.MeshStandardMaterial({
      color: 0xefe3cf, roughness: 0.9, emissive: 0xffc98a, emissiveIntensity: 0, side: THREE.DoubleSide,
    }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xe6e9ea, roughness: 0.02, metalness: 1 }),
    wool: pbr('rough_linen', { tile: 0.25, color: 0xb9ab95, rough: 1, normal: 1.4, maps: 'n' }),
    wool_border: pbr('rough_linen', { tile: 0.25, color: 0x4a3526, rough: 1, normal: 1.4, maps: 'n' }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x223036, roughness: 0.02, metalness: 0, clearcoat: 1 }),
    flower_marigold: new THREE.MeshStandardMaterial({ color: 0xf28a0e, roughness: 0.7 }),
    flower_white: new THREE.MeshStandardMaterial({ color: 0xf6f1e8, roughness: 0.7 }),
    sheer: new THREE.MeshStandardMaterial({
      color: 0xf2ece2, roughness: 0.95, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
    }),
  };
  M.arch = (name) => M[name] || M.plaster;
  await Promise.all(pending);
  return M;
}
