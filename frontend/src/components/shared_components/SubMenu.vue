<script setup>
import { onClickOutside } from '@vueuse/core';
import { ref } from 'vue';
defineProps({
    name: String,
    numEntries: Number,
});
const entriesVisible = ref(false);
const clickOutsideRef = ref(null);
onClickOutside(clickOutsideRef, () => {
    entriesVisible.value = false;
});
</script>

<template>
    <div class="relative z-[15] text-sm" ref="clickOutsideRef">
        <button
            class="btn btn-gray"
            :class="{ 'btn-disabled': !(numEntries > 0) }"
            @click="if (numEntries > 0) entriesVisible = !entriesVisible;">
            {{ name }}
        </button>
        <div
            v-if="entriesVisible"
            class="absolute mt-1 flex flex-col whitespace-nowrap rounded-md border bg-white p-1 dark:border-gray-700 dark:bg-gray-400 dark:text-gray-900"
            @click="entriesVisible = false">
            <slot></slot>
        </div>
    </div>
</template>
