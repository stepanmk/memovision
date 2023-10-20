<script setup>
import { onClickOutside } from '@vueuse/core';
import { ref } from 'vue';
defineProps({
    name: String,
});
const entriesVisible = ref(false);
const clickOutsideRef = ref(null);
onClickOutside(clickOutsideRef, () => {
    entriesVisible.value = false;
});
</script>

<template>
    <div class="relative z-[15] text-sm" ref="clickOutsideRef">
        <button class="btn btn-gray" @click="entriesVisible = !entriesVisible">{{ name }}</button>
        <div
            v-if="entriesVisible"
            class="absolute mt-1 flex flex-col whitespace-nowrap rounded-md border bg-white p-1"
            @click="entriesVisible = false">
            <slot></slot>
        </div>
    </div>
</template>
