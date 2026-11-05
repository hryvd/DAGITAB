import { useEffect, useRef, useState } from 'react';

const TAU = Math.PI * 2;
const COLORS = [
  '#fff8e7',
  '#ecf7ff',
  '#cfebff',
  '#b6eaff',
  '#cbbaff',
  '#f6d5a0',
];

/** The supplied DAGITAB silhouette is the source of every particle target. */
export default function LogoParticles({
  src = '/brand/dagitab-logo.svg',
  paused = false,
  replayKey = 0,
  onReady,
}) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const pausedRef = useRef(paused);
  const controlsRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const lastReplay = useRef(replayKey);
  const [showFallback, setShowFallback] = useState(true);
  onReadyRef.current = onReady;

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return undefined;

    let disposed = false;
    let ready = false;
    let visible = true;
    let frame = 0;
    let frameCount = 0;
    let lastTimestamp = 0;
    let elapsed = 0;
    let burstAge = 99;
    let scatterLevel = 0;
    let width = 1;
    let height = 1;
    let ratio = 1;
    let logoWidth = 1;
    let logoHeight = 1;
    let targets = [];
    let particles = [];
    const groups = COLORS.map(() => []);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: -1000, y: -1000, active: false, downX: 0, downY: 0 };
    const image = new Image();

    function seededRandom(seed) {
      return () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    }

    function sampleLogo() {
      const mask = document.createElement('canvas');
      mask.width = 800;
      mask.height = Math.max(
        1,
        Math.round((image.naturalHeight / image.naturalWidth) * mask.width),
      );
      const sample = mask.getContext('2d', { willReadFrequently: true });
      sample.drawImage(image, 0, 0, mask.width, mask.height);
      const pixels = sample.getImageData(0, 0, mask.width, mask.height).data;
      const points = [];
      for (let y = 0; y < mask.height; y += 2) {
        for (let x = 0; x < mask.width; x += 2) {
          const offset = (y * mask.width + x) * 4;
          if (
            pixels[offset + 3] > 125 &&
            pixels[offset] + pixels[offset + 1] + pixels[offset + 2] > 80
          ) {
            points.push({ x: x / mask.width - 0.5, y: y / mask.height - 0.5 });
          }
        }
      }
      const random = seededRandom(190713);
      for (let i = points.length - 1; i > 0; i -= 1) {
        const next = Math.floor(random() * (i + 1));
        [points[i], points[next]] = [points[next], points[i]];
      }
      targets = points;
    }

    function makeParticles() {
      const random = seededRandom(56419);
      const count = Math.min(targets.length, width < 600 ? 2200 : 4600);
      groups.forEach((group) => {
        group.length = 0;
      });
      particles = targets.slice(0, count).map((target, index) => {
        const angle = random() * TAU;
        const distance = 0.48 + random() * 0.5;
        const particle = {
          target,
          x: width * 0.5 + Math.cos(angle) * width * distance,
          y: height * 0.5 + Math.sin(angle) * height * distance * 0.68,
          vx: 0,
          vy: 0,
          seed: random() * TAU,
          angle,
          orbit: 0.65 + random() * 0.4,
          delay: random() * 0.52,
          size: 0.8 + random() * 0.85,
          color: index % 13 < 7 ? index % 2 : 2 + (index % 4),
        };
        groups[particle.color].push(particle);
        return particle;
      });
      canvas.dataset.pointCount = String(particles.length);
    }

    function fitLogo() {
      const aspect = image.naturalWidth / image.naturalHeight;
      logoWidth = Math.min(width * 0.94, height * 0.82 * aspect);
      logoHeight = logoWidth / aspect;
    }

    function settleLogo() {
      elapsed = 2;
      burstAge = 99;
      scatterLevel = 0;
      for (const particle of particles) {
        particle.x = width * 0.5 + particle.target.x * logoWidth;
        particle.y = height * 0.5 + particle.target.y * logoHeight;
        particle.vx = 0;
        particle.vy = 0;
      }
    }

    function update(delta) {
      if (!delta) return;
      elapsed += delta;
      burstAge += delta;
      const dt = delta * 30;
      const cycle = (elapsed - 2) % 16;
      const cycleBurst =
        elapsed > 2 && cycle > 13 && cycle < 14.8
          ? Math.sin(((cycle - 13) / 1.8) * Math.PI) * 0.2
          : 0;
      const clickBurst =
        burstAge < 1.8 ? Math.sin((burstAge / 1.8) * Math.PI) * 0.88 : 0;
      const scatter = Math.max(clickBurst, cycleBurst);
      scatterLevel = scatter;
      const radius = width < 600 ? 48 : 100;
      const radiusSquared = radius * radius;

      canvas.dataset.animationState =
        scatter > 0.02 ? 'scattering' : elapsed < 1.9 ? 'assembling' : 'formed';
      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        const phase = elapsed * 1.3 + particle.seed;
        const baseX = width * 0.5 + particle.target.x * logoWidth;
        const baseY = height * 0.5 + particle.target.y * logoHeight;
        // A travelling glint lifts small groups while the logo remains legible.
        const wave =
          Math.sin(phase + particle.target.x * 13) *
          (2.1 + Math.sin(elapsed * 0.7 + particle.seed) * 0.8);
        const crest = Math.pow(
          (Math.sin(elapsed * 1.7 + particle.target.x * 6.8) + 1) * 0.5,
          8,
        );
        let targetX =
          baseX +
          Math.cos(phase * 0.73) * 1.5 +
          crest * Math.cos(particle.seed) * 4;
        let targetY = baseY + wave + crest * Math.sin(particle.seed) * 6;
        if (scatter > 0) {
          const orbitAngle = particle.angle + elapsed * 0.42;
          const orbitX =
            width * 0.5 + Math.cos(orbitAngle) * width * 0.49 * particle.orbit;
          const orbitY =
            height * 0.5 +
            Math.sin(orbitAngle) * height * 0.43 * particle.orbit;
          targetX += (orbitX - baseX) * scatter;
          targetY += (orbitY - baseY) * scatter;
        }
        if (elapsed < particle.delay) {
          targetX =
            width * 0.5 +
            Math.cos(particle.angle + elapsed * 0.6) *
              width *
              0.49 *
              particle.orbit;
          targetY =
            height * 0.5 +
            Math.sin(particle.angle + elapsed * 0.6) *
              height *
              0.42 *
              particle.orbit;
        }
        if (pointer.active) {
          const px = particle.x - pointer.x;
          const py = particle.y - pointer.y;
          const squared = px * px + py * py;
          if (squared < radiusSquared && squared > 0.1) {
            const distance = Math.sqrt(squared);
            const strength = (1 - distance / radius) * 4.5;
            particle.vx += (px / distance) * strength * dt;
            particle.vy += (py / distance) * strength * dt;
          }
        }
        const spring = elapsed < 1.8 ? 0.045 : 0.055;
        particle.vx =
          (particle.vx + (targetX - particle.x) * spring * dt) *
          Math.pow(0.76, dt);
        particle.vy =
          (particle.vy + (targetY - particle.y) * spring * dt) *
          Math.pow(0.76, dt);
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
      }
    }

    function paint() {
      if (!ready || disposed) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      if (motion.matches) {
        context.globalAlpha = 1;
        context.drawImage(
          image,
          (width - logoWidth) / 2,
          (height - logoHeight) / 2,
          logoWidth,
          logoHeight,
        );
        canvas.dataset.animationState = 'reduced';
      } else {
        context.globalCompositeOperation = 'lighter';
        // Reveal the supplied silver artwork intact as its particles assemble.
        const underlay = Math.max(0, Math.min(1, (elapsed - 0.65) / 1.4));
        context.globalAlpha = underlay * (1 - scatterLevel);
        context.drawImage(
          image,
          (width - logoWidth) / 2,
          (height - logoHeight) / 2,
          logoWidth,
          logoHeight,
        );
        if (pointer.active && !pausedRef.current) {
          const radius = width < 600 ? 43 : 82;
          const opening = context.createRadialGradient(
            pointer.x,
            pointer.y,
            0,
            pointer.x,
            pointer.y,
            radius,
          );
          opening.addColorStop(0, 'rgba(0,0,0,.9)');
          opening.addColorStop(1, 'rgba(0,0,0,0)');
          context.globalCompositeOperation = 'destination-out';
          context.globalAlpha = 1;
          context.fillStyle = opening;
          context.fillRect(
            pointer.x - radius,
            pointer.y - radius,
            radius * 2,
            radius * 2,
          );
          context.globalCompositeOperation = 'lighter';
        }
        const particleVisibility = Math.min(
          1,
          1 - underlay * 0.94 + scatterLevel + (pointer.active ? 0.2 : 0),
        );
        for (let color = 0; color < groups.length; color += 1) {
          context.fillStyle = COLORS[color];
          context.globalAlpha = (color < 2 ? 0.92 : 0.84) * particleVisibility;
          for (const particle of groups[color]) {
            const light =
              0.9 + Math.sin(elapsed * 2.4 + particle.seed * 4) * 0.25;
            const size = particle.size * (width < 600 ? 1.05 : 1.8) * light;
            context.fillRect(particle.x, particle.y, size, size);
          }
        }
        // Sparse comet filaments make the whole composition visibly flow.
        for (let i = 0; i < 110; i += 1) {
          const phase = i / 110;
          const angle = phase * TAU + elapsed * 0.27;
          const rx = width * (0.45 + Math.sin(i * 8.9) * 0.025);
          const ry = height * (0.42 + Math.cos(i * 7.3) * 0.035);
          const x = width * 0.5 + Math.cos(angle) * rx;
          const y = height * 0.5 + Math.sin(angle) * ry;
          context.fillStyle = i % 3 ? '#a4beff' : '#ffdba8';
          context.globalAlpha = 0.12 + (Math.sin(elapsed + i) + 1) * 0.17;
          context.fillRect(x, y, i % 9 === 0 ? 2 : 1, 1);
        }
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;
        if (pausedRef.current) canvas.dataset.animationState = 'paused';
      }
      frameCount += 1;
      canvas.dataset.frameCount = String(frameCount);
    }

    function tick(timestamp) {
      if (
        disposed ||
        pausedRef.current ||
        motion.matches ||
        document.hidden ||
        !visible
      ) {
        frame = 0;
        return;
      }
      if (!lastTimestamp || timestamp - lastTimestamp >= 32) {
        const delta = lastTimestamp
          ? Math.min(0.06, (timestamp - lastTimestamp) / 1000)
          : 1 / 30;
        lastTimestamp = timestamp;
        update(delta);
        paint();
      }
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTimestamp = 0;
      if (!ready || disposed) return;
      paint();
      if (
        !pausedRef.current &&
        !motion.matches &&
        !document.hidden &&
        visible
      ) {
        frame = requestAnimationFrame(tick);
      }
    }

    function replay() {
      if (!ready || disposed) return;
      elapsed = 0;
      burstAge = 99;
      scatterLevel = 0;
      makeParticles();
      if (pausedRef.current) settleLogo();
      sync();
    }

    function resize() {
      const bounds = stage.getBoundingClientRect();
      const nextWidth = Math.max(1, bounds.width);
      const nextHeight = Math.max(1, bounds.height);
      if (width === nextWidth && height === nextHeight && canvas.width > 1)
        return;
      width = nextWidth;
      height = nextHeight;
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      if (ready) {
        fitLogo();
        makeParticles();
        elapsed = 0;
        if (pausedRef.current) settleLogo();
        sync();
      }
    }

    function move(event) {
      if (motion.matches || pausedRef.current) return;
      const bounds = stage.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active = true;
    }

    function scatter() {
      if (motion.matches || pausedRef.current || !ready) return;
      burstAge = 0;
      pointer.active = false;
      for (const particle of particles) {
        const angle = Math.atan2(
          particle.y - height * 0.5,
          particle.x - width * 0.5,
        );
        particle.vx += Math.cos(angle) * 6;
        particle.vy += Math.sin(angle) * 6;
      }
      sync();
    }

    const leave = () => {
      pointer.active = false;
    };
    const down = (event) => {
      pointer.downX = event.clientX;
      pointer.downY = event.clientY;
      if (event.pointerType !== 'touch') scatter();
    };
    const up = (event) => {
      if (event.pointerType === 'touch') {
        const distance = Math.hypot(
          event.clientX - pointer.downX,
          event.clientY - pointer.downY,
        );
        if (distance < 12) scatter();
        leave();
      }
    };

    controlsRef.current = { sync, replay };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: '40px' },
    );
    intersectionObserver.observe(stage);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    stage.addEventListener('pointermove', move, { passive: true });
    stage.addEventListener('pointerleave', leave, { passive: true });
    stage.addEventListener('pointerdown', down, { passive: true });
    stage.addEventListener('pointerup', up, { passive: true });
    stage.addEventListener('pointercancel', leave, { passive: true });

    image.onload = () => {
      if (disposed) return;
      try {
        sampleLogo();
        if (!targets.length) return;
        ready = true;
        fitLogo();
        makeParticles();
        canvas.dataset.ready = 'true';
        if (pausedRef.current && !motion.matches) {
          settleLogo();
        }
        sync();
        setShowFallback(false);
        onReadyRef.current?.();
      } catch {
        // The original image remains visible if a browser cannot read the mask.
        canvas.dataset.ready = 'fallback';
      }
    };
    image.onerror = () => {
      canvas.dataset.ready = 'fallback';
    };
    resize();
    image.src = src;

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerleave', leave);
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', leave);
      image.onload = null;
      image.onerror = null;
      controlsRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    pausedRef.current = paused;
    controlsRef.current?.sync();
  }, [paused]);

  useEffect(() => {
    if (lastReplay.current !== replayKey) {
      lastReplay.current = replayKey;
      controlsRef.current?.replay();
    }
  }, [replayKey]);

  return (
    <div
      ref={stageRef}
      className="logo-particle-scene"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        touchAction: 'pan-y',
      }}
    >
      <img
        className="logo-particle-fallback"
        src={src}
        alt=""
        aria-hidden="true"
        draggable="false"
        style={{
          position: 'absolute',
          inset: '9% 3%',
          width: '94%',
          height: '82%',
          objectFit: 'contain',
          opacity: showFallback ? 1 : 0,
          pointerEvents: 'none',
        }}
      />
      <canvas
        ref={canvasRef}
        className="logo-particle-canvas"
        aria-hidden="true"
        data-ready="false"
        style={{
          display: 'block',
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
