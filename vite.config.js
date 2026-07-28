// vite.config.js
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Clickquiz/',                 // <-- repository name for GitHub Pages
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*'],
      manifest: {
        name: 'Photo Quiz',
        short_name: 'Quiz',
        start_url: '/Clickquiz/',
        display: 'standalone',
        background_color: '#fafafa',
        theme_color: '#2563eb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  build: { outDir: 'dist', sourcemap: true }
});
