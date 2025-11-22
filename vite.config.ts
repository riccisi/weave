// vite.config.ts
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [tailwindcss()], // 👈 attiva Tailwind v4 in Vite
    resolve: {
        alias: {
            // '@core':  path.resolve(__dirname, 'src/core'),
            '@state': path.resolve(__dirname, 'src/state'),
            '@ui':    path.resolve(__dirname, 'src/ui'),
            // '@form':  path.resolve(__dirname, 'src/form'),
            // '@validation': path.resolve(__dirname, 'src/validation'),
            // '@refx':  path.resolve(__dirname, 'src/core')
        }
    },
    server: { port: 5173, open: true },
    optimizeDeps: { include: ['uhtml'] },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.ts']
    }
});