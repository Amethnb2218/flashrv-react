import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return null
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-charts'
          return 'vendor'
        },
      },
    },
  },
  server: {
    host: true,
    port: 3000,
    open: false,
    allowedHosts: ['localhost', '127.0.0.1', '.sslip.io', 'www.jolofera.com', 'jolofera.com'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: { '*': '' },
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
