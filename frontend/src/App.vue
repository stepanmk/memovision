<script setup>
import AlertModal from './components/AlertModal.vue';
</script>

<template>

<router-view/>

<AlertModal/>

</template>

<style>

/* width */
::-webkit-scrollbar {
    width: 5px;
    height: 5px;
    border-radius: 10px;
}
 
/* Handle */
::-webkit-scrollbar-thumb {
    background: rgb(200, 200, 200);
    border-radius: 10px; 
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
    background: rgb(100, 100, 100);; 
    border-radius: 10px; 
}

html, body {
    overflow-x: hidden;
}

</style>
