import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brain-logo.png', 'brain-favi.png'],
      manifestFilename: 'manifest.json',
      manifest: {
        name: 'Spoonfeeder',
        short_name: 'Spoonfeeder',
        description: 'Your personalized educational content platform',
        theme_color: '#0E0E10',
        background_color: '#0E0E10',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/brain-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/brain-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/logo/web/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/logo/web/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: [
          'logo/android/**/*',
          'logo/ios/**/*'
        ],
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