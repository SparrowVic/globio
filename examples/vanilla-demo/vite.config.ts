import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        charts: resolve(__dirname, 'charts.html'),
        heatmap: resolve(__dirname, 'heatmap.html'),
      },
    },
  },
});
