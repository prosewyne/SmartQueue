import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const projectRoot = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const watchedPaths = [path.join(projectRoot, 'index.html'), path.join(projectRoot, 'src')];

function ignoreOutsideFrontend(filePath) {
  const resolvedPath = path.resolve(filePath);
  return resolvedPath !== projectRoot && !watchedPaths.some((watchedPath) => (
    resolvedPath === watchedPath || resolvedPath.startsWith(`${watchedPath}${path.sep}`)
  ));
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    watch: {
      ignored: ignoreOutsideFrontend
    },
    proxy: {
      '/api': 'http://127.0.0.1:3000'
    }
  }
});