// Residence — first floor viewer. Real-time: sun at the site's latitude, soft shadows, GTAO, AgX.
// Photo mode: progressive path tracing (three-gpu-pathtracer) of the current view.
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { WebGLPathTracer, DenoiseMaterial } from 'three-gpu-pathtracer';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { P, FT, vfovFromLens } from './util.js';
import { createMaterials } from './materials.js';
import { buildHouse } from './house.js';
import { furnish } from './furnish.js';
import { Walk } from './walk.js';

const params = new URLSearchParams(location.search);
const ui = {
  status: document.getElementById('status'),
  bar: document.getElementById('bar'),
  loader: document.getElementById('loader'),
  photoInfo: document.getElementById('photo-info'),
};
const setStatus = (t) => { if (ui.status) ui.status.textContent = t; };

// ---------------------------------------------------------------- renderer + scene
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = +(params.get('ev') || 1.0);
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 400);

setStatus('Loading plan data…');
const data = await (await fetch('data/house.json')).json();
const LV = data.meta.level;

setStatus('Loading materials…');
const M = await createMaterials(renderer);
const house = buildHouse(data, M);
scene.add(house.root);

setStatus('Loading sky…');
const sky = await new HDRLoader().loadAsync('assets/hdri/sky_2k.hdr');
sky.mapping = THREE.EquirectangularReflectionMapping;
scene.background = sky;
scene.environment = sky;
const ENV_RASTER = 0.7;          // IBL ignores walls in raster mode; GTAO restores the occlusion
scene.environmentIntensity = ENV_RASTER;

// ---------------------------------------------------------------- sun: 20.39°N, 21 March 09:00 solar time
const { alt, az } = data.meta.sun;
const a = THREE.MathUtils.degToRad(alt), z = THREE.MathUtils.degToRad(az);
const toSun = new THREE.Vector3(Math.sin(z) * Math.cos(a), Math.sin(a), -Math.cos(z) * Math.cos(a));   // x E, y up, -z N
const sun = new THREE.DirectionalLight(0xffeeda, 4.2);
const centre = P(29.5, 16.4, LV.FF);
sun.position.copy(centre).addScaledVector(toSun, 40);
sun.target.position.copy(centre);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 5, far: 90 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.025;
sun.shadow.radius = 2.5;
scene.add(sun, sun.target);

// Raster-only daylight fill: area lights in the window openings stand in for the light a real room
// bounces around. The path tracer computes true bounce light, so Photo mode switches these off.
RectAreaLightUniformsLib.init();
const fills = new THREE.Group();
function windowFill(x, y, z, w, h, lookX, lookY, intensity) {
  const l = new THREE.RectAreaLight(0xfff3e4, intensity, w * FT, h * FT);
  l.position.copy(P(x, y, LV.FF + z));
  l.lookAt(P(lookX, lookY, LV.FF + z));
  fills.add(l);
}
windowFill(52.7, 21.0, 4.2, 12.0, 8.0, 40, 21.0, 1.3);      // balcony slider, east
windowFill(43.0, 29.95, 5.0, 5.5, 4.0, 43.0, 18, 0.8);      // living north window
windowFill(33.8, 29.95, 5.0, 4.0, 4.0, 33.8, 18, 0.8);      // dining north window
const hemi = new THREE.HemisphereLight(0xfff4e6, 0xc8b497, 0.22);
fills.add(hemi);
scene.add(fills);

// ---------------------------------------------------------------- furniture
setStatus('Loading furniture…');
const furniture = await furnish(data, M, (f) => setStatus(`Loading furniture… ${Math.round(f * 100)}%`));
scene.add(furniture.root);

// ---------------------------------------------------------------- post: MSAA render, GTAO, AgX output
const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(renderer.getPixelRatio());
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.5, thickness: 1.2, scale: 1.15, samples: 16, screenSpaceRadius: false });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
gtao.blendIntensity = 1.0;
composer.addPass(gtao);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- views and controls
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.maxDistance = 60;
let dirty = true;
const markDirty = () => { dirty = true; photo.stop(); };
orbit.addEventListener('change', markDirty);
const walk = new Walk(camera, renderer.domElement, data, markDirty);

function viewPose(name) {
  const v = data.views[name], lv = LV[v.floor || 'FF'];
  return { pos: P(v.pos[0], v.pos[1], lv + v.pos[2]), target: P(v.target[0], v.target[1], lv + v.target[2]),
           fov: vfovFromLens(v.lens, camera.aspect) };
}
function applyPose({ pos, target, fov }) {
  camera.fov = fov;
  camera.position.copy(pos);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  orbit.target.copy(target);
  orbit.update();
}
function setView(name) {
  applyPose(viewPose(name));
  current.view = name;
  updateTourLabel();
  markDirty();
}

const current = { mode: 'orbit', view: params.get('view') || data.tour?.[0] || 'living' };

// ---------------------------------------------------------------- tour (Next / Previous)
const TOUR = data.tour || [current.view];
const tourLabel = document.getElementById('tour-label');
function tourIndex() { return Math.max(0, TOUR.indexOf(current.view)); }
function updateTourLabel() {
  if (tourLabel) tourLabel.textContent = `${tourIndex() + 1} / ${TOUR.length} · ${current.view.replace(/_/g, ' ')}`;
  const sel = document.getElementById('room-select');
  if (sel) sel.value = current.view;
}
function stepTour(delta) {
  const i = (tourIndex() + delta + TOUR.length) % TOUR.length;
  if (player.on) return glideTo(TOUR[i]);          // Prev / Next while playing: go there and keep playing
  setMode('orbit');
  setView(TOUR[i]);
}

// ---------------------------------------------------------------- guided tour: glide to each stop, hold, move on
const GLIDE = 2.5, HOLD = 4.5;                     // seconds
const player = { on: false, t: 0, from: null, to: null };
const playBtn = document.getElementById('btn-play');
function glideTo(name) {
  player.from = { pos: camera.position.clone(), target: orbit.target.clone(), fov: camera.fov };
  player.to = viewPose(name);
  player.t = 0;
  current.view = name;
  updateTourLabel();
}
function playTour(on) {
  player.on = on;
  if (playBtn) { playBtn.textContent = on ? '❚❚ Pause' : '▶ Tour'; playBtn.classList.toggle('on', on); }
  if (on) { setMode('orbit'); glideTo(TOUR[(tourIndex() + (player.started ? 1 : 0)) % TOUR.length]); }
  player.started = true;
}
function tickTour(dt) {
  if (!player.on) return;
  player.t += dt;
  if (player.t <= GLIDE) {
    const k = THREE.MathUtils.smootherstep(player.t / GLIDE, 0, 1), { from, to } = player;
    applyPose({ pos: from.pos.clone().lerp(to.pos, k), target: from.target.clone().lerp(to.target, k),
                fov: from.fov + (to.fov - from.fov) * k });
    markDirty();
  } else if (player.t > GLIDE + HOLD) glideTo(TOUR[(tourIndex() + 1) % TOUR.length]);
}

// ---------------------------------------------------------------- dollhouse (roof + ceiling off, angled top view)
// Per floor of the current view: hide everything above it (and the GF shell when looking at the FF).
const HIDE_IN_DOLLHOUSE = {
  GF: ['Roof', 'FF', 'FF_ROOMS', 'FF_FACADE', 'FF_STAIR', 'FF_SLAB', 'furn_FF', 'furn_ROOF', 'Context'],
  FF: ['Roof', 'GF', 'GF_ROOMS', 'GF_FACADE', 'GF_STAIR', 'furn_ROOF'],
  ROOF: [],
};
const viewFloor = () => data.views[current.view]?.floor || 'FF';
let dollhouseSaved = null;
let dollFloor = null;                                          // floor shown in the dollhouse (GF / FF / ROOF buttons)
function enterDollhouse(floor = viewFloor()) {
  dollhouseSaved ||= { pos: camera.position.clone(), fov: camera.fov, target: orbit.target.clone() };
  dollFloor = floor;
  [...house.root.children, ...furniture.root.children].forEach((g) => { g.visible = true; });
  const hide = HIDE_IN_DOLLHOUSE[floor];
  [...house.root.children, ...furniture.root.children].forEach((g) => { if (hide.includes(g.name)) g.visible = false; });
  sun.castShadow = false;                                      // long low-angle shadows look wrong from directly above
  const c = P(29.5, 16.4, LV[floor] + 4);
  camera.fov = 45;
  camera.position.set(c.x - 20 * FT, c.y + 42 * FT, c.z + 14 * FT);
  camera.updateProjectionMatrix();
  orbit.target.copy(c);
  orbit.minDistance = 10;
  orbit.maxDistance = 90;
  orbit.update();
  document.querySelectorAll('[data-floor]').forEach((b) => b.classList.toggle('on', b.dataset.floor === floor));
  markDirty();
}
function exitDollhouse() {
  if (!dollhouseSaved) return;
  [...house.root.children, ...furniture.root.children].forEach((g) => { g.visible = true; });
  sun.castShadow = true;
  orbit.minDistance = 0;
  camera.position.copy(dollhouseSaved.pos);
  camera.fov = dollhouseSaved.fov;
  camera.updateProjectionMatrix();
  orbit.target.copy(dollhouseSaved.target);
  orbit.update();
  dollhouseSaved = null;
  dollFloor = null;
  document.querySelectorAll('[data-floor]').forEach((b) => b.classList.remove('on'));
  markDirty();
}

function setMode(mode) {
  if (mode !== 'orbit' && player.on) playTour(false);
  if (current.mode === 'dollhouse' && mode !== 'dollhouse') exitDollhouse();
  current.mode = mode;
  if (mode === 'walk') {
    orbit.enabled = false;
    const x = camera.position.x / FT, y = -camera.position.z / FT;
    const v = data.views[current.view];
    walk.enter(x, y, viewFloor(), v && v.target.slice(0, 2));
    camera.fov = 70; camera.updateProjectionMatrix();
  } else if (mode === 'dollhouse') {
    walk.exit();
    orbit.enabled = true;
    enterDollhouse();
  } else {
    walk.exit();
    orbit.enabled = true;
    setView(current.view);
  }
  document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  markDirty();
}

// ---------------------------------------------------------------- day / dusk
const SUN_DAY = { color: 0xffeeda, intensity: 4.2, alt: data.meta.sun.alt, az: data.meta.sun.az,
  hemi: [0xfff4e6, 0xc8b497, 0.22], exposure: +(params.get('ev') || 1.0), bg: 1.0 };
const SUN_DUSK = { color: 0xff9a5c, intensity: 3.2, alt: 6, az: 250,
  hemi: [0xb9c3de, 0x3a2e28, 0.13], exposure: 0.85, bg: 0.55 };
let dayMode = 'day';
function applySun(preset) {
  const a = THREE.MathUtils.degToRad(preset.alt), z2 = THREE.MathUtils.degToRad(preset.az);
  const dir = new THREE.Vector3(Math.sin(z2) * Math.cos(a), Math.sin(a), -Math.cos(z2) * Math.cos(a));
  const c = P(29.5, 16.4, LV.FF);
  sun.color.setHex(preset.color);
  sun.intensity = preset.intensity;
  sun.position.copy(c).addScaledVector(dir, 40);
  sun.target.position.copy(c);
  hemi.color.setHex(preset.hemi[0]);
  hemi.groundColor.setHex(preset.hemi[1]);
  hemi.intensity = preset.hemi[2];
  renderer.toneMappingExposure = preset.exposure;
  scene.backgroundIntensity = preset.bg;
  markDirty();
}
function setDayMode(mode) {
  dayMode = mode;
  applySun(mode === 'dusk' ? SUN_DUSK : SUN_DAY);
  const lit = mode === 'dusk';                    // layered lighting: cove LEDs, lamp shades, lamp lights
  M.led.emissiveIntensity = lit ? 3.0 : 0;
  M.shade.emissiveIntensity = lit ? 0.9 : 0;
  furniture.lamps.forEach((l) => { l.intensity = lit ? l.userData.on : 0; });
  document.querySelectorAll('[data-day]').forEach((b) => b.classList.toggle('on', b.dataset.day === mode));
}

// ---------------------------------------------------------------- photo mode (path traced)
const photo = {
  pt: null, running: false, built: false,
  async start() {
    if (!this.pt) {
      this.pt = new WebGLPathTracer(renderer);
      const n = +(params.get('pttiles') || 8);    // small tiles: each GPU dispatch stays well under the
      this.pt.tiles.set(n, n);                     // ~2 s Windows GPU watchdog on integrated graphics
      this.pt.bounces = +(params.get('ptb') || 5);
      this.pt.transmissiveBounces = 6;
      this.pt.filterGlossyFactor = 0.6;
      this.pt.minSamples = 1;
      this.pt.renderScale = +(params.get('ptscale') || 0.5);
      const denoise = new FullScreenQuad(new DenoiseMaterial({ map: null, blending: THREE.CustomBlending,
        premultipliedAlpha: renderer.getContextAttributes().premultipliedAlpha }));
      this.pt.renderToCanvasCallback = (target, r, quad) => {
        denoise.material.sigma = 2.2;
        denoise.material.threshold = 0.12;
        denoise.material.kSigma = 1.0;
        denoise.material.opacity = quad.material.opacity;
        denoise.material.map = target.texture;
        denoise.render(r);
      };
      this.pt.fadeDuration = 0;
    }
    ui.photoInfo.hidden = false;
    ui.photoInfo.textContent = 'Preparing path tracer…';
    await new Promise((r) => setTimeout(r, 30));
    scene.environmentIntensity = 1.0;          // the path tracer handles occlusion, so the sky is physical
    fills.visible = false;
    this.pt.setScene(scene, camera);
    this.running = true;
    document.body.classList.add('photo');
  },
  stop() {
    if (!this.running) return;
    this.running = false;
    scene.environmentIntensity = ENV_RASTER;
    fills.visible = true;
    ui.photoInfo.hidden = true;
    document.body.classList.remove('photo');
    dirty = true;
  },
  samples() { return this.pt ? this.pt.samples : 0; },
};

// ---------------------------------------------------------------- UI wiring
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { setMode('orbit'); setView(b.dataset.view); }));
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
document.querySelectorAll('[data-floor]').forEach((b) => b.addEventListener('click', () => {
  if (current.mode !== 'dollhouse') setMode('dollhouse');
  enterDollhouse(b.dataset.floor);
}));
document.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => setDayMode(b.dataset.day)));
document.getElementById('btn-photo')?.addEventListener('click', () => (photo.running ? photo.stop() : photo.start()));
document.getElementById('btn-prev')?.addEventListener('click', () => stepTour(-1));
playBtn?.addEventListener('click', () => playTour(!player.on));
renderer.domElement.addEventListener('pointerdown', () => { if (player.on) playTour(false); });   // touch/drag = take over
document.getElementById('btn-next')?.addEventListener('click', () => stepTour(1));
const roomSelect = document.getElementById('room-select');
if (roomSelect) {
  roomSelect.innerHTML = TOUR.map((v) => `<option value="${v}">${v.replace(/_/g, ' ')}</option>`).join('');
  roomSelect.addEventListener('change', () => { const v = roomSelect.value; if (player.on) return glideTo(v); setMode('orbit'); setView(v); });
}
const planSelect = document.getElementById('plan-select');      // PDF plan sets, newest first; opens in a new tab
if (planSelect && data.plans) {
  planSelect.innerHTML = '<option value="">Plans (PDF)</option>' + data.plans.map((p) => `<option value="${p.file}">${p.name}</option>`).join('');
  planSelect.addEventListener('change', () => { if (planSelect.value) open(planSelect.value, '_blank'); planSelect.value = ''; });
}
addEventListener('keydown', (e) => {
  if (current.mode !== 'orbit' || e.target !== document.body) return;
  if (e.key === 'ArrowRight') stepTour(1);
  if (e.key === 'ArrowLeft') stepTour(-1);
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  if (current.mode === 'orbit') camera.fov = vfovFromLens(data.views[current.view].lens, camera.aspect);
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  markDirty();
});

// ---------------------------------------------------------------- loop
const clock = new THREE.Timer();
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  if (photo.running) { photo.stop(); photo.pt = null; }
  setStatus('Graphics driver reset — back to real-time view');
});
renderer.domElement.addEventListener('webglcontextrestored', () => { dirty = true; });

renderer.setAnimationLoop(() => {
  clock.update();
  const dt = Math.min(clock.getDelta(), 0.05);
  if (walk.update(dt)) markDirty();
  tickTour(dt);
  if (orbit.enabled) orbit.update();
  if (photo.running) {
    photo.pt.renderSample();
    ui.photoInfo.textContent = `Photo mode · ${photo.samples()} samples · move to exit`;
    return;
  }
  if (dirty || walk.enabled) { composer.render(); dirty = false; }
});

setView(current.view);
setDayMode('day');
const touch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && innerWidth < 900);
document.body.classList.toggle('touch', touch);
if (params.get('tour') === '1' || (params.get('hud') !== '0' && touch)) playTour(true);   // phones: start the guided tour
if (params.get('hud') === '0') document.body.classList.add('nohud');
ui.loader?.remove();
setStatus('');
window.APP = { THREE, scene, camera, renderer, data, setView, setMode, setDayMode, stepTour, photo, walk, ready: true };
