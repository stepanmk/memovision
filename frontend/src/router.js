import Home from './views/Home.vue';
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import Sessions from './views/Sessions.vue';

import { createRouter, createWebHistory } from 'vue-router';
import { showAlert } from './alerts';
import { api } from './axiosInstance';
import { useUserInfo } from './globalStores';
import { getSecureConfig, getSessions } from './sharedFunctions';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
        beforeEnter: async () => {
            const userInfo = useUserInfo();
            const axiosConfig = getSecureConfig();
            if (axiosConfig.headers['X-CSRF-TOKEN'] !== undefined) {
                const res = await api.get('/login-check', axiosConfig);
                if (res.data.valid) {
                    userInfo.username = res.data.username;
                    userInfo.selectedSession = res.data.selectedSession;
                    userInfo.preciseSync = res.data.preciseSync;
                } else {
                    showAlert('Login expired.', 2000);
                    return { name: 'Login' };
                }
            } else {
                showAlert('You need to be logged in!', 2000);
                return { name: 'Login' };
            }
        },
    },
    {
        path: '/sessions',
        name: 'Sessions',
        component: Sessions,
        beforeEnter: async () => {
            const userInfo = useUserInfo();
            const axiosConfig = getSecureConfig();
            if (axiosConfig.headers['X-CSRF-TOKEN'] !== undefined) {
                const res = await api.get('/login-check', axiosConfig);
                if (res.data.valid) {
                    userInfo.sessions = await getSessions();
                } else {
                    showAlert('Login expired.', 2000);
                    return { name: 'Login' };
                }
            } else {
                showAlert('You need to be logged in!', 2000);
                return { name: 'Login' };
            }
        },
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
    },
    {
        path: '/register',
        name: 'Register',
        component: Register,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
