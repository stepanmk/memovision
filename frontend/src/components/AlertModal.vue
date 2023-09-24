<script setup>

import { Icon } from '@iconify/vue';
import { useAlertState } from '../globalStores';


const alertState = useAlertState();

</script>

<template>

<Transition name="fade">
    <div v-if="alertState.show" id="alert-container" class="h-16 top-0 absolute flex justify-center items-center w-[50%] ml-[25%] z-50">
        <div id="alert-modal" class=" h-8 flex justify-center items-center gap-2 text-white font-semibold bg-neutral-800 py-1 px-4 rounded-md text-sm 
        dark:bg-gray-400 dark:text-gray-900">
            <Icon icon="ion:alert-circle-outline" :inline="true" width="20"/> 
            <p>{{ alertState.message }}</p>
        </div>
    </div>
</Transition>

</template>

<style scoped>

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

</style>