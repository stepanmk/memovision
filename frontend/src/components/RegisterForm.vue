<script setup>

import router from '../router.js'

import { reactive, computed } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, email, minLength, sameAs } from '@vuelidate/validators'
import { useI18n } from 'vue-i18n'

import { api } from '../axiosInstance'
import { showAlert } from '../alerts'


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
        email: {required, email},
        username: { required, lengthCheck: minLength(3) },
        password: { required, lengthCheck: minLength(6), passwordMatch: sameAs(formData.passwordRepeat)},
        passwordRepeat: { required, lengthCheck: minLength(6), passwordMatch: sameAs(formData.password)}
    }
});

const v$ = useVuelidate(rules, formData);

// user register function
function registerUser(data)
{
    api.post('/register', data)
    .then(function (response) {
        if (response.data.message === 'registration successful') {
            // if the register was successful, redirect user to login page
            router.push('/signin');
            showAlert(t('register.registersuccess'), 1500);
        }
        if (response.data.message === 'email already exists') {
            showAlert(t('alert.emailexists'), 1500)
        }
        if (response.data.message === 'username already exists') {
            showAlert(t('alert.usernameexists'), 1500);
        }
    })
    .catch(function (error) {
        // handle register error
        showAlert(error.message + '.', 1500);
    });
};

</script>


<template>

<p class="pb-10 font-bold text-transparent text-8xl bg-clip-text bg-gradient-to-r from-green-400 to-blue-700 select-none">MemoVision</p>

<form class="w-full px-25 py-5 flex flex-col items-center justify-center bg-neutral-700 bg-opacity-50 text-white backdrop-blur-sm" id="register-form" @submit.prevent="submit">

    <span class="mb-5 text-3xl ">{{t('form.register')}}</span>
    <input v-model="v$.email.$model" type="email" class="input-field-nomargin border-2" :placeholder="t('form.email')"
    :class="{'border-green-400 transition duration-500': !v$.email.$invalid,
             'border-2 border-gray-300': v$.email.$invalid}"
              autocomplete="email"/>

    <div class="h-5 text-xs text-white mb-1 mt-1">
        <div v-if="v$.email.$error">
            <span v-if="v$.email.$errors[0].$validator === 'email'">
                {{t('register.emailbadformat')}}
            </span>
        </div>
    </div>
    
    <input v-model="v$.username.$model" type="text" class="input-field-nomargin border-2" :placeholder="t('form.username')"
    :class="{'border-green-400 transition duration-500': !v$.username.$invalid,
             'border-2 border-gray-300': v$.username.$invalid}"
              autocomplete="username"/>
    
    <div class="h-5 text-xs text-white mb-1 mt-1">
        <div v-if="v$.username.$error">
            <span v-if="v$.username.$errors[0].$validator === 'lengthCheck'">
                {{t('register.usernametooshort')}}
            </span>
        </div>
    </div>
    
    <input v-model="v$.password.$model" type="password" class="input-field-nomargin border-2" :placeholder="t('form.pswd')"
    :class="{'border-green-400 transition duration-500': !v$.password.$invalid,
             'border-2 border-gray-300': v$.password.$invalid}"
              autocomplete="new-password"/>

    <div class="h-5 text-xs text-white mb-1 mt-1">
        <div v-if="v$.password.$error">
            <span v-if="v$.password.$errors[0].$validator === 'lengthCheck'">
                {{t('register.pswdtooshort')}}
            </span>
            <span v-if="v$.password.$errors[0].$validator === 'passwordMatch'">
                {{t('register.pswdnomatch')}}
            </span>
        </div>
    </div>
    
    <input v-model="v$.passwordRepeat.$model" type="password" class="input-field-nomargin border-2" :placeholder="t('form.pswdagain')" 
    :class="{'border-green-400 transition duration-500': !v$.passwordRepeat.$invalid,
             'border-2 border-gray-300': v$.passwordRepeat.$invalid}"
              autocomplete="new-password"/>

    <div class="h-5 text-xs text-white mb-1 mt-1">
        <div v-if="v$.passwordRepeat.$error">
            <span v-if="v$.passwordRepeat.$errors[0].$validator === 'lengthCheck'">
                {{t('register.pswdtooshort')}}
            </span>
            <span v-if="v$.passwordRepeat.$errors[0].$validator === 'passwordMatch'">
                {{t('register.pswdnomatch')}}
            </span>
        </div>
    </div>

    <div v-if="!v$.email.$invalid && !v$.username.$invalid && !v$.password.$invalid && !v$.passwordRepeat.$invalid">
        <button type="submit" @click="registerUser(formData)" class="btn btn-blue text-base font-semibold h-8">{{t('button.signup')}}</button>
    </div>

    <div v-else>
        <button type="button" class="btn btn-disabled text-base font-semibold h-8">{{t('button.signup')}}</button>
    </div>

    <div class="flex flex-row gap-1 mt-5 font-semibold text-white"> 
        <p>{{t('register.alreadyregistered')}}</p>
        <router-link :to="{name: 'Login'}" class="text-green-400 hover:text-white">{{t('register.gologin')}}</router-link>
    </div>

</form>

</template>


<style scoped>

input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}

</style>