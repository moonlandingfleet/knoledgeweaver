import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        strictPort: true, // Use exactly port 3001
      },
      plugins: [react()],
      define: {
        'process.env.GOOGLE_GENERATIVE_AI_API_KEY': JSON.stringify(env.GOOGLE_GENERATIVE_AI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          external: ['stream', 'util', 'path', 'buffer', 'fs', 'crypto'],
          output: {
            manualChunks: {
              'csv-parse': ['csv-parse'],
              'xlsx': ['xlsx'],
              'mammoth': ['mammoth']
            }
          }
        }
      },
      // Add this to handle SPA routing
      preview: {
        port: 3001,
        host: '0.0.0.0',
        strictPort: true,
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './test/setup.ts',
        css: true,
        coverage: {
          reporter: ['text', 'json', 'html'],
          exclude: [
            'node_modules/',
            'test/',
            '**/*.d.ts',
            '**/*.config.*',
            '**/vite-env.d.ts'
          ]
        }
      }
    };
});