<script setup>
import { Icon } from '@iconify/vue';
import { ref } from 'vue';

const props = defineProps({
    name: String,
    iconType: String,
    active: Boolean,
    width: String,
});

let mouseIsOver = ref(false);
let nameIsVisible = ref(false);
let globalTimer;

function mouseOver() {
    clearTimeout(globalTimer);
    globalTimer = setTimeout(() => {
        nameIsVisible.value = true;
    }, 50);
    mouseIsOver.value = true;
}

function mouseLeave() {
    nameIsVisible.value = false;
    clearTimeout(globalTimer);
    globalTimer = setTimeout(() => {
        mouseIsOver.value = false;
    }, 50);
}
</script>

<template>
    <div
        class="button-container z-50 flex h-12 cursor-pointer select-none flex-row items-start rounded-md bg-neutral-200 transition duration-100 hover:bg-cyan-600 hover:text-white dark:bg-gray-400 dark:text-gray-900 dark:hover:bg-cyan-600 dark:hover:text-white"
        :class="{
            'bg-cyan-700 text-white dark:bg-cyan-700 dark:text-white': props.active,
        }"
        v-on:mouseover="mouseOver()"
        v-on:mouseleave="mouseLeave()">
        <div class="flex h-full w-[3rem] items-center justify-center">
            <Icon :icon="props.iconType" :width="props.width" :inline="true" />
        </div>

        <!-- <Transition>
            <p
                v-if="nameIsVisible"
                class="flex h-full w-[calc(100%-3rem)] items-center justify-center whitespace-nowrap rounded-r-md pr-4 text-sm font-semibold">
                {{ props.name }}
            </p>
        </Transition> -->
    </div>
</template>

<style scoped>
.v-enter-active {
    transition: opacity 100ms;
    transition-property: opacity;
}
.v-leave-active {
    transition: opacity 50ms;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}

.button-container {
    transition: width 100ms linear;
}
</style>
