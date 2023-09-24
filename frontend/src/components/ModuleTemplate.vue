<script setup>


const props = defineProps({
    moduleTitle: String,
    moduleIdentifier: String,
    visible: Boolean,
    isDisabled: Boolean,
})
</script>


<template>

    <div v-if="visible" :id="moduleIdentifier" class="relative w-[calc(100%-10rem)] max-w-[120rem] min-w-[60rem] h-full flex flex-col items-center bg-white border z-5 rounded-md 
    dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">

        <!-- <div class="h-[3rem] w-full border-b flex justify-between items-center pl-7 pr-7 dark:border-gray-700">
            <p class="text-sm select-none font-semibold">{{ moduleTitle }}</p>
        </div> -->

        <Transition>
            <div v-if="isDisabled" class=" absolute h-full w-full flex flex-col items-center justify-center z-10 bg-neutral-500 bg-opacity-70 rounded-md">
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