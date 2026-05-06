import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        edificio1: resolve(__dirname, 'edifici/edificio-1.html'),
        edificio2: resolve(__dirname, 'edifici/edificio-2.html'),
        edificio3: resolve(__dirname, 'edifici/edificio-3.html'),
        edificio4: resolve(__dirname, 'edifici/edificio-4.html')
      }
    }
  }
});
