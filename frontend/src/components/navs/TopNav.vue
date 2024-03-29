<script setup>
import { Icon } from '@iconify/vue';
import { onClickOutside } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { showAlert } from '../../alerts';
import { api } from '../../axiosInstance';
import { useAudioStore, useModulesVisible, useUserInfo } from '../../globalStores';
import { pinia } from '../../piniaInstance';
import router from '../../router.js';
import { darkMode, disableDarkMode, getSecureConfig } from '../../sharedFunctions';

const userInfo = useUserInfo(pinia);
const modulesVisible = useModulesVisible(pinia);
const audioStore = useAudioStore(pinia);

const { t, locale } = useI18n();
const { username, darkModeEnabled } = storeToRefs(userInfo);
const menuOpen = ref(false);
const target = ref(null);

onClickOutside(target, () => {
    menuOpen.value = false;
});

function changeSession() {
    router.push('/sessions');
}

async function logoutUser(data) {
    await api.put('/update-modified-time', {}, getSecureConfig());
    api.post('/logout', data)
        .then(function (response) {
            if (response.data.message === 'logout successful') {
                // reset track pinia stores
                modulesVisible.$reset();
                userInfo.$reset();
                audioStore.$reset();
                showAlert('Successfully logged out.', 1500);
                // if the logout was successful, redirect user to the sign in page
                router.push('/login');
                disableDarkMode();
            }
        })
        .catch(function (error) {
            console.log(error);
        });
}
</script>

<template>
    <div
        id="navbar"
        class="flex h-16 w-full flex-row items-center justify-between gap-2 border-b bg-white px-7 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <div
            id="first"
            class="flex h-full w-[calc(100%-7rem)] select-none flex-row items-center justify-start text-xl font-bold">
            <p>MemoVision</p>
        </div>

        <div
            id="available-space"
            class="flex h-full flex-row items-center justify-center gap-2 whitespace-nowrap text-sm text-black dark:text-gray-200">
            <div
                id="outer-rect"
                class="flex h-[0.75rem] w-[8rem] items-center justify-start overflow-clip rounded-md bg-neutral-200 dark:bg-gray-600">
                <div
                    id="inner-rect"
                    class="h-full bg-neutral-400 dark:bg-gray-400"
                    :style="{
                        width: `${userInfo.occupiedPerc}%`,
                    }"></div>
            </div>
            <p class="flex h-full w-[6.5rem] items-center justify-start">
                {{ userInfo.occupiedSpace }}/{{ userInfo.availableSpace }} MB
            </p>
        </div>

        <div id="second" class="flex h-full items-center justify-center">
            <div id="dark-toggle-container" class="flex h-full w-full items-center justify-center dark:text-gray-900">
                <div
                    id="toggle-bg"
                    class="h-[1.2rem] w-[2.5rem] cursor-pointer rounded-full bg-neutral-400 dark:bg-gray-600"
                    @click="darkMode()">
                    <div
                        id="toggle-circle"
                        class="hover:bg-cyan flex h-[1.2rem] w-[1.2rem] items-center justify-center rounded-full bg-neutral-200 duration-200 hover:bg-cyan-600 hover:text-white dark:bg-gray-400 dark:hover:bg-cyan-600"
                        :class="{
                            'ml-[1.25rem] duration-100': darkModeEnabled,
                        }">
                        <Icon v-if="!darkModeEnabled" icon="ic:outline-light-mode" :inline="true" width="20" />
                        <Icon v-else icon="ic:outline-dark-mode" :inline="true" width="20" />
                    </div>
                </div>
            </div>
        </div>

        <div id="third" class="flex h-full items-center justify-center text-black">
            <div
                id="user-icon"
                class="dark:text-gray flex cursor-pointer flex-row items-center justify-center gap-1 hover:text-neutral-600 dark:text-gray-300 dark:hover:text-white"
                @click="menuOpen = !menuOpen">
                <Icon icon="ph:user-circle-light" :inline="true" width="40" />
            </div>
        </div>
    </div>

    <div
        v-if="menuOpen"
        id="user-menu"
        class="absolute right-0 top-0 z-50 mr-12 mt-14 flex w-64 flex-col gap-1 rounded-md border bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-neutral-200"
        ref="target">
        <div class="flex select-none flex-row gap-1 px-2">
            <p>User:</p>
            <p class="font-semibold">{{ username }}</p>
        </div>
        <div class="b mb-1 flex select-none flex-row gap-1 px-2">
            <p>Session:</p>
            <p class="font-semibold">{{ userInfo.selectedSession }}</p>
        </div>

        <button
            @click="changeSession()"
            class="flex cursor-pointer gap-1 rounded-md px-2 py-1 text-sm hover:bg-neutral-200 dark:hover:bg-gray-700">
            <Icon icon="material-symbols:swap-horiz-rounded" :inline="true" width="20" />
            Change session
        </button>

        <button
            @click="logoutUser()"
            class="flex cursor-pointer gap-1 rounded-md px-2 py-1 text-sm hover:bg-neutral-200 dark:hover:bg-gray-700">
            <Icon icon="clarity:sign-out-line" :inline="true" width="20" />
            {{ t('button.signout') }}
        </button>
    </div>
</template>
