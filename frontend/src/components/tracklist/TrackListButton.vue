<script setup>

import { Icon } from '@iconify/vue';


const props = defineProps(
    {
        name: String,
        iconType: String,
        expanded: Boolean,
        active: Boolean,
        enabled: Boolean
    }
)

</script>

<template>
    <Transition>
    <div class="duration-100 h-10 transition
    bg-neutral-200 rounded-md 
    hover:bg-cyan-600 
    hover:text-white select-none cursor-pointer
    flex"
    :class="{'text-white bg-cyan-700': props.active,
            'btn-disabled cursor-default hover:bg-neutral-200 hover:text-neutral-400': !props.enabled}">
        <div class="w-10 h-full flex items-center justify-center">
            <Icon :icon=props.iconType width="20" :inline="true"/>
        </div>
        <div class="h-full items-center flex rounded-r-md justify-left font-semibold whitespace-nowrap text-sm pr-5">
            {{props.name}}
        </div>
    </div>
    </Transition>
</template>

<style scoped>
/* we will explain what these classes do next! */
.v-enter-active{
    transition: opacity 100ms;
}
.v-leave-active {
    transition: opacity 50ms;
}

.v-enter-from{
    opacity: 0;
}

.v-leave-to {
    opacity: 0;
}

</style>