import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { VitePWA } from 'vite-plugin-pwa'

// https://github.com/antfu/vite-plugin-pwa/blob/master/src/types.ts

// https://vitejs.dev/config/
export default defineConfig({
  base: '/md/',
  plugins: [vue(),
    VitePWA({
      manifest: {
       // content of manifest
      },
      workbox: {
      // workbox options for generateSW
      }
    })
  ]
})
