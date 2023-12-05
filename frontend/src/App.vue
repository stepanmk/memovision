<script setup>
import AlertModal from './components/AlertModal.vue';
</script>

<template>
    <router-view />
    <AlertModal />
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
    background: rgb(100, 100, 100);
    border-radius: 10px;
}

input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
}

input[type='range']:focus {
    outline: none;
}

input[type='range']::-webkit-slider-runnable-track {
    background-color: #10b981;
    border-radius: 0.5rem;
    height: 0.5rem;
}

input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    margin-top: -0.25rem;
    border-radius: 0.5rem;
    background-color: #065f46;
    height: 1rem;
    width: 1rem;
}

/* firefox */
input[type='range']::-moz-range-track {
    background-color: #a5f3fc;
    margin-top: -0.25rem;
    border-radius: 0.5rem;
    height: 0.5rem;
}

input[type='range']::-moz-range-thumb {
    border: none;
    border-radius: 0.5rem;
    background-color: #22d3ee;
    height: 1rem;
    width: 1rem;
}

html,
body {
    overflow-x: hidden;
    font-family: 'Inter', sans-serif;
}
</style>
