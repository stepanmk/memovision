<script setup>
defineProps({
    trackCount: Number,
});
</script>

<template>
    <div
        class="flex h-[1.75rem] w-full select-none items-center justify-between gap-3 border-b px-7 text-sm dark:border-gray-700">
        <div class="flex items-center justify-start gap-3">
            <div class="flex flex-row items-center justify-center gap-1">
                <div class="h-2 w-2 rounded-full bg-violet-800"></div>
                <p>Reference track</p>
            </div>
            <div class="flex flex-row items-center justify-center gap-1">
                <div class="h-2 w-2 rounded-full bg-green-600"></div>
                <p>Annotated measures</p>
            </div>
            <div class="flex flex-row items-center justify-center gap-1">
                <div class="h-2 w-2 rounded-full bg-orange-400"></div>
                <p>Transferred measures</p>
            </div>
            <div class="flex flex-row items-center justify-center gap-1">
                <div class="h-2 w-2 rounded-full bg-red-600"></div>
                <p>Structural differences</p>
            </div>
        </div>
        <div class="flex flex-row items-center justify-center gap-1">
            <p>Track count:</p>
            <p class="font-semibold">
                {{ trackCount }}
            </p>
        </div>
    </div>
</template>
