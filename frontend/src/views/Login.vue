<script setup>
import LoginForm from '../components/LoginForm.vue';
</script>

<template>
    <div class="bg-main-bg min-h-screen bg-cover">
        <div
            id="login-container"
            class="flex h-[calc(100vh)] flex-col items-center justify-center bg-gray-700 bg-opacity-50 backdrop-blur">
            <LoginForm />
        </div>
    </div>
</template>
