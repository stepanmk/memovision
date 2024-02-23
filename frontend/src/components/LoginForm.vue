<script setup>
import { Icon } from '@iconify/vue';
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
    <div class="flex flex-col items-center justify-center rounded-3xl bg-gray-800 px-20 py-12">
        <p
            class="select-none bg-gradient-to-r from-cyan-700 to-red-400 bg-clip-text pb-5 text-8xl font-bold text-transparent max-sm:text-5xl">
            MemoVision
        </p>
        <form
            id="login-form"
            class="px-25 flex w-[20rem] flex-col items-center justify-center py-5 text-white max-sm:hidden"
            @submit.prevent="submit">
            <input
                id="username"
                v-model="v$.username.$model"
                type="text"
                class="input-field w-full"
                placeholder="Username"
                autocomplete="username" />
            <input
                id="password"
                v-model="v$.password.$model"
                type="password"
                class="input-field w-full"
                placeholder="Password"
                autocomplete="current-password" />
            <button @click="loginUser(formData)" type="submit" class="btn btn-blue h-8 w-[20rem]">Sign in</button>
            <div class="mt-5 flex select-none flex-row gap-1 font-semibold text-white">
                <p>Not registered?</p>
                <router-link :to="{ path: '/register' }" class="text-red-400 hover:text-white"
                    >Create an account.</router-link
                >
            </div>
        </form>
        <div class="flex items-center justify-center gap-8">
            <a href="https://www.tacr.cz/en/ " target="”_blank”">
                <div class="bg-tacr-logo rounded- h-[4.6rem] w-[4.6rem] bg-cover"></div>
            </a>
            <a href="https://www.music.phil.muni.cz" target="”_blank”">
                <div class="bg-muni-arts h-[5rem] w-[6.5rem] rounded-sm bg-cover transition"></div>
            </a>
            <a href="https://www.github.com/stepanmk/memovision" target="”_blank”" class="text-white">
                <Icon icon="icomoon-free:github" width="52" />
            </a>
        </div>
        <p class="w-[30rem] select-none pt-5 text-justify text-xs text-white max-sm:hidden">
            This work was supported by the project TA ČR, TL05000527 Memories of Sound: The Evolution of the
            Interpretative Tradition Based on the Works of Antonin Dvorak and Bedrich Smetana and was co-financed with
            state support of the Technology Agency of the Czech Republic within the ÉTA Program.
        </p>
        <p class="pt-5 text-xs font-semibold text-white sm:hidden">
            This application is only intended for desktop use.
        </p>
    </div>
</template>

<style scoped>
input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}
</style>
