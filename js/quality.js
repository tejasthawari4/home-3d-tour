// Picks a quality tier for this device and steps render settings down if the frame rate can't keep up.
// Assets (full vs lite) are chosen once at load; only render settings change mid-session.
export const TIERS = {
  high: { lite: false, ratio: 1.5, shadows: true, lamps: 99, post: true, decor: true },
  mid: { lite: true, ratio: 1.25, shadows: true, lamps: 6, post: false, decor: true },   // GTAO + MSAA cost ~4x the frame on an iGPU
  low: { lite: true, ratio: 1, shadows: false, lamps: 0, post: false, decor: false },
};
// small decor skipped on low (vases, bowls, kitchen and pooja clutter)
export const SMALL_DECOR = /vase|bowl|candle|brass_pot|thali|kettle|cooker|pillow/;

export function probe(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const small = Math.min(screen.width, screen.height) < 900;
  return {
    gpu: String(gpu),
    mem: navigator.deviceMemory,                       // Chrome only, capped at 8; missing on Safari/Firefox
    cores: navigator.hardwareConcurrency || 4,
    maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    ktx2: !!(gl.getExtension('WEBGL_compressed_texture_astc') || gl.getExtension('WEBGL_compressed_texture_etc')
      || gl.getExtension('WEBGL_compressed_texture_s3tc') || gl.getExtension('EXT_texture_compression_bptc')),
    phone: touch && small,
  };
}

export function pickTier(p) {
  if (/swiftshader|llvmpipe|software|basic render/i.test(p.gpu) || p.maxTex < 4096) return 'low';
  // integrated GPUs ("AMD Radeon(TM) Graphics", Intel UHD/Iris) run GTAO + shadows at ~7 fps: never high
  const discrete = /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|arc a\d|apple gpu|apple m\d/i.test(p.gpu);
  if (p.phone) return (p.mem !== undefined && p.mem < 4) || p.cores < 4 ? 'low' : 'mid';
  if (!discrete || (p.mem !== undefined && p.mem < 4) || p.cores < 4) return 'mid';
  return 'high';
}

// Median frame time over the last 3 s of continuous rendering; calls onSlow() when it stays above ~33 ms.
export function fpsMonitor(onSlow) {
  let last = 0, sum = 0, dts = [];
  return (now, rendered) => {
    if (!rendered) { last = 0; return; }             // the viewer idles when nothing moves; only time busy stretches
    if (last) { dts.push(now - last); sum += now - last; }
    last = now;
    if (sum < 3000) return;
    dts.sort((a, b) => a - b);
    const slow = dts[dts.length >> 1] > 1000 / 30;
    dts = []; sum = 0;
    if (slow) onSlow();
  };
}
