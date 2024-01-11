<script setup>
import RegisterForm from '../components/RegisterForm.vue';
</script>

<template>
    <div class="bg-main-bg min-h-screen bg-cover">
        <div
            id="login-container"
            class="flex h-[calc(100vh)] items-center justify-center bg-black bg-opacity-25 backdrop-blur-md">
            <RegisterForm />
        </div>
    </div>
</template>
