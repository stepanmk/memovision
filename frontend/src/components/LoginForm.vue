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
    <div
        class="flex flex-col items-center justify-center overflow-clip rounded-3xl bg-gray-800 px-16 py-12 backdrop-blur-3xl">
        <p
            class="select-none bg-gradient-to-r from-cyan-700 to-green-400 bg-clip-text text-7xl font-bold text-transparent">
            MemoVision
        </p>

        <form
            id="login-form"
            class="px-25 flex w-[20rem] flex-col items-center justify-center py-5 text-white"
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
                <router-link :to="{ path: '/signup' }" class="text-green-400 hover:text-white"
                    >Create an account.</router-link
                >
            </div>
        </form>
        <a href="https://www.tacr.cz/en/ " target="”_blank”">
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
        <a href="https://github.com/stepanmk/memovision" target="”_blank”" class="text-green-400 hover:text-white">
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
