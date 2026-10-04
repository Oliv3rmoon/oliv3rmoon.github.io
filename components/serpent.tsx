'use client';
import { useEffect, useRef } from 'react';

// Study 002 / Serpent: a skeletal dragon written in code. A chain of vertebrae
// follows the head, ribs and limbs are solved every frame with simple inverse
// kinematics, and the creature follows the pointer or wanders when left alone.
type Point = { x: number; y: number };
type Foot = {
  hip: number;
  side: 1 | -1;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  step: number;
};

const COUNT = 58;
const TAU = Math.PI * 2;
const wrap = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function Serpent({ compact = false }: { compact?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const area = host.current,
      canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!area || !canvas || !ctx) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0,
      height = 0,
      unit = 8,
      heading = 0,
      speed = 0,
      time = 0,
      last = 0,
      frame = 0,
      ticks = 0,
      pointerAt = -1e9,
      visible = true,
      started = false;
    const target: Point = { x: 0, y: 0 };
    const spine: Point[] = Array.from({ length: COUNT }, () => ({ x: 0, y: 0 }));
    const feet: Foot[] = (
      [
        [9, 1],
        [9, -1],
        [22, 1],
        [22, -1],
      ] as const
    ).map(([hip, side]) => ({
      hip,
      side,
      x: 0,
      y: 0,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
      step: 1,
    }));
    const spacing = (i: number) => unit * (1.22 - 0.55 * (i / COUNT));
    const ribLength = (t: number) =>
      t < 0.09 || t > 0.5
        ? 0
        : Math.pow(Math.sin((Math.PI * (t - 0.09)) / 0.41), 0.75) * unit * 4.4;
    function place() {
      heading = -0.2;
      spine[0].x = width * 0.62;
      spine[0].y = height * 0.48;
      for (let i = 1; i < COUNT; i++) {
        spine[i].x = spine[i - 1].x - Math.cos(heading) * spacing(i);
        spine[i].y = spine[i - 1].y - Math.sin(heading) * spacing(i);
      }
      for (const foot of feet) {
        const ideal = footIdeal(foot);
        Object.assign(foot, { x: ideal.x, y: ideal.y, step: 1 });
      }
    }
    function forward(i: number) {
      const a = spine[Math.max(0, i - 1)],
        b = spine[Math.max(1, i)];
      return Math.atan2(a.y - b.y, a.x - b.x);
    }
    function footIdeal(foot: Foot) {
      const p = spine[foot.hip],
        angle = forward(foot.hip);
      const reach = unit * 5.1;
      return {
        x: p.x + Math.cos(angle) * unit * 2.4 - Math.sin(angle) * reach * foot.side,
        y: p.y + Math.sin(angle) * unit * 2.4 + Math.cos(angle) * reach * foot.side,
      };
    }
    function simulate(dt: number) {
      time += dt;
      const idle = performance.now() - pointerAt > 2200;
      if (idle) {
        target.x =
          width / 2 +
          width * 0.34 * Math.sin(time * 0.31) +
          width * 0.07 * Math.sin(time * 1.13);
        target.y =
          height / 2 +
          height * 0.3 * Math.sin(time * 0.53 + 1.2) +
          height * 0.06 * Math.cos(time * 0.9);
      }
      const head = spine[0];
      const dx = target.x - head.x,
        dy = target.y - head.y,
        distance = Math.hypot(dx, dy);
      const sway = Math.sin(time * 3.4) * 0.5 * (speed / (unit * 46));
      heading += clamp(wrap(Math.atan2(dy, dx) - heading), -2.9 * dt, 2.9 * dt);
      const desired = clamp(distance * 1.9, unit * (idle ? 10 : 6), unit * 46);
      speed += (desired - speed) * Math.min(1, dt * 2.6);
      head.x += Math.cos(heading + sway) * speed * dt;
      head.y += Math.sin(heading + sway) * speed * dt;
      for (let i = 1; i < COUNT; i++) {
        const a = spine[i - 1],
          b = spine[i];
        let angle = Math.atan2(b.y - a.y, b.x - a.x);
        const previous =
          i === 1
            ? heading + Math.PI
            : Math.atan2(a.y - spine[i - 2].y, a.x - spine[i - 2].x);
        angle = previous + clamp(wrap(angle - previous), -0.3, 0.3);
        b.x = a.x + Math.cos(angle) * spacing(i);
        b.y = a.y + Math.sin(angle) * spacing(i);
      }
      for (const foot of feet) {
        const ideal = footIdeal(foot);
        const partner = feet.find(
          (f) => f.hip === foot.hip && f.side !== foot.side,
        )!;
        if (
          foot.step >= 1 &&
          partner.step >= 1 &&
          Math.hypot(ideal.x - foot.x, ideal.y - foot.y) > unit * 4.2
        ) {
          const angle = forward(foot.hip);
          Object.assign(foot, {
            fromX: foot.x,
            fromY: foot.y,
            toX: ideal.x + Math.cos(angle) * unit * 2.2,
            toY: ideal.y + Math.sin(angle) * unit * 2.2,
            step: 0,
          });
        }
        if (foot.step < 1) {
          foot.step = Math.min(1, foot.step + dt * 5.5);
          const e = foot.step * foot.step * (3 - 2 * foot.step);
          foot.x = foot.fromX + (foot.toX - foot.fromX) * e;
          foot.y = foot.fromY + (foot.toY - foot.fromY) * e;
        }
      }
    }
    function line(ax: number, ay: number, bx: number, by: number) {
      ctx!.beginPath();
      ctx!.moveTo(ax, ay);
      ctx!.lineTo(bx, by);
      ctx!.stroke();
    }
    function draw(trail: boolean) {
      const c = ctx!;
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = trail ? 'rgba(7, 8, 11, 0.3)' : '#07080b';
      c.fillRect(0, 0, width, height);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      // Spine
      for (let i = 1; i < COUNT; i++) {
        const t = i / COUNT;
        c.strokeStyle = `rgba(236, 237, 241, ${0.9 - t * 0.45})`;
        c.lineWidth = Math.max(0.8, unit * 0.34 * (1 - t * 0.75));
        line(spine[i - 1].x, spine[i - 1].y, spine[i].x, spine[i].y);
      }
      // Ribs, vertebrae and dorsal plates
      for (let i = 2; i < COUNT - 1; i++) {
        const t = i / COUNT,
          p = spine[i],
          angle = forward(i);
        const nx = -Math.sin(angle),
          ny = Math.cos(angle),
          bx = -Math.cos(angle),
          by = -Math.sin(angle);
        const rib = ribLength(t);
        if (rib > 0) {
          c.strokeStyle = 'rgba(226, 228, 234, 0.55)';
          c.lineWidth = Math.max(0.6, unit * 0.13);
          for (const side of [1, -1]) {
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.quadraticCurveTo(
              p.x + nx * rib * 0.75 * side + bx * rib * 0.1,
              p.y + ny * rib * 0.75 * side + by * rib * 0.1,
              p.x + nx * rib * 0.92 * side + bx * rib * 0.62,
              p.y + ny * rib * 0.92 * side + by * rib * 0.62,
            );
            c.stroke();
          }
        }
        const tick = Math.max(unit * 0.45, rib * 0.22) * (t > 0.5 ? 1.2 - t : 1);
        c.strokeStyle = 'rgba(236, 237, 241, 0.7)';
        c.lineWidth = Math.max(0.6, unit * 0.12);
        line(p.x - nx * tick, p.y - ny * tick, p.x + nx * tick, p.y + ny * tick);
        if (t > 0.5 && i % 2 === 0) {
          const plate = unit * 0.9 * (1.05 - t);
          c.beginPath();
          c.moveTo(p.x + bx * plate * 1.6, p.y + by * plate * 1.6);
          c.lineTo(p.x + nx * plate, p.y + ny * plate);
          c.lineTo(p.x - bx * plate * 0.4, p.y - by * plate * 0.4);
          c.lineTo(p.x - nx * plate, p.y - ny * plate);
          c.closePath();
          c.stroke();
        }
      }
      // Limbs, solved as two-bone chains from hip to planted foot
      for (const foot of feet) {
        const p = spine[foot.hip],
          angle = forward(foot.hip);
        const nx = -Math.sin(angle) * foot.side,
          ny = Math.cos(angle) * foot.side;
        const hipX = p.x + nx * unit * 1.1,
          hipY = p.y + ny * unit * 1.1;
        const thigh = unit * 3.3,
          shin = unit * 3.1;
        let fx = foot.x - hipX,
          fy = foot.y - hipY;
        const reach = clamp(Math.hypot(fx, fy), 0.01, thigh + shin - 0.01);
        const base = Math.atan2(fy, fx);
        fx = hipX + Math.cos(base) * reach;
        fy = hipY + Math.sin(base) * reach;
        const bend = Math.acos(
          clamp((thigh * thigh + reach * reach - shin * shin) / (2 * thigh * reach), -1, 1),
        );
        const knee = base - bend * foot.side;
        const kx = hipX + Math.cos(knee) * thigh,
          ky = hipY + Math.sin(knee) * thigh;
        c.strokeStyle = 'rgba(236, 237, 241, 0.82)';
        c.lineWidth = Math.max(0.9, unit * 0.26);
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(hipX, hipY);
        c.lineTo(kx, ky);
        c.lineTo(fx, fy);
        c.stroke();
        c.lineWidth = Math.max(0.6, unit * 0.12);
        c.beginPath();
        c.arc(kx, ky, unit * 0.32, 0, TAU);
        c.stroke();
        for (const spread of [-0.55, 0, 0.55]) {
          const claw = angle + spread + foot.side * 0.35;
          line(fx, fy, fx + Math.cos(claw) * unit * 1.25, fy + Math.sin(claw) * unit * 1.25);
        }
      }
      // Tail spade
      {
        const end = spine[COUNT - 1],
          angle = forward(COUNT - 1) + Math.PI;
        c.save();
        c.translate(end.x, end.y);
        c.rotate(angle);
        c.scale(unit, unit);
        c.strokeStyle = 'rgba(236, 237, 241, 0.6)';
        c.lineWidth = 0.12;
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(0.8, 1.6, 2.6, 0);
        c.quadraticCurveTo(0.8, -1.6, 0, 0);
        c.stroke();
        c.restore();
      }
      // Skull, horns and barbels
      {
        const head = spine[0],
          angle = forward(0);
        c.save();
        c.translate(head.x, head.y);
        c.rotate(angle);
        c.scale(unit, unit);
        c.strokeStyle = 'rgba(244, 245, 248, 0.95)';
        c.lineWidth = 0.17;
        c.beginPath();
        const skull = [
          [4.4, 0], [3.4, 0.85], [1.8, 1.25], [0.5, 1.95], [-0.6, 1.55],
          [-1.25, 0.8], [-1.25, -0.8], [-0.6, -1.55], [0.5, -1.95],
          [1.8, -1.25], [3.4, -0.85],
        ];
        skull.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
        c.stroke();
        c.lineWidth = 0.1;
        c.beginPath();
        c.moveTo(3.9, 0);
        c.lineTo(0.2, 0);
        c.stroke();
        for (const side of [1, -1]) {
          c.beginPath();
          c.moveTo(-0.7, 1.2 * side);
          c.quadraticCurveTo(-2.4, 2.5 * side, -4.6, 2.9 * side);
          c.stroke();
          c.beginPath();
          c.moveTo(0.1, 1.6 * side);
          c.quadraticCurveTo(-1.2, 2.9 * side, -2.6, 3.7 * side);
          c.stroke();
          c.beginPath();
          c.moveTo(3.2, 0.9 * side);
          for (let k = 1; k <= 9; k++) {
            c.lineTo(
              3.2 - k * 0.95,
              (1.1 + k * 0.42 + Math.sin(time * 2.6 + k * 0.75) * 0.45) * side,
            );
          }
          c.stroke();
          c.beginPath();
          c.arc(3.75, 0.42 * side, 0.12, 0, TAU);
          c.stroke();
        }
        c.shadowColor = 'rgba(255, 255, 255, 0.9)';
        c.shadowBlur = 10;
        c.fillStyle = '#ffffff';
        for (const side of [1, -1]) {
          c.beginPath();
          c.ellipse(1.05, 0.98 * side, 0.36, 0.2, 0.35 * side, 0, TAU);
          c.fill();
        }
        c.restore();
      }
    }
    function updateReadout() {
      if (!readout.current) return;
      const head = spine[0];
      const degrees = Math.round(((heading * 180) / Math.PI + 360) % 360);
      readout.current.textContent = `x ${String(Math.round(head.x)).padStart(4, '0')}  y ${String(Math.round(head.y)).padStart(4, '0')}  θ ${String(degrees).padStart(3, '0')}°`;
    }
    function still() {
      for (let i = 0; i < 420; i++) simulate(1 / 60);
      draw(false);
      updateReadout();
    }
    function loop(timestamp: number) {
      frame = 0;
      const dt = last ? Math.min((timestamp - last) / 1000, 1 / 30) : 1 / 60;
      last = timestamp;
      simulate(dt);
      draw(true);
      if (++ticks % 6 === 0) updateReadout();
      if (visible && !document.hidden && !reduce.matches)
        frame = requestAnimationFrame(loop);
    }
    function wake() {
      if (reduce.matches) return still();
      if (!frame && visible && !document.hidden) {
        last = 0;
        frame = requestAnimationFrame(loop);
      }
    }
    function size() {
      const rect = area!.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * ratio);
      canvas!.height = Math.round(height * ratio);
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      unit = clamp(Math.min(width, height * 1.6) / 62, 4.6, 11);
      if (!started) {
        started = true;
        place();
      }
      draw(false);
      if (reduce.matches) still();
    }
    function onPointer(event: PointerEvent) {
      const rect = area!.getBoundingClientRect();
      target.x = event.clientX - rect.left;
      target.y = event.clientY - rect.top;
      pointerAt = performance.now();
    }
    function onLeave() {
      pointerAt = performance.now() - 1600;
    }
    const resize = new ResizeObserver(size);
    resize.observe(area);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(area);
    const onVisibility = () => (document.hidden ? (cancelAnimationFrame(frame), (frame = 0)) : wake());
    document.addEventListener('visibilitychange', onVisibility);
    reduce.addEventListener('change', wake);
    area.addEventListener('pointermove', onPointer);
    area.addEventListener('pointerdown', onPointer);
    area.addEventListener('pointerleave', onLeave);
    size();
    wake();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduce.removeEventListener('change', wake);
      area.removeEventListener('pointermove', onPointer);
      area.removeEventListener('pointerdown', onPointer);
      area.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  return (
    <div
      ref={host}
      className={compact ? 'serpent serpent-compact' : 'serpent'}
      role="img"
      aria-label="Animated line drawing of a skeletal dragon that follows your pointer"
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="serpent-corner serpent-tl">Study 002 / Serpent</span>
      <span className="serpent-corner serpent-tr">
        58 vertebrae · 4 limbs · inverse kinematics
      </span>
      <span className="serpent-corner serpent-bl" ref={readout} aria-hidden="true">
        x 0000 y 0000 θ 000°
      </span>
      <span className="serpent-corner serpent-br">Move to lead it</span>
    </div>
  );
}
