<script setup>
import { Icon } from '@iconify/vue';
import { useVuelidate } from '@vuelidate/core';
import { email, minLength, required, sameAs } from '@vuelidate/validators';
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { showAlert } from '../alerts';
import { api } from '../axiosInstance';
import router from '../router.js';

// localization
const { t, locale } = useI18n();

// validation
const formData = reactive({
    email: '',
    username: '',
    password: '',
    passwordRepeat: '',
});

const rules = computed(() => {
    return {
        email: { required, email },
        username: { required, lengthCheck: minLength(3) },
        password: {
            required,
            lengthCheck: minLength(6),
            passwordMatch: sameAs(formData.passwordRepeat),
        },
        passwordRepeat: {
            required,
            lengthCheck: minLength(6),
            passwordMatch: sameAs(formData.password),
        },
    };
});

const v$ = useVuelidate(rules, formData);

// user register function
function registerUser(data) {
    api.post('/register', data)
        .then(function (response) {
            if (response.data.message === 'registration successful') {
                router.push('/signin');
                showAlert(t('register.registersuccess'), 1500);
            }
            if (response.data.message === 'email already exists') {
                showAlert(t('alert.emailexists'), 1500);
            }
            if (response.data.message === 'username already exists') {
                showAlert(t('alert.usernameexists'), 1500);
            }
        })
        .catch(function (error) {
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
            class="px-25 b flex w-[20rem] flex-col items-center justify-center py-5 text-white"
            id="register-form"
            @submit.prevent="submit">
            <input
                v-model="v$.email.$model"
                id="email"
                type="email"
                class="input-field-nomargin w-full border-2"
                :placeholder="t('form.email')"
                :class="{
                    'border-green-400 transition duration-500': !v$.email.$invalid,
                    'border-2 border-gray-300': v$.email.$invalid,
                }"
                autocomplete="email" />

            <div class="mb-1 mt-1 h-5 text-xs text-white">
                <div v-if="v$.email.$error">
                    <span v-if="v$.email.$errors[0].$validator === 'email'">
                        {{ t('register.emailbadformat') }}
                    </span>
                </div>
            </div>

            <input
                v-model="v$.username.$model"
                id="username"
                type="text"
                class="input-field-nomargin w-full border-2"
                :placeholder="t('form.username')"
                :class="{
                    'border-green-400 transition duration-500': !v$.username.$invalid,
                    'border-2 border-gray-300': v$.username.$invalid,
                }"
                autocomplete="username" />

            <div class="mb-1 mt-1 h-5 text-xs text-white">
                <div v-if="v$.username.$error">
                    <span v-if="v$.username.$errors[0].$validator === 'lengthCheck'">
                        {{ t('register.usernametooshort') }}
                    </span>
                </div>
            </div>

            <input
                v-model="v$.password.$model"
                id="password-first"
                type="password"
                class="input-field-nomargin w-full border-2"
                :placeholder="t('form.pswd')"
                :class="{
                    'border-green-400 transition duration-500': !v$.password.$invalid,
                    'border-2 border-gray-300': v$.password.$invalid,
                }"
                autocomplete="new-password" />

            <div class="mb-1 mt-1 h-5 text-xs text-white">
                <div v-if="v$.password.$error">
                    <span v-if="v$.password.$errors[0].$validator === 'lengthCheck'">
                        {{ t('register.pswdtooshort') }}
                    </span>
                    <span v-if="v$.password.$errors[0].$validator === 'passwordMatch'">
                        {{ t('register.pswdnomatch') }}
                    </span>
                </div>
            </div>

            <input
                v-model="v$.passwordRepeat.$model"
                id="password-repeat"
                type="password"
                class="input-field-nomargin w-full border-2"
                :placeholder="t('form.pswdagain')"
                :class="{
                    'border-green-400 transition duration-500': !v$.passwordRepeat.$invalid,
                    'border-2 border-gray-300': v$.passwordRepeat.$invalid,
                }"
                autocomplete="new-password" />

            <div class="mb-1 mt-1 h-5 text-xs text-white">
                <div v-if="v$.passwordRepeat.$error">
                    <span v-if="v$.passwordRepeat.$errors[0].$validator === 'lengthCheck'">
                        {{ t('register.pswdtooshort') }}
                    </span>
                    <span v-if="v$.passwordRepeat.$errors[0].$validator === 'passwordMatch'">
                        {{ t('register.pswdnomatch') }}
                    </span>
                </div>
            </div>

            <div
                v-if="
                    !v$.email.$invalid && !v$.username.$invalid && !v$.password.$invalid && !v$.passwordRepeat.$invalid
                ">
                <button type="submit" @click="registerUser(formData)" class="btn btn-blue h-8 w-[20rem] font-semibold">
                    {{ t('button.signup') }}
                </button>
            </div>

            <div v-else>
                <button type="button" class="btn btn-disabled h-8 w-[20rem]">
                    {{ t('button.signup') }}
                </button>
            </div>

            <div class="mt-5 flex flex-row gap-1 font-semibold text-white">
                <p>{{ t('register.alreadyregistered') }}</p>
                <router-link :to="{ name: 'Login' }" class="text-green-400 hover:text-white">{{
                    t('register.gologin')
                }}</router-link>
            </div>
        </form>
        <a href="https://www.tacr.cz/en/" target="”_blank”">
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
        <a href="https://github.com/stepanmk/memovision" class="text-green-400 hover:text-white" target="”_blank”">
            <div class="flex max-w-[35rem] select-none flex-row items-center gap-2 rounded-md pt-2 text-xs">
                <Icon icon="icomoon-free:github" width="32" class="" />

                <p class="">This is the alpha version of the application. Feel free to contribute on GitHub.</p>
            </div>
        </a>
    </div>
</template>

<style scoped>
input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}
</style>
