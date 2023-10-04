<script setup>
const props = defineProps({
    disabled: Boolean,
    btnText: String,
})

</script>

<template>
    <button class="btn btn-gray"
    :class="{'btn-disabled': disabled}">
        {{ btnText }}
    </button>
</template>