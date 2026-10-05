// The paddock for the raptor simulation: worn ground inside an electrified
// fence, a pond, two floodlight towers, and a treeline on rising ground.
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  Float32BufferAttribute,
  HemisphereLight,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  SpotLight,
  Vector3,
  type Scene,
} from 'three';

export const BOUNDS = { minX: -11, maxX: 11, minZ: -7, maxZ: 7 };
export const POND = { x: 6.2, z: -3.3, r: 2.1 };

// A seeded random so the paddock is laid out the same way every visit.
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function groundHeight(x: number, z: number) {
  const outside = Math.max(Math.abs(x) - 12.5, Math.abs(z) - 8.5, 0);
  if (!outside) return 0;
  return (
    smooth(0, 14, outside) *
    (1.6 +
      Math.sin(x * 0.23) * Math.cos(z * 0.19) * 1.4 +
      Math.sin(x * 0.07 + z * 0.11) * 2.2)
  );
}

export function createPaddock(scene: Scene) {
  const random = seeded(20261005);
  const owned: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(item: T) => {
    owned.push(item);
    return item;
  };

  // Sky: a dark gradient dome with a low moon.
  const sky = new Mesh(
    keep(new SphereGeometry(90, 32, 16)),
    keep(
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new Color(0x05070b) },
          horizon: { value: new Color(0x1a2130) },
        },
        vertexShader: `varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying float vY; void main(){ gl_FragColor = vec4(mix(horizon, top, smoothstep(-0.02, 0.45, vY)), 1.0); }`,
      }),
    ),
  );
  scene.add(sky);
  const moon = new Mesh(
    keep(new CircleGeometry(2.2, 32)),
    keep(
      new MeshBasicMaterial({ color: new Color(2.2, 2.25, 2.4), fog: false }),
    ),
  );
  moon.position.set(-40, 26, -60);
  moon.lookAt(0, 0, 0);
  scene.add(moon);

  // Ground, with soft colour variation and hills beyond the fence.
  const ground = keep(new PlaneGeometry(120, 120, 150, 150));
  ground.rotateX(-Math.PI / 2);
  const position = ground.attributes.position;
  const colors: number[] = [];
  const dirt = new Color(0x0d0c0a),
    grass = new Color(0x080b07),
    moss = new Color(0x0b100b),
    c = new Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      z = position.getZ(i);
    position.setY(i, groundHeight(x, z));
    const n =
      Math.sin(x * 1.3) * Math.cos(z * 1.1) * 0.5 +
      Math.sin(x * 0.37 + z * 0.53) * 0.5 +
      (random() - 0.5) * 0.35;
    const inside = Math.abs(x) < 11.5 && Math.abs(z) < 7.5;
    c.copy(grass).lerp(dirt, inside ? 0.55 + n * 0.4 : 0.2 + n * 0.25);
    if (!inside) c.lerp(moss, 0.4);
    colors.push(c.r, c.g, c.b);
  }
  ground.setAttribute('color', new Float32BufferAttribute(colors, 3));
  ground.computeVertexNormals();
  const floor = new Mesh(
    ground,
    keep(
      new MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        metalness: 0,
      }),
    ),
  );
  floor.receiveShadow = true;
  scene.add(floor);

  // The simulation grid, only inside the paddock.
  const grid: number[] = [];
  for (let x = BOUNDS.minX; x <= BOUNDS.maxX; x++)
    grid.push(x, 0.015, BOUNDS.minZ, x, 0.015, BOUNDS.maxZ);
  for (let z = BOUNDS.minZ; z <= BOUNDS.maxZ; z++)
    grid.push(BOUNDS.minX, 0.015, z, BOUNDS.maxX, 0.015, z);
  const gridGeometry = keep(new BufferGeometry());
  gridGeometry.setAttribute('position', new Float32BufferAttribute(grid, 3));
  scene.add(
    new LineSegments(
      gridGeometry,
      keep(
        new LineBasicMaterial({
          color: 0x8b93a6,
          transparent: true,
          opacity: 0.07,
        }),
      ),
    ),
  );

  // Fence: posts, three cables, and a light on every post.
  const corners = [
    [-11.6, -7.6],
    [11.6, -7.6],
    [11.6, 7.6],
    [-11.6, 7.6],
  ];
  const posts: [number, number][] = [];
  for (let s = 0; s < 4; s++) {
    const [ax, az] = corners[s],
      [bx, bz] = corners[(s + 1) % 4];
    const length = Math.hypot(bx - ax, bz - az);
    const count = Math.round(length / 1.6);
    for (let i = 0; i < count; i++)
      posts.push([ax + ((bx - ax) * i) / count, az + ((bz - az) * i) / count]);
  }
  const metal = keep(
    new MeshStandardMaterial({
      color: 0x23262c,
      roughness: 0.55,
      metalness: 0.6,
    }),
  );
  const postMesh = new InstancedMesh(
    keep(new BoxGeometry(0.1, 2.8, 0.1)),
    metal,
    posts.length,
  );
  const lampMaterial = keep(
    new MeshBasicMaterial({ color: new Color(1.6, 0.75, 0.25) }),
  );
  const lamps = new InstancedMesh(
    keep(new SphereGeometry(0.05, 8, 6)),
    lampMaterial,
    posts.length,
  );
  const dummy = new Object3D();
  const cables: number[] = [];
  posts.forEach(([x, z], i) => {
    dummy.position.set(x, 1.4, z);
    dummy.updateMatrix();
    postMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 2.84, z);
    dummy.updateMatrix();
    lamps.setMatrixAt(i, dummy.matrix);
    const [nx, nz] = posts[(i + 1) % posts.length];
    for (const y of [0.8, 1.5, 2.2]) cables.push(x, y, z, nx, y, nz);
  });
  postMesh.castShadow = true;
  scene.add(postMesh, lamps);
  const cableGeometry = keep(new BufferGeometry());
  cableGeometry.setAttribute('position', new Float32BufferAttribute(cables, 3));
  scene.add(
    new LineSegments(
      cableGeometry,
      keep(
        new LineBasicMaterial({
          color: 0x9aa1ae,
          transparent: true,
          opacity: 0.45,
        }),
      ),
    ),
  );
  // The main gate at the back.
  const concrete = keep(
    new MeshStandardMaterial({ color: 0x2b2a28, roughness: 0.95 }),
  );
  const pillar = keep(new BoxGeometry(0.7, 5.2, 0.7));
  for (const x of [-2.4, 2.4]) {
    const p = new Mesh(pillar, concrete);
    p.position.set(x, 2.6, -7.6);
    p.castShadow = true;
    scene.add(p);
  }
  const beam = new Mesh(keep(new BoxGeometry(5.6, 0.6, 0.8)), concrete);
  beam.position.set(0, 5.1, -7.6);
  beam.castShadow = true;
  scene.add(beam);
  const doors = new Mesh(keep(new BoxGeometry(4.1, 4.2, 0.12)), metal);
  doors.position.set(0, 2.1, -7.62);
  scene.add(doors);

  // Floodlight towers with visible beams and real light pools.
  const beams: Mesh[] = [];
  for (const [x, z, tx, tz, color] of [
    [-13.5, -9.5, -4, -1, 0xfff0d8],
    [13.5, -9.5, 4.5, 1.5, 0xe2ecff],
  ] as const) {
    const y = groundHeight(x, z);
    const pole = new Mesh(keep(new CylinderGeometry(0.12, 0.18, 8, 8)), metal);
    pole.position.set(x, y + 4, z);
    scene.add(pole);
    const lampHead = new Mesh(keep(new BoxGeometry(0.9, 0.35, 0.5)), metal);
    lampHead.position.set(x, y + 8.1, z);
    scene.add(lampHead);
    const light = new SpotLight(color, 60, 32, 0.42, 0.75, 1.6);
    light.position.set(x, y + 8, z);
    light.target.position.set(tx, 0, tz);
    scene.add(light, light.target);
    const from = new Vector3(x, y + 8, z),
      to = new Vector3(tx, 0, tz);
    const length = from.distanceTo(to);
    const cone = new Mesh(
      keep(new ConeGeometry(Math.tan(0.42) * length, length, 32, 1, true)),
      keep(
        new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.035,
          blending: AdditiveBlending,
          depthWrite: false,
          side: BackSide,
          fog: false,
        }),
      ),
    );
    cone.position.copy(from).add(to).multiplyScalar(0.5);
    cone.quaternion.copy(
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        from.clone().sub(to).normalize(),
      ),
    );
    scene.add(cone);
    beams.push(cone);
    const glow = new Mesh(
      keep(new CircleGeometry(0.22, 16)),
      keep(
        new MeshBasicMaterial({ color: new Color(3, 2.9, 2.6), fog: false }),
      ),
    );
    glow.position.set(x, y + 7.9, z + 0.26);
    glow.lookAt(tx, 0, tz);
    scene.add(glow);
  }

  // Pond.
  const water = new Mesh(
    keep(new CircleGeometry(POND.r, 48)),
    keep(
      new MeshStandardMaterial({
        color: 0x05080c,
        roughness: 0.06,
        metalness: 0.85,
      }),
    ),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(POND.x, 0.02, POND.z);
  water.receiveShadow = true;
  scene.add(water);
  const bank = new Mesh(
    keep(new RingGeometry(POND.r - 0.02, POND.r + 0.45, 48)),
    keep(new MeshStandardMaterial({ color: 0x0a0907, roughness: 1 })),
  );
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(POND.x, 0.018, POND.z);
  bank.receiveShadow = true;
  scene.add(bank);

  // Rocks: a few boulders by the fence and stones on the pond's far bank.
  const stone = keep(
    new MeshStandardMaterial({
      color: 0x2c2d30,
      roughness: 0.9,
      flatShading: true,
    }),
  );
  const rockShape = keep(new DodecahedronGeometry(1, 0));
  const rockSpots: [number, number, number][] = [
    [-10.2, -6.2, 0.9],
    [-9.1, -6.6, 0.5],
    [10.3, 6.3, 0.8],
    [-10.4, 5.9, 0.6],
    [9.8, -6.4, 0.55],
    [POND.x + 1.9, POND.z - 1.3, 0.35],
    [POND.x + 2.3, POND.z - 0.5, 0.25],
    [POND.x + 0.9, POND.z - 2.2, 0.3],
  ];
  for (let i = 0; i < 18; i++) {
    const a = random() * Math.PI * 2,
      r = 14 + random() * 12;
    rockSpots.push([
      Math.cos(a) * r * 1.3,
      Math.sin(a) * r,
      0.6 + random() * 1.4,
    ]);
  }
  for (const [x, z, s] of rockSpots) {
    const rock = new Mesh(rockShape, stone);
    rock.position.set(x, groundHeight(x, z) + s * 0.25, z);
    rock.scale.set(
      s * (0.8 + random() * 0.5),
      s * (0.5 + random() * 0.4),
      s * (0.8 + random() * 0.5),
    );
    rock.rotation.set(random() * 3, random() * 3, random() * 3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  // Treeline on the hills.
  const trees: [number, number, number][] = [];
  while (trees.length < 70) {
    const x = (random() - 0.5) * 80,
      z = (random() - 0.5) * 70;
    if (Math.abs(x) < 14 && Math.abs(z) < 10) continue;
    trees.push([x, z, 1.6 + random() * 2.4]);
  }
  const trunks = new InstancedMesh(
    keep(new CylinderGeometry(0.09, 0.16, 1, 6)),
    keep(new MeshStandardMaterial({ color: 0x15110d, roughness: 1 })),
    trees.length,
  );
  const crowns = new InstancedMesh(
    keep(new ConeGeometry(1, 1, 7)),
    keep(
      new MeshStandardMaterial({
        color: 0x0e1a13,
        roughness: 0.95,
        flatShading: true,
      }),
    ),
    trees.length * 3,
  );
  trees.forEach(([x, z, s], i) => {
    const y = groundHeight(x, z);
    dummy.rotation.set(0, random() * 6, 0);
    dummy.position.set(x, y + s * 0.5, z);
    dummy.scale.set(s, s * 1.2, s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    for (let t = 0; t < 3; t++) {
      const r = s * (0.95 - t * 0.25);
      dummy.position.set(x, y + s * (1.3 + t * 0.85), z);
      dummy.scale.set(r, s * 1.5, r);
      dummy.updateMatrix();
      crowns.setMatrixAt(i * 3 + t, dummy.matrix);
      crowns.setColorAt(
        i * 3 + t,
        c.setHSL(0.38, 0.25, 0.05 + random() * 0.05),
      );
    }
  });
  trunks.castShadow = crowns.castShadow = true;
  scene.add(trunks, crowns);

  // Grass tufts and ferns, kept off the pond.
  // Each tuft is a few thin blades leaning out from one root.
  const BLADES = 1600;
  const tufts = new InstancedMesh(
    keep(new ConeGeometry(0.012, 1, 3).translate(0, 0.5, 0)),
    keep(new MeshStandardMaterial({ color: 0x3a4a2c, roughness: 1 })),
    BLADES,
  );
  for (let i = 0; i < BLADES;) {
    let x = 0,
      z = 0;
    do {
      x = (random() - 0.5) * 40;
      z = (random() - 0.5) * 28;
    } while (
      Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.5 ||
      (Math.abs(x) < 9.5 && Math.abs(z) < 5.5 && random() < 0.8)
    );
    const tall = Math.abs(x) > 11 || Math.abs(z) > 7 ? 1.8 : 1;
    for (let b = 0; b < 5 && i < BLADES; b++, i++) {
      const h = (0.12 + random() * 0.22) * tall;
      dummy.position.set(
        x + (random() - 0.5) * 0.08,
        groundHeight(x, z),
        z + (random() - 0.5) * 0.08,
      );
      dummy.rotation.set(
        (random() - 0.5) * 0.9,
        random() * 6,
        (random() - 0.5) * 0.9,
      );
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tufts.setColorAt(
        i,
        c.setHSL(0.2 + random() * 0.08, 0.3, 0.1 + random() * 0.1),
      );
    }
  }
  tufts.receiveShadow = true;
  scene.add(tufts);

  // Light: a cold moon with shadows, a warm fill from the far horizon, and
  // a sky light.
  scene.add(new HemisphereLight(0x8fa2c6, 0x1d1913, 1.25));
  const moonLight = new DirectionalLight(0xd2ddff, 2.6);
  moonLight.position.set(-6, 10, -6);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  const shadow = moonLight.shadow.camera;
  shadow.left = shadow.bottom = -7;
  shadow.right = shadow.top = 7;
  shadow.near = 1;
  shadow.far = 30;
  moonLight.shadow.bias = -0.0005;
  moonLight.shadow.normalBias = 0.02;
  scene.add(moonLight, moonLight.target);
  const fill = new DirectionalLight(0xffc9a0, 0.4);
  fill.position.set(8, 3, 10);
  scene.add(fill);

  const lampColor = new Color(1.6, 0.75, 0.25);
  return {
    // Keep the shadow map centred on the animal.
    follow(x: number, z: number) {
      moonLight.position.set(x - 6, 10, z - 6);
      moonLight.target.position.set(x, 0, z);
    },
    update(time: number) {
      const on = time % 1.4 < 0.12;
      lampMaterial.color.copy(lampColor).multiplyScalar(on ? 1.6 : 0.35);
      for (const beam of beams)
        (beam.material as MeshBasicMaterial).opacity =
          0.03 + Math.sin(time * 0.7) * 0.004;
    },
    dispose() {
      owned.forEach((item) => item.dispose());
      postMesh.dispose();
      lamps.dispose();
      trunks.dispose();
      crowns.dispose();
      tufts.dispose();
    },
  };
}
