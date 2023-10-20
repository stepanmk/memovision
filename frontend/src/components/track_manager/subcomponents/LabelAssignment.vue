<script setup>
import { Icon } from '@iconify/vue';
import { useVuelidate } from '@vuelidate/core';
import { alphaNum, maxLength, minLength, required } from '@vuelidate/validators';
import { onMounted, ref } from 'vue';
import { api } from '../../../axiosInstance';
import { useMeasureData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { getSecureConfig } from '../../../sharedFunctions';

defineProps({
    visible: Boolean,
});

onMounted(() => {
    getLabelNames();
});

const formData = ref({
    labelName0: '',
    labelName1: '',
});

const rules = {
    labelName0: {
        required,
        alphaNum,
        minLength: minLength(1),
        maxLength: maxLength(40),
    },
    labelName1: {
        required,
        alphaNum,
        minLength: minLength(1),
        maxLength: maxLength(40),
    },
};

const v$ = useVuelidate(rules, formData);

const tracksFromDb = useTracksFromDb(pinia);
const measureData = useMeasureData(pinia);

const labelObjects = ref([]);
const labelBeingAdded = ref(false);
const labelBeingEdited = ref(false);
const labelNames = ref([]);
const oldLabelName = ref('');

function addNewLabel() {
    labelBeingAdded.value = true;
    tracksFromDb.trackObjects.forEach(() => {
        labelObjects.value.push(false);
    });
}

async function getLabelNames() {
    const res = await api.get('/get-label-names', getSecureConfig());
    labelNames.value = res.data.labelNames;
    measureData.labels = res.data.labelNames;
}

async function saveLabel() {
    const data = {
        labelName: `${formData.value.labelName0}_${formData.value.labelName1}`,
        labelType: 'custom',
        labels: labelObjects.value,
    };
    await api.put('/save-label', data, getSecureConfig());
    await getLabelNames();
    labelBeingAdded.value = false;
    labelObjects.value = [];
    formData.value.labelName0 = '';
    formData.value.labelName1 = '';
}

async function openLabel(label) {
    const res = await api.get(`/get-label/${label}`, getSecureConfig());
    oldLabelName.value = label;
    const labels = label.split('_');
    formData.value.labelName0 = labels[0];
    formData.value.labelName1 = labels[1];
    labelObjects.value = res.data.labelData;
    labelBeingAdded.value = true;
    labelBeingEdited.value = true;
}

async function editLabel() {
    const data = {
        labelName: oldLabelName.value,
        newLabelName: `${formData.value.labelName0}_${formData.value.labelName1}`,
        labelType: 'custom',
        labels: labelObjects.value,
    };
    await api.put('/edit-label', data, getSecureConfig());
    await getLabelNames();
    labelObjects.value = [];
    oldLabelName.value = '';
    formData.value.labelName0 = '';
    formData.value.labelName1 = '';
    labelBeingAdded.value = false;
    labelBeingEdited.value = false;
}

async function deleteLabel(label) {
    await api.delete(`/delete-label/${label}`, getSecureConfig());
    await getLabelNames();
}
</script>

<template>
    <div
        v-if="visible"
        class="z-20 flex h-[30rem] w-[50rem] flex-col items-center justify-center rounded-md border bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <div
            class="flex h-[3rem] w-full items-center justify-start rounded-t-md border-b px-5 text-sm dark:border-gray-700">
            <p>Label assignment</p>
        </div>

        <div
            v-if="!labelBeingAdded"
            class="flex h-[calc(100%-6rem)] w-full flex-col gap-1 overflow-y-auto border-b px-5 py-3 text-sm dark:border-gray-700">
            <div
                v-for="(label, i) in labelNames"
                class="flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md bg-neutral-200 px-2 hover:bg-neutral-300">
                <p class="flex h-full w-[calc(100%-1.5rem)] items-center" @click="openLabel(label)">
                    {{ label }}
                </p>
                <div
                    :id="`remove-button-${i}`"
                    class="flex h-full w-[1.5rem] cursor-pointer items-center justify-center transition hover:text-red-600">
                    <Icon icon="fluent:delete-48-regular" :inline="true" width="18" @click="deleteLabel(label)" />
                </div>
            </div>
        </div>

        <div
            v-if="labelBeingAdded"
            class="flex h-[calc(100%-6rem)] w-full flex-col gap-1 overflow-y-auto border-b px-5 py-3 text-sm dark:border-gray-700">
            <div
                v-for="(obj, i) in tracksFromDb.trackObjects"
                class="flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md bg-neutral-200 pl-2 hover:bg-neutral-300"
                @click="labelObjects[i] = !labelObjects[i]">
                <p>{{ obj.filename }}</p>
                <div
                    class="h-full w-[0.5rem] rounded-r-md"
                    :class="{
                        'bg-red-600': !labelObjects[i],
                        'bg-blue-600': labelObjects[i],
                    }"></div>
            </div>
        </div>

        <div class="flex h-[3rem] w-full items-center justify-between gap-5 rounded-b-md px-5 text-sm">
            <div class="flex items-center gap-2">
                <input
                    v-model="v$.labelName0.$model"
                    type="text"
                    class="input-field-nomargin h-7 text-blue-600"
                    placeholder="Label A name"
                    maxlength="20"
                    :class="{
                        'border-2 border-green-400': !v$.labelName0.$invalid,
                        'border-2 border-gray-300': v$.labelName0.$invalid,
                    }" />

                <input
                    v-model="v$.labelName1.$model"
                    type="text"
                    class="input-field-nomargin h-7 text-red-600"
                    placeholder="Label B name"
                    maxlength="20"
                    :class="{
                        'border-2 border-green-400': !v$.labelName1.$invalid,
                        'border-2 border-gray-300': v$.labelName1.$invalid,
                    }" />

                <button
                    v-if="!labelBeingAdded"
                    class="btn btn-blue"
                    :class="{
                        'btn-disabled': v$.labelName0.$invalid || v$.labelName1.$invalid,
                    }"
                    @click="v$.labelName0.$invalid || v$.labelName1.$invalid ? null : addNewLabel()">
                    Add new labels
                </button>
            </div>
            <div class="flex items-center">
                <button v-if="!labelBeingAdded" class="btn btn-blue" @click="$emit('closeLabelAssignment')">
                    Close
                </button>
                <button
                    v-if="labelBeingAdded && labelBeingEdited"
                    class="btn btn-blue"
                    :class="{
                        'btn-disabled': v$.labelName0.$invalid || v$.labelName1.$invalid,
                    }"
                    @click="v$.labelName0.$invalid || v$.labelName1.$invalid ? null : editLabel()">
                    Accept
                </button>
                <button v-if="labelBeingAdded && !labelBeingEdited" class="btn btn-blue" @click="saveLabel()">
                    Save label
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}
</style>
