<script setup>
import { Icon } from '@iconify/vue';
import { useVuelidate } from '@vuelidate/core';
import { alphaNum, maxLength, minLength, required } from '@vuelidate/validators';
import { reactive } from 'vue';
import { api } from '../axiosInstance';
import { useUserInfo } from '../globalStores';
import router from '../router.js';
import { getSecureConfig, getSessions } from '../sharedFunctions';

// validation
const formData = reactive({
    sessionName: '',
});

const rules = {
    sessionName: {
        required,
        alphaNum,
        minLength: minLength(3),
        maxLength: maxLength(20),
    },
};

const v$ = useVuelidate(rules, formData);
const userInfo = useUserInfo();

// function for session selection
function selectSession(selectedSession) {
    const data = {
        sessionName: selectedSession,
    };
    api.post('/select-session', data, getSecureConfig()).then(() => {
        router.push('/');
    });
}

// create a new session
function createSession() {
    const data = {
        sessionName: formData.sessionName,
    };
    api.post('/create-session', data, getSecureConfig())
        .then(() => {
            return getSessions();
        })
        .then((retrievedSessions) => {
            userInfo.sessions = retrievedSessions;
            formData.sessionName = '';
        });
}

// delete a given session
function deleteSession(sessionName) {
    const data = {
        sessionName: sessionName,
    };
    api.post('/delete-session', data, getSecureConfig())
        .then(() => {
            return getSessions();
        })
        .then((retrievedSessions) => {
            userInfo.sessions = retrievedSessions;
        });
}
</script>

<template>
    <div
        class="flex flex-col items-center justify-center overflow-clip rounded-3xl bg-black bg-opacity-30 px-16 py-12 backdrop-blur-3xl">
        <p
            class="select-none bg-gradient-to-r from-cyan-700 to-green-400 bg-clip-text text-7xl font-bold text-transparent">
            MemoVision
        </p>

        <form
            class="px-25 flex w-[34rem] flex-col items-center justify-center gap-5 py-5 text-white"
            id="session-form"
            @submit.prevent="submit">
            <!-- <p class="">Session selection</p> -->

            <div class="flex h-36 w-[34rem] flex-col items-center gap-1 overflow-y-auto rounded-md bg-white px-2 py-3">
                <div
                    v-for="(obj, i) in userInfo.sessions"
                    class="flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md bg-neutral-200 px-2 text-black hover:bg-neutral-300">
                    <div
                        class="flex h-full w-[calc(100%-1.5rem)] flex-row items-center justify-between gap-5 pr-2"
                        @click="selectSession(obj.name)">
                        <p class="text-sm">{{ obj.name }}</p>
                        <p class="text-sm">Last modified: {{ obj.last_modified }}</p>
                    </div>

                    <Icon
                        icon="fluent:delete-48-regular"
                        :inline="true"
                        width="18"
                        @click="deleteSession(obj.name)"
                        class="w-[1.5rem] cursor-pointer hover:text-red-600" />
                </div>
            </div>

            <input
                v-model="v$.sessionName.$model"
                id="session-name"
                type="text"
                class="input-field-nomargin w-[20rem]"
                placeholder="New session name"
                maxlength="20"
                :class="{
                    'border-2 border-green-400': !v$.sessionName.$invalid,
                    'border-2 border-gray-300': v$.sessionName.$invalid,
                }" />

            <button
                @click="v$.sessionName.$invalid ? null : createSession()"
                type="submit"
                class="btn btn-blue h-8 w-[20rem]"
                :class="{ 'btn-disabled': v$.sessionName.$invalid }">
                Create a new session
            </button>
        </form>
        <a href="https://www.tacr.cz/en/">
            <div
                class="group flex max-w-[35rem] select-none items-center gap-2 rounded-md p-2 text-justify text-xs text-white">
                <div
                    class="bg-tacr-logo group-hover:bg-tacr-logo-color h-[4rem] w-[4rem] rounded-sm bg-slate-400 bg-cover transition"></div>

                <p class="w-[calc(100%-4rem)]">
                    This work was supported by the project TA ČR, TL05000527 Memories of Sound: The Evolution of the
                    Interpretative Tradition Based on the Works of Antonin Dvorak and Bedrich Smetana and was
                    co-financed with state support of the Technology Agency of the Czech Republic within the ÉTA
                    Program.
                </p>
            </div>
        </a>
        <a href="https://github.com/stepanmk/memovision" class="text-green-400 hover:text-white">
            <div class="flex max-w-[35rem] select-none flex-row items-center gap-2 rounded-md pt-2 text-xs">
                <Icon icon="icomoon-free:github" width="32" class="" />

                <p class="">This is the alpha version of the aplication. Feel free to contribute on GitHub.</p>
            </div>
        </a>
    </div>
</template>

<style scoped>
input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}
</style>
