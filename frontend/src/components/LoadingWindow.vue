<script setup>
import { Icon } from '@iconify/vue';

const props = defineProps({
    visible: Boolean,
    loadingMessage: String,
    progressBarPerc: Number,
});
</script>

<template>
    <div
        v-if="visible"
        class="z-20 flex h-[20rem] w-[40rem] flex-col items-center justify-center gap-2 rounded-md border bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Icon icon="eos-icons:loading" :inline="true" width="35" />
        <p>{{ loadingMessage }}</p>
        <div
            id="progress-bar-container"
            class="mt-2 h-2 w-[32rem] rounded-md bg-neutral-400 dark:bg-gray-100">
            <div
                id="progress-bar-main"
                class="progress-bar h-full rounded-md bg-neutral-800 dark:bg-gray-700"
                :style="{ width: `${progressBarPerc}%` }"></div>
        </div>
    </div>
</template>

<style scoped>
#progress-bar-main {
    width: 0%;
    transition: width 50ms linear;
}
</style>
