<script setup>
defineProps({
    idx: Number,
    regionName: String,
    relevance: Number,
    absoluteRelevance: String,
});
</script>

<template>
    <div
        :id="`rel-measure-${idx}`"
        :key="idx"
        class="flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md px-2 text-sm hover:bg-neutral-200 dark:hover:bg-gray-300">
        <p class="mr-5 flex h-full w-full items-center">
            {{ regionName }}
        </p>
        <div class="flex h-full gap-2 rounded-md py-1">
            <p class="flex w-28 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                Relevance:
                {{ relevance.toFixed(2) }}
            </p>
            <p class="flex w-44 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                Absolute relevance:
                {{ Number(absoluteRelevance).toFixed(2) }}
            </p>
        </div>
    </div>
</template>
