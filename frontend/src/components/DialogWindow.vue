<script setup>
const props = defineProps({
    visible: Boolean,
    message: String,
});
</script>

<template>
    <div
        v-if="visible"
        class="z-20 flex h-[20rem] w-[40rem] flex-col items-center justify-center rounded-md border bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <div
            class="flex h-[3rem] w-full items-center justify-start rounded-t-md border-b px-5 text-sm dark:border-gray-700">
            <p>{{ message }}</p>
        </div>
        <slot name="dialog-content"></slot>

        <div class="flex h-[3rem] w-full items-center justify-between rounded-b-md px-5">
            <slot name="dialog-buttons"></slot>
        </div>
    </div>
</template>
