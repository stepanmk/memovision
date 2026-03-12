import { createRouter, createWebHistory } from 'vue-router';

import AdminUsers from './views/AdminUsers.vue';
import Home from './views/Home.vue';
import Login from './views/Login.vue';
import Sessions from './views/Sessions.vue';

import { showAlert } from './alerts';
import { api } from './axiosInstance';
import { useUserInfo } from './globalStores';
import { getSecureConfig, getSessions } from './sharedFunctions';

async function requireLogin() {
    const userInfo = useUserInfo();
    const axiosConfig = getSecureConfig();

    if (axiosConfig.headers['X-CSRF-TOKEN'] === undefined) {
        showAlert('You need to be logged in!', 2000);
        return { name: 'Login' };
    }

    try {
        const res = await api.get('/login-check', axiosConfig);

        if (!res.data.valid) {
            showAlert('Login expired.', 2000);
            return { name: 'Login' };
        }

        userInfo.username = res.data.username;
        userInfo.selectedSession = res.data.selectedSession;
        userInfo.preciseSync = res.data.preciseSync;

        // optional, if you store this in Pinia
        userInfo.isAdmin = res.data.isAdmin ?? res.data.is_admin ?? false;

        return {
            ok: true,
            isAdmin: res.data.isAdmin ?? res.data.is_admin ?? false,
        };
    } catch (error) {
        showAlert('Login expired.', 2000);
        return { name: 'Login' };
    }
}

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
        beforeEnter: async () => {
            const auth = await requireLogin();
            if (auth.ok) return true;
            return auth;
        },
    },
    {
        path: '/sessions',
        name: 'Sessions',
        component: Sessions,
        beforeEnter: async () => {
            const auth = await requireLogin();
            if (!auth.ok) return auth;

            const userInfo = useUserInfo();
            userInfo.sessions = await getSessions();
            return true;
        },
    },
    {
        path: '/admin',
        name: 'AdminUsers',
        component: AdminUsers,
        beforeEnter: async () => {
            const auth = await requireLogin();
            if (!auth.ok) return auth;

            if (!auth.isAdmin) {
                showAlert('Access denied.', 2000);
                return { name: 'Home' };
            }

            return true;
        },
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
