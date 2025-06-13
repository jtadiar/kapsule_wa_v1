import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Optimize build output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'data-vendor': ['zustand', '@supabase/supabase-js']
        }
      }
    },
    // Improve chunk loading
    chunkSizeWarningLimit: 1000,
    // Improve asset loading
    assetsInlineLimit: 4096, // 4kb
  },
  server: {
    // Optimize dev server
    hmr: {
      overlay: true,
    },
  },
});