import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/portal-[hash].js',
        chunkFileNames: 'assets/portal-[name]-[hash].js',
        assetFileNames: asset => asset.name?.endsWith('.css')
          ? 'assets/portal-[hash][extname]'
          : 'assets/[name]-[hash][extname]'
      }
    }
  }
});
