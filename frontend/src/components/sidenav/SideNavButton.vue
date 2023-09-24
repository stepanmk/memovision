<script setup>
import { Icon } from '@iconify/vue';
import { ref } from 'vue';


const props = defineProps(
    {
        name: String,
        iconType: String,
        active: Boolean,
        width: String,
    }
)

let mouseIsOver = ref(false);
let nameIsVisible = ref(false);
let globalTimer;

function mouseOver()
{
    clearTimeout(globalTimer);
    globalTimer = setTimeout(() => {nameIsVisible.value = true}, 50);
    mouseIsOver.value = true;
}

function mouseLeave()
{
    nameIsVisible.value = false;
    clearTimeout(globalTimer);
    globalTimer = setTimeout(() => {mouseIsOver.value = false}, 50);
}

</script>


<template>

    <div class="button-container h-12 flex items-start flex-row transition bg-neutral-200 hover:bg-cyan-600 duration-100 hover:text-white z-50
    select-none cursor-pointer rounded-md dark:bg-gray-400 dark:hover:bg-cyan-600 dark:text-gray-900 dark:hover:text-white"
    :class="{'text-white bg-cyan-700 dark:bg-cyan-700 dark:text-white': props.active,
    'w-12': !mouseIsOver,
    'w-52': mouseIsOver}"
    v-on:mouseover="mouseOver()"
    v-on:mouseleave="mouseLeave()">
        
        <div class="w-[3rem] h-full flex items-center justify-center">
            <Icon :icon=props.iconType :width=props.width :inline="true"/>
        </div>
        
        <Transition>
            <p v-if="nameIsVisible" class="w-[calc(100%-3rem)] h-full pr-4 items-center flex rounded-r-md justify-center font-semibold whitespace-nowrap text-sm">{{props.name}}</p>
        </Transition>
    </div>

</template>


<style scoped>
.v-enter-active{
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

.button-container{
    transition: width 100ms linear;
}

</style>