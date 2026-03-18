<script setup>
import { Icon } from '@iconify/vue';
import { useVuelidate } from '@vuelidate/core';
import { helpers, maxLength, minLength, required } from '@vuelidate/validators';
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { showAlert } from '../alerts';
import { api } from '../axiosInstance';
import { useUserInfo } from '../globalStores';
import router from '../router.js';
import { getSessions } from '../sharedFunctions';

// localization
const { t } = useI18n();

// strict validators
const usernameAllowed = helpers.withMessage(
    'Username contains invalid characters.',
    (value) => /^[A-Za-z0-9._-]+$/.test(value)
);

const noControlChars = helpers.withMessage(
    'Input contains invalid control characters.',
    (value) => !/[\x00-\x1F\x7F]/.test(value)
);

// validation data
const formData = reactive({
    username: '',
    password: '',
});

const rules = {
    username: {
        required,
        minLength: minLength(3),
        maxLength: maxLength(64),
        usernameAllowed,
        noControlChars,
    },
    password: {
        required,
        minLength: minLength(6),
        maxLength: maxLength(128),
        noControlChars,
    },
};

const v$ = useVuelidate(rules, formData);

// stores
const userInfo = useUserInfo();

function sanitizeUsername(value) {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, '');
}

function sanitizePassword(value) {
    // do not "escape" passwords; just normalize dangerous control chars
    return String(value ?? '').replace(/[\x00-\x1F\x7F]/g, '');
}

const cleanedPayload = computed(() => ({
    username: sanitizeUsername(formData.username),
    password: sanitizePassword(formData.password),
}));

async function submit() {
    const isValid = await v$.value.$validate();
    if (!isValid) {
        showAlert('Please correct the highlighted fields.', 1800);
        return;
    }

    try {
        const response = await api.post('/login', cleanedPayload.value);

        if (response.data.message === 'login successful') {
            showAlert('Login was successful.', 1500);
            const sessions = await getSessions();
            userInfo.sessions = sessions;
            router.push('/sessions');
            return;
        }

        if (response.data.message === 'wrong password') {
            showAlert(t('alert.wrongpassword'), 1500);
            return;
        }

        if (response.data.message === 'user does not exist') {
            showAlert(t('alert.wrongusername'), 1500);
            return;
        }

        showAlert('Login failed.', 1500);
    } catch (error) {
        showAlert(error?.response?.data?.message || error.message || 'Login failed.', 1500);
    }
}
</script>

<template>
    <div class="flex flex-col items-center justify-center rounded-3xl bg-gray-800 px-20 py-12">
        <p
            class="select-none bg-gradient-to-r from-cyan-700 to-red-400 bg-clip-text pb-5 text-8xl font-bold text-transparent max-sm:text-5xl">
            MemoVision
        </p>

        <form id="login-form"
            class="px-25 flex w-[20rem] flex-col items-center justify-center py-5 text-white max-sm:hidden"
            @submit.prevent="submit">
            <input id="username" v-model.trim="v$.username.$model" type="text" class="input-field w-full"
                placeholder="Username" autocomplete="username" spellcheck="false" autocapitalize="none" />
            <p v-if="v$.username.$error" class="mt-1 w-full text-xs text-red-400">
                Invalid username.
            </p>

            <input id="password" v-model="v$.password.$model" type="password" class="input-field w-full"
                placeholder="Password" autocomplete="current-password" />
            <p v-if="v$.password.$error" class="mt-1 w-full text-xs text-red-400">
                Invalid password.
            </p>

            <button type="submit" class="btn btn-blue h-8 w-[20rem]">
                Sign in
            </button>

            <p class="text-center text-xs text-white mt-6">
                Need access? Contact us at
                <a href="mailto:memovision@seznam.cz" class="text-cyan-400 transition hover:text-cyan-300">
                    memovision@seznam.cz
                </a>
            </p>
        </form>

        <div class="flex items-center justify-center gap-12 max-sm:gap-6">
            <a href="https://www.tacr.cz/en/" target="_blank" rel="noopener noreferrer">
                <div class="bg-tacr-logo rounded- h-[4.6rem] w-[4.6rem] bg-cover"></div>
            </a>
            <a href="https://www.music.phil.muni.cz" target="_blank" rel="noopener noreferrer">
                <div class="bg-muni-arts h-[5rem] w-[6.5rem] rounded-sm bg-cover transition"></div>
            </a>
            <a href="https://www.github.com/stepanmk/memovision" target="_blank" rel="noopener noreferrer"
                class="text-white">
                <Icon icon="icomoon-free:github" width="52" />
            </a>
        </div>

        <p class="mt-3 w-[36rem] select-none rounded-xl p-3 text-justify text-[11px] text-gray-400 max-sm:hidden">
            This work was supported by the project TA ČR, TL05000527 Memories of Sound: The Evolution of the
            Interpretative Tradition Based on the Works of Antonin Dvorak and Bedrich Smetana and was co-financed with
            state support of the Technology Agency of the Czech Republic within the ÉTA Program.
        </p>

        <p class="pt-5 text-xs font-semibold text-gray-400 sm:hidden">
            This application is only intended for desktop use.
        </p>
    </div>
</template>

<style scoped>
input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}
</style>
