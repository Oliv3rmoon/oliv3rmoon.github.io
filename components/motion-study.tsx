'use client';
import Image from '@/components/site-image';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type {
  Object3D,
  Mesh,
  Material,
  LineBasicMaterial,
  WebGLRenderer,
} from 'three';

export function MotionStudy({ ambient = false }: { ambient?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const settings = useRef({ paused: false, wire: false, reset: 0, angle: 0 });
  const [paused, setPaused] = useState(false),
    [wire, setWire] = useState(false),
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
      const [T, { GLTFLoader }, { OrbitControls }, { RoomEnvironment }] =
        await Promise.all([
          import('three'),
          import('three/addons/loaders/GLTFLoader.js'),
          import('three/addons/controls/OrbitControls.js'),
          import('three/addons/environments/RoomEnvironment.js'),
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
      renderer.toneMappingExposure = 1.25;
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
      scene.add(new T.HemisphereLight(0xffffff, 0x222222, 2));
      const light = new T.DirectionalLight(0xffffff, 3);
      light.position.set(-3, 4, 5);
      scene.add(light);
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
      let model: Object3D | null = null;
      let frame = 0,
        time = 0,
        last = 0,
        reset = 0,
        visible = true;
      const surfaces = new Set<Material>(),
        lines: LineBasicMaterial[] = [];
      function render() {
        if (!disposed) renderer.render(scene, camera);
      }
      function size() {
        const { width, height } = host!.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.fov = width < height ? 44 : 36;
        camera.updateProjectionMatrix();
        render();
      }
      function update(timestamp: number) {
        frame = 0;
        const delta = last ? Math.min((timestamp - last) / 1000, 0.05) : 0;
        last = timestamp;
        if (!settings.current.paused) time += delta;
        if (model) {
          rig.rotation.y =
            settings.current.angle + Math.sin(time * 0.13) * 0.38;
          rig.rotation.z = Math.sin(time * 0.17) * 0.035;
          rig.position.y = Math.sin(time * 0.31) * 0.07;
          const blend = settings.current.wire
            ? 0
            : ambient
              ? 0.2 + 0.8 * ((Math.sin(time * 0.32) + 1) / 2)
              : 1;
          for (const material of surfaces) {
            material.opacity = 0.04 + blend * 0.96;
            material.depthWrite = blend > 0.4;
          }
          for (const material of lines)
            material.opacity = settings.current.wire ? 0.6 : (1 - blend) * 0.45;
        }
        if (reset !== settings.current.reset) {
          reset = settings.current.reset;
          controls?.reset();
        }
        render();
        if (visible && !document.hidden && !settings.current.paused)
          frame = requestAnimationFrame(update);
      }
      function wake() {
        if (!disposed && visible && !document.hidden && !frame) {
          last = 0;
          frame = requestAnimationFrame(update);
        }
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
      controls?.addEventListener('change', render);
      cleanupScene = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        observer.disconnect();
        controls?.dispose();
        document.removeEventListener('visibilitychange', onVisibility);
        host!.removeEventListener('study-change', wake);
        scene.traverse((object) => {
          const mesh = object as Mesh;
          mesh.geometry?.dispose();
        });
        surfaces.forEach((m) => m.dispose());
        lines.forEach((m) => m.dispose());
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
  function toggleWire() {
    settings.current.wire = !settings.current.wire;
    setWire(settings.current.wire);
    wake();
  }
  function resetView() {
    settings.current.reset++;
    settings.current.angle = 0;
    wake();
  }
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
            : 'Interactive silver orbital sculpture. Drag to rotate, or use the buttons below to rotate, pause motion, show its structure, and reset the view.'
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
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleWire}
              aria-pressed={wire}
              disabled={!ready}
            >
              {wire ? 'Show surface' : 'Show structure'}
            </Button>
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
                ? 'Drag to explore'
                : 'Preparing the object…'}
          </span>
        )}
      </div>
    </div>
  );
}
