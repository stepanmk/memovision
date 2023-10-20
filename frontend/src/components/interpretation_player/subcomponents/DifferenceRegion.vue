<script setup>
defineProps({
    idx: Number,
    regionName: String,
    startTime: String,
    endTime: String,
    startTimeTarget: String,
    endTimeTarget: String,
});
</script>

<template>
    <div
        :id="`diff-region-${idx}`"
        :key="idx"
        class="flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md px-2 text-sm hover:bg-neutral-200">
        <p class="mr-5 flex h-full w-full items-center">
            {{ regionName }}
        </p>
        <div class="flex h-full gap-2 rounded-md py-1 dark:bg-gray-400 dark:hover:bg-gray-700">
            <div class="flex flex-row gap-2">
                <p class="flex h-full items-center">Reference:</p>
                <p class="flex w-20 select-none items-center justify-center rounded-md bg-green-500 text-xs text-white">
                    {{ startTime }}
                </p>
                <p class="flex w-20 select-none items-center justify-center rounded-md bg-red-500 text-xs text-white">
                    {{ endTime }}
                </p>
                <p>Target:</p>
                <p class="flex w-20 select-none items-center justify-center rounded-md bg-green-500 text-xs text-white">
                    {{ startTimeTarget }}
                </p>
                <p class="flex w-20 select-none items-center justify-center rounded-md bg-red-500 text-xs text-white">
                    {{ endTimeTarget }}
                </p>
            </div>
        </div>
    </div>
</template>
