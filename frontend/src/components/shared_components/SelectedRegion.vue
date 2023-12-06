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
        class="flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md px-2 text-sm hover:bg-neutral-400 dark:hover:bg-gray-300">
        <p class="mr-5 flex h-full w-full items-center">
            {{ regionName }}
        </p>
        <div class="flex h-full gap-2 rounded-md py-1">
            <!-- <div class="flex flex-row gap-2">
                <p class="flex h-full items-center">Reference:</p>
                <p class="flex w-20 select-none items-center justify-center rounded-md bg-green-500 text-xs text-white">
                    {{ startTime }}
                </p>
                <p class="flex w-20 select-none items-center justify-center rounded-md bg-red-500 text-xs text-white">
                    {{ endTime }}
                </p>
            </div> -->
            <p class="flex w-28 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                Measures
                {{ startMeasure }}–{{ endMeasure }}
            </p>
        </div>
    </div>
</template>
