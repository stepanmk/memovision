<script setup>
import { Icon } from '@iconify/vue';
import { useMenuButtonsDisable } from '../../globalStores';
import { pinia } from '../../piniaInstance';

const menuButtonsDisable = useMenuButtonsDisable(pinia);

const props = defineProps({
    active: Boolean,
    disabled: Boolean,
    iconType: String,
    name: String,
    width: String,
});
</script>

<template>
    <div class="z-50 flex h-12 w-12 cursor-pointer select-none flex-row items-start rounded-md">
        <div
            class="btn btn-gray flex h-full w-[3rem] items-center justify-center rounded-md"
            :class="{
                'btn-disabled': !props.disabled,
                'bg-cyan-700 text-white dark:bg-cyan-700 dark:text-white': active,
            }">
            <Icon
                v-if="menuButtonsDisable.isLoading && props.disabled"
                icon="eos-icons:loading"
                :width="props.width"
                :inline="true" />
            <Icon v-else :icon="props.iconType" :width="props.width" :inline="true" />
        </div>
    </div>
</template>
