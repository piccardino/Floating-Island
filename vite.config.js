import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';

function copyPublic() {
  const publicDir = resolve(__dirname, 'public');
  const distDir = resolve(__dirname, 'dist');
  
  if (!existsSync(publicDir)) return;
  
  const destDir = resolve(distDir, 'models');
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  
  copyFileSync(
    resolve(publicDir, 'models/floatingIsland.glb'),
    resolve(destDir, 'floatingIsland.glb')
  );
  
  const dracoDest = resolve(distDir, 'draco');
  if (!existsSync(dracoDest)) mkdirSync(dracoDest, { recursive: true });
  
  ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js'].forEach(file => {
    copyFileSync(
      resolve(publicDir, `draco/${file}`),
      resolve(dracoDest, file)
    );
  });
}

export default defineConfig({
  base: '/Floating-Island/',
  plugins: [{
    name: 'copy-public',
    closeBundle() {
      copyPublic();
    }
  }],
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
