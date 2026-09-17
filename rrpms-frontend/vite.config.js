import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BACKEND_URL lets the proxy target differ between plain local dev
// (localhost:8080) and Docker dev-mode, where the backend is only reachable
// by its compose service name (http://backend:8080) — "localhost" inside a
// container would otherwise point at the container itself, not the backend.
const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8082';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // bind 0.0.0.0 so the dev server is reachable from outside the container
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
          });
        },
      },
    },
  },
});
