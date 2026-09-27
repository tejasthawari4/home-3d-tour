// First-person walking on every floor, up and down the stair. Collision uses the walk surfaces computed in
// export_web.py (floors + doorways minus furniture, shrunk by the body radius; stair flights as ramps), so no
// wall or table can be entered. A step may only move onto a surface at (almost) the walker's own height.
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { FT, inParts } from './util.js';

const EYE = 5.25;                 // eye height, ft above the floor
const SPEED = 4.2;                // ft/s, an unhurried walk
const TOL = 0.3;                  // ft: surfaces join where they meet at the same height

const surfZ = (s, x) => s.za + (s.zb - s.za) * (s.xb === s.xa ? 0 : THREE.MathUtils.clamp((x - s.xa) / (s.xb - s.xa), 0, 1));

export class Walk {
  constructor(camera, dom, data, onChange) {
    this.camera = camera;
    this.surfs = data.walk;
    this.level = data.meta.level;
    this.start = data.walk_start;
    this.z = this.level.FF;
    this.controls = new PointerLockControls(camera, dom);
    this.keys = new Set();
    this.enabled = false;
    this.onChange = onChange;
    addEventListener('keydown', (e) => { if (this.enabled) this.keys.add(e.code); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    dom.addEventListener('click', () => { if (this.enabled && !this.controls.isLocked) this.controls.lock(); });
    this.controls.addEventListener('change', () => this.onChange?.());
  }

  plan() { return [this.camera.position.x / FT, -this.camera.position.z / FT]; }

  // height of the walkable surface at (x, y) nearest to z, within TOL; null if none
  zAt(x, y, z) {
    let best = null;
    for (const s of this.surfs) {
      const sz = surfZ(s, x);
      if (Math.abs(sz - z) < TOL && inParts(x, y, s.parts) && (best === null || Math.abs(sz - z) < Math.abs(best - z))) best = sz;
    }
    return best;
  }

  // floor: the current view's floor; tries the camera spot, then the view target, then the floor's start point
  enter(x, y, floor = 'FF', target = null) {
    const lv = this.level[floor];
    const pick = [[x, y], target, this.start[floor]].find((p) => p && this.zAt(p[0], p[1], lv) !== null);
    [x, y] = pick || this.start[floor];
    this.z = this.zAt(x, y, lv) ?? lv;
    this.place(x, y);
    this.enabled = true;
  }

  place(x, y) { this.camera.position.set(x * FT, (this.z + EYE) * FT, -y * FT); }

  exit() { this.enabled = false; this.keys.clear(); if (this.controls.isLocked) this.controls.unlock(); }

  update(dt) {
    if (!this.enabled || !this.keys.size) return false;
    const k = this.keys, f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (!f && !r) return false;
    dt = Math.min(dt, 0.05);                       // a slow frame must not out-step TOL on the stair
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    const step = fwd.multiplyScalar(f).add(right.multiplyScalar(r)).normalize().multiplyScalar(SPEED * dt * (k.has('ShiftLeft') ? 1.8 : 1));
    const [x, y] = this.plan();
    const dx = step.x / FT, dy = -step.z / FT;
    // slide along walls: try the full step, then each axis on its own
    for (const [nx, ny] of [[x + dx, y + dy], [x + dx, y], [x, y + dy]]) {
      const z = this.zAt(nx, ny, this.z);
      if (z !== null) {
        this.z = z;
        this.place(nx, ny);
        return true;
      }
    }
    return false;
  }
}
