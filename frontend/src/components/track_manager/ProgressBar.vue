<script setup>


const props = defineProps({
    id: Number,
    percentage: Number,
})

</script>

<template>

<div :id="`progress-bar-${props.id}`"
:style="{'width': `${props.percentage}%`}" 
class="bg-neutral-800 rounded-md h-full progress-bar dark:bg-gray-700"></div>

</template>


<style scoped>
.progress-bar{
    width: 0%;
    transition: width 0.1s linear;
}

</style>