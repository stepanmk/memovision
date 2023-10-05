<script setup>
import router from '../router.js';

import { reactive } from 'vue';
import { useVuelidate } from '@vuelidate/core';
import {
    required,
    minLength,
    maxLength,
    alphaNum,
} from '@vuelidate/validators';

import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';

import { useUserInfo } from '../globalStores';
import { getSessions, getSecureConfig } from '../sharedFunctions';

import { api } from '../axiosInstance';

// localization
const { t, locale } = useI18n();

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
    <p
        class="select-none bg-gradient-to-r from-green-400 to-blue-700 bg-clip-text pb-10 text-8xl font-bold text-transparent">
        MemoVision
    </p>

    <form
        class="px-25 flex w-full select-none flex-col items-center justify-center gap-5 bg-neutral-700 bg-opacity-50 py-5 text-white backdrop-blur-sm"
        id="session-form"
        @submit.prevent="submit">
        <p class="text-3xl">Session selection</p>

        <div
            class="flex h-36 w-[40rem] flex-col items-center gap-1 overflow-y-auto rounded-md bg-white px-5 py-3">
            <div
                v-for="(obj, i) in userInfo.sessions"
                class="flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md bg-neutral-200 px-2 text-black hover:bg-neutral-300">
                <div
                    class="flex h-full w-[calc(100%-1.5rem)] flex-row items-center justify-between gap-5 pr-2"
                    @click="selectSession(obj.name)">
                    <p class="text-sm">{{ obj.name }}</p>
                    <p class="text-sm">
                        Last modified: {{ obj.last_modified }}
                    </p>
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
            type="text"
            class="input-field-nomargin"
            placeholder="New session name"
            maxlength="20"
            :class="{
                'border-2 border-green-400': !v$.sessionName.$invalid,
                'border-2 border-gray-300': v$.sessionName.$invalid,
            }" />

        <button
            @click="v$.sessionName.$invalid ? null : createSession()"
            type="submit"
            class="btn btn-blue h-8 text-base font-semibold"
            :class="{ 'btn-disabled': v$.sessionName.$invalid }">
            Create a new session
        </button>
    </form>
</template>

<style scoped>
input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}
</style>
