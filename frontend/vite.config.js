import { vueI18n } from '@intlify/vite-plugin-vue-i18n';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// vite config
export default defineConfig({
    plugins: [vue(), vueI18n()],

    build: {
        outDir: '../backend/memovision/vue',
        emptyOutDir: true,
    },

    server: {
        host: '127.0.0.1',
    },
});
