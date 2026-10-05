'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DinosaurSketch } from '@/components/dinosaur-sketch';
import type { Drive, Palette } from '@/components/raptor';
import type { Group, Mesh, WebGLRenderer } from 'three';

// Paddock 02 / Live simulation. A pack of three raptors, left to
// themselves. Each gets hungry, thirsty and tired on its own clock, and
// decides what to do next: wander, investigate a scent, drink, patrol the
// fence, call to the others, rest. They keep near the leader, answer each
// other's calls, watch anything that comes too close, and run for food when
// someone drops it in.
type View = 'live' | 'xray';
type Mode =
  | 'idle'
  | 'walk'
  | 'sniff'
  | 'call'
  | 'drink'
  | 'eat'
  | 'watch'
  | 'rest';
const NEEDS = ['Hunger', 'Thirst', 'Energy', 'Comfort'] as const;
const CHANNELS = [
  { key: 'jaw', label: 'Jaw', unit: '°', min: 0, max: 45 },
  { key: 'pan', label: 'Neck pan', unit: '°', min: -60, max: 60 },
  { key: 'tilt', label: 'Neck tilt', unit: '°', min: -70, max: 40 },
  { key: 'tail', label: 'Tail', unit: '°', min: -15, max: 15 },
  { key: 'breath', label: 'Breath', unit: '%', min: 0, max: 100 },
  { key: 'strideL', label: 'Stride L', unit: '%', min: 0, max: 100 },
  { key: 'strideR', label: 'Stride R', unit: '%', min: 0, max: 100 },
] as const;
const PACK: {
  id: string;
  x: number;
  z: number;
  heading: number;
  needs: [number, number, number];
  palette: Palette;
}[] = [
  {
    id: 'VR-01',
    x: -3,
    z: 1.4,
    heading: -0.4,
    needs: [0.4, 0.64, 0.85],
    palette: {},
  },
  {
    id: 'VR-02',
    x: -6.6,
    z: -0.6,
    heading: 0.3,
    needs: [0.5, 0.4, 0.7],
    palette: {
      side: 0x5d6152,
      back: 0x2e3129,
      stripe: 0x14150f,
      flank: 0xa9ad9a,
      belly: 0xb3ad94,
      scale: 0x4f4a3d,
      brow: 0x55403a,
      eye: 0xd09a2a,
    },
  },
  {
    id: 'VR-03',
    x: -4.4,
    z: -2.8,
    heading: 0.9,
    needs: [0.32, 0.28, 0.92],
    palette: {
      side: 0xa8743f,
      back: 0x744a28,
      stripe: 0x45291a,
      flank: 0xd6ad78,
      belly: 0xe0c597,
      scale: 0x845333,
      brow: 0x9a4a30,
      eye: 0xd9a12c,
    },
  },
];
const MODE_LABEL: Record<Exclude<Mode, 'walk'>, string> = {
  idle: 'Idle',
  sniff: 'Investigating a scent',
  call: 'Vocalising',
  drink: 'Drinking',
  eat: 'Feeding',
  watch: 'Watching you',
  rest: 'Resting',
};
const WALK = 1.15,
  TROT = 2.3,
  RUN = 4.4;
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const wrap = (a: number) =>
  ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
const ramp = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const clock = (minutes: number) => {
  const m = Math.floor(minutes) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function RaptorSim() {
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const log = useRef<HTMLOListElement>(null);
  const telemetry = useRef<HTMLSpanElement>(null);
  const needBars = useRef<(HTMLSpanElement | null)[]>([]);
  const needValues = useRef<(HTMLSpanElement | null)[]>([]);
  const channelBars = useRef<(HTMLSpanElement | null)[]>([]);
  const channelValues = useRef<(HTMLSpanElement | null)[]>([]);
  const settings = useRef({
    paused: false,
    view: 'live' as View,
    food: 0,
    selected: 0,
  });
  const [paused, setPaused] = useState(false),
    [view, setView] = useState<View>('live'),
    [selected, setSelected] = useState(0),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);

  useEffect(() => {
    const area = stage.current,
      canvasHost = host.current;
    if (!area || !canvasHost) return;
    let disposed = false,
      cleanup = () => {};
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => {
      settings.current.paused = preference.matches;
      setPaused(preference.matches);
      area.dispatchEvent(new Event('sim-change'));
    };
    onPreference();
    preference.addEventListener('change', onPreference);

    async function initialize() {
      const [T, { OrbitControls }, { createRaptor, createScales }, world] =
        await Promise.all([
          import('three'),
          import('three/addons/controls/OrbitControls.js'),
          import('@/components/raptor'),
          import('@/components/paddock'),
        ]);
      if (disposed) return;
      const { BOUNDS, POND } = world;
      let renderer: WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({ antialias: true });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFShadowMap;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      canvasHost!.appendChild(renderer.domElement);

      const scene = new T.Scene();
      scene.background = new T.Color(0x0b0e14);
      scene.fog = new T.FogExp2(0x121722, 0.026);
      const camera = new T.PerspectiveCamera(40, 1, 0.1, 200);
      const paddock = world.createPaddock(scene);
      const dot = document.createElement('canvas');
      dot.width = dot.height = 32;
      const d = dot.getContext('2d')!;
      d.strokeStyle = '#fff';
      d.lineWidth = 3;
      d.beginPath();
      d.arc(16, 16, 11, 0, Math.PI * 2);
      d.stroke();
      const dotTexture = new T.CanvasTexture(dot);
      const scales = createScales();

      // ——— The pack ———
      type Food = {
        group: Group;
        y: number;
        vy: number;
        amount: number;
        landed: boolean;
      };
      type Goal = {
        x: number;
        z: number;
        speed: number;
        next: Mode;
        label: string;
        food?: Food;
      };
      type Agent = ReturnType<typeof makeAgent>;
      function makeAgent(spec: (typeof PACK)[number]) {
        const raptor = createRaptor({
          dot: dotTexture,
          scales,
          palette: spec.palette,
        });
        scene.add(raptor.group);
        const drive: Drive = {
          x: spec.x,
          z: spec.z,
          heading: spec.heading,
          speed: 0,
          turn: 0,
          look: null,
          reach: 0,
          crouch: 0,
          call: 0,
          jaw: 0,
          peck: 0,
          sleepy: 0,
          upright: 1,
        };
        const [hunger, thirst, energy] = spec.needs;
        return {
          id: spec.id,
          raptor,
          drive,
          needs: { hunger, thirst, energy, comfort: 0.9 },
          mode: 'idle' as Mode,
          modeTime: 0,
          modeLength: rand(1, 3),
          label: MODE_LABEL.idle,
          goal: null as Goal | null,
          target: null as Food | null,
          look: new T.Vector3(),
          face: new T.Vector3(),
          sniff: new T.Vector3(),
          nextGlance: 0,
          lastNear: -10,
          watchCooldown: 0,
          answerAt: -1,
        };
      }
      const pack = PACK.map(makeAgent);
      const leader = pack[0];
      const meshes = pack.map((a) => a.raptor.mesh);

      const OFFSET = new T.Vector3(4.4, 2.4, 6.4);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minPolarAngle = 0.35;
      controls.maxPolarAngle = 1.45;
      controls.rotateSpeed = 0.6;
      const placeCamera = (agent: Agent) => {
        controls.target.set(agent.drive.x, 0.85, agent.drive.z);
        camera.position.copy(controls.target).add(OFFSET);
        controls.update();
      };
      placeCamera(pack[0]);

      // A selection ring under the followed animal, and a ground reticle.
      const ringMaterial = new T.MeshBasicMaterial({
        color: 0xe8ecf3,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      const selection = new T.Mesh(
        new T.RingGeometry(0.95, 1.0, 64),
        ringMaterial,
      );
      selection.rotation.x = -Math.PI / 2;
      selection.position.y = 0.025;
      scene.add(selection);
      const reticle = new T.Group();
      const ring = new T.Mesh(new T.RingGeometry(0.26, 0.29, 40), ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      reticle.add(ring);
      for (let i = 0; i < 4; i++) {
        const tick = new T.Mesh(new T.PlaneGeometry(0.02, 0.12), ringMaterial);
        tick.rotation.x = -Math.PI / 2;
        tick.rotation.z = (i * Math.PI) / 2;
        tick.position.set(
          Math.sin((i * Math.PI) / 2) * 0.38,
          0,
          Math.cos((i * Math.PI) / 2) * 0.38,
        );
        reticle.add(tick);
      }
      reticle.position.y = 0.03;
      reticle.visible = false;
      scene.add(reticle);

      // Food: a chunk of meat on the bone, enough for the whole pack.
      const meatGeometry = new T.IcosahedronGeometry(0.17, 1),
        boneGeometry = new T.CylinderGeometry(0.022, 0.03, 0.42, 6),
        meatMaterial = new T.MeshStandardMaterial({
          color: 0x5c1914,
          roughness: 0.5,
          flatShading: true,
        }),
        boneMaterial = new T.MeshStandardMaterial({
          color: 0xd8cfbd,
          roughness: 0.6,
        });
      const foods: Food[] = [];

      const pointerGround = new T.Vector3(),
        pointerNdc = new T.Vector2(),
        raycaster = new T.Raycaster(),
        groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0),
        follow = new T.Vector3(),
        jitter = new T.Vector3();
      let pointerValid = false,
        pointerOver = false,
        pointerMoved = -10,
        simTime = 0,
        minutes = 18 * 60 + 40,
        frame = 0,
        last = 0,
        frames = 0,
        foodRequests = 0,
        followed = 0,
        visible = true,
        shownStatus = '',
        shownName = '',
        shownClock = '',
        view: View = 'live';
      const events: string[] = [];

      function say(text: string) {
        events.unshift(`${clock(minutes)}  ${text}`);
        events.length = Math.min(events.length, 4);
        if (log.current)
          log.current.replaceChildren(
            ...events.map((e, i) => {
              const li = document.createElement('li');
              li.textContent = e;
              li.style.opacity = String(1 - i * 0.24);
              return li;
            }),
          );
      }
      const distance = (a: Agent, x: number, z: number) =>
        Math.hypot(x - a.drive.x, z - a.drive.z);
      function inside(x: number, z: number, margin = 0) {
        return (
          x > BOUNDS.minX + margin &&
          x < BOUNDS.maxX - margin &&
          z > BOUNDS.minZ + margin &&
          z < BOUNDS.maxZ - margin
        );
      }
      function spot(margin: number, near?: Agent, radius = 4) {
        for (let tries = 0; ; tries++) {
          let x = near
              ? near.drive.x + rand(-radius, radius)
              : rand(BOUNDS.minX + margin, BOUNDS.maxX - margin),
            z = near
              ? near.drive.z + rand(-radius, radius)
              : rand(BOUNDS.minZ + margin, BOUNDS.maxZ - margin);
          x = clamp(x, BOUNDS.minX + margin, BOUNDS.maxX - margin);
          z = clamp(z, BOUNDS.minZ + margin, BOUNDS.maxZ - margin);
          if (Math.hypot(x - POND.x, z - POND.z) > POND.r + 1.6 || tries > 40)
            return [x, z];
        }
      }
      function setMode(a: Agent, next: Mode, length = 0) {
        a.mode = next;
        a.modeTime = 0;
        a.modeLength = length;
        if (next !== 'walk') a.label = MODE_LABEL[next];
      }
      function goTo(
        a: Agent,
        x: number,
        z: number,
        speed: number,
        next: Mode,
        label: string,
        food?: Food,
      ) {
        a.goal = { x, z, speed, next, label, food };
        a.label = label;
        setMode(a, 'walk');
      }
      function approach(a: Agent, x: number, z: number, reach: number) {
        const angle = Math.atan2(a.drive.z - z, a.drive.x - x);
        return [x + Math.cos(angle) * reach, z + Math.sin(angle) * reach];
      }
      function call(a: Agent, answering = false) {
        setMode(a, 'call', 2.3);
        if (answering) {
          a.label = 'Answering the pack';
          say(`${a.id} answered`);
          return;
        }
        say(`${a.id} called out`);
        for (const other of pack)
          if (other !== a && other.answerAt < 0 && Math.random() < 0.85)
            other.answerAt = simTime + rand(0.5, 1.6);
      }
      function goForFood(a: Agent, food: Food) {
        const [x, z] = approach(
          a,
          food.group.position.x,
          food.group.position.z,
          1.45,
        );
        const hungry = a.needs.hunger > 0.5 && a.needs.energy > 0.2;
        goTo(
          a,
          x,
          z,
          hungry ? RUN : TROT,
          'eat',
          hungry ? 'Running to food' : 'Heading to food',
          food,
        );
        a.target = food;
        say(
          hungry
            ? `${a.id} is charging the food`
            : `${a.id} caught the scent of food`,
        );
      }
      function choose(a: Agent) {
        a.target = null;
        const n = a.needs;
        if (n.thirst > 0.6) {
          const [x, z] = approach(a, POND.x, POND.z, POND.r + 1.35);
          goTo(
            a,
            x,
            z,
            n.thirst > 0.85 ? TROT : WALK,
            'drink',
            'Heading to water',
          );
          return;
        }
        if (n.energy < 0.22) {
          setMode(a, 'rest', rand(6, 9));
          say(`${a.id} is resting`);
          return;
        }
        const fromLeader = distance(a, leader.drive.x, leader.drive.z);
        if (a !== leader && fromLeader > 5.5) {
          const [x, z] = spot(1.4, leader, 2.5);
          goTo(
            a,
            x,
            z,
            fromLeader > 9 ? TROT : WALK,
            'idle',
            'Following the pack',
          );
          return;
        }
        const r = Math.random();
        if (r < 0.4) {
          const [x, z] =
            a !== leader && Math.random() < 0.6
              ? spot(1.6, leader, 4)
              : spot(1.6);
          goTo(a, x, z, Math.random() < 0.2 ? TROT : WALK, 'idle', 'Wandering');
        } else if (r < 0.58) {
          setMode(a, 'sniff', rand(2.6, 4.2));
          a.sniff
            .set(Math.cos(a.drive.heading), 0, Math.sin(a.drive.heading))
            .multiplyScalar(1.6)
            .add(jitter.set(a.drive.x, 0, a.drive.z));
        } else if (r < 0.72) {
          const edge = Math.random() < 0.5;
          const x = edge
            ? rand(BOUNDS.minX + 2, BOUNDS.maxX - 2)
            : Math.sign(rand(-1, 1)) * (BOUNDS.maxX - 1.6);
          const z = edge
            ? Math.sign(rand(-1, 1)) * (BOUNDS.maxZ - 1.6)
            : rand(BOUNDS.minZ + 2, BOUNDS.maxZ - 2);
          goTo(a, x, z, WALK, 'idle', 'Patrolling the fence');
        } else if (r < 0.8) call(a);
        else setMode(a, 'idle', rand(2, 4.5));
      }
      function dropFood(x: number, z: number) {
        if (foods.length >= 3) removeFood(foods[0]);
        const group = new T.Group();
        const meat = new T.Mesh(meatGeometry, meatMaterial);
        meat.scale.set(1.25, 0.85, 1);
        const bone = new T.Mesh(boneGeometry, boneMaterial);
        bone.rotation.z = Math.PI / 2;
        bone.rotation.y = rand(0, 3);
        meat.castShadow = bone.castShadow = true;
        group.add(meat, bone);
        group.position.set(x, 4, z);
        group.rotation.y = rand(0, 6);
        scene.add(group);
        foods.push({ group, y: 4, vy: 0, amount: 1.6, landed: false });
        say('Food dropped into the paddock');
      }
      function removeFood(food: Food) {
        scene.remove(food.group);
        foods.splice(foods.indexOf(food), 1);
        for (const a of pack) if (a.target === food) a.target = null;
      }

      function simulate(a: Agent, dt: number) {
        a.modeTime += dt;
        const n = a.needs,
          drive = a.drive;
        n.hunger = clamp(n.hunger + dt * 0.006, 0, 1);
        n.thirst = clamp(n.thirst + dt * 0.009, 0, 1);
        n.energy = clamp(
          n.energy +
            dt *
              (drive.speed > 3
                ? -0.05
                : a.mode === 'rest'
                  ? 0.09
                  : drive.speed > 0.2
                    ? -0.004
                    : 0.012),
          0,
          1,
        );
        const near =
          pointerOver &&
          pointerValid &&
          distance(a, pointerGround.x, pointerGround.z) < 4.5 &&
          simTime - pointerMoved < 3;
        if (near) a.lastNear = simTime;
        n.comfort = clamp(n.comfort + dt * (near ? -0.06 : 0.03), 0, 1);

        // Interruptions: food first, then a reply to the pack, then anything
        // that comes too close.
        const landed = foods.filter((f) => f.landed);
        const casual =
          a.mode === 'idle' ||
          a.mode === 'sniff' ||
          (a.mode === 'walk' && a.goal?.next === 'idle');
        if (
          landed.length &&
          n.hunger > 0.25 &&
          a.mode !== 'eat' &&
          !(a.mode === 'walk' && a.goal?.next === 'eat')
        ) {
          landed.sort(
            (p, q) =>
              distance(a, p.group.position.x, p.group.position.z) -
              distance(a, q.group.position.x, q.group.position.z),
          );
          goForFood(a, landed[0]);
        } else if (a.answerAt > 0 && simTime > a.answerAt) {
          a.answerAt = -1;
          if (casual || a.mode === 'watch') call(a, true);
        } else if (near && simTime > a.watchCooldown && casual) {
          setMode(a, 'watch');
          say(`${a.id} has noticed you`);
        }

        let speedTarget = 0,
          turnTo: number | null = null,
          steering = false;
        switch (a.mode) {
          case 'walk': {
            const g = a.goal!;
            if (g.food && !foods.includes(g.food)) {
              choose(a);
              break;
            }
            const dx = g.x - drive.x,
              dz = g.z - drive.z,
              dist = Math.hypot(dx, dz) || 1e-3;
            let ax = dx / dist,
              az = dz / dist;
            // Steer around the pond unless that is where it is going, and
            // keep a little room between animals.
            const px = drive.x - POND.x,
              pz = drive.z - POND.z,
              pd = Math.hypot(px, pz);
            if (g.next !== 'drink' && pd < POND.r + 1.8) {
              const push = (POND.r + 1.8 - pd) * 1.5;
              ax += (px / pd) * push;
              az += (pz / pd) * push;
            }
            for (const other of pack) {
              if (other === a) continue;
              const ox = drive.x - other.drive.x,
                oz = drive.z - other.drive.z,
                od = Math.hypot(ox, oz);
              if (od < 1.7 && od > 1e-3) {
                ax += (ox / od) * (1.7 - od) * 1.2;
                az += (oz / od) * (1.7 - od) * 1.2;
              }
            }
            turnTo = Math.atan2(az, ax);
            steering = true;
            speedTarget = g.speed * clamp(dist / 1.6, 0.3, 1);
            if (dist < 0.45) {
              if (g.next === 'eat' && g.food) {
                a.target = g.food;
                setMode(a, 'eat');
                say(`${a.id} is feeding`);
              } else if (g.next === 'drink') {
                setMode(a, 'drink');
                say(`${a.id} is drinking`);
              } else setMode(a, g.next, rand(1.5, 3.5));
              a.goal = null;
            }
            break;
          }
          case 'drink': {
            const angle = Math.atan2(POND.z - drive.z, POND.x - drive.x);
            a.face.set(
              POND.x - Math.cos(angle) * POND.r * 0.85,
              0,
              POND.z - Math.sin(angle) * POND.r * 0.85,
            );
            turnTo = Math.atan2(a.face.z - drive.z, a.face.x - drive.x);
            n.thirst = clamp(n.thirst - dt * 0.12, 0, 1);
            if (n.thirst < 0.04 || a.modeTime > 10) {
              say(`${a.id} finished drinking`);
              choose(a);
            }
            break;
          }
          case 'eat': {
            const food = a.target;
            if (!food || !foods.includes(food)) {
              choose(a);
              break;
            }
            a.face.copy(food.group.position);
            turnTo = Math.atan2(a.face.z - drive.z, a.face.x - drive.x);
            const bite = Math.min(food.amount, dt * 0.11);
            food.amount -= bite;
            n.hunger = clamp(n.hunger - bite * 0.9, 0, 1);
            food.group.scale.setScalar(0.35 + Math.min(food.amount, 1) * 0.65);
            if (food.amount <= 0.01) {
              removeFood(food);
              say(`${a.id} finished the food`);
              choose(a);
            } else if (n.hunger < 0.03) {
              say(`${a.id} has eaten its fill`);
              choose(a);
            }
            break;
          }
          case 'watch': {
            a.face.set(pointerGround.x, 0, pointerGround.z);
            turnTo = Math.atan2(a.face.z - drive.z, a.face.x - drive.x);
            if (simTime - a.lastNear > 1.6) {
              a.watchCooldown = simTime + 6;
              say(`${a.id} lost interest`);
              choose(a);
            }
            break;
          }
          default:
            if (a.modeTime > a.modeLength) choose(a);
        }

        // Heading and speed.
        let turn = 0;
        if (turnTo !== null) {
          const delta = wrap(turnTo - drive.heading);
          if (steering || Math.abs(delta) > 0.35) {
            const rate = (2.6 - Math.min(drive.speed, 4) * 0.3) * dt;
            turn = clamp(delta, -rate, rate);
          }
          if (steering && Math.abs(delta) > 1.2) speedTarget *= 0.35;
        }
        drive.heading = wrap(drive.heading + turn);
        drive.turn +=
          ((dt ? turn / dt : 0) - drive.turn) * (1 - Math.exp(-dt * 6));
        const accel = speedTarget > drive.speed ? 2.4 : 5;
        drive.speed +=
          (speedTarget - drive.speed) * (1 - Math.exp(-dt * accel));
        drive.x += Math.cos(drive.heading) * drive.speed * dt;
        drive.z += Math.sin(drive.heading) * drive.speed * dt;
        // Standing animals still shuffle apart if they end up too close.
        if (a.mode !== 'walk')
          for (const other of pack) {
            if (other === a) continue;
            const ox = drive.x - other.drive.x,
              oz = drive.z - other.drive.z,
              od = Math.hypot(ox, oz);
            if (od < 1.2 && od > 1e-3) {
              drive.x += (ox / od) * (1.2 - od) * dt * 1.5;
              drive.z += (oz / od) * (1.2 - od) * dt * 1.5;
            }
          }
        drive.x = clamp(drive.x, BOUNDS.minX + 0.8, BOUNDS.maxX - 0.8);
        drive.z = clamp(drive.z, BOUNDS.minZ + 0.8, BOUNDS.maxZ - 0.8);

        // Behaviour channels.
        const m = a.mode;
        drive.reach =
          m === 'sniff'
            ? 0.55
            : m === 'drink' || m === 'eat'
              ? 0.95
              : m === 'rest'
                ? 0.3
                : 0;
        drive.crouch =
          m === 'watch'
            ? 0.75
            : m === 'eat'
              ? 0.3
              : m === 'rest'
                ? 0.6
                : drive.speed > 3
                  ? 0.2
                  : 0;
        drive.call =
          m === 'call'
            ? ramp(0.1, 0.4, a.modeTime) * (1 - ramp(1.7, 2.2, a.modeTime))
            : 0;
        drive.jaw =
          m === 'watch'
            ? Math.sin(simTime * 0.9 + a.id.length) > 0.8
              ? 0.4
              : 0.05
            : m === 'sniff'
              ? 0.06
              : drive.speed > 3
                ? 0.15
                : 0;
        drive.peck = m === 'eat' ? 1 : m === 'drink' ? 0.45 : 0;
        drive.sleepy = m === 'rest' ? ramp(0, 2.5, a.modeTime) * 0.8 : 0;
        drive.upright = m === 'idle' || m === 'watch' || m === 'call' ? 1 : 0;

        // Attention.
        let looking = true;
        if (m === 'watch') a.look.set(pointerGround.x, 0.5, pointerGround.z);
        else if (m === 'eat' || m === 'drink') a.look.copy(a.face);
        else if (m === 'sniff')
          a.look
            .copy(a.sniff)
            .add(
              jitter.set(
                Math.sin(simTime * 1.7) * 0.3,
                0,
                Math.cos(simTime * 1.3) * 0.3,
              ),
            );
        else if (m === 'call' || m === 'rest') looking = false;
        else if (simTime > a.nextGlance) {
          a.nextGlance = simTime + rand(1.2, 3.6);
          const others = pack.filter((o) => o !== a);
          const r = Math.random();
          if (r < 0.2) a.look.copy(camera.position);
          else if (r < 0.45) {
            const o = others[(Math.random() * others.length) | 0];
            a.look.set(o.drive.x, 1.2, o.drive.z);
          } else {
            const angle =
                drive.heading + rand(-1.2, 1.2) * (m === 'walk' ? 0.4 : 1),
              r2 = rand(4, 9);
            a.look.set(
              drive.x + Math.cos(angle) * r2,
              rand(0.2, 1.8),
              drive.z + Math.sin(angle) * r2,
            );
          }
        }
        drive.look = looking ? a.look : null;
      }

      // ——— Rendering ———
      function render() {
        if (!disposed) renderer.render(scene, camera);
      }
      function size() {
        const box = canvasHost!.getBoundingClientRect();
        if (!box.width || !box.height) return;
        renderer.setSize(box.width, box.height);
        camera.aspect = box.width / box.height;
        camera.fov = box.width < box.height * 1.1 ? 54 : 40;
        camera.updateProjectionMatrix();
        render();
      }
      function hud() {
        frames++;
        const a = pack[followed];
        if (name.current && a.id !== shownName) {
          name.current.textContent = a.id;
          shownName = a.id;
        }
        if (status.current && a.label !== shownStatus) {
          status.current.textContent = a.label;
          shownStatus = a.label;
        }
        const now = clock(minutes);
        if (time.current && now !== shownClock) {
          time.current.textContent = now;
          shownClock = now;
        }
        if (frames % 6 === 0) {
          [
            a.needs.hunger,
            a.needs.thirst,
            a.needs.energy,
            a.needs.comfort,
          ].forEach((v, i) => {
            const bar = needBars.current[i],
              value = needValues.current[i];
            if (bar) {
              bar.style.transform = `scaleX(${Math.max(v, 0.02).toFixed(3)})`;
              bar.dataset.warn = (i < 2 ? v > 0.7 : v < 0.3) ? 'true' : 'false';
            }
            if (value) value.textContent = `${Math.round(v * 100)}%`;
          });
        }
        if (view === 'live' && telemetry.current && frames % 3 === 0) {
          const hdg = Math.round(
            ((a.drive.heading * 180) / Math.PI + 360) % 360,
          );
          telemetry.current.textContent = `${a.id}   ${a.drive.speed.toFixed(2)} m/s   hdg ${String(hdg).padStart(3, '0')}°   x ${a.drive.x.toFixed(1)}  z ${a.drive.z.toFixed(1)}`;
        }
        if (view === 'xray')
          CHANNELS.forEach((c, i) => {
            const v = a.raptor.channels[c.key];
            const value = channelValues.current[i],
              bar = channelBars.current[i];
            if (value)
              value.textContent = `${v < 0 ? '-' : ' '}${String(Math.abs(Math.round(v))).padStart(3, '0')}${c.unit}`;
            if (bar)
              bar.style.transform = `scaleX(${clamp((v - c.min) / (c.max - c.min), 0.02, 1).toFixed(3)})`;
          });
      }
      function step(dt: number) {
        const s = settings.current;
        if (s.view !== view) {
          view = s.view;
          for (const a of pack) a.raptor.setXray(view === 'xray');
          reticle.visible = false;
        }
        if (s.selected !== followed) {
          followed = s.selected;
          placeCamera(pack[followed]);
        }
        if (s.food !== foodRequests) {
          foodRequests = s.food;
          // Somewhere in view, a few strides from the followed animal.
          const a = pack[followed];
          for (let tries = 0; tries < 20; tries++) {
            const angle = rand(0, Math.PI * 2),
              r = rand(4, 7);
            const x = a.drive.x + Math.cos(angle) * r,
              z = a.drive.z + Math.sin(angle) * r;
            if (
              inside(x, z, 1.2) &&
              Math.hypot(x - POND.x, z - POND.z) > POND.r + 1
            ) {
              dropFood(x, z);
              break;
            }
          }
        }
        if (dt) {
          simTime += dt;
          minutes += dt * 0.5;
          for (const food of foods) {
            if (food.landed) continue;
            food.vy -= 14 * dt;
            food.y += food.vy * dt;
            if (food.y <= 0.1) {
              food.y = 0.1;
              if (Math.abs(food.vy) > 1.5) food.vy *= -0.3;
              else food.landed = true;
            }
            food.group.position.y = food.y;
          }
          for (const a of pack) simulate(a, dt);
        }
        for (const a of pack) a.raptor.update(dt, simTime, a.drive);
        const target = pack[followed].drive;
        paddock.update(simTime);
        paddock.follow(target.x, target.z);
        selection.position.x = target.x;
        selection.position.z = target.z;
        // The camera keeps the followed animal in view while you orbit.
        follow.set(target.x, 0.85, target.z).sub(controls.target);
        follow.multiplyScalar(dt ? 1 - Math.exp(-dt * 2.2) : 0);
        controls.target.add(follow);
        camera.position.add(follow);
        controls.update();
        render();
        hud();
      }
      function update(timestamp: number) {
        frame = 0;
        const dt = last ? Math.min((timestamp - last) / 1000, 0.05) : 0;
        last = timestamp;
        step(settings.current.paused ? 0 : dt);
        if (visible && !document.hidden && !settings.current.paused)
          frame = requestAnimationFrame(update);
      }
      function wake() {
        if (!disposed && visible && !document.hidden && !frame) {
          last = 0;
          frame = requestAnimationFrame(update);
        }
      }

      // ——— Pointer: click a raptor to follow it, or the ground to feed ———
      let down: { x: number; y: number; t: number } | null = null;
      function locate(event: PointerEvent) {
        const box = canvasHost!.getBoundingClientRect();
        pointerNdc.set(
          ((event.clientX - box.left) / box.width) * 2 - 1,
          -((event.clientY - box.top) / box.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointerNdc, camera);
        pointerValid =
          !!raycaster.ray.intersectPlane(groundPlane, pointerGround) &&
          inside(pointerGround.x, pointerGround.z, 0.3);
        reticle.visible = pointerValid && settings.current.view === 'live';
        reticle.position.set(pointerGround.x, 0.03, pointerGround.z);
      }
      function onMove(event: PointerEvent) {
        pointerOver = true;
        pointerMoved = simTime;
        locate(event);
        if (settings.current.paused) render();
      }
      function onDown(event: PointerEvent) {
        locate(event);
        down = { x: event.clientX, y: event.clientY, t: performance.now() };
      }
      function onUp(event: PointerEvent) {
        if (
          down &&
          Math.hypot(event.clientX - down.x, event.clientY - down.y) < 6 &&
          performance.now() - down.t < 500
        ) {
          locate(event);
          const hit = raycaster.intersectObjects(meshes, false)[0];
          if (hit) {
            const index = meshes.indexOf(hit.object as (typeof meshes)[number]);
            settings.current.selected = index;
            setSelected(index);
            wake();
          } else if (pointerValid && !settings.current.paused)
            dropFood(pointerGround.x, pointerGround.z);
        }
        down = null;
        if (event.pointerType === 'touch') {
          pointerOver = false;
          reticle.visible = false;
        }
      }
      function onLeave() {
        pointerOver = false;
        down = null;
        reticle.visible = false;
        if (settings.current.paused) render();
      }
      const resize = new ResizeObserver(size);
      resize.observe(canvasHost!);
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
        else {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      });
      observer.observe(canvasHost!);
      const onVisibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(frame);
          frame = 0;
        } else wake();
      };
      const onControls = () => {
        if (settings.current.paused) render();
      };
      document.addEventListener('visibilitychange', onVisibility);
      area!.addEventListener('sim-change', wake);
      canvasHost!.addEventListener('pointermove', onMove);
      canvasHost!.addEventListener('pointerdown', onDown);
      canvasHost!.addEventListener('pointerup', onUp);
      canvasHost!.addEventListener('pointerleave', onLeave);
      controls.addEventListener('change', onControls);
      cleanup = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        observer.disconnect();
        controls.removeEventListener('change', onControls);
        controls.dispose();
        document.removeEventListener('visibilitychange', onVisibility);
        area!.removeEventListener('sim-change', wake);
        canvasHost!.removeEventListener('pointermove', onMove);
        canvasHost!.removeEventListener('pointerdown', onDown);
        canvasHost!.removeEventListener('pointerup', onUp);
        canvasHost!.removeEventListener('pointerleave', onLeave);
        for (const a of pack) a.raptor.dispose();
        paddock.dispose();
        scales.dispose();
        dotTexture.dispose();
        for (const item of [
          meatGeometry,
          boneGeometry,
          meatMaterial,
          boneMaterial,
          ringMaterial,
        ])
          item.dispose();
        selection.geometry.dispose();
        reticle.traverse((o) => (o as Mesh).geometry?.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
      say('Pack released into Paddock 02');
      size();
      // Settle every pose before the first frame is shown.
      for (let i = 0; i < 30; i++)
        for (const a of pack) a.raptor.update(1 / 60, i / 60, a.drive);
      step(0);
      setReady(true);
      wake();
    }
    initialize().catch((error: unknown) => {
      console.error(error);
      if (!disposed) {
        cleanup();
        cleanup = () => {};
        setReady(false);
        setFailed(true);
      }
    });
    return () => {
      disposed = true;
      preference.removeEventListener('change', onPreference);
      cleanup();
    };
  }, []);

  const wake = () => stage.current?.dispatchEvent(new Event('sim-change'));
  function toggleMotion() {
    settings.current.paused = !settings.current.paused;
    setPaused(settings.current.paused);
    wake();
  }
  function chooseView(next: View) {
    settings.current.view = next;
    setView(next);
    wake();
  }
  function nextRaptor() {
    const next = (settings.current.selected + 1) % PACK.length;
    settings.current.selected = next;
    setSelected(next);
    wake();
  }
  return (
    <div className="sim" ref={stage} data-view={view}>
      <figure
        className="sim-stage"
        aria-label="Live 3D simulation of a pack of three velociraptors in a fenced paddock at night. Each one moves on its own, driven by hunger, thirst, energy and comfort: they wander, investigate scents, drink from the pond, patrol the fence, call to each other, rest, keep near the pack leader, and watch the pointer when it comes close. Click the ground, or use the Drop food button, to drop food into the paddock. Click a raptor, or use Next raptor, to follow it. Drag to orbit the camera."
      >
        {failed && <DinosaurSketch className="sim-fallback" />}
        <div ref={host} className="sim-canvas" />
        {!failed && (
          <div className="sim-hud" aria-hidden="true">
            <div className="sim-hud-tl">
              <span className="sim-live">Paddock 02 · Live</span>
              <span className="sim-clock">
                Sim time <span ref={time}>18:40</span> · Pack of {PACK.length}
              </span>
              <ol className="sim-log" ref={log} />
            </div>
            <div className="sim-card">
              <div className="sim-card-title">
                <strong ref={name}>{PACK[0].id}</strong>
                <span>Velociraptor</span>
              </div>
              <span className="sim-status" ref={status}>
                {ready ? 'Idle' : 'Loading the paddock…'}
              </span>
              {NEEDS.map((need, i) => (
                <div className="sim-need" key={need}>
                  <span>{need}</span>
                  <span className="sim-bar">
                    <span
                      ref={(el) => {
                        needBars.current[i] = el;
                      }}
                    />
                  </span>
                  <span
                    ref={(el) => {
                      needValues.current[i] = el;
                    }}
                  >
                    —
                  </span>
                </div>
              ))}
            </div>
            <div className="sim-hud-bl">
              <span className="sim-telemetry" ref={telemetry} />
              <div className="sim-channels">
                <span className="sim-channels-title">Actuator channels</span>
                {CHANNELS.map((c, i) => (
                  <div key={c.key}>
                    <span>{c.label}</span>
                    <span className="sim-bar">
                      <span
                        ref={(el) => {
                          channelBars.current[i] = el;
                        }}
                      />
                    </span>
                    <span
                      ref={(el) => {
                        channelValues.current[i] = el;
                      }}
                    >
                      {' 000'}
                      {c.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </figure>
      <div className="study-controls">
        {!failed && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMotion}
              aria-pressed={paused}
              disabled={!ready}
            >
              {paused ? 'Play' : 'Pause'}{' '}
              <span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span>
            </Button>
            <fieldset className="study-views">
              <legend className="sr-only">View</legend>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => chooseView('live')}
                aria-pressed={view === 'live'}
                disabled={!ready}
              >
                Live
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => chooseView('xray')}
                aria-pressed={view === 'xray'}
                disabled={!ready}
              >
                X-ray
              </Button>
            </fieldset>
            <Button
              variant="ghost"
              size="sm"
              disabled={!ready || paused}
              onClick={() => {
                settings.current.food++;
                wake();
              }}
            >
              Drop food
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!ready}
              onClick={nextRaptor}
              aria-label={`Follow the next raptor. Now following ${PACK[selected].id}.`}
            >
              Next raptor <span aria-hidden="true">⇄</span>
            </Button>
          </>
        )}
        <span className="viewer-hint">
          {failed
            ? '3D unavailable · still view'
            : ready
              ? 'Drag to orbit · click a raptor to follow · click the ground to feed'
              : 'Loading the paddock…'}
        </span>
      </div>
    </div>
  );
}
