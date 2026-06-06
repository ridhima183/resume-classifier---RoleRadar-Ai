import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({ include: /\.(jsx|js|ts|tsx)$/ }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
  build: {
    // Optimized code splitting for better caching
    rollupOptions: {
      output: {
        // Vendor code (node_modules) in separate chunk
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['recharts', 'chart.js'],
          'utils': ['axios', 'lodash-es'],
        },
      },
    },
    // More aggressive minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Higher chunk size warning threshold
    chunkSizeWarningLimit: 1000,
    // CSS code splitting
    cssCodeSplit: true,
    // Source maps for debugging (disabled in production for smaller bundle)
    sourcemap: false,
  },
  server: {
    port: 3000,
    // Enable gzip compression in dev server
    middlewareMode: false,
  },
});

