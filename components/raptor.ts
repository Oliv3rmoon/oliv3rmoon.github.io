// VR-01: an original, procedural velociraptor for the paddock simulation.
// The skin is a set of lofted tubes whose rings ride on a jointed skeleton,
// so the whole animal is rebuilt every frame from its pose. The legs are
// digitigrade and solved with two-bone IK against feet that plant, lift and
// step on their own as the body moves over them.
import {
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Points,
  PointsMaterial,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  type Material,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Drive = {
  // Placement and motion, owned by the simulation.
  x: number;
  z: number;
  heading: number;
  speed: number;
  turn: number;
  // Behaviour channels, 0–1 unless noted.
  look: Vector3 | null;
  reach: number;
  crouch: number;
  call: number;
  jaw: number;
  peck: number;
  sleepy: number;
  // 0 when moving, 1 for the raised, alert stance it takes when standing.
  upright: number;
};

export type Channels = {
  jaw: number;
  pan: number;
  tilt: number;
  tail: number;
  breath: number;
  strideL: number;
  strideR: number;
};

type Spring = { x: number; v: number };
function follow(s: Spring, target: number, stiffness: number, dt: number) {
  const damping = 2 * Math.sqrt(stiffness);
  for (let left = dt; left > 1e-6; left -= 1 / 120) {
    const h = Math.min(left, 1 / 120);
    s.v += (stiffness * (target - s.x) - damping * s.v) * h;
    s.x += s.v * h;
  }
  return s.x;
}
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Rest pose of the spine, side view, relative to the pelvis.
const FRONT: [number, number][] = [
  [0.25, 0.0],
  [0.5, -0.02],
  [0.72, -0.05],
  [0.9, -0.06],
  [1.02, -0.02],
  [1.11, 0.07],
  [1.18, 0.16],
  [1.25, 0.23],
  [1.32, 0.27],
];
const TAIL: [number, number][] = [
  [-0.2, 0.0],
  [-0.42, -0.01],
  [-0.66, -0.03],
  [-0.92, -0.05],
  [-1.2, -0.07],
  [-1.5, -0.09],
  [-1.8, -0.11],
  [-2.1, -0.13],
  [-2.38, -0.15],
];
// Section sizes: half-width, half-height, centre offset below the spine.
const PELVIS = [0.18, 0.23, -0.05];
const TORSO = [
  [0.19, 0.255, -0.08],
  [0.2, 0.27, -0.1],
  [0.185, 0.26, -0.09],
  [0.16, 0.24, -0.07],
  [0.15, 0.185, -0.03],
  [0.125, 0.15, -0.012],
  [0.108, 0.128, 0],
  [0.1, 0.116, 0.004],
];
// Head sections along the skull: x, half-width, half-height, offset, how
// much the underside is flattened to make room for the jaw.
const HEAD = [
  [0.0, 0.094, 0.11, 0.014, 0.5],
  [0.08, 0.1, 0.114, 0.022, 0.5],
  [0.17, 0.088, 0.098, 0.016, 0.45],
  [0.27, 0.073, 0.083, 0.006, 0.45],
  [0.37, 0.059, 0.07, -0.004, 0.45],
  [0.46, 0.047, 0.058, -0.01, 0.45],
  [0.54, 0.035, 0.046, -0.013, 0.45],
  [0.585, 0.017, 0.025, -0.015, 0.5],
];
const JAW = [
  [-0.02, 0.04, 0.02, -0.012],
  [0.12, 0.064, 0.033, -0.014],
  [0.23, 0.055, 0.029, -0.012],
  [0.35, 0.043, 0.024, -0.009],
  [0.45, 0.032, 0.019, -0.007],
  [0.5, 0.013, 0.009, -0.005],
];
// Brow ridge points in the head's frame: x, y, z, half-width, half-height.
const BROW = [
  [0.02, 0.085, 0.062, 0.008, 0.006],
  [0.08, 0.1, 0.074, 0.02, 0.016],
  [0.15, 0.096, 0.071, 0.018, 0.014],
  [0.23, 0.076, 0.056, 0.006, 0.005],
];
const HEAD_REST = -0.26,
  JAW_REST = 0.015;
const THIGH = 0.4,
  SHIN = 0.44,
  META = 0.24;
const HIP_HEIGHT = 1.1;

const SKIN = {
  side: new Color(0x7b6c58),
  back: new Color(0x433a30),
  stripe: new Color(0x2a241e),
  flank: new Color(0xd9d3c3),
  belly: new Color(0xcfc0a0),
  mouth: new Color(0x6a2a2e),
  claw: new Color(0x15120f),
  scale: new Color(0x6b4a3b),
  brow: new Color(0x8a3836),
  eye: new Color(0xc23a22),
};

type Tube = {
  start: number;
  rings: number;
  m: number;
  kind: 'body' | 'jaw' | 'limb' | 'digit' | 'ridge';
};
// How many times the scale texture repeats along and around each kind.
const TILING = {
  body: [44, 6],
  jaw: [8, 2.4],
  limb: [10, 2.4],
  digit: [1, 0.4],
  ridge: [1, 0.3],
};

export type Palette = Partial<Record<keyof typeof SKIN, number>>;

// A tileable sheet of scales: Voronoi cells, raised in the middle and
// grooved at the edges. One texture drives both the bump and a faint
// variation in colour.
export function createScales(seed = 7) {
  const size = 256,
    count = 110;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const points = Array.from({ length: count }, () => [
    random() * size,
    random() * size,
  ]);
  const bump = document.createElement('canvas'),
    tint = document.createElement('canvas');
  bump.width = bump.height = tint.width = tint.height = size;
  const b = bump.getContext('2d')!,
    t = tint.getContext('2d')!;
  const height = b.createImageData(size, size),
    color = t.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let d1 = 1e9,
        d2 = 1e9;
      for (const [px, py] of points) {
        let dx = Math.abs(x - px),
          dy = Math.abs(y - py);
        if (dx > size / 2) dx = size - dx;
        if (dy > size / 2) dy = size - dy;
        const d = dx * dx + dy * dy;
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
      const edge = Math.min((Math.sqrt(d2) - Math.sqrt(d1)) / 5, 1);
      const dome = 1 - Math.min(Math.sqrt(d1) / 16, 1) * 0.35;
      const h = edge * dome;
      const o = (y * size + x) * 4;
      height.data[o] = height.data[o + 1] = height.data[o + 2] = 90 + h * 165;
      height.data[o + 3] = 255;
      color.data[o] = color.data[o + 1] = color.data[o + 2] = 222 + h * 33;
      color.data[o + 3] = 255;
    }
  b.putImageData(height, 0, 0);
  t.putImageData(color, 0, 0);
  const bumpMap = new CanvasTexture(bump),
    map = new CanvasTexture(tint);
  for (const texture of [bumpMap, map]) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = 4;
  }
  map.colorSpace = SRGBColorSpace;
  return {
    bumpMap,
    map,
    dispose() {
      bumpMap.dispose();
      map.dispose();
    },
  };
}

export function createRaptor(options: {
  dot: Texture;
  scales: ReturnType<typeof createScales>;
  palette?: Palette;
}) {
  const skinColors = Object.fromEntries(
    Object.entries(SKIN).map(([key, value]) => [
      key,
      options.palette?.[key as keyof typeof SKIN] !== undefined
        ? new Color(options.palette[key as keyof typeof SKIN])
        : value.clone(),
    ]),
  ) as typeof SKIN;
  const root = new Group();
  root.rotation.order = 'YZX';
  const group = new Group();
  group.add(root);

  // ——— Skeleton ———
  const bone = (parent: Object3D, x: number, y: number, z = 0) => {
    const node = new Object3D();
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  };
  const front: Object3D[] = [];
  let parent: Object3D = root,
    px = 0,
    py = 0;
  for (const [x, y] of FRONT) {
    parent = bone(parent, x - px, y - py);
    front.push(parent);
    px = x;
    py = y;
  }
  const head = bone(front[8], 0, 0);
  head.rotation.z = HEAD_REST;
  const jaw = bone(head, 0.066, -0.052);
  const tail: Object3D[] = [];
  parent = root;
  px = 0;
  py = 0;
  for (const [x, y] of TAIL) {
    parent = bone(parent, x - px, y - py);
    tail.push(parent);
    px = x;
    py = y;
  }
  const hips = [1, -1].map((side) => bone(root, 0.04, -0.1, 0.13 * side));
  const arms = [1, -1].map((side) => {
    const shoulder = bone(front[3], 0.02, -0.11, 0.1 * side);
    shoulder.rotation.set(0.3 * side, 0, -1.35);
    const elbow = bone(shoulder, 0.2, 0);
    elbow.rotation.z = 1.95;
    const wrist = bone(elbow, 0.19, 0);
    wrist.rotation.z = -1.6;
    return { shoulder, elbow, wrist, side };
  });

  // ——— Tubes ———
  const tubes: Tube[] = [];
  let vertexCount = 0;
  const index: number[] = [];
  const tube = (rings: number, m: number, kind: Tube['kind']) => {
    const t: Tube = { start: vertexCount, rings, m, kind };
    vertexCount += rings * m + 2;
    tubes.push(t);
    const cap0 = t.start + rings * m,
      cap1 = cap0 + 1;
    for (let i = 0; i < rings - 1; i++)
      for (let k = 0; k < m; k++) {
        const a = t.start + i * m + k,
          b = t.start + i * m + ((k + 1) % m),
          c = a + m,
          d = b + m;
        index.push(a, c, b, b, c, d);
      }
    for (let k = 0; k < m; k++) {
      const a = t.start + k,
        b = t.start + ((k + 1) % m);
      index.push(cap0, a, b);
      const e = t.start + (rings - 1) * m + k,
        f = t.start + (rings - 1) * m + ((k + 1) % m);
      index.push(cap1, f, e);
    }
    return t;
  };
  const spine = [...[...TAIL].reverse(), [0, 0], ...FRONT.slice(0, 8)];
  const SPINE_SAMPLES = spine.length * 2 - 1;
  const body = tube(SPINE_SAMPLES + HEAD.length, 24, 'body');
  const jawTube = tube(JAW.length, 12, 'jaw');
  const legTubes = hips.map(() => tube(9, 12, 'limb'));
  const toeTubes = hips.map(() => [0, 1, 2].map(() => tube(4, 6, 'digit')));
  const armTubes = arms.map(() => tube(5, 8, 'limb'));
  const fingerTubes = arms.map(() => [0, 1, 2].map(() => tube(4, 5, 'digit')));
  const browTubes = [1, -1].map(() => tube(4, 6, 'ridge'));

  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  // UVs mirror around the ring so the texture has no seam.
  const uvs = new Float32Array(vertexCount * 2);
  for (const t of tubes) {
    const [along, around] = TILING[t.kind];
    for (let i = 0; i < t.rings; i++)
      for (let k = 0; k < t.m; k++) {
        const o = (t.start + i * t.m + k) * 2;
        uvs[o] = (1 - Math.abs((2 * k) / t.m - 1)) * around;
        uvs[o + 1] = (i / Math.max(t.rings - 1, 1)) * along;
      }
    for (const [cap, ring] of [
      [t.rings * t.m, 0],
      [t.rings * t.m + 1, t.rings - 1],
    ]) {
      uvs[(t.start + cap) * 2] = 0;
      uvs[(t.start + cap) * 2 + 1] = (ring / Math.max(t.rings - 1, 1)) * along;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage),
  );
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(index);

  // Colour: a pale belly, a dark back with broken stripes, a charcoal band
  // along the flank, dark claws, and a dark mouth that shows when it opens.
  const paint = (
    t: Tube,
    fn: (ring: number, angle: number, color: Color) => void,
  ) => {
    const c = new Color();
    for (let i = 0; i < t.rings; i++)
      for (let k = 0; k < t.m; k++) {
        fn(i, (k / t.m) * Math.PI * 2, c);
        c.toArray(colors, (t.start + i * t.m + k) * 3);
      }
    const first = t.start * 3,
      last = (t.start + (t.rings - 1) * t.m) * 3;
    colors.copyWithin((t.start + t.rings * t.m) * 3, first, first + 3);
    colors.copyWithin((t.start + t.rings * t.m + 1) * 3, last, last + 3);
  };
  const hash = (n: number) => {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };
  paint(body, (ring, angle, c) => {
    const u = ring / (body.rings - 1);
    const s = Math.sin(angle);
    c.copy(skinColors.side);
    if (s > 0.3) {
      c.lerp(skinColors.back, clamp((s - 0.3) * 2.5, 0, 1));
      const band = Math.sin(u * 64 + Math.cos(angle * 3) * 0.8);
      if (band > 0.55 && u < 0.86) c.lerp(skinColors.stripe, 0.75);
    }
    // A pale stripe high on each side, from the tail to behind the eye.
    const head = ring >= SPINE_SAMPLES ? ring - SPINE_SAMPLES : -1;
    const stripeAt = head >= 0 ? 0.42 : 0.55;
    if (Math.abs(s - stripeAt) < 0.085 && u > 0.3 && head < 2)
      c.lerp(skinColors.flank, 0.85);
    if (s < -0.25) c.lerp(skinColors.belly, clamp((-s - 0.25) * 1.8, 0, 0.9));
    if (head >= 0) {
      if (s < -0.45) c.copy(skinColors.mouth);
      if (s > 0.2) c.lerp(skinColors.back, 0.35);
      if (head >= 1 && head <= 3 && s > 0.3 && s < 0.85)
        c.lerp(skinColors.brow, 0.55);
    }
    c.multiplyScalar(0.96 + hash(ring * 31 + angle * 7) * 0.08);
  });
  paint(jawTube, (_, angle, c) => {
    const s = Math.sin(angle);
    c.copy(
      s > 0.4
        ? skinColors.mouth
        : s < -0.3
          ? skinColors.belly
          : skinColors.side,
    );
  });
  for (const t of [...legTubes, ...armTubes])
    paint(t, (ring, angle, c) => {
      // Thighs match the body; below the knee the skin turns to the
      // darker, redder scales of the feet.
      c.copy(skinColors.scale).lerp(
        skinColors.side,
        ring < 4 ? 1 : ring < 5 ? 0.4 : 0,
      );
      if (Math.sin(angle) < -0.4 && ring < 4) c.lerp(skinColors.belly, 0.35);
      c.multiplyScalar(0.94 + hash(ring * 13 + angle) * 0.1);
    });
  for (const t of [...toeTubes.flat(), ...fingerTubes.flat()])
    paint(t, (ring, _, c) => {
      c.copy(ring >= 2 ? skinColors.claw : skinColors.scale);
    });
  for (const t of browTubes)
    paint(t, (_, angle, c) => {
      c.copy(skinColors.brow).lerp(
        skinColors.back,
        Math.sin(angle) > 0.3 ? 0.4 : 0,
      );
    });

  const skinMaterial = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.82,
    metalness: 0.02,
    map: options.scales.map,
    bumpMap: options.scales.bumpMap,
    bumpScale: 0.55,
  });
  const wireMaterial = new MeshBasicMaterial({
    color: 0x9aa3b5,
    wireframe: true,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const mesh = new Mesh<BufferGeometry, Material>(geometry, skinMaterial);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  group.add(mesh);

  // Eyes, with a vertical slit, and teeth along both jaws.
  const eyeMaterial = new MeshStandardMaterial({
    color: skinColors.eye,
    emissive: skinColors.eye.clone().multiplyScalar(0.45),
    emissiveIntensity: 0.7,
    roughness: 0.15,
  });
  const pupilMaterial = new MeshBasicMaterial({ color: 0x050403 });
  const eyes = [1, -1].map((side) => {
    const eye = new Group();
    eye.position.set(0.1, 0.05, 0.079 * side);
    const ball = new Mesh(new SphereGeometry(0.022, 12, 10), eyeMaterial);
    const slit = new Mesh(new BoxGeometry(0.005, 0.026, 0.004), pupilMaterial);
    slit.position.z = 0.021 * side;
    eye.add(ball, slit);
    head.add(eye);
    return eye;
  });
  const sample = (table: number[][], x: number, column: number) => {
    for (let i = 0; i < table.length - 1; i++)
      if (x <= table[i + 1][0]) {
        const t = (x - table[i][0]) / (table[i + 1][0] - table[i][0]);
        return lerp(table[i][column], table[i + 1][column], t);
      }
    return table[table.length - 1][column];
  };
  const teeth = (on: Object3D, from: number, to: number, upper: boolean) => {
    const parts: BufferGeometry[] = [];
    for (const side of [1, -1])
      for (let x = from; x <= to; x += 0.034) {
        const table = upper ? HEAD : JAW;
        const w = sample(table, x, 1),
          h = sample(table, x, 2),
          dy = sample(table, x, 3);
        const length = (upper ? 0.022 : 0.016) * (1 - (x - from) * 0.6);
        const cone = new ConeGeometry(0.0045, length, 4);
        cone.rotateX(upper ? Math.PI : 0);
        cone.translate(
          x,
          upper ? dy - h * 0.26 - length * 0.4 : dy + h * 0.57 + length * 0.4,
          w * 0.82 * side,
        );
        parts.push(cone);
      }
    const merged = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    const m = new Mesh(
      merged,
      new MeshStandardMaterial({ color: 0xd9d3c4, roughness: 0.4 }),
    );
    on.add(m);
    return m;
  };
  // Quills on the back of the head and the top of the neck.
  const quillParts: BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const q = new ConeGeometry(0.0045, 0.05 + (i % 3) * 0.015, 4);
    q.rotateZ(0.95 + (i % 2) * 0.15);
    q.rotateY(((i % 3) - 1) * 0.5);
    q.translate(
      -0.02 + Math.floor(i / 3) * 0.035,
      0.105 - Math.floor(i / 3) * 0.006,
      ((i % 3) - 1) * 0.03,
    );
    quillParts.push(q);
  }
  const quillGeometry = mergeGeometries(quillParts);
  quillParts.forEach((q) => q.dispose());
  const quillMaterial = new MeshStandardMaterial({
    color: skinColors.back,
    roughness: 0.9,
  });
  const quills = new Mesh(quillGeometry, quillMaterial);
  quills.castShadow = true;
  head.add(quills);
  const upperTeeth = teeth(head, 0.14, 0.54, true);
  const lowerTeeth = teeth(jaw, 0.09, 0.46, false);

  // ——— X-ray: skeleton, joints, and candidate actuator housings ———
  const legPoints = 7,
    armPoints = 6;
  const skeletonCount =
    body.rings + JAW.length + hips.length * legPoints + arms.length * armPoints;
  const skeletonPositions = new Float32Array(skeletonCount * 3);
  const skeletonGeometry = new BufferGeometry();
  skeletonGeometry.setAttribute(
    'position',
    new BufferAttribute(skeletonPositions, 3).setUsage(DynamicDrawUsage),
  );
  const links: number[] = [];
  for (let i = 0; i < body.rings - 1; i++) links.push(i, i + 1);
  const jawStart = body.rings;
  links.push(SPINE_SAMPLES + 1, jawStart);
  for (let i = 0; i < JAW.length - 1; i++)
    links.push(jawStart + i, jawStart + i + 1);
  const pelvisSample = TAIL.length * 2;
  const chestSample = (TAIL.length + 4) * 2;
  const legStart = (l: number) => jawStart + JAW.length + l * legPoints;
  const armStart = (a: number) => legStart(hips.length) + a * armPoints;
  for (let l = 0; l < hips.length; l++) {
    const s = legStart(l);
    links.push(
      pelvisSample,
      s,
      s,
      s + 1,
      s + 1,
      s + 2,
      s + 2,
      s + 3,
      s + 3,
      s + 4,
      s + 3,
      s + 5,
      s + 3,
      s + 6,
    );
  }
  for (let a = 0; a < arms.length; a++) {
    const s = armStart(a);
    links.push(
      chestSample,
      s,
      s,
      s + 1,
      s + 1,
      s + 2,
      s + 2,
      s + 3,
      s + 2,
      s + 4,
      s + 2,
      s + 5,
    );
  }
  skeletonGeometry.setIndex(links);
  const skeletonMaterial = new LineBasicMaterial({
    color: 0xf2f4f8,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const skeleton = new LineSegments(skeletonGeometry, skeletonMaterial);
  skeleton.frustumCulled = false;
  skeleton.renderOrder = 2;
  const jointIndex: number[] = [];
  for (let i = 0; i < SPINE_SAMPLES; i += 2) jointIndex.push(i);
  jointIndex.push(
    SPINE_SAMPLES,
    body.rings - 1,
    jawStart,
    jawStart + JAW.length - 1,
  );
  for (let l = 0; l < hips.length; l++)
    for (let i = 0; i < 4; i++) jointIndex.push(legStart(l) + i);
  for (let a = 0; a < arms.length; a++)
    for (let i = 0; i < 3; i++) jointIndex.push(armStart(a) + i);
  const jointGeometry = new BufferGeometry();
  jointGeometry.setAttribute(
    'position',
    skeletonGeometry.getAttribute('position'),
  );
  jointGeometry.setIndex(jointIndex);
  const jointMaterial = new PointsMaterial({
    size: 8,
    sizeAttenuation: false,
    map: options.dot,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    color: 0xf2f4f8,
  });
  const joints = new Points(jointGeometry, jointMaterial);
  joints.frustumCulled = false;
  joints.renderOrder = 3;
  group.add(skeleton, joints);

  const actuators: { material: LineBasicMaterial; channel: keyof Channels }[] =
    [];
  const housing = (
    on: Object3D,
    shape: BufferGeometry,
    at: [number, number, number],
    channel: keyof Channels,
  ) => {
    const material = new LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const edges = new LineSegments(new EdgesGeometry(shape), material);
    shape.dispose();
    edges.position.set(...at);
    edges.renderOrder = 2;
    on.add(edges);
    actuators.push({ material, channel });
  };
  housing(head, new BoxGeometry(0.09, 0.045, 0.06), [0.13, -0.005, 0], 'jaw');
  housing(front[4], new BoxGeometry(0.08, 0.08, 0.08), [0, -0.01, 0], 'pan');
  housing(
    front[5],
    new CylinderGeometry(0.05, 0.05, 0.02, 10),
    [0, -0.05, 0],
    'tilt',
  );
  housing(
    front[1],
    new CylinderGeometry(0.035, 0.035, 0.22, 8),
    [0, -0.14, 0],
    'breath',
  );
  housing(tail[1], new BoxGeometry(0.09, 0.06, 0.07), [0, -0.02, 0], 'tail');
  housing(hips[0], new BoxGeometry(0.07, 0.07, 0.06), [0, 0, 0], 'strideL');
  housing(hips[1], new BoxGeometry(0.07, 0.07, 0.06), [0, 0, 0], 'strideR');

  // ——— Motion state ———
  const pan: Spring = { x: 0, v: 0 },
    tilt: Spring = { x: 0, v: 0 },
    jawOpen: Spring = { x: 0, v: 0 },
    crouch: Spring = { x: 0, v: 0 },
    reach: Spring = { x: 0, v: 0 },
    call: Spring = { x: 0, v: 0 },
    lean: Spring = { x: 0, v: 0 },
    bend: Spring = { x: 0, v: 0 },
    upright: Spring = { x: 0, v: 0 };
  // Extra neck tilt that steers the mouth onto whatever it is reaching for,
  // and keeps it out of the ground.
  let dip = 0;
  const muzzle = new Vector3();
  type Foot = {
    side: number;
    planted: Vector3;
    from: Vector3;
    to: Vector3;
    at: Vector3;
    t: number;
    rest: number;
  };
  const feet: Foot[] = hips.map((_, i) => ({
    side: i === 0 ? 1 : -1,
    planted: new Vector3(),
    from: new Vector3(),
    to: new Vector3(),
    at: new Vector3(),
    t: 1,
    rest: 0,
  }));
  const channels: Channels = {
    jaw: 0,
    pan: 0,
    tilt: 0,
    tail: 0,
    breath: 0,
    strideL: 0,
    strideR: 0,
  };
  let breathPhase = 0,
    blinkAt = -1,
    nextBlink = 2,
    xray = false,
    started = false;

  const fwd = new Vector3(),
    right = new Vector3(),
    up = new Vector3(0, 1, 0),
    tmp = new Vector3(),
    tmp2 = new Vector3(),
    local = new Vector3();
  const H = new Vector3(),
    K = new Vector3(),
    A = new Vector3(),
    F = new Vector3();
  const samples = Array.from({ length: SPINE_SAMPLES }, () => new Vector3());
  const spineWorld = Array.from({ length: spine.length }, () => new Vector3());
  const spineNodes = [...[...tail].reverse(), root, ...front.slice(0, 8)];
  const spineSize = (i: number) => {
    // Sizes per spine joint, tail tip first.
    if (i < TAIL.length) {
      const f = (i + 0.5) / (TAIL.length + 0.5);
      return [0.012 + 0.125 * f ** 1.3, 0.016 + 0.16 * f ** 1.3, -0.025 * f];
    }
    if (i === TAIL.length) return PELVIS;
    return TORSO[i - TAIL.length - 1];
  };

  // Writes one ring of a tube.
  const ring = (
    t: Tube,
    i: number,
    center: Vector3,
    tangent: Vector3,
    lateral: Vector3,
    w: number,
    h: number,
    dy = 0,
    flat = 1,
  ) => {
    const r = tmp
      .copy(lateral)
      .addScaledVector(tangent, -tangent.dot(lateral))
      .normalize();
    const u = tmp2.crossVectors(r, tangent).normalize();
    for (let k = 0; k < t.m; k++) {
      const a = (k / t.m) * Math.PI * 2;
      const c = Math.cos(a),
        s = Math.sin(a);
      const x = w * c * (1 - 0.12 * s),
        y = dy + h * s * (s < 0 ? flat : 1);
      const o = (t.start + i * t.m + k) * 3;
      positions[o] = center.x + r.x * x + u.x * y;
      positions[o + 1] = center.y + r.y * x + u.y * y;
      positions[o + 2] = center.z + r.z * x + u.z * y;
    }
    if (i === 0) {
      const o = (t.start + t.rings * t.m) * 3;
      positions[o] = center.x + u.x * dy;
      positions[o + 1] = center.y + u.y * dy;
      positions[o + 2] = center.z + u.z * dy;
    }
    if (i === t.rings - 1) {
      const o = (t.start + t.rings * t.m + 1) * 3;
      positions[o] = center.x + tangent.x * w * 0.5;
      positions[o + 1] = center.y + tangent.y * w * 0.5;
      positions[o + 2] = center.z + tangent.z * w * 0.5;
    }
  };
  // Lofts a tube through a list of points.
  const sizes: [number, number][] = [];
  const path = Array.from({ length: 9 }, () => new Vector3());
  const tangentAt = new Vector3();
  const loft = (
    t: Tube,
    points: Vector3[],
    dims: [number, number][],
    lateral: Vector3,
  ) => {
    for (let i = 0; i < t.rings; i++) {
      const a = points[Math.max(i - 1, 0)],
        b = points[Math.min(i + 1, t.rings - 1)];
      tangentAt.subVectors(b, a).normalize();
      ring(t, i, points[i], tangentAt, lateral, dims[i][0], dims[i][1]);
    }
  };
  const skeletonPoint = (i: number, p: Vector3) =>
    p.toArray(skeletonPositions, i * 3);

  function frameFromNode(node: Object3D, axis: 0 | 1 | 2, out: Vector3) {
    return out.setFromMatrixColumn(node.matrixWorld, axis).normalize();
  }

  function solveLeg(foot: Foot, hip: Object3D, angle: number, l: number) {
    hip.getWorldPosition(H);
    F.copy(foot.at);
    A.copy(F)
      .addScaledVector(fwd, -Math.cos(angle) * META)
      .addScaledVector(up, Math.sin(angle) * META);
    tmp.subVectors(A, H);
    let d = tmp.length();
    const max = THIGH + SHIN - 1e-3;
    if (d > max) {
      A.copy(H).addScaledVector(tmp.normalize(), max);
      F.copy(A)
        .addScaledVector(fwd, Math.cos(angle) * META)
        .addScaledVector(up, -Math.sin(angle) * META);
      d = max;
    }
    d = Math.max(d, Math.abs(THIGH - SHIN) + 1e-3);
    const dir = tmp.subVectors(A, H).normalize();
    const hint = tmp2.copy(fwd).addScaledVector(right, foot.side * 0.15);
    hint.addScaledVector(dir, -hint.dot(dir)).normalize();
    const along = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d);
    const out = Math.sqrt(Math.max(THIGH * THIGH - along * along, 0));
    K.copy(H).addScaledVector(dir, along).addScaledVector(hint, out);

    // Skin along hip → knee → ankle → ball of the foot.
    const pts = path;
    const dims = sizes;
    dims.length = 0;
    const put = (
      i: number,
      from: Vector3,
      to: Vector3,
      t: number,
      w: number,
      h: number,
    ) => {
      pts[i].lerpVectors(from, to, t);
      dims.push([w, h]);
    };
    // The first section is tucked inside the body so no cap shows.
    put(0, H, K, 0, 0.04, 0.05);
    put(1, H, K, 0.18, 0.12, 0.165);
    put(2, H, K, 0.5, 0.125, 0.155);
    put(3, H, K, 0.84, 0.09, 0.09);
    put(4, K, A, 0.15, 0.074, 0.076);
    put(5, K, A, 0.6, 0.055, 0.056);
    put(6, K, A, 0.96, 0.031, 0.035);
    put(7, A, F, 0.55, 0.024, 0.027);
    pts[8].copy(F).addScaledVector(fwd, 0.02).addScaledVector(up, 0.005);
    dims.push([0.022, 0.018]);
    loft(legTubes[l], pts, dims, right);

    // Toes: III and IV on the ground, II raised with the sickle claw.
    const toes = toeTubes[l];
    const toe = (
      t: Tube,
      spread: number,
      points: [number, number][],
      widths: number[],
    ) => {
      tmp
        .copy(fwd)
        .addScaledVector(right, spread * foot.side)
        .normalize();
      for (let i = 0; i < 4; i++)
        path[i]
          .copy(F)
          .addScaledVector(tmp, points[i][0])
          .addScaledVector(up, points[i][1])
          .addScaledVector(
            right,
            (spread < 0 ? -0.02 : spread > 0 ? 0.015 : 0) * foot.side,
          );
      loft(
        t,
        path.slice(0, 4),
        widths.map((w) => [w, w * 0.85]),
        right,
      );
      return path[3];
    };
    const s = legStart(l);
    skeletonPoint(s, H);
    skeletonPoint(s + 1, K);
    skeletonPoint(s + 2, A);
    skeletonPoint(s + 3, F);
    skeletonPoint(
      s + 4,
      toe(
        toes[0],
        0,
        [
          [0, 0.01],
          [0.08, 0.004],
          [0.15, -0.006],
          [0.19, -0.026],
        ],
        [0.02, 0.016, 0.009, 0.002],
      ),
    );
    skeletonPoint(
      s + 5,
      toe(
        toes[1],
        0.35,
        [
          [0, 0.008],
          [0.07, 0.004],
          [0.13, -0.006],
          [0.16, -0.024],
        ],
        [0.017, 0.014, 0.008, 0.002],
      ),
    );
    skeletonPoint(
      s + 6,
      toe(
        toes[2],
        -0.1,
        [
          [-0.01, 0.012],
          [0.035, 0.055],
          [0.07, 0.09],
          [0.115, 0.07],
        ],
        [0.016, 0.013, 0.008, 0.002],
      ),
    );
  }

  function update(dt: number, time: number, d: Drive) {
    fwd.set(Math.cos(d.heading), 0, Math.sin(d.heading));
    right.set(-Math.sin(d.heading), 0, Math.cos(d.heading));
    const speed = d.speed,
      run = clamp(speed / 4, 0, 1);

    // Feet: plant, then step when the body has carried the hip too far.
    const stepTime = clamp(0.46 - speed * 0.065, 0.19, 0.46);
    const reachOut = 0.11 + speed * 0.1;
    let bob = 0,
      sway = 0;
    feet.forEach((foot, i) => {
      const neutral = tmp
        .set(d.x, 0, d.z)
        .addScaledVector(fwd, 0.13 + run * 0.05)
        .addScaledVector(right, 0.17 * foot.side)
        .addScaledVector(fwd, speed * stepTime * 0.55);
      if (!started) {
        foot.planted.copy(neutral);
        foot.at.copy(neutral);
      }
      const other = feet[1 - i];
      if (foot.t >= 1) {
        foot.rest += dt;
        const far = foot.planted.distanceTo(neutral);
        const ready = other.t >= 1 || (speed > 2.4 && other.t > 0.55);
        const settle = speed < 0.05 && far > 0.05 && foot.rest > 0.6;
        if (ready && (far > reachOut || settle)) {
          foot.from.copy(foot.planted);
          foot.to.copy(neutral).addScaledVector(fwd, speed * stepTime * 0.4);
          foot.t = 0;
        }
        foot.at.copy(foot.planted);
      } else {
        foot.t = Math.min(1, foot.t + dt / stepTime);
        const e = foot.t * foot.t * (3 - 2 * foot.t);
        const lift = Math.sin(foot.t * Math.PI);
        foot.at
          .lerpVectors(foot.from, foot.to, e)
          .addScaledVector(up, lift * (0.08 + speed * 0.03));
        bob += lift;
        sway += foot.side * lift;
        if (foot.t >= 1) {
          foot.planted.copy(foot.to);
          foot.at.copy(foot.to);
          foot.rest = 0;
        }
      }
    });
    started = true;

    // Springs toward the behaviour channels.
    follow(crouch, d.crouch, 30, dt);
    follow(reach, d.reach, 18, dt);
    follow(call, d.call, 40, dt);
    follow(lean, -d.turn * speed * 0.05, 12, dt);
    follow(bend, d.turn * 0.12, 10, dt);
    follow(upright, d.upright * (1 - run), 6, dt);

    // Attention: where the head should point, in the body's own frame.
    let yaw = clamp(d.turn * 0.35, -0.6, 0.6),
      pitch = 0;
    if (d.look) {
      local.copy(d.look);
      root.worldToLocal(local);
      const dx = local.x - 1.32,
        dz = local.z,
        dyv = local.y - 0.27;
      yaw = clamp(Math.atan2(-dz, Math.max(dx, 0.05)), -1.25, 1.25);
      pitch = clamp(
        Math.atan2(dyv, Math.hypot(Math.max(dx, 0.05), dz)),
        -1.35,
        0.8,
      );
    }
    muzzle.set(0.54, -0.035, 0).applyMatrix4(head.matrixWorld);
    if (d.look && d.reach > 0.5) dip -= (muzzle.y - (d.look.y + 0.06)) * 3 * dt;
    else dip *= Math.exp(-dt * 3);
    if (muzzle.y < 0.05) dip += (0.05 - muzzle.y) * 14 * dt;
    dip = clamp(dip, -0.9, 0.9);
    pitch += dip + call.x * 0.9 + d.peck * Math.sin(time * 11) * 0.18;
    follow(pan, yaw, d.look ? 26 : 14, dt);
    follow(tilt, pitch, 22, dt);
    const jawTarget =
      Math.max(d.jaw, call.x * 0.95) +
      d.peck * Math.max(0, Math.sin(time * 11 + 1)) * 0.6;
    follow(jawOpen, jawTarget, 120, dt);

    // Breathing, faster after running.
    breathPhase += dt * (1.5 + run * 3 + d.call * 2);
    const breath = (Math.sin(breathPhase) + 1) / 2;

    // Body.
    const hipY =
      HIP_HEIGHT -
      crouch.x * 0.16 -
      reach.x * 0.1 -
      d.sleepy * 0.3 +
      bob * (0.018 + speed * 0.006) +
      breath * 0.006;
    root.position.set(
      d.x + right.x * sway * 0.012,
      hipY,
      d.z + right.z * sway * 0.012,
    );
    root.rotation.y = -d.heading;
    root.rotation.z =
      -0.03 -
      run * 0.1 -
      reach.x * 0.32 +
      call.x * 0.14 -
      crouch.x * 0.05 -
      d.sleepy * 0.1 +
      upright.x * 0.3;
    root.rotation.x = lean.x + Math.sin(time * 0.6) * 0.01;
    front.forEach((node, i) => {
      if (i < 3) {
        node.rotation.y = bend.x * 0.3;
        node.rotation.z = (breath - 0.5) * 0.01;
      }
    });
    const neck = [front[3], front[4], front[5], front[6], front[7]];
    const share = [0.14, 0.2, 0.2, 0.18, 0.12];
    const tiltAdjusted = tilt.x + reach.x * 0.32 - call.x * 0.14;
    neck.forEach((node, i) => {
      node.rotation.y = pan.x * share[i] + bend.x * 0.2;
      node.rotation.z = tiltAdjusted * share[i] + (i === 0 ? -run * 0.12 : 0);
    });
    head.rotation.y = pan.x * 0.16;
    head.rotation.z = HEAD_REST + tiltAdjusted * 0.16 + run * 0.12;
    head.rotation.x = Math.sin(time * 0.8) * 0.03;
    jaw.rotation.z = JAW_REST - jawOpen.x * 0.75;
    tail.forEach((node, i) => {
      const f = 0.4 + i / TAIL.length;
      node.rotation.y =
        Math.sin(time * (1.2 + run * 3) - i * 0.45) * (0.035 - run * 0.02) * f -
        bend.x * 0.35 +
        sway * 0.02 * (1 - run);
      // Standing tall, the tail stays level and lifts towards its tip.
      node.rotation.z =
        Math.sin(time * 0.7 - i * 0.35) * 0.012 +
        run * 0.012 +
        reach.x * 0.04 -
        d.sleepy * 0.03 -
        upright.x * (i < 3 ? 0.1 : i > 4 ? 0.035 : 0);
    });
    arms.forEach((arm, i) => {
      arm.shoulder.rotation.z =
        -1.35 + Math.sin(time * 1.3 + i) * 0.05 + reach.x * 0.25 - run * 0.3;
      arm.elbow.rotation.z = 1.95 + breath * 0.06 + run * 0.25;
    });

    // Blinks.
    if (time > nextBlink) {
      blinkAt = time;
      nextBlink = time + 2 + Math.random() * 4.5;
    }
    const b = time - blinkAt;
    const lid = Math.max(
      0.08,
      (b < 0.16 ? 1 - Math.sin((b / 0.16) * Math.PI) : 1) *
        (1 - d.sleepy * 0.85),
    );
    for (const eye of eyes) eye.scale.y = lid;

    group.updateMatrixWorld(true);

    // ——— Rebuild the skin ———
    spineNodes.forEach((node, i) => node.getWorldPosition(spineWorld[i]));
    const n = spineWorld.length;
    for (let i = 0; i < n; i++) {
      samples[i * 2].copy(spineWorld[i]);
      if (i < n - 1) {
        const p0 = spineWorld[Math.max(i - 1, 0)],
          p1 = spineWorld[i],
          p2 = spineWorld[i + 1],
          p3 = spineWorld[Math.min(i + 2, n - 1)];
        samples[i * 2 + 1]
          .copy(p1)
          .multiplyScalar(0.5625)
          .addScaledVector(p2, 0.5625)
          .addScaledVector(p0, -0.0625)
          .addScaledVector(p3, -0.0625);
      }
    }
    frameFromNode(root, 2, local);
    const breathIn = 1 + breath * 0.045;
    for (let i = 0; i < SPINE_SAMPLES; i++) {
      const a = samples[Math.max(i - 1, 0)],
        c =
          i < SPINE_SAMPLES - 1
            ? samples[i + 1]
            : tmp2.set(0, 0, 0).setFromMatrixPosition(head.matrixWorld);
      tangentAt.subVectors(c, a).normalize();
      const j = i / 2;
      const s0 = spineSize(Math.floor(j)),
        s1 = spineSize(Math.min(Math.ceil(j), n - 1));
      const f = j - Math.floor(j);
      const chest =
        i >= (TAIL.length + 1) * 2 && i <= (TAIL.length + 4) * 2 ? breathIn : 1;
      ring(
        body,
        i,
        samples[i],
        tangentAt,
        local,
        lerp(s0[0], s1[0], f) * chest,
        lerp(s0[1], s1[1], f) * chest,
        lerp(s0[2], s1[2], f),
      );
      skeletonPoint(i, samples[i]);
    }
    const headAxis = frameFromNode(head, 0, new Vector3());
    const headSide = frameFromNode(head, 2, new Vector3());
    HEAD.forEach(([x, w, h, dy, flat], i) => {
      tmp2.set(x, 0, 0).applyMatrix4(head.matrixWorld);
      const center = path[0].copy(tmp2);
      ring(body, SPINE_SAMPLES + i, center, headAxis, headSide, w, h, dy, flat);
      skeletonPoint(SPINE_SAMPLES + i, center);
    });
    // Brow ridges over the eyes.
    browTubes.forEach((t, b) => {
      const side = b === 0 ? 1 : -1;
      const pts = BROW.map(([x, y, z], i) =>
        path[i].set(x, y, z * side).applyMatrix4(head.matrixWorld),
      );
      loft(
        t,
        pts,
        BROW.map(([, , , w, h]) => [w, h] as [number, number]),
        headSide,
      );
    });
    const jawAxis = frameFromNode(jaw, 0, new Vector3());
    const jawSide = frameFromNode(jaw, 2, new Vector3());
    JAW.forEach(([x, w, h, dy], i) => {
      const center = path[0].set(x, 0, 0).applyMatrix4(jaw.matrixWorld);
      ring(jawTube, i, center, jawAxis, jawSide, w, h, dy, 1);
      skeletonPoint(jawStart + i, center);
    });

    // Legs.
    feet.forEach((foot, l) => {
      const swing = foot.t < 1 ? Math.sin(foot.t * Math.PI) : 0;
      const angle = 1.02 - run * 0.12 + swing * 0.45 + crouch.x * 0.12;
      solveLeg(foot, hips[l], angle, l);
    });

    // Arms and fingers.
    arms.forEach((arm, a) => {
      const S = arm.shoulder.getWorldPosition(new Vector3());
      const E = arm.elbow.getWorldPosition(new Vector3());
      const W = arm.wrist.getWorldPosition(new Vector3());
      path[0].copy(S);
      path[1].lerpVectors(S, E, 0.5);
      path[2].copy(E);
      path[3].lerpVectors(E, W, 0.5);
      path[4].copy(W);
      loft(
        armTubes[a],
        path.slice(0, 5),
        [
          [0.05, 0.055],
          [0.042, 0.046],
          [0.032, 0.034],
          [0.026, 0.028],
          [0.022, 0.022],
        ],
        right,
      );
      const s = armStart(a);
      skeletonPoint(s, S);
      skeletonPoint(s + 1, E);
      skeletonPoint(s + 2, W);
      fingerTubes[a].forEach((t, f) => {
        const k = f - 1;
        const pts = [
          [0, 0, k * 0.012],
          [0.045, -0.01, k * 0.016],
          [0.075, -0.035, k * 0.018],
          [0.08, -0.058, k * 0.018],
        ].map(([x, y, z], i) =>
          path[i].set(x, y, z * arm.side).applyMatrix4(arm.wrist.matrixWorld),
        );
        loft(
          t,
          pts,
          [
            [0.012, 0.012],
            [0.009, 0.009],
            [0.005, 0.005],
            [0.0015, 0.0015],
          ],
          right,
        );
        skeletonPoint(s + 3 + f, pts[3]);
      });
    });

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    skeletonGeometry.attributes.position.needsUpdate = true;

    // Channels, as an animatronic controller would read them.
    channels.jaw = jawOpen.x * 0.75 * (180 / Math.PI);
    channels.pan = pan.x * (180 / Math.PI);
    channels.tilt = tiltAdjusted * (180 / Math.PI);
    channels.tail = tail[2].rotation.y * (180 / Math.PI) * 6;
    channels.breath = breath * 100;
    channels.strideL = feet[0].t < 1 ? Math.sin(feet[0].t * Math.PI) * 100 : 0;
    channels.strideR = feet[1].t < 1 ? Math.sin(feet[1].t * Math.PI) * 100 : 0;
    for (const a of actuators) {
      const v = Math.abs(channels[a.channel]);
      a.material.opacity = xray ? 0.35 + Math.min(v / 40, 1) * 0.65 : 0;
    }
  }

  function setXray(on: boolean) {
    xray = on;
    mesh.material = on ? wireMaterial : skinMaterial;
    mesh.castShadow = !on;
    skeleton.visible = joints.visible = on;
    upperTeeth.visible = lowerTeeth.visible = !on;
    for (const eye of eyes) eye.visible = !on;
    for (const a of actuators) a.material.visible = on;
  }
  setXray(false);

  const mouth = new Vector3();
  return {
    group,
    mesh,
    channels,
    feet,
    update,
    setXray,
    mouth() {
      return mouth.set(0.54, -0.035, 0).applyMatrix4(head.matrixWorld);
    },
    dispose() {
      group.traverse((object) => {
        const item = object as Mesh;
        item.geometry?.dispose();
        const material = item.material as MeshStandardMaterial | undefined;
        material?.dispose?.();
      });
      skinMaterial.dispose();
      wireMaterial.dispose();
    },
  };
}
