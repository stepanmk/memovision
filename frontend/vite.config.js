import vue from '@vitejs/plugin-vue'
import { vueI18n } from '@intlify/vite-plugin-vue-i18n'
import { defineConfig } from 'vite'


// vite config
export default defineConfig({
  plugins: [
    vue(),
    vueI18n(),
  ],
  
  build: {
    outDir: '../backend/mos_backend/vue',
    emptyOutDir: true
  },

  server: {
    host: '127.0.0.1',
  }
})
