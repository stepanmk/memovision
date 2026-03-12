import { vueI18n } from '@intlify/vite-plugin-vue-i18n';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [vue(), vueI18n()],

    build: {
        outDir: './dist',
        emptyOutDir: true,
    },

    server: {
        host: '127.0.0.1',
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
        },
    },
});
