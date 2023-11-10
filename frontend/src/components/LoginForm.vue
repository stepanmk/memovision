<script setup>
import { useVuelidate } from '@vuelidate/core';
import { minLength, required } from '@vuelidate/validators';
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { showAlert } from '../alerts';
import { api } from '../axiosInstance';
import { useUserInfo } from '../globalStores';
import router from '../router.js';
import { getSessions } from '../sharedFunctions';

// localization
const { t, locale } = useI18n();

// validation
const formData = reactive({
    username: '',
    password: '',
});

const rules = {
    username: { required, lengthCheck: minLength(3) },
    password: { required, lengthCheck: minLength(6) },
};

const v$ = useVuelidate(rules, formData);

// stores
const userInfo = useUserInfo();

// user login function
function loginUser(data) {
    api.post('/login', data)
        .then(function (response) {
            if (response.data.message === 'login successful') {
                // if the login was successful, redirect user to the main page
                showAlert('Login was successful.', 1500);
                getSessions().then((sessions) => {
                    userInfo.sessions = sessions;
                });
                router.push('/sessions');
            }
            if (response.data.message === 'wrong password') {
                showAlert(t('alert.wrongpassword'), 1500);
            }
            if (response.data.message === 'user does not exist') {
                showAlert(t('alert.wrongusername'), 1500);
            }
        })
        .catch(function (error) {
            // handle login error
            showAlert(error.message + '.', 1500);
        });
}
</script>

<template>
    <p
        class="select-none bg-gradient-to-r from-green-400 to-blue-700 bg-clip-text pb-10 text-8xl font-bold text-transparent">
        MemoVision
    </p>

    <form
        id="login-form"
        class="px-25 flex w-full flex-col items-center justify-center bg-neutral-700 bg-opacity-50 py-5 text-white backdrop-blur-sm"
        @submit.prevent="submit">
        <p class="mb-5 select-none text-3xl">{{ t('form.login') }}</p>

        <input
            v-model="v$.username.$model"
            type="text"
            class="input-field"
            :placeholder="t('form.username')"
            autocomplete="username" />
        <input
            v-model="v$.password.$model"
            type="password"
            class="input-field"
            :placeholder="t('form.pswd')"
            autocomplete="password" />

        <button @click="loginUser(formData)" type="submit" class="btn btn-blue h-8 text-base font-semibold">
            {{ t('button.signin') }}
        </button>

        <div class="mt-5 flex select-none flex-row gap-1 font-semibold text-white">
            <p>{{ t('login.notregistered') }}</p>
            <router-link :to="{ path: '/signup' }" class="text-green-400 hover:text-white">{{
                t('login.goregister')
            }}</router-link>
        </div>
    </form>
</template>

<style scoped>
input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}
</style>
