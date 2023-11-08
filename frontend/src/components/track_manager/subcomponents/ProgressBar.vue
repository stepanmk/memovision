<script setup>
const props = defineProps({
    id: Number,
    percentage: Number,
});
</script>

<template>
    <div
        :id="`progress-bar-${props.id}`"
        :style="{ width: `${props.percentage}%` }"
        class="progress-bar h-full rounded-md bg-neutral-800 dark:bg-gray-700"></div>
</template>

<style scoped>
.progress-bar {
    width: 0%;
    transition: width 0.1s linear;
}
</style>
