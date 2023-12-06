<script setup>
defineProps({
    idx: Number,
    featName: String,
});
</script>

<template>
    <div
        :id="`feat-${idx}`"
        :key="idx"
        class="flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md px-2 text-sm hover:bg-neutral-200 dark:hover:bg-gray-300">
        <p class="mr-5 flex h-full w-full items-center">
            {{ featName }}
        </p>
        <div class="flex h-full gap-2 rounded-md py-1 dark:bg-gray-400 dark:hover:bg-gray-700"></div>
    </div>
</template>
