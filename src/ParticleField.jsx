import { useEffect, useRef } from 'react';

// An original particle print, drawn once and gently illuminated in motion.
// No images, WebGL, or animation dependencies are needed.
export default function ParticleField({ className = '', paused = false }) {
  const canvasRef = useRef(null);
  const pausedRef = useRef(paused);
  const resumeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const texture = document.createElement('canvas');
    const print = texture.getContext('2d');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1;
    let height = 1;
    let ratio = 1;
    let frame = 0;
    let lastFrame = 0;
    let time = 0;
    let visible = true;
    let disposed = false;
    let geometry;

    const randomGenerator = (seed) => () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    function point(angle, radius, depth = 0) {
      const { x, y, rx, ry, rotation } = geometry;
      const px = Math.cos(angle) * rx * radius;
      const py = Math.sin(angle) * ry * radius + depth;
      return {
        x: x + px * Math.cos(rotation) - py * Math.sin(rotation),
        y: y + px * Math.sin(rotation) + py * Math.cos(rotation),
      };
    }

    function drawPrint() {
      const random = randomGenerator(7927);
      const mobile = width < 700;
      const rx = mobile
        ? Math.max(width * 0.68, 220)
        : Math.min(width * 0.36, height * 0.76);
      geometry = {
        x: width * (mobile ? 0.78 : 0.74),
        y: height * (mobile ? 0.69 : 0.54),
        rx,
        ry: rx * 0.49,
        rotation: -0.49,
      };
      print.setTransform(ratio, 0, 0, ratio, 0, 0);
      print.clearRect(0, 0, width, height);

      // A soft spectral atmosphere surrounds the individually printed grains.
      const glow = print.createRadialGradient(
        geometry.x,
        geometry.y,
        rx * 0.22,
        geometry.x,
        geometry.y,
        rx * 1.2,
      );
      glow.addColorStop(0, 'rgba(20, 15, 52, 0)');
      glow.addColorStop(0.48, 'rgba(57, 37, 157, .06)');
      glow.addColorStop(0.73, 'rgba(76, 49, 175, .13)');
      glow.addColorStop(1, 'rgba(10, 8, 35, 0)');
      print.fillStyle = glow;
      print.fillRect(0, 0, width, height);
      print.globalCompositeOperation = 'lighter';

      // An elliptical halo follows the ribbon itself, leaving the inner void dark.
      print.save();
      print.translate(geometry.x, geometry.y);
      print.rotate(geometry.rotation);
      print.scale(1, geometry.ry / geometry.rx);
      const halo = print.createRadialGradient(0, 0, rx * 0.77, 0, 0, rx * 1.23);
      halo.addColorStop(0, 'rgba(86, 50, 255, 0)');
      halo.addColorStop(0.25, 'rgba(80, 45, 255, .07)');
      halo.addColorStop(0.49, 'rgba(73, 156, 255, .10)');
      halo.addColorStop(0.61, 'rgba(169, 234, 255, .13)');
      halo.addColorStop(0.73, 'rgba(255, 153, 69, .07)');
      halo.addColorStop(1, 'rgba(255, 77, 37, 0)');
      print.fillStyle = halo;
      print.fillRect(-rx * 1.3, -rx * 1.3, rx * 2.6, rx * 2.6);
      print.restore();

      // Fine luminous filaments create the silhouette even at small sizes.
      for (let strand = 0; strand < 39; strand += 1) {
        const offset = strand / 38;
        const radius = 0.87 + offset * 0.26;
        print.beginPath();
        for (let step = 0; step <= 180; step += 1) {
          const angle = (step / 180) * Math.PI * 2;
          const p = point(angle, radius + Math.sin(angle * 3 + offset) * 0.018);
          if (step === 0) print.moveTo(p.x, p.y);
          else print.lineTo(p.x, p.y);
        }
        const hue = offset < 0.32 ? 252 : offset < 0.64 ? 190 : 24;
        print.strokeStyle = `hsla(${hue}, 95%, ${offset > 0.45 && offset < 0.67 ? 88 : 66}%, ${0.04 + Math.sin(offset * Math.PI) * 0.1})`;
        print.lineWidth = 0.6 + random() * 0.8;
        print.stroke();
      }

      // Grain is concentrated around the same orbit, never scattered as dot soup.
      for (let i = 0; i < 28000; i += 1) {
        const angle = random() * Math.PI * 2;
        const spine = i % 5 === 0;
        const band = spine ? 0.57 + (random() + random() - 1) * 0.08 : random();
        const grain =
          (random() + random() + random() - 1.5) * (spine ? 0.035 : 0.095);
        const radius = 0.86 + band * 0.3 + grain;
        const p = point(angle, radius, (random() - 0.5) * rx * 0.018);
        const foreground = (Math.sin(angle) + 1) / 2;
        const hue =
          band < 0.32
            ? 249 - band * 65
            : band < 0.67
              ? 203 - (band - 0.32) * 100
              : 40 - (band - 0.67) * 105;
        const lightness =
          band > 0.48 && band < 0.69 ? 81 + random() * 18 : 53 + random() * 29;
        const opacity = Math.min(1, 0.3 + foreground * 0.48 + random() * 0.28);
        const size = (0.55 + random() * 1.4) * Math.max(0.75, rx / 380);
        print.fillStyle = `hsla(${hue}, 96%, ${lightness}%, ${opacity})`;
        print.fillRect(p.x, p.y, size, size);
      }

      // Long outgoing arcs connect the orbit to the wider composition.
      for (let strand = 0; strand < 24; strand += 1) {
        const spread = strand / 23;
        const start = point(2.7, 0.96 + spread * 0.16);
        print.beginPath();
        print.moveTo(start.x, start.y);
        print.bezierCurveTo(
          width * 0.35,
          height * 0.79 + spread * 28,
          width * 0.35,
          height * 1.08,
          width * 0.02,
          height * 1.28,
        );
        print.strokeStyle = `hsla(${230 - spread * 210}, 95%, 67%, ${0.035 + random() * 0.045})`;
        print.lineWidth = 0.7;
        print.stroke();
      }

      for (let i = 0; i < 75; i += 1) {
        const x = width * (0.3 + random() * 0.7);
        const y = random() * height;
        const size = random() > 0.95 ? 1.4 : 0.6;
        print.fillStyle = `rgba(201, 210, 255, ${0.12 + random() * 0.4})`;
        print.fillRect(x, y, size, size);
      }
      print.globalCompositeOperation = 'source-over';
    }

    function paint() {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.drawImage(texture, 0, 0, width, height);
      if (motion.matches || pausedRef.current || !geometry) return;

      context.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 24; i += 1) {
        const angle = (i / 24) * Math.PI * 2 + time * (i % 2 ? 0.04 : 0.026);
        const p = point(angle, 0.95 + (i % 5) * 0.035);
        const intensity = Math.pow((Math.sin(time * 0.5 + i * 1.8) + 1) / 2, 3);
        const glow = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, 3.5);
        glow.addColorStop(0, `rgba(236, 248, 255, ${intensity * 0.8})`);
        glow.addColorStop(0.3, `rgba(141, 196, 255, ${intensity * 0.34})`);
        glow.addColorStop(1, 'rgba(100, 150, 255, 0)');
        context.fillStyle = glow;
        context.fillRect(p.x - 4, p.y - 4, 8, 8);
      }
      context.globalCompositeOperation = 'source-over';
    }

    function tick(timestamp) {
      if (
        disposed ||
        motion.matches ||
        pausedRef.current ||
        document.hidden ||
        !visible
      ) {
        frame = 0;
        return;
      }
      if (timestamp - lastFrame > 50) {
        time = timestamp / 1000;
        paint();
        lastFrame = timestamp;
      }
      frame = requestAnimationFrame(tick);
    }

    function resume() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      paint();
      if (
        !disposed &&
        !motion.matches &&
        !pausedRef.current &&
        !document.hidden &&
        visible
      ) {
        frame = requestAnimationFrame(tick);
      }
    }

    resumeRef.current = resume;

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = texture.width = Math.round(width * ratio);
      canvas.height = texture.height = Math.round(height * ratio);
      drawPrint();
      resume();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    intersectionObserver.observe(canvas);
    document.addEventListener('visibilitychange', resume);
    motion.addEventListener('change', resume);
    resize();

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', resume);
      motion.removeEventListener('change', resume);
      resumeRef.current = null;
    };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    resumeRef.current?.();
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      className={`particle-field ${className}`}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
