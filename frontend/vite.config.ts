import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brain-favi.png', 'manifest.json'],
      manifest: {
        name: 'Spoonfeeder',
        short_name: 'Spoonfeeder',
        description: 'Educational content platform',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/brain-favi.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/brain-favi.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/pdf-storage\.suganthr09\.workers\.dev\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pdf-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: '0.0.0.0', // Explicitly bind to all network interfaces
    strictPort: false, // If port 3000 is taken, try next available port
    allowedHosts: [
      '.ngrok-free.dev', // Allow all ngrok free domains
      '.ngrok.io', // Allow all ngrok paid domains
      'localhost',
      '127.0.0.1',
    ],
  },
})
