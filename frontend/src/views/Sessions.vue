<script setup>
import SessionSelector from '../components/SessionSelector.vue';
</script>

<template>
    <div class="bg-main-bg min-h-screen bg-cover">
        <div
            id="session-selector-container"
            class="flex h-[calc(100vh)] items-center justify-center bg-gray-700 bg-opacity-50 backdrop-blur">
            <SessionSelector />
        </div>
    </div>
</template>
