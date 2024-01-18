<script setup>
import RegisterForm from '../components/RegisterForm.vue';
</script>

<template>
    <div class="bg-main-bg min-h-screen bg-cover">
        <div
            id="register-container"
            class="flex h-[calc(100vh)] items-center justify-center bg-gray-700 bg-opacity-50 backdrop-blur">
            <RegisterForm />
        </div>
    </div>
</template>
