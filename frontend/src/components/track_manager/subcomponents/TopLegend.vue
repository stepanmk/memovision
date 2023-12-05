<script setup></script>

<template>
    <div class="items-left flex h-[1.75rem] w-full flex-row overflow-y-scroll border-b px-5 dark:border-gray-700">
        <div class="flex h-full w-full justify-between pl-2 pr-2">
            <div class="flex h-full w-[calc(100%-22.5rem)] flex-row items-center justify-between">
                <p class="pr1 flex w-32 items-center pl-1 text-sm">Track name</p>
                <div class="flex h-full items-center justify-between gap-2">
                    <p class="flex h-5 w-16 flex-row items-center justify-center text-sm">Tuning</p>
                    <p class="flex h-5 w-16 flex-row items-center justify-center text-sm">Duration</p>
                    <p class="flex h-5 w-16 flex-row items-center justify-center text-sm">Sync</p>
                </div>
            </div>
            <div class="flex flex-row items-center gap-2 text-sm">
                <p class="flex w-16 justify-center">Year</p>
                <p class="flex w-32 justify-center">Performer</p>
                <p class="flex w-28 justify-center"></p>
                <p class="flex w-[1.5rem] justify-center"></p>
            </div>
        </div>
    </div>
</template>
