<script setup>
import { Icon } from '@iconify/vue';
import { computed, onMounted, ref, Teleport } from 'vue';
import { api } from '../axiosInstance';
import router from '../router';
import { getSecureConfig } from '../sharedFunctions';

const isLoading = ref(false);
const loadingMessage = ref('');

const users = ref([]);
const searchQuery = ref('');

const storage = ref({
    disk: {
        path: '',
        total_mb: 0,
        used_mb: 0,
        free_mb: 0,
        total_gb: 0,
        used_gb: 0,
        free_gb: 0,
    },
    user_quota_total_mb: 0,
    user_occupied_total_mb: 0,
    user_quota_remaining_mb: 0,
});

const createDialogVisible = ref(false);
const newUsername = ref('');
const newEmail = ref('');
const newAvailableSpace = ref(512);

const passwordDialogVisible = ref(false);
const passwordDialogUsername = ref('');
const passwordDialogPassword = ref('');

const deleteDialogVisible = ref(false);
const userToDelete = ref(null);

const savingUserIds = ref(new Set());

function normalizeEmail(email) {
    if (email === null || email === undefined) return null;
    const trimmed = String(email).trim();
    return trimmed === '' ? null : trimmed;
}

function goHome() {
    router.push('/');
}

function formatMb(value) {
    return `${Number(value || 0).toLocaleString(undefined, {
        maximumFractionDigits: 0,
    })} MB`;
}

function formatGb(value) {
    return `${Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })} GB`;
}

const filteredUsers = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return users.value;

    return users.value.filter((user) => {
        const username = String(user.username || '').toLowerCase();
        const email = String(user.email || '').toLowerCase();
        return username.includes(q) || email.includes(q);
    });
});

const adminUsers = computed(() => filteredUsers.value.filter((user) => user.is_admin));
const regularUsers = computed(() => filteredUsers.value.filter((user) => !user.is_admin));

const userCount = computed(() => users.value.length);
const adminCount = computed(() => users.value.filter((user) => user.is_admin).length);
const regularCount = computed(() => users.value.filter((user) => !user.is_admin).length);

function isSaving(userId) {
    return savingUserIds.value.has(userId);
}

function markSaving(userId, saving) {
    const next = new Set(savingUserIds.value);
    if (saving) next.add(userId);
    else next.delete(userId);
    savingUserIds.value = next;
}

function openCreateDialog() {
    newUsername.value = '';
    newEmail.value = '';
    newAvailableSpace.value = 512;
    createDialogVisible.value = true;
}

function closeCreateDialog() {
    createDialogVisible.value = false;
}

function closeDeleteDialog() {
    deleteDialogVisible.value = false;
    userToDelete.value = null;
}

function startBusy(message) {
    loadingMessage.value = message;
    isLoading.value = true;
}

function stopBusy() {
    isLoading.value = false;
    loadingMessage.value = '';
}

async function fetchUsers() {
    startBusy('Loading users...');

    try {
        const res = await api.get('/admin/users', getSecureConfig());
        users.value = res.data.users || [];
        storage.value = res.data.storage || storage.value;
    } catch (error) {
        console.error(error);
        alert(error?.response?.data?.message || 'Failed to load users');
    } finally {
        stopBusy();
    }
}

async function createUser() {
    if (!newUsername.value.trim()) {
        alert('Username is required');
        return;
    }

    startBusy('Creating user...');

    try {
        const res = await api.post(
            '/admin/users',
            {
                username: newUsername.value.trim(),
                email: normalizeEmail(newEmail.value),
                available_space: newAvailableSpace.value,
                is_admin: false,
            },
            getSecureConfig()
        );

        passwordDialogUsername.value = res.data.user.username;
        passwordDialogPassword.value = res.data.password;

        createDialogVisible.value = false;
        passwordDialogVisible.value = true;

        await fetchUsers();
    } catch (error) {
        console.error(error);
        alert(error?.response?.data?.message || 'Failed to create user');
        stopBusy();
    }
}

async function saveUser(user) {
    markSaving(user.id, true);

    try {
        const res = await api.patch(
            `/admin/users/${user.id}`,
            {
                username: user.username?.trim(),
                email: normalizeEmail(user.email),
                available_space: Number(user.available_space || 0),
            },
            getSecureConfig()
        );

        const updated = res.data.user;
        const index = users.value.findIndex((u) => u.id === updated.id);
        if (index !== -1) {
            users.value[index] = { ...updated };
        }

        await fetchUsers();
    } catch (error) {
        console.error(error);
        alert(error?.response?.data?.message || 'Failed to update user');
        await fetchUsers();
    } finally {
        markSaving(user.id, false);
    }
}

async function resetPassword(user) {
    startBusy(`Resetting password for ${user.username}...`);

    try {
        const res = await api.post(
            `/admin/users/${user.id}/reset-password`,
            {},
            getSecureConfig()
        );
        passwordDialogUsername.value = res.data.username;
        passwordDialogPassword.value = res.data.password;
        passwordDialogVisible.value = true;
    } catch (error) {
        console.error(error);
        alert(error?.response?.data?.message || 'Failed to reset password');
    } finally {
        stopBusy();
    }
}

function askDeleteUser(user) {
    userToDelete.value = user;
    deleteDialogVisible.value = true;
}

async function deleteUser() {
    if (!userToDelete.value) return;

    startBusy(`Deleting ${userToDelete.value.username}...`);

    try {
        await api.delete(`/admin/users/${userToDelete.value.id}`, getSecureConfig());
        closeDeleteDialog();
        await fetchUsers();
    } catch (error) {
        console.error(error);
        alert(error?.response?.data?.message || 'Failed to delete user');
        stopBusy();
    }
}

async function copyPassword() {
    try {
        await navigator.clipboard.writeText(passwordDialogPassword.value);
    } catch (error) {
        console.error(error);
        alert('Failed to copy password');
    }
}

onMounted(() => {
    fetchUsers();
});
</script>

<template>
    <div class="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <!-- LOADING -->
        <Teleport to="body">
            <div v-if="isLoading"
                class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
                <div
                    class="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div class="flex items-center gap-3">
                        <div
                            class="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-sky-600 dark:border-slate-700 dark:border-t-sky-400">
                        </div>
                        <div>
                            <h3 class="text-base font-semibold">Please wait</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400">
                                {{ loadingMessage }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- CREATE MODAL -->
        <Teleport to="body">
            <div v-if="createDialogVisible"
                class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm"
                @click.self="closeCreateDialog()">
                <div
                    class="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div
                        class="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                        <div>
                            <h3 class="text-lg font-semibold">Create new user</h3>
                            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                New users created here are always regular users.
                            </p>
                        </div>
                        <button
                            class="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            @click="closeCreateDialog()">
                            <Icon icon="mdi:close" width="18" />
                        </button>
                    </div>

                    <div class="grid grid-cols-1 gap-4 px-6 py-6 md:grid-cols-3">
                        <div>
                            <label class="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                                Username
                            </label>
                            <input v-model="newUsername" type="text"
                                class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-500" />
                        </div>

                        <div>
                            <label class="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                                Email
                            </label>
                            <input v-model="newEmail" type="text"
                                class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-500" />
                        </div>

                        <div>
                            <label class="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                                Available space (MB)
                            </label>
                            <input v-model.number="newAvailableSpace" type="number" min="0"
                                class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-500" />
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-800">
                        <button
                            class="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            @click="closeCreateDialog()">
                            Cancel
                        </button>
                        <button
                            class="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                            @click="createUser()">
                            Create user
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- PASSWORD MODAL -->
        <Teleport to="body">
            <div v-if="passwordDialogVisible"
                class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm"
                @click.self="passwordDialogVisible = false">
                <div
                    class="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                        <h3 class="text-lg font-semibold">Generated password</h3>
                    </div>

                    <div class="px-6 py-6">
                        <div class="mb-4 text-sm text-slate-600 dark:text-slate-300">
                            User:
                            <span class="font-semibold">{{ passwordDialogUsername }}</span>
                        </div>

                        <div
                            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-sm dark:border-slate-700 dark:bg-slate-950">
                            {{ passwordDialogPassword }}
                        </div>

                        <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
                            Copy this password and send it to the user.
                        </p>
                    </div>

                    <div class="flex justify-end gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-800">
                        <button
                            class="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
                            @click="copyPassword()">
                            Copy password
                        </button>
                        <button
                            class="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            @click="passwordDialogVisible = false">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- DELETE MODAL -->
        <Teleport to="body">
            <div v-if="deleteDialogVisible"
                class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm"
                @click.self="closeDeleteDialog()">
                <div
                    class="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                        <h3 class="text-lg font-semibold">Delete user</h3>
                    </div>

                    <div class="px-6 py-6">
                        <p class="text-sm text-slate-600 dark:text-slate-300">
                            Are you sure you want to delete
                            <span class="font-semibold">{{ userToDelete?.username }}</span>?
                        </p>
                    </div>

                    <div class="flex justify-end gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-800">
                        <button
                            class="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            @click="closeDeleteDialog()">
                            Cancel
                        </button>
                        <button
                            class="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
                            @click="deleteUser()">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <div class="flex min-h-screen flex-col">
            <!-- TOP BAR -->
            <header
                class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                <div class="mx-auto max-w-[1400px] px-4 py-4 md:px-6">
                    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div class="flex items-center gap-3">
                            <button @click="goHome"
                                class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
                                <Icon icon="mdi:arrow-left" width="18" />
                                Back to app
                            </button>

                            <div>
                                <h1 class="text-2xl font-bold tracking-tight">User administration</h1>
                            </div>
                        </div>

                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div class="relative min-w-[280px]">
                                <Icon icon="mdi:magnify" width="18"
                                    class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input v-model="searchQuery" type="text" placeholder="Search users..."
                                    class="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500" />
                            </div>

                            <button @click="openCreateDialog()"
                                class="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">
                                <Icon icon="mdi:plus" width="18" />
                                Create user
                            </button>
                        </div>
                    </div>

                    <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div
                            class="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                            <div class="text-sm font-semibold">Remaining disk space</div>
                            <div class="mt-2 text-2xl font-bold">{{ formatGb(storage.disk.free_gb) }}</div>
                        </div>

                        <div
                            class="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                            <div class="text-sm font-semibold">Assigned quota</div>
                            <div class="mt-2 text-2xl font-bold">{{ formatMb(storage.user_quota_total_mb) }}</div>

                        </div>

                        <div
                            class="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                            <div class="text-sm font-semibold">Occupied overall</div>
                            <div class="mt-2 text-2xl font-bold">{{ formatMb(storage.user_occupied_total_mb) }}</div>

                        </div>
                    </div>

                    <div class="mt-4 flex flex-wrap gap-2 text-sm">
                        <div
                            class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                            Total users: <span class="font-semibold">{{ userCount }}</span>
                        </div>
                        <div
                            class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                            Admins: <span class="font-semibold">{{ adminCount }}</span>
                        </div>
                        <div
                            class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                            Regular users: <span class="font-semibold">{{ regularCount }}</span>
                        </div>
                    </div>
                </div>
            </header>

            <!-- CONTENT -->
            <main class="flex-1 px-4 py-4 md:px-6">
                <div class="mx-auto flex max-w-[1400px] flex-col gap-4">
                    <!-- ADMINS -->
                    <section
                        class="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                        <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h2 class="text-lg font-semibold">Admins</h2>
                                </div>
                                <div
                                    class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
                                    {{ adminUsers.length }}
                                </div>
                            </div>
                        </div>

                        <div class="overflow-x-auto p-4">
                            <div class="min-w-[1040px]">
                                <div
                                    class="grid grid-cols-[180px_1fr_130px_130px_130px_180px] gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                    <div>Username</div>
                                    <div>Email</div>
                                    <div>Quota</div>
                                    <div>Used</div>
                                    <div>Left</div>
                                    <div>Actions</div>
                                </div>

                                <TransitionGroup name="list" tag="div" class="mt-3 flex flex-col gap-2">
                                    <div v-for="user in adminUsers" :key="user.id"
                                        class="grid grid-cols-[180px_1fr_130px_130px_130px_180px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                                        <div class="px-1 text-sm font-medium">
                                            {{ user.username }}
                                        </div>

                                        <input v-model="user.email" type="text"
                                            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500"
                                            @change="saveUser(user)" />

                                        <input v-model.number="user.available_space" type="number" min="0"
                                            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500"
                                            @change="saveUser(user)" />

                                        <div
                                            class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                                            {{ formatMb(user.occupied_space) }}
                                        </div>

                                        <div
                                            class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400">
                                            {{ formatMb(user.remaining_quota) }}
                                        </div>

                                        <div class="flex items-center gap-2">
                                            <div v-if="isSaving(user.id)" class="text-xs text-slate-400">
                                                Saving...
                                            </div>
                                            <button
                                                class="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold h-9 text-white transition hover:bg-sky-500"
                                                @click="resetPassword(user)">
                                                Reset password
                                            </button>
                                            <button
                                                class="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white transition hover:bg-red-500"
                                                @click="askDeleteUser(user)">
                                                <Icon icon="fluent:delete-48-regular" width="16" />
                                            </button>
                                        </div>
                                    </div>
                                </TransitionGroup>

                                <div v-if="adminUsers.length === 0 && !isLoading"
                                    class="mt-4 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    No admin users found.
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- REGULAR USERS -->
                    <section
                        class="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                        <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h2 class="text-lg font-semibold">Regular users</h2>
                                </div>
                                <div
                                    class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
                                    {{ regularUsers.length }}
                                </div>
                            </div>
                        </div>

                        <div class="overflow-x-auto p-4">
                            <div class="min-w-[1040px]">
                                <div
                                    class="grid grid-cols-[180px_1fr_130px_130px_130px_180px] gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                    <div>Username</div>
                                    <div>Email</div>
                                    <div>Quota</div>
                                    <div>Used</div>
                                    <div>Left</div>
                                    <div>Actions</div>
                                </div>

                                <TransitionGroup name="list" tag="div" class="mt-3 flex flex-col gap-2">
                                    <div v-for="user in regularUsers" :key="user.id"
                                        class="grid grid-cols-[180px_1fr_130px_130px_130px_180px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                                        <input v-model="user.username" type="text"
                                            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500"
                                            @change="saveUser(user)" />

                                        <input v-model="user.email" type="text"
                                            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500"
                                            @change="saveUser(user)" />

                                        <input v-model.number="user.available_space" type="number" min="0"
                                            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500"
                                            @change="saveUser(user)" />

                                        <div
                                            class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                                            {{ formatMb(user.occupied_space) }}
                                        </div>

                                        <div
                                            class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400">
                                            {{ formatMb(user.remaining_quota) }}
                                        </div>

                                        <div class="flex items-center gap-2">
                                            <div v-if="isSaving(user.id)" class="text-xs text-slate-400">
                                                Saving...
                                            </div>
                                            <button
                                                class="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold h-9 text-white transition hover:bg-sky-500"
                                                @click="resetPassword(user)">
                                                Reset password
                                            </button>
                                            <button
                                                class="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white transition hover:bg-red-500"
                                                @click="askDeleteUser(user)">
                                                <Icon icon="fluent:delete-48-regular" width="16" />
                                            </button>
                                        </div>
                                    </div>
                                </TransitionGroup>

                                <div v-if="regularUsers.length === 0 && !isLoading"
                                    class="mt-4 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    No regular users found.
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    </div>
</template>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
    transition: all 0.2s ease;
}

.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateY(6px);
}

input:focus {
    outline: none;
}
</style>