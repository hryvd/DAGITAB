import { useEffect, useId, useRef, useState } from 'react';

const panes = [
  '.nav-wrap',
  '.mobile-nav',
  '.hero-bottom',
  '.organization-card',
  '.module-card',
  '.system-diagram',
  '.diagram-node',
  '.experience-art',
  '.roadmap-tabs',
  '.roadmap-list',
  '.faq-item.is-open',
  '.join-card',
  '.role-dialog',
  '.dialog-note',
].join(',');

// The rounded rectangle's distance field keeps displacement on its bevel.
// Everything beyond that narrow rim is exactly neutral in the lens map.
function edgeMap(width, height, radius) {
  const canvas = document.createElement('canvas');
  const resolution = Math.min(1, 512 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * resolution));
  canvas.height = Math.max(1, Math.round(height * resolution));
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(canvas.width, canvas.height);
  const band = Math.min(22, width / 4, height / 4);

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = ((x + 0.5) / canvas.width - 0.5) * width;
      const dy = ((y + 0.5) / canvas.height - 0.5) * height;
      const qx = Math.abs(dx) - width / 2 + radius;
      const qy = Math.abs(dy) - height / 2 + radius;
      const cornerX = Math.max(qx, 0);
      const cornerY = Math.max(qy, 0);
      const length = Math.hypot(cornerX, cornerY);
      const depth = radius - length - Math.min(Math.max(qx, qy), 0);
      let normalX = 0;
      let normalY = 0;
      if (depth >= 0 && depth < band) {
        const strength = (1 - depth / band) ** 2;
        normalX =
          (length ? cornerX / length : qx > qy ? 1 : 0) *
          Math.sign(dx) *
          strength;
        normalY =
          (length ? cornerY / length : qy >= qx ? 1 : 0) *
          Math.sign(dy) *
          strength;
      }
      const index = (y * canvas.width + x) * 4;
      pixels.data[index] = Math.round(128 - normalX * 127);
      pixels.data[index + 1] = Math.round(128 - normalY * 127);
      pixels.data[index + 2] = 128;
      pixels.data[index + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL();
}

export default function GlassRefraction() {
  const definitions = useRef(null);
  const prefix = `glass-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!CSS.supports('backdrop-filter', 'url("#glass")')) return;
    // Touch browsers use native frosting; SVG backdrop URLs are not portable.
    const desktop = window.matchMedia(
      '(min-width: 901px) and (hover: hover) and (pointer: fine)',
    );
    const update = () => setEnabled(desktop.matches);
    update();
    desktop.addEventListener('change', update);
    return () => desktop.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const defs = definitions.current;
    const tracked = new Map();
    const filters = new Map();
    let frame = 0;
    let nextId = 0;

    function update(element) {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (!width || !height) return;
      const radius = Math.min(
        parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0,
        width / 2,
        height / 2,
      );
      const key = `${width}:${height}:${radius}`;
      let filter = filters.get(key);
      if (!filter) {
        filter = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'filter',
        );
        filter.id = `${prefix}-${nextId++}`;
        filter.setAttribute('x', '0%');
        filter.setAttribute('y', '0%');
        filter.setAttribute('width', '100%');
        filter.setAttribute('height', '100%');
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        // Numeric image dimensions avoid the hidden SVG's zero-size viewport.
        // 128 / 255 * 255 / 256 = 0.5 keeps the center neutral.
        filter.innerHTML = `<feImage href="${edgeMap(width, height, radius)}" width="${width}" height="${height}" preserveAspectRatio="none" result="rim"/>
          <feComponentTransfer in="rim" result="lens"><feFuncR type="linear" slope="0.99609375"/><feFuncG type="linear" slope="0.99609375"/></feComponentTransfer>
          <feDisplacementMap in="SourceGraphic" in2="lens" scale="20" xChannelSelector="R" yChannelSelector="G"/>`;
        defs.append(filter);
        filters.set(key, filter);
      }
      tracked.set(element, filter.id);
      element.style.setProperty(
        '--liquid-backdrop',
        `url("#${filter.id}") blur(0.6px) saturate(1.15)`,
      );
    }

    function prune() {
      const active = new Set(tracked.values());
      for (const [key, filter] of filters) {
        if (!active.has(filter.id)) {
          filter.remove();
          filters.delete(key);
        }
      }
    }

    const resize = new ResizeObserver((entries) => {
      for (const { target } of entries) update(target);
      prune();
    });
    function refresh() {
      frame = 0;
      const current = new Set(document.querySelectorAll(panes));
      for (const element of tracked.keys()) {
        if (!current.has(element)) {
          resize.unobserve(element);
          element.style.removeProperty('--liquid-backdrop');
          tracked.delete(element);
        }
      }
      for (const element of current) {
        if (!tracked.has(element)) {
          tracked.set(element, null);
          resize.observe(element);
        }
        update(element);
      }
      prune();
    }
    const mutations = new MutationObserver((records) => {
      if (!frame && records.some(({ target }) => !defs.contains(target))) {
        frame = requestAnimationFrame(refresh);
      }
    });
    mutations.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'open'],
    });
    refresh();
    return () => {
      resize.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      for (const element of tracked.keys()) {
        element.style.removeProperty('--liquid-backdrop');
      }
      defs.replaceChildren();
    };
  }, [prefix, enabled]);

  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{ position: 'absolute' }}
    >
      <defs ref={definitions} />
    </svg>
  );
}
