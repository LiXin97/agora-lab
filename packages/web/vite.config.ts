import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/ws': {
        target: `ws://localhost:${process.env.VITE_WS_PORT || '3001'}`,
        ws: true,
      },
    },
  },
});
