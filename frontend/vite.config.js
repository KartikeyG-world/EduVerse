import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/') || id.includes('\\react\\')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('@tsparticles')) {
              return 'vendor-particles';
            }
            if (id.includes('@tiptap') || id.includes('dompurify')) {
              return 'vendor-editor';
            }
          }
        },
      },
    },
  },
})

