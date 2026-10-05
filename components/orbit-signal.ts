// Study 001 / Orbit, signal pass. The sculpture is rendered into an offscreen
// target, then a single full-screen shader decides what reaches the screen:
// the lit surface, or the same pixels re-read as characters of code, and how
// badly the signal is breaking up while it does it.
import {
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  BufferGeometry,
  HalfFloatType,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Object3D,
  type WebGLRenderer,
} from 'three';

export type SignalFrame = {
  time: number;
  // Pointer position in 0–1 canvas space (y up), and how open the lens is.
  pointer: Vector2;
  lens: number;
  // Burst strength 0–1 and a random seed that changes with every burst.
  glitch: number;
  seed: number;
  // Position of the descending scan line, 0–1, or below zero when idle.
  scan: number;
  // 0 is the surface, 1 is the whole object read as code.
  source: number;
  // Hold the previous frame instead of drawing a new one.
  hold: boolean;
};

const GLYPH_W = 24,
  GLYPH_H = 40;
// Candidates for the density ramp; they are measured and sorted below.
const RAMP = " .`'-:;,_~=+<>!?*()[]{}rcx1i7tz0oaeuns%3542&#8$9";
const NOISE = '0123456789abcdef{}[]();<>/=+*#$&%';
// Characters for edges, by direction: horizontal, rising, vertical, falling.
const EDGES = '-/|\\';
const FONT = `500 ${GLYPH_H * 0.74}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

function glyphAtlas() {
  const probe = document.createElement('canvas');
  probe.width = GLYPH_W;
  probe.height = GLYPH_H;
  const p = probe.getContext('2d', { willReadFrequently: true })!;
  const ink = (char: string) => {
    p.clearRect(0, 0, GLYPH_W, GLYPH_H);
    p.fillStyle = '#fff';
    p.font = FONT;
    p.textAlign = 'center';
    p.textBaseline = 'middle';
    p.fillText(char, GLYPH_W / 2, GLYPH_H / 2 + 1);
    const data = p.getImageData(0, 0, GLYPH_W, GLYPH_H).data;
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) sum += data[i];
    return sum;
  };
  const measured = Array.from(new Set(RAMP))
    .map((char) => ({ char, ink: ink(char) }))
    .sort((a, b) => a.ink - b.ink);
  // Sixteen steps, spread evenly across the measured ink, so brightness reads
  // as density no matter which monospace font the visitor has.
  const max = measured[measured.length - 1].ink || 1;
  const ramp: string[] = [];
  for (let i = 0; i < 16; i++) {
    const target = (i / 15) * max;
    let best = measured[0];
    for (const m of measured)
      if (Math.abs(m.ink - target) < Math.abs(best.ink - target)) best = m;
    ramp.push(best.char);
  }
  const chars = [...ramp, ...NOISE.split(''), ...EDGES.split('')];
  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_W * chars.length;
  canvas.height = GLYPH_H;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#fff';
  c.font = FONT;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  chars.forEach((char, i) =>
    c.fillText(char, GLYPH_W * i + GLYPH_W / 2, GLYPH_H / 2 + 1),
  );
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  return {
    texture,
    count: chars.length,
    ramp: ramp.length,
    noise: NOISE.length,
  };
}

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tGlyphs;
uniform vec2 uResolution;
uniform vec2 uCell;
uniform float uGlyphs;
uniform float uRamp;
uniform float uNoise;
uniform float uTime;
uniform vec2 uPointer;
uniform float uLens;
uniform float uGlitch;
uniform float uSeed;
uniform float uScan;
uniform float uSource;
uniform float uScale;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec4 sceneAt(vec2 uv) {
  return texture2D(tScene, clamp(uv, 0.0, 1.0));
}

// The scene target holds linear, premultiplied light. Bring it to display.
vec3 display(vec4 s) {
  vec3 c = s.rgb / max(s.a, 1e-4);
  #ifdef TONE_MAPPING
  c = toneMapping(c);
  #endif
  return linearToOutputTexel(vec4(c, 1.0)).rgb;
}

vec3 background(vec2 uv) {
  vec2 d = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float r = length(d) / length(vec2(uResolution.x / uResolution.y, 1.0) * 0.5);
  return mix(vec3(0.090, 0.098, 0.122), vec3(0.027, 0.031, 0.043), smoothstep(0.0, 0.72, r));
}

float luma(vec4 s) {
  return dot(display(s), vec3(0.299, 0.587, 0.114)) * s.a;
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), e = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, e, f.x), f.y);
}

float glyph(float index, vec2 local) {
  local.x = clamp(local.x, 0.04, 0.96);
  return texture2D(tGlyphs, vec2((index + local.x) / uGlyphs, local.y)).r;
}

void main() {
  vec2 uv = vUv;
  vec2 px = uv * uResolution;
  float g = uGlitch;

  // Horizontal slices torn sideways during a burst.
  float rows = 8.0 + floor(hash(vec2(uSeed, 1.7)) * 36.0);
  float row = floor(uv.y * rows);
  float torn = step(1.0 - g * 0.55, hash(vec2(row, uSeed)));
  uv.x += torn * (hash(vec2(row, uSeed + 3.1)) - 0.5) * 0.16 * g;
  // A fine, constant shiver on a few lines, like a bad cable.
  float line = floor(px.y / (3.0 * uScale));
  uv.x += (hash(vec2(line, floor(uTime * 24.0))) - 0.5) * step(0.996, hash(vec2(line * 0.37, floor(uTime * 6.0)))) * 0.012;

  // Rectangular blocks that fail outright.
  vec2 blocks = vec2(6.0, 4.0) + floor(vec2(hash(vec2(uSeed, 9.0)), hash(vec2(uSeed, 4.0))) * vec2(14.0, 10.0));
  vec2 block = floor(uv * blocks);
  float failed = step(1.0 - g * 0.22, hash(block + uSeed * 7.13));

  // Chromatic split: always faint at the edges, wide in a burst.
  float edge = length(uv - 0.5);
  float split = 0.0007 + edge * 0.0035 + g * 0.012 + failed * 0.02;
  vec4 s = sceneAt(uv);
  vec4 sr = sceneAt(uv + vec2(split, 0.0));
  vec4 sb = sceneAt(uv - vec2(split, 0.0));
  float alpha = max(s.a, max(sr.a, sb.a));
  vec3 bg = background(vUv);
  vec3 surface = vec3(display(sr).r * sr.a, display(s).g * s.a, display(sb).b * sb.a) + bg * (1.0 - alpha);

  // ——— The object re-read as code ———
  vec2 cell = uCell * uScale;
  vec2 cellId = floor(px / cell);
  vec2 local = fract(px / cell);
  vec2 step2 = cell / uResolution;
  vec2 cellUv = (cellId + 0.5) * step2;
  cellUv.x += torn * (hash(vec2(row, uSeed + 3.1)) - 0.5) * 0.16 * g;
  vec4 cs = sceneAt(cellUv);
  float lum = luma(cs);
  // Edges become strokes that follow the form; flat areas become density.
  float gx = luma(sceneAt(cellUv + vec2(step2.x, 0.0))) - luma(sceneAt(cellUv - vec2(step2.x, 0.0)));
  float gy = luma(sceneAt(cellUv + vec2(0.0, step2.y))) - luma(sceneAt(cellUv - vec2(0.0, step2.y)));
  float strength = length(vec2(gx, gy));
  // Dark surfaces still register as a faint stipple, so the core has volume.
  float level = max(smoothstep(0.015, 0.8, lum), 0.09 * step(0.5, cs.a));
  float index = floor(min(level, 0.999) * uRamp);
  float direction = mod(atan(gy, gx) + 1.5708, 3.14159);
  float edgeIndex = uRamp + uNoise + mod(floor(direction / 0.7854 + 0.5), 4.0);
  float isEdge = step(0.18, strength) * step(0.3, cs.a);
  index = mix(index, edgeIndex, isEdge);
  level = max(level, isEdge * smoothstep(0.18, 0.6, strength));
  // Some cells refuse to settle and keep cycling through other characters.
  float tick = floor(uTime * 9.0 + hash(cellId) * 9.0);
  float restless = step(0.94, hash(cellId + tick * 0.13)) * step(0.08, cs.a);
  index = mix(index, uRamp + floor(hash(cellId + tick) * uNoise), restless);
  float ink = glyph(index, local) * step(0.012, lum + isEdge + 0.02 * cs.a);
  // Empty space still holds faint, drifting hexadecimal.
  float driftRow = cellId.y + floor(uTime * 1.5 + hash(vec2(cellId.x, 2.0)) * 40.0);
  float noiseIndex = uRamp + floor(hash(vec2(cellId.x, driftRow)) * uNoise);
  float noise = glyph(noiseIndex, local) * step(0.86, hash(vec2(cellId.x * 1.3, driftRow))) * (1.0 - cs.a);
  vec3 ink3 = mix(vec3(0.55, 0.59, 0.67), vec3(0.97, 0.98, 1.0), level);
  vec3 code = bg * 0.5 + surface * 0.1 + ink3 * ink * (0.3 + level * 0.95) + vec3(0.42, 0.45, 0.52) * noise * 0.22;

  // Patches of the object drift in and out of code on their own, snapped to
  // the character grid so their edges stay hard.
  vec2 patchUv = (cellId + 0.5) * step2 * vec2(uResolution.x / uResolution.y, 1.0);
  float patches = smoothNoise(patchUv * 3.2 + vec2(uTime * 0.05, -uTime * 0.035));
  float drift = step(0.74, patches) * step(0.2, cs.a);
  // A faint field of hexadecimal hangs around the object at all times.
  float halo = 1.0 - smoothstep(0.08, 0.42, length((vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0)));
  vec3 field = vec3(0.42, 0.45, 0.52) * noise * 0.1 * halo;

  // Where the code shows through: the lens, the scan line, failed blocks.
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  float radius = 0.19 * uLens;
  float dist = length((vUv - uPointer) * aspect);
  float lens = 1.0 - smoothstep(radius - 0.006, radius, dist);
  float band = uScan - vUv.y;
  float scan = step(0.0, uScan) * smoothstep(0.0, 0.004, band) * (1.0 - smoothstep(0.02, 0.16, band));
  float mask = max(max(max(lens, scan), drift), max(uSource, failed * step(0.5, hash(block + uSeed))));
  vec3 color = mix(surface + field, code, mask);

  // Lens rim: a thin dashed circle that slowly turns.
  float angle = atan(vUv.y - uPointer.y, (vUv.x - uPointer.x) * aspect.x);
  float dash = step(0.5, fract(angle * 9.549 + uTime * 0.25));
  float on = step(0.02, uLens);
  float rim = (1.0 - smoothstep(0.0, 0.0018 * uScale, abs(dist - radius))) * on;
  // Four short ticks just outside the rim, measured in pixels.
  vec2 d = abs((vUv - uPointer) * uResolution);
  float r = radius * uResolution.y;
  float tickX = step(d.y, 0.6 * uScale) * step(r + 4.0 * uScale, d.x) * step(d.x, r + 12.0 * uScale);
  float tickY = step(d.x, 0.6 * uScale) * step(r + 4.0 * uScale, d.y) * step(d.y, r + 12.0 * uScale);
  color += vec3(0.85, 0.88, 0.95) * (rim * (0.3 + 0.5 * dash) + max(tickX, tickY) * 0.6 * on);
  // The leading edge of the scan.
  color += vec3(0.8, 0.85, 0.95) * step(0.0, uScan) * (1.0 - smoothstep(0.0, 0.0025, abs(band))) * 0.55;

  // Failed blocks that are not code invert or lose a channel.
  float invert = failed * step(0.5, 1.0 - hash(block + uSeed)) * step(0.7, hash(block * 1.7 + uSeed));
  color = mix(color, vec3(1.0) - color.gbr, invert * 0.85);
  // A bright tear across the frame in heavy bursts.
  float tearY = hash(vec2(uSeed, 21.0));
  color += vec3(0.9) * step(0.55, g) * (1.0 - smoothstep(0.0, 1.5 * uScale / uResolution.y, abs(vUv.y - tearY)));

  // Film: scanlines, rolling interference, grain, vignette.
  color *= 0.955 + 0.045 * sin(px.y * 2.0944 / uScale);
  color *= 1.0 + 0.035 * smoothstep(0.9, 1.0, sin(vUv.y * 3.5 - uTime * 0.9));
  color += (hash(px + fract(uTime) * 91.7) - 0.5) * 0.045;
  color *= 1.0 - smoothstep(0.45, 0.95, edge) * 0.55;

  gl_FragColor = vec4(color, 1.0);
}`;

export function createSignal(renderer: WebGLRenderer) {
  const atlas = glyphAtlas();
  const target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    samples: 4,
  });
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tScene: { value: target.texture },
      tGlyphs: { value: atlas.texture },
      uResolution: { value: new Vector2(1, 1) },
      uCell: { value: new Vector2(7, 12) },
      uGlyphs: { value: atlas.count },
      uRamp: { value: atlas.ramp },
      uNoise: { value: atlas.noise },
      uTime: { value: 0 },
      uPointer: { value: new Vector2(0.5, 0.5) },
      uLens: { value: 0 },
      uGlitch: { value: 0 },
      uSeed: { value: 0 },
      uScan: { value: -1 },
      uSource: { value: 0 },
      uScale: { value: 1 },
    },
  });
  // One oversized triangle covers the screen without a diagonal seam.
  const triangle = new BufferGeometry();
  triangle.setAttribute(
    'position',
    new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
  );
  const quad = new Mesh(triangle, material);
  quad.frustumCulled = false;
  const post = new Scene();
  post.add(quad);
  const flat = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const u = material.uniforms;

  return {
    setSize(width: number, height: number, scale: number) {
      target.setSize(Math.round(width * scale), Math.round(height * scale));
      u.uResolution.value.set(width * scale, height * scale);
      u.uScale.value = scale;
      // Smaller characters on small screens keep the object legible.
      u.uCell.value.set(width < 520 ? 6 : 7, width < 520 ? 10 : 12);
    },
    render(scene: Scene, camera: Camera, frame: SignalFrame) {
      if (!frame.hold) {
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
      }
      u.uTime.value = frame.time;
      u.uPointer.value.copy(frame.pointer);
      u.uLens.value = frame.lens;
      u.uGlitch.value = frame.glitch;
      u.uSeed.value = frame.seed;
      u.uScan.value = frame.scan;
      u.uSource.value = frame.source;
      renderer.render(post, flat);
    },
    dispose() {
      target.dispose();
      material.dispose();
      triangle.dispose();
      atlas.texture.dispose();
    },
  };
}

// A thin band of text that circles the sculpture like a ticker. It reads as
// telemetry; part of it is a sentence in hexadecimal.
export function createCodeRing() {
  const message = 'it is looking back';
  const hex = message
    .split('')
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ');
  const text = [
    'ORBIT.SIGNAL',
    '0x4F52424954',
    'iris[16].aperture()',
    'gimbal{4} :: drift',
    'ORIGIN UNRESOLVED',
    hex,
    '01001111 01010010 01000010',
    'observer.locate()',
    'surface -> structure -> source',
    'study_001',
  ].join('   ::   ');
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 64;
  const c = canvas.getContext('2d')!;
  c.font = `500 30px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  c.textBaseline = 'middle';
  c.fillStyle = '#fff';
  const span = c.measureText(text + '   ::   ').width;
  for (let x = 0; x < canvas.width; x += span)
    c.fillText(text + '   ::   ', x, 33);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.anisotropy = 4;
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.55,
    side: DoubleSide,
    depthWrite: false,
    color: 0xc9cfdb,
  });
  const geometry = new CylinderGeometry(2.62, 2.62, 0.13, 160, 1, true);
  const ring: Object3D = new Mesh(geometry, material);
  ring.rotation.set(0.1, 0, 0.16);
  return {
    ring,
    update(time: number, glitch: number) {
      texture.offset.x = -time * 0.006;
      material.opacity = 0.62 + Math.sin(time * 1.3) * 0.08 - glitch * 0.3;
      ring.rotation.y = time * 0.05;
    },
    dispose() {
      texture.dispose();
      material.dispose();
      geometry.dispose();
    },
  };
}
