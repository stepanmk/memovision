<script setup>
defineProps({
    idx: Number,
    regionName: String,
    startMeasure: Number,
    endMeasure: Number,
});
</script>

<template>
    <div
        :id="`region-${idx}`"
        :key="idx"
        class="flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md px-2 text-sm hover:bg-neutral-300 dark:hover:bg-gray-300">
        <p class="mr-5 flex h-full w-full items-center">
            {{ regionName }}
        </p>
        <div class="flex h-full gap-2 rounded-md py-1">
            <p class="flex w-28 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                Measures
                {{ startMeasure }}–{{ endMeasure }}
            </p>
        </div>
    </div>
</template>
