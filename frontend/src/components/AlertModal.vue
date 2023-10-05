<script setup>
import { Icon } from '@iconify/vue';
import { useAlertState } from '../globalStores';

const alertState = useAlertState();
</script>

<template>
    <Transition name="fade">
        <div
            v-if="alertState.show"
            id="alert-container"
            class="absolute top-0 z-50 ml-[25%] flex h-16 w-[50%] items-center justify-center">
            <div
                id="alert-modal"
                class="flex h-8 items-center justify-center gap-2 rounded-md bg-neutral-800 py-1 px-4 text-sm font-semibold text-white dark:bg-gray-400 dark:text-gray-900">
                <Icon
                    icon="ion:alert-circle-outline"
                    :inline="true"
                    width="20" />
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
