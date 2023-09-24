<script setup>

import router from '../router.js';

import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { onClickOutside } from '@vueuse/core';

import { useUserInfo, useTracksFromDb, useComponentsVisible, useModulesVisible } from '../globalStores';

import { darkMode, disableDarkMode } from '../sharedFunctions'
import { showAlert } from '../alerts'
import { api } from '../axiosInstance';


const userInfo = useUserInfo();
const tracksFromDb = useTracksFromDb();
const componentsVisible = useComponentsVisible();
const modulesVisible = useModulesVisible();

const { t, locale } = useI18n();
const { username, darkModeEnabled } = storeToRefs(userInfo);
const menuOpen = ref(false);
const target = ref(null);

onClickOutside(target, () => 
{
    menuOpen.value = false;
})

function changeSession()
{
    router.push('/sessions');
}

function logoutUser(data)
{
    api.post('/logout', data)
    .then(function (response) {
        if (response.data.message === 'logout successful') 
        {              
            // reset track pinia stores
            tracksFromDb.$reset();
            componentsVisible.$reset();
            userInfo.$reset();
            showAlert('Successfully logged out.', 1500);
            // if the logout was successful, redirect user to the sign in page
            router.push('/signin');
            disableDarkMode();
        }
    })
    .catch(function (error) {
        console.log(error);
    });
}

</script>


<template>
    <div id="navbar" class="w-full h-16 border-b px-7 bg-white flex flex-row items-center justify-between
    dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">

        <div id="first" class="h-full w-[calc(100%-7rem)] flex flex-row items-center justify-start font-bold text-xl">MemoVision</div>
        
        <div id="second" class="h-full w-[4rem] flex items-center justify-center ">
            <div id="dark-toggle-container" class="w-full h-full  flex items-center justify-center dark:text-gray-900">
                <div id="toggle-bg" class="w-[2.5rem] h-[1.2rem] rounded-full dark:bg-gray-600 bg-neutral-400 cursor-pointer" @click="darkMode()">
                    <div id="toggle-circle" class="w-[1.2rem] h-[1.2rem] rounded-full flex items-center justify-center
                    hover:bg-cyan hover:bg-cyan-600 duration-200 hover:text-white bg-neutral-200 dark:bg-gray-400 dark:hover:bg-cyan-600" 
                    :class="{'ml-[1.25rem] duration-100': darkModeEnabled}">
                        <Icon v-if="!darkModeEnabled" icon="ic:outline-light-mode" :inline="true" width="20"/>
                        <Icon v-else icon="ic:outline-dark-mode" :inline="true" width="20"/>
                    </div>
                </div>
            </div>
        </div>

        <div id="third" class="h-full w-[3rem] flex items-center justify-center text-black ">
            <div id="user-icon" class="flex flex-row items-center justify-center gap-1 hover:text-neutral-600 cursor-pointer
            dark:hover:text-white dark:text-gray dark:text-gray-300" @click="menuOpen = !menuOpen">
                <Icon icon="ph:user-circle-light" :inline="true" width="40"/>    
            </div>
        </div>

    </div>

    <div v-if="menuOpen" id="user-menu" class="absolute right-0 top-0 bg-white mt-14 mr-12 rounded-md pt-3 pb-3 text-sm flex flex-col border z-20
    w-60 dark:bg-gray-800 dark:border-gray-700 dark:text-white" ref="target">
        <div class="pl-5 pr-5 pt-1 pb-1 text-base font-semibold flex gap-1">
            User: {{username}}
        </div>
        
        <div @click="changeSession()" class="pl-5 pr-5 pt-1 pb-1 text-sm hover:bg-neutral-200 dark:hover:bg-gray-700 cursor-pointer flex gap-1">
            <Icon icon="material-symbols:swap-horiz-rounded" :inline="true" width="20"/>
            Change session
        </div>

        <!-- <div class="pl-5 pr-5 pt-1 pb-1 text-sm hover:bg-neutral-200 dark:hover:bg-gray-700 cursor-pointer flex gap-1">
            <Icon icon="carbon:settings" :inline="true" width="20"/>
            Profile settings
        </div> -->
        
        <div @click="logoutUser()" class="pl-5 pr-5 pt-1 pb-1 text-sm hover:bg-neutral-200 dark:hover:bg-gray-700 cursor-pointer flex gap-1">
            <Icon icon="clarity:sign-out-line" :inline="true" width="20"/>
            {{t('button.signout')}}
        </div>
    </div>

</template>