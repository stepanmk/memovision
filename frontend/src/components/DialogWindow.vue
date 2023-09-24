<script setup>
import { Icon } from '@iconify/vue';

const props = defineProps({
    visible: Boolean,
    message: String,
})

</script>


<template>

    <div v-if="visible" class="w-[40rem] h-[20rem] border flex flex-col items-center justify-center bg-white rounded-md z-20 
    dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
        <div class="w-full h-[3rem] flex items-center justify-start rounded-t-md px-5 border-b text-sm dark:border-gray-700 ">
            <p>{{ message }}</p>
        </div>
        <slot name="dialog-content"></slot> 
        
        <div class="w-full h-[3rem] flex items-center justify-between rounded-b-md px-5">
            <slot name="dialog-buttons"></slot>
        </div>
    </div>

</template>


<style scoped>


</style>
