'use client';
import Image from '@/components/site-image';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type {
  Object3D,
  Mesh,
  Material,
  LineBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  WebGLRenderer,
} from 'three';

type View = 'surface' | 'structure' | 'source';
const VIEWS: { id: View; label: string }[] = [
  { id: 'surface', label: 'Surface' },
  { id: 'structure', label: 'Structure' },
  { id: 'source', label: 'Source' },
];
const SPEC = '16 blades · 4 gimbals · 48 markers';
const NOISE = '#$%&*+/<=>?@[]{}01';
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const scramble = (text: string, amount: number) =>
  text
    .split('')
    .map((char) =>
      char !== ' ' && Math.random() < amount
        ? NOISE[(Math.random() * NOISE.length) | 0]
        : char,
    )
    .join('');

export function MotionStudy({ ambient = false }: { ambient?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const spec = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const settings = useRef({
    paused: false,
    view: 'surface' as View,
    reset: 0,
    angle: 0,
  });
  const [paused, setPaused] = useState(false),
    [view, setView] = useState<View>('surface'),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let disposed = false,
      cleanupScene = () => {};
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => {
      settings.current.paused = preference.matches;
      setPaused(preference.matches);
      host.dispatchEvent(new Event('study-change'));
    };
    onPreference();
    preference.addEventListener('change', onPreference);
    async function initialize() {
      const [T, { GLTFLoader }, { OrbitControls }, { RoomEnvironment }, fx] =
        await Promise.all([
          import('three'),
          import('three/addons/loaders/GLTFLoader.js'),
          import('three/addons/controls/OrbitControls.js'),
          import('three/addons/environments/RoomEnvironment.js'),
          ambient ? null : import('@/components/orbit-signal'),
        ]);
      if (disposed) return;
      let renderer: WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
        });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0x07080b, 0);
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = fx ? 1.1 : 1.25;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      host!.appendChild(renderer.domElement);
      const scene = new T.Scene(),
        camera = new T.PerspectiveCamera(36, 1, 0.1, 50);
      camera.position.set(2.6, 1.3, 8.3);
      camera.lookAt(0, 0, 0);
      const pmrem = new T.PMREMGenerator(renderer),
        room = new RoomEnvironment(),
        environment = pmrem.fromScene(room, 0.04);
      scene.environment = environment.texture;
      room.dispose();
      pmrem.dispose();
      const light = new T.DirectionalLight(0xffffff, 3);
      light.position.set(-3, 4, 5);
      scene.add(light);
      if (fx) {
        // The signal version is lit lower and colder, with a rim from behind
        // so the silhouette survives against the dark.
        scene.environmentIntensity = 0.55;
        light.intensity = 2.2;
        scene.add(new T.HemisphereLight(0xc8d2ff, 0x050507, 0.7));
        const rim = new T.DirectionalLight(0xd6e0ff, 5);
        rim.position.set(3, 2.5, -5);
        scene.add(rim);
      } else scene.add(new T.HemisphereLight(0xffffff, 0x222222, 2));
      const controls = ambient
        ? null
        : new OrbitControls(camera, renderer.domElement);
      if (controls) {
        controls.enableDamping = false;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.minPolarAngle = 0.3;
        controls.maxPolarAngle = Math.PI - 0.3;
        controls.saveState();
      }
      const rig = new T.Group();
      scene.add(rig);
      const signal = fx?.createSignal(renderer) ?? null;
      // If the signal shader cannot compile on this device, fall back to the
      // plain render rather than a blank frame.
      let broken = false;
      renderer.debug.onShaderError = () => {
        broken = true;
      };
      const ticker = fx?.createCodeRing() ?? null;
      if (ticker) scene.add(ticker.ring);
      let model: Object3D | null = null;
      let frame = 0,
        time = 0,
        last = 0,
        reset = 0,
        visible = true;
      const surfaces = new Set<Material>(),
        lines: LineBasicMaterial[] = [];

      // Everything below drives the signal version only.
      const state = {
        time: 0,
        pointer: new T.Vector2(0.5, 0.5),
        lens: 0,
        glitch: 0,
        seed: 0,
        scan: -1,
        source: 0,
        hold: false,
      };
      const ndc = new T.Vector2(),
        wander = new T.Vector2(),
        raycaster = new T.Raycaster(),
        gaze = new T.Quaternion(),
        aim = new T.Quaternion(),
        base = new T.Quaternion(),
        euler = new T.Euler(),
        toCamera = new T.Vector3(),
        toTarget = new T.Vector3(),
        iris = new T.Vector3();
      const blades: Object3D[] = [],
        rings: {
          node: Object3D;
          base: Quaternion;
          axis: Vector3;
          speed: number;
        }[] = [],
        glowing: MeshStandardMaterial[] = [];
      let pupil: Mesh | null = null;
      let inside = false,
        source = 0,
        lens = 0,
        aperture = 0,
        drag = 0,
        lastAzimuth = 0,
        burstEnd = 0,
        burstStrength = 0,
        nextBurst = 2.4,
        lostEnd = 0,
        nextLost = rand(12, 20),
        nextScan = 3.5,
        nextSaccade = 0,
        scrambled = false,
        shownStatus = '';

      function render() {
        if (disposed) return;
        if (!signal || broken) renderer.render(scene, camera);
        else if (model) signal.render(scene, camera, state);
      }
      function size() {
        const { width, height } = host!.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height);
        signal?.setSize(width, height, renderer.getPixelRatio());
        camera.aspect = width / height;
        camera.fov = width < height ? 44 : 36;
        camera.updateProjectionMatrix();
        state.hold = false;
        render();
      }
      function animateSignal(delta: number) {
        const s = settings.current;
        const moving = !s.paused && !preference.matches;
        const ease = (rate: number) => 1 - Math.exp(-delta * rate);
        const sourceTarget = s.view === 'source' ? 1 : 0;
        const lensTarget = inside && s.view !== 'source' ? 1 : 0;
        source += (sourceTarget - source) * ease(5);
        lens += (lensTarget - lens) * ease(9);
        if (Math.abs(lens - lensTarget) < 0.01) lens = lensTarget;
        if (Math.abs(source - sourceTarget) < 0.01) source = sourceTarget;
        // Bursts arrive on an irregular clock; a few come in stuttering pairs.
        let glitch = 0,
          lost = false,
          scan = -1;
        if (moving) {
          if (time > nextBurst) {
            burstEnd = time + rand(0.06, 0.4);
            burstStrength = rand(0.25, 1);
            state.seed = Math.random() * 100;
            nextBurst =
              time + (Math.random() < 0.3 ? rand(0.1, 0.35) : rand(2.4, 6.5));
          }
          if (time > nextLost) {
            lostEnd = time + rand(0.7, 1.2);
            nextLost = time + rand(16, 28);
          }
          lost = time < lostEnd;
          if (time < burstEnd) glitch = burstStrength * rand(0.55, 1);
          if (lost) glitch = Math.max(glitch, rand(0.3, 0.8));
          glitch = Math.max(glitch, drag);
          if (glitch > 0.2 && Math.random() < 0.3)
            state.seed = Math.random() * 100;
          if (time > nextScan + 2.8) nextScan = time + rand(6, 11);
          if (time > nextScan) scan = 1.12 - ((time - nextScan) / 2.8) * 1.3;
        }
        drag *= Math.exp(-delta * 4);
        state.time = time;
        state.lens = lens;
        state.glitch = glitch;
        state.scan = scan;
        state.hold = glitch > 0.2 && Math.random() < 0.3;
        // When the signal is lost the object flickers between its surface
        // and its source.
        state.source = lost
          ? Math.max(source, Math.random() < 0.55 ? 1 : 0)
          : source;
        if (!model || s.paused) return glitch;

        // It watches the pointer. Left alone, it looks around in short,
        // sudden saccades, and every so often straight back at the viewer.
        if (inside) ndc.set(state.pointer.x * 2 - 1, state.pointer.y * 2 - 1);
        else {
          if (time > nextSaccade) {
            nextSaccade = time + rand(1.2, 4);
            if (Math.random() < 0.25) wander.set(0, 0);
            else wander.set(rand(-0.8, 0.8), rand(-0.6, 0.6));
          }
          ndc.copy(wander);
        }
        raycaster.setFromCamera(ndc, camera);
        toTarget
          .copy(raycaster.ray.direction)
          .multiplyScalar(camera.position.length() * 0.55)
          .add(raycaster.ray.origin)
          .sub(rig.position)
          .normalize();
        toCamera.copy(camera.position).sub(rig.position).normalize();
        aim.setFromUnitVectors(toCamera, toTarget);
        gaze.slerp(aim, ease(inside ? 5 : 8));

        // The iris narrows as the pointer comes close to it.
        iris.set(0, 0, 0.85).applyMatrix4(model.matrixWorld).project(camera);
        const near = inside
          ? Math.max(0, 1 - Math.hypot(ndc.x - iris.x, ndc.y - iris.y) / 0.4)
          : 0;
        const opening =
          0.1 +
          Math.sin(time * 0.7) * 0.06 -
          near * 0.24 +
          (glitch > 0.4 ? rand(-0.2, 0.2) : 0);
        aperture += (opening - aperture) * ease(7);
        for (const blade of blades) blade.rotation.z = aperture;

        // A slow double pulse in the light rim, like a heartbeat.
        const phase = (time % 2.7) / 2.7;
        const beat =
          Math.exp(-(((phase - 0.04) * 26) ** 2)) +
          0.55 * Math.exp(-(((phase - 0.16) * 26) ** 2));
        for (const material of glowing)
          material.emissiveIntensity =
            0.2 + beat * 1.6 + (glitch > 0.3 ? rand(0, 2.5) : 0);
        if (pupil) {
          const flicker = glitch > 0.3 ? rand(0, 1.6) : 1;
          pupil.scale.setScalar((0.7 + beat * 0.6 + near * 0.5) * flicker);
        }
        for (const ring of rings)
          ring.node.quaternion
            .setFromAxisAngle(ring.axis, time * ring.speed)
            .multiply(ring.base);
        return glitch;
      }
      function update(timestamp: number) {
        frame = 0;
        const delta = last ? Math.min((timestamp - last) / 1000, 0.05) : 0;
        last = timestamp;
        const s = settings.current;
        if (!s.paused) time += delta;
        const glitch = signal ? animateSignal(delta) : 0;
        if (model) {
          euler.set(
            0,
            s.angle + Math.sin(time * 0.13) * (signal ? 0.22 : 0.38),
            Math.sin(time * 0.17) * 0.035,
          );
          base.setFromEuler(euler);
          rig.quaternion.copy(gaze).multiply(base);
          rig.position.y = Math.sin(time * 0.31) * 0.07;
          const wire = s.view === 'structure';
          const blend = wire
            ? 0
            : ambient
              ? 0.2 + 0.8 * ((Math.sin(time * 0.32) + 1) / 2)
              : 1;
          for (const material of surfaces) {
            material.opacity = 0.04 + blend * 0.96;
            material.depthWrite = blend > 0.4;
          }
          for (const material of lines)
            material.opacity = wire ? 0.6 : (1 - blend) * 0.45;
          ticker?.update(time, glitch);
        }
        if (reset !== s.reset) {
          reset = s.reset;
          controls?.reset();
        }
        if (signal) hud(glitch);
        render();
        const settling =
          signal &&
          (Math.abs(lens - (inside && s.view !== 'source' ? 1 : 0)) > 0.003 ||
            Math.abs(source - (s.view === 'source' ? 1 : 0)) > 0.003);
        if (visible && !document.hidden && (!s.paused || settling))
          frame = requestAnimationFrame(update);
      }
      function hud(glitch: number) {
        if (readout.current && controls) {
          const theta = Math.round(
            ((controls.getAzimuthalAngle() * 180) / Math.PI + 360) % 360,
          );
          const phi = Math.round((controls.getPolarAngle() * 180) / Math.PI);
          readout.current.textContent = `θ ${String(theta).padStart(3, '0')}°  φ ${String(phi).padStart(3, '0')}°  sig ${(1 - glitch * 0.9).toFixed(2)}`;
        }
        if (spec.current) {
          if (glitch > 0.35) {
            spec.current.textContent = scramble(SPEC, glitch * 0.5);
            scrambled = true;
          } else if (scrambled) {
            spec.current.textContent = SPEC;
            scrambled = false;
          }
        }
        const next =
          time < lostEnd
            ? 'Signal lost'
            : glitch > 0.45
              ? 'Signal unstable'
              : 'Signal';
        if (status.current && next !== shownStatus) {
          status.current.textContent = next;
          status.current.dataset.state = next === 'Signal' ? 'ok' : 'lost';
          shownStatus = next;
        }
      }
      function wake() {
        if (!disposed && visible && !document.hidden && !frame) {
          last = 0;
          frame = requestAnimationFrame(update);
        }
      }
      function onPointer(event: PointerEvent) {
        const box = host!.getBoundingClientRect();
        state.pointer.set(
          (event.clientX - box.left) / box.width,
          1 - (event.clientY - box.top) / box.height,
        );
        inside = true;
        wake();
      }
      function onLeave(event: PointerEvent) {
        if (event.type === 'pointerup' && event.pointerType !== 'touch') return;
        inside = false;
        wake();
      }
      function onControls() {
        if (!controls) return;
        const azimuth = controls.getAzimuthalAngle();
        if (!preference.matches)
          drag = Math.min(0.8, drag + Math.abs(azimuth - lastAzimuth) * 2.5);
        lastAzimuth = azimuth;
        render();
      }
      const resize = new ResizeObserver(size);
      resize.observe(host!);
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
        else {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      });
      observer.observe(host!);
      const onVisibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(frame);
          frame = 0;
        } else wake();
      };
      document.addEventListener('visibilitychange', onVisibility);
      host!.addEventListener('study-change', wake);
      if (signal) {
        host!.addEventListener('pointermove', onPointer);
        host!.addEventListener('pointerdown', onPointer);
        host!.addEventListener('pointerleave', onLeave);
        host!.addEventListener('pointerup', onLeave);
      }
      controls?.addEventListener('change', onControls);
      cleanupScene = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        observer.disconnect();
        controls?.dispose();
        document.removeEventListener('visibilitychange', onVisibility);
        host!.removeEventListener('study-change', wake);
        host!.removeEventListener('pointermove', onPointer);
        host!.removeEventListener('pointerdown', onPointer);
        host!.removeEventListener('pointerleave', onLeave);
        host!.removeEventListener('pointerup', onLeave);
        scene.traverse((object) => {
          const mesh = object as Mesh;
          mesh.geometry?.dispose();
        });
        surfaces.forEach((m) => m.dispose());
        lines.forEach((m) => m.dispose());
        (pupil?.material as Material | undefined)?.dispose();
        ticker?.dispose();
        signal?.dispose();
        environment.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
      size();
      const gltf = await new GLTFLoader().loadAsync('/models/orbit-study.glb');
      if (disposed) {
        gltf.scene.traverse((object) => {
          const mesh = object as Mesh;
          mesh.geometry?.dispose();
          if (mesh.material)
            (Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material]
            ).forEach((m) => m.dispose());
        });
        return;
      }
      model = gltf.scene;
      const meshes: Mesh[] = [];
      model.traverse((object) => {
        if ((object as Mesh).isMesh) meshes.push(object as Mesh);
      });
      for (const mesh of meshes) {
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) {
          material.transparent = true;
          surfaces.add(material);
        }
        if (/Core|gimbal|housing|arm|Iris_blade/i.test(mesh.name)) {
          const source = /Core/.test(mesh.name)
            ? new T.SphereGeometry(1.015, 24, 12)
            : null;
          const geometry = source
            ? new T.WireframeGeometry(source)
            : new T.EdgesGeometry(mesh.geometry, 20);
          source?.dispose();
          const material = new T.LineBasicMaterial({
            color: 0xe1e4e9,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          });
          mesh.add(new T.LineSegments(geometry, material));
          lines.push(material);
        }
      }
      if (signal) {
        for (const mesh of meshes) {
          const material = mesh.material as MeshStandardMaterial;
          if (material.name === 'White light' && !glowing.includes(material)) {
            material.emissive.copy(material.color);
            glowing.push(material);
          }
          // Each iris blade turns about its outer end, so together they open
          // and close like an aperture.
          if (mesh.name.startsWith('Iris_blade') && mesh.parent) {
            mesh.geometry.computeBoundingBox();
            const box = mesh.geometry.boundingBox!;
            const center = box.getCenter(new T.Vector3());
            const outward = new T.Vector3(center.x, center.y, 0).normalize();
            const pivot = new T.Group();
            pivot.position.copy(outward).multiplyScalar(0.56).setZ(center.z);
            mesh.parent.add(pivot);
            mesh.position.sub(pivot.position);
            pivot.add(mesh);
            blades.push(pivot);
          }
          if (/gimbal|Equatorial/.test(mesh.name)) {
            const inner = /Inner/.test(mesh.name),
              outer = /Outer/.test(mesh.name);
            rings.push({
              node: mesh,
              base: mesh.quaternion.clone(),
              axis: new T.Vector3(
                inner ? 0.2 : outer ? 1 : 0,
                inner ? 1 : outer ? 0.15 : 0.4,
                outer ? 0.3 : 1,
              ).normalize(),
              speed: inner ? 0.21 : outer ? -0.09 : 0.05,
            });
          }
        }
        // A point of light deep in the pupil.
        pupil = new T.Mesh(
          new T.SphereGeometry(0.045, 16, 12),
          new T.MeshBasicMaterial({ color: new T.Color(3, 3.2, 3.6) }),
        );
        pupil.position.set(0, 0, 0.8);
        model.add(pupil);
      }
      rig.add(model);
      setReady(true);
      wake();
    }
    initialize().catch(() => {
      if (!disposed) {
        cleanupScene();
        cleanupScene = () => {};
        setReady(false);
        setFailed(true);
      }
    });
    return () => {
      disposed = true;
      preference.removeEventListener('change', onPreference);
      cleanupScene();
    };
  }, [ambient]);
  const wake = () =>
    container.current?.dispatchEvent(new Event('study-change'));
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
  function resetView() {
    settings.current.reset++;
    settings.current.angle = 0;
    wake();
  }
  const touch =
    ready &&
    typeof matchMedia === 'function' &&
    !matchMedia('(hover: hover)').matches;
  return (
    <div
      className={
        ambient
          ? 'motion-study ambient-study'
          : 'motion-study interactive-study'
      }
    >
      <figure
        className="study-stage"
        aria-hidden={ambient}
        aria-label={
          ambient
            ? undefined
            : 'Interactive silver orbital sculpture, rendered through a shader that glitches and rewrites it as code. It turns to follow your pointer. Drag to rotate, hover to read part of it as code, or use the buttons below to change the view, pause motion, and reset.'
        }
      >
        <Image
          unoptimized
          className={`study-poster ${ready ? 'poster-hidden' : ''}`}
          src="/images/orbit-study.webp"
          alt={
            ambient
              ? ''
              : 'Blender-rendered orbital sculpture with a dark core and silver iris'
          }
          width="1600"
          height="1100"
          aria-hidden={ambient || ready}
        />
        <div ref={container} className="study-canvas" />
        {!ambient && (
          <div className="orbit-hud" aria-hidden="true">
            <span className="orbit-hud-tl">Study 001 / Orbit</span>
            <span className="orbit-hud-tr" ref={spec}>
              {SPEC}
            </span>
            <span className="orbit-hud-bl" ref={readout}>
              θ 000° φ 000° sig 1.00
            </span>
            <span className="orbit-hud-br" ref={status} data-state="ok">
              Signal
            </span>
          </div>
        )}
      </figure>
      <div className="study-controls">
        {!failed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMotion}
            aria-pressed={paused}
            disabled={!ready}
          >
            {paused ? 'Play motion' : 'Pause motion'}{' '}
            <span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span>
          </Button>
        )}
        {!ambient && !failed && (
          <>
            <fieldset className="study-views">
              <legend className="sr-only">View</legend>
              {VIEWS.map(({ id, label }) => (
                <Button
                  key={id}
                  variant="ghost"
                  size="sm"
                  onClick={() => chooseView(id)}
                  aria-pressed={view === id}
                  disabled={!ready}
                >
                  {label}
                </Button>
              ))}
            </fieldset>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetView}
              disabled={!ready}
            >
              Reset view ↺
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Rotate sculpture left"
              disabled={!ready}
              onClick={() => {
                settings.current.angle -= 0.2;
                wake();
              }}
            >
              ←
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Rotate sculpture right"
              disabled={!ready}
              onClick={() => {
                settings.current.angle += 0.2;
                wake();
              }}
            >
              →
            </Button>
          </>
        )}
        {!ambient && (
          <span className="viewer-hint">
            {failed
              ? 'Still view'
              : ready
                ? touch
                  ? 'Drag to turn · touch to decode'
                  : 'Drag to turn · hover to decode'
                : 'Preparing the object…'}
          </span>
        )}
      </div>
    </div>
  );
}
