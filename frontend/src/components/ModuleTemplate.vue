<script setup>
const props = defineProps({
    moduleTitle: String,
    moduleIdentifier: String,
    visible: Boolean,
    isDisabled: Boolean,
});
</script>

<template>
    <div
        v-if="visible"
        :id="moduleIdentifier"
        class="z-5 relative flex h-full w-[calc(100%-10rem)] min-w-[60rem] max-w-[120rem] flex-col items-center rounded-md border bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Transition>
            <div
                v-if="isDisabled"
                class="absolute z-10 flex h-full w-full flex-col items-center justify-center rounded-md bg-neutral-500 bg-opacity-70">
                <slot name="window"></slot>
            </div>
        </Transition>
        <slot name="module-content"></slot>
    </div>
</template>

<style scoped>
.v-leave-active {
    transition: opacity 100ms ease;
    transition-delay: 100ms;
}
.v-leave-to {
    opacity: 0;
}
</style>
