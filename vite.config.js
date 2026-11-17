import { defineConfig } from 'vite';

export default defineConfig({
  // Pre-empaqueta three y sus addons juntos: evita el aviso "Multiple instances of Three.js"
  // que aparece en la primera carga cuando Vite re-optimiza al descubrir `three/addons`.
  optimizeDeps: {
    include: ['three', 'three/addons/utils/BufferGeometryUtils.js'],
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
});
