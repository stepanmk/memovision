<script setup>

import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';


const { t, locale } = useI18n();

</script>


<template>

<div id="lang-switch" class="text-light-50 m-3 mt-4 h-10 pl-1 pr-1 bg-neutral-700 bg-opacity-50 backdrop-blur-sm rounded-md z-30 flex">
    
    <input type="radio" id="one" class="hidden" value="en" v-model="locale" />
    
    <label for="one">
        <Icon icon="twemoji:flag-united-kingdom" :inline="true" width="25" class="m-2 cursor-pointer hover:opacity-70 transition"/>
    </label>
    
    <input type="radio" id="two" class="hidden" value="cz" v-model="locale" />
    
    <label for="two">
        <Icon icon="twemoji:flag-czechia" :inline="true" width="25" class="m-2 cursor-pointer hover:opacity-70 transition"/>
    </label>

</div>

</template>