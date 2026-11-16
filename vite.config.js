import { defineConfig } from 'vite';

const proxy = { '/api': { target: 'http://127.0.0.1:3001' } };
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy,
    fs: {
      deny: [
        '.env',
        '.env.*',
        '*.{crt,pem}',
        '**/.git/**',
        '**/.data/**',
        '**/*.sqlite*',
        '**/server/**',
        '**/tests/**',
      ],
    },
  },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true, proxy },
});
