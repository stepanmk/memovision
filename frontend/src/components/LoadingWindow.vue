<script setup>
import { watch } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
    visible: Boolean,
    loadingMessage: String,
    progressBarPerc: Number,
})

</script>


<template>
    
    <div v-if="visible" class="w-[40rem] h-[20rem] bg-white rounded-md z-20 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 border flex flex-col gap-2 items-center justify-center">
        <Icon icon="eos-icons:loading" :inline="true" width="35"/>    
        <p>{{ loadingMessage }}</p>
        <div id="progress-bar-container" class="w-[32rem] h-2 mt-2 bg-neutral-400 rounded-md dark:bg-gray-100">
            <div id="progress-bar-main" class="bg-neutral-800 rounded-md h-full progress-bar dark:bg-gray-700"
            :style="{'width': `${progressBarPerc}%`}"></div>
        </div>
    </div>

</template>


<style scoped>

#progress-bar-main{
    width: 0%;
    transition: width 50ms linear;
}

</style>
