<script setup>
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
                router.push('/login');
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
    <div class="flex flex-col items-center justify-center rounded-3xl bg-gray-800 px-20 py-12">
        <p
            class="select-none bg-gradient-to-r from-cyan-700 to-red-400 bg-clip-text pb-5 text-7xl font-bold text-transparent max-sm:text-5xl">
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
                <router-link :to="{ name: 'Login' }" class="text-red-400 hover:text-white">Sign in.</router-link>
            </div>
        </form>
        <!-- <div class="flex items-center justify-center gap-8">
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
        </p> -->
    </div>
</template>

<style scoped>
input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}
</style>
