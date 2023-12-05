<script setup>
import { Icon } from '@iconify/vue';
import { useDropZone } from '@vueuse/core';
import { onMounted, ref } from 'vue';
import Popper from 'vue3-popper';
import {
    useFeatureLists,
    useMenuButtonsDisable,
    useModulesVisible,
    useTracksFromDb,
    useUserInfo,
} from '../../globalStores';
import { pinia } from '../../piniaInstance';
import { getTimeString, resetAllStores, truncateFilename } from '../../sharedFunctions';
import DialogWindow from '../DialogWindow.vue';
import LoadingWindow from '../LoadingWindow.vue';
import ModuleTemplate from '../ModuleTemplate.vue';
import BottomLegend from './subcomponents/BottomLegend.vue';
import LabelAssignment from './subcomponents/LabelAssignment.vue';
import ProgressBar from './subcomponents/ProgressBar.vue';
import TopLegend from './subcomponents/TopLegend.vue';

import {
    diffRegions,
    diffRegionsMessage,
    diffRegionsWindow,
    duplicates,
    duplicatesMessage,
    duplicatesWindow,
    featureExtractionWindow,
    isDisabled,
    isLoading,
    labelAssignmentVisible,
    loadingMessage,
    numComputed,
    numThingsToCompute,
    preciseSync,
    progressBarPerc,
    somethingToUpload,
    trackManagerOpened,
    uploadList,
} from './javascript/variables';

import {
    addFilesToUploadList,
    clearUploadList,
    removeFileFromUploadList,
    uploadAllFiles,
    uploadMeasures,
    uploadMetadata,
} from './javascript/upload';

import {
    downloadMeasures,
    getAudioData,
    getChords,
    getMeasureData,
    getMetronomeClick,
    getRegionData,
    getSyncPoints,
    getTrackData,
} from './javascript/fetch';

import { deleteAllFilesFromDb, deleteFileFromDb, setReference, updateAllMetadata } from './javascript/track';

import {
    deleteDiffStructureTracks,
    deleteDuplicates,
    getAllFeatures,
    getFeatureNames,
    keepDiffStructureTracks,
    keepDuplicates,
    processAllTracks,
    resetProgress,
    setPreciseSync,
} from './javascript/process';

/* pinia stores */
const featureLists = useFeatureLists(pinia);
const menuButtonsDisable = useMenuButtonsDisable(pinia);
const modulesVisible = useModulesVisible(pinia);
const tracksFromDb = useTracksFromDb(pinia);
const userInfo = useUserInfo(pinia);

/* dropzone variables */
const dropzone = ref();
const metadataDropzone = ref();
const { isOverDropzone } = useDropZone(dropzone, onDrop);
const { isOverMetadataDropzone } = useDropZone(metadataDropzone, uploadMetadata);

onMounted(() => {
    resetAllStores();
    getAllData();
});

modulesVisible.$subscribe((mutation, state) => {
    if (state.trackManager) {
        trackManagerOpened.value = true;
    } else if (trackManagerOpened.value) {
        trackManagerOpened.value = false;
    }
});

async function getAllData() {
    menuButtonsDisable.startLoading('trackManager');
    loadingMessage.value = 'Retrieving audio data...';
    isLoading.value = true;
    isDisabled.value = true;
    await getTrackData();
    await getRegionData();
    await getSyncPoints();
    await getChords();
    preciseSync.value = userInfo.preciseSync;
    numThingsToCompute.value = tracksFromDb.trackObjects.length;
    let audioData = [];
    for (const track of tracksFromDb.trackObjects) {
        audioData.push(getAudioData(track.filename));
    }
    await Promise.all(audioData);
    await getMetronomeClick();
    await getMeasureData();
    await getFeatureNames();
    loadingMessage.value = 'Retrieving audio features...';
    await getAllFeatures();
    isDisabled.value = false;
    isLoading.value = false;
    resetProgress();
    menuButtonsDisable.stopLoading();
}

function onDrop(files) {
    addFilesToUploadList(files);
}

function openLabelAssignment() {
    menuButtonsDisable.startLoading('trackManager');
    isDisabled.value = true;
    labelAssignmentVisible.value = true;
}

async function closeLabelAssignment() {
    labelAssignmentVisible.value = false;
    numThingsToCompute.value = 1;
    isLoading.value = true;
    loadingMessage.value = 'Computing feature relevance...';
    numComputed.value = 1;
    await getAllFeatures();
    isDisabled.value = false;
    isLoading.value = false;
    resetProgress();
    menuButtonsDisable.stopLoading();
}
</script>

<template>
    <ModuleTemplate
        :module-title="'Track manager'"
        :module-identifier="'track-manager'"
        :visible="modulesVisible.trackManager"
        :is-disabled="isDisabled">
        <template v-slot:window>
            <LoadingWindow
                :visible="isLoading"
                :loading-message="loadingMessage"
                :progress-bar-perc="progressBarPerc" />

            <DialogWindow :visible="duplicatesWindow" :message="duplicatesMessage">
                <template v-slot:dialog-content>
                    <div
                        class="flex h-[calc(100%-6rem)] w-full flex-col gap-1 overflow-y-auto border-b px-5 py-3 dark:border-gray-700">
                        <div
                            v-for="(obj, i) in duplicates"
                            :id="`duplicate-${i}`"
                            class="flex h-7 w-full justify-start gap-2 rounded-md bg-neutral-200 pb-1 pl-2 pr-2 pt-1 text-sm dark:bg-gray-400 dark:hover:bg-gray-700">
                            <p class="flex items-center rounded-md bg-neutral-500 px-2 text-white">
                                {{ truncateFilename(obj[0], 20) }}
                            </p>
                            <p class="flex items-center">same as</p>
                            <p class="flex items-center rounded-md bg-neutral-500 px-2 text-white">
                                {{ truncateFilename(obj[1], 20) }}
                            </p>
                        </div>
                    </div>
                </template>

                <template v-slot:dialog-buttons>
                    <button v-if="duplicates.length > 0" class="btn btn-blue" @click="keepDuplicates()">Keep</button>
                    <button v-if="duplicates.length > 0" class="btn btn-blue" @click="deleteDuplicates()">
                        Delete
                    </button>
                </template>
            </DialogWindow>

            <DialogWindow :visible="diffRegionsWindow" :message="diffRegionsMessage">
                <template v-slot:dialog-content>
                    <div
                        class="flex h-[calc(100%-6rem)] w-full flex-col gap-1 overflow-y-auto border-b px-5 py-3 dark:border-gray-700">
                        <div
                            v-for="(obj, i) in diffRegions"
                            :id="`bad-regions-${i}`"
                            class="flex h-7 w-full justify-between gap-2 rounded-md bg-neutral-200 pb-1 pl-2 pr-2 pt-1 text-sm dark:bg-gray-400 dark:hover:bg-gray-700">
                            <p class="flex items-center rounded-md">
                                {{ truncateFilename(obj.filename, 20) }}
                            </p>
                            <p class="flex w-60 items-center justify-center rounded-md bg-red-500 px-1 text-white">
                                Number of different regions:
                                {{ obj.target.length }}
                            </p>
                        </div>
                    </div>
                </template>

                <template v-slot:dialog-buttons>
                    <button v-if="diffRegions.length > 0" class="btn btn-blue" @click="deleteDiffStructureTracks()">
                        Delete
                    </button>
                    <button v-if="diffRegions.length > 0" class="btn btn-blue" @click="keepDiffStructureTracks()">
                        Keep
                    </button>
                </template>
            </DialogWindow>

            <DialogWindow :visible="featureExtractionWindow" message="Feature extraction" class="h-[30rem] w-[50rem]">
                <template v-slot:dialog-content>
                    <div
                        class="flex h-[calc(100%-6rem)] w-full flex-col gap-1 overflow-y-auto border-b px-5 py-3 dark:border-gray-700">
                        <div
                            v-for="obj in featureLists.rhythmMetadata"
                            class="flex h-7 w-full items-center justify-between rounded-md bg-indigo-200 px-2 text-sm font-normal dark:text-gray-700">
                            <p>{{ obj.name }}</p>
                            <Icon v-if="!obj.computed" icon="eos-icons:loading" :inline="true" width="18" />
                            <Icon v-else icon="material-symbols:check" :inline="true" width="18" />
                        </div>
                        <div
                            v-for="obj in featureLists.dynamicsMetadata"
                            class="flex h-7 w-full items-center justify-between rounded-md bg-orange-200 px-2 text-sm font-normal dark:text-gray-700">
                            <p>{{ obj.name }}</p>
                            <Icon v-if="!obj.computed" icon="eos-icons:loading" :inline="true" width="18" />
                            <Icon v-else icon="material-symbols:check" :inline="true" width="18" />
                        </div>
                    </div>
                </template>
                <template v-slot:dialog-buttons>
                    <button
                        class="btn btn-blue font-normal"
                        @click="
                            {
                                featureExtractionWindow = false;
                                isDisabled = false;
                                menuButtonsDisable.stopLoading();
                            }
                        ">
                        Close
                    </button>
                </template>
            </DialogWindow>

            <LabelAssignment :visible="labelAssignmentVisible" @close-label-assignment="closeLabelAssignment()" />
        </template>

        <template v-slot:module-content>
            <!-- uploaded files -->
            <TopLegend />
            <div
                class="items-left flex h-[calc(60%-6.5rem)] w-full flex-col gap-1 overflow-y-scroll border-b px-5 py-3 dark:border-gray-700 dark:text-gray-900"
                ref="metadataDropzone">
                <TransitionGroup name="list">
                    <div
                        v-for="(obj, i) in tracksFromDb.trackObjects"
                        :id="`uploaded-file-${i}`"
                        :key="obj.filename"
                        class="flex w-full justify-between rounded-md bg-neutral-200 pl-2 pr-2 text-sm hover:bg-neutral-300 dark:bg-gray-400 dark:hover:bg-gray-500"
                        :class="{
                            'bg-violet-300 hover:bg-violet-400 dark:bg-violet-400 dark:hover:bg-violet-500':
                                obj.reference,
                        }">
                        <div
                            class="flex h-7 w-[calc(100%-22.5rem)] cursor-pointer flex-row items-center justify-between"
                            @click="setReference(obj.filename)">
                            <div class="w-30 flex items-center justify-start px-1 text-sm">
                                <Popper
                                    :content="obj.filename"
                                    hover
                                    placement="right"
                                    :arrow="true"
                                    class="select-none">
                                    {{ truncateFilename(obj.filename, 14) }}
                                </Popper>
                            </div>

                            <div class="flex h-full items-center justify-between gap-2">
                                <div v-if="obj.gt_measures" class="h-2 w-2 rounded-full bg-green-600"></div>
                                <div v-if="obj.tf_measures" class="h-2 w-2 rounded-full bg-orange-400"></div>
                                <div v-if="obj.diff" class="h-2 w-2 rounded-full bg-red-600"></div>

                                <div
                                    class="flex h-5 w-16 flex-row items-center justify-center gap-1 rounded-md bg-neutral-800 text-white">
                                    <p class="text-xs">{{ obj.tuning_offset }} Hz</p>
                                </div>

                                <p
                                    class="flex h-5 w-16 items-center justify-center rounded-md bg-neutral-800 text-xs text-white">
                                    {{ getTimeString(obj.length_sec, 14, 19) }}
                                </p>

                                <div
                                    v-if="obj.sync"
                                    class="flex h-5 w-16 flex-row items-center justify-center rounded-md bg-neutral-800 text-white">
                                    <p class="text-xs">Sync</p>
                                </div>
                                <div v-else class="h-5 w-16"></div>
                            </div>
                        </div>

                        <div class="flex flex-row items-center gap-2">
                            <div class="flex flex-row gap-2">
                                <input
                                    type="number"
                                    maxlength="4"
                                    class="w-16 rounded-md px-1 text-black dark:bg-gray-300"
                                    v-model="obj.year"
                                    :name="`year-${i}`"
                                    @input="updateAllMetadata()" />
                                <input
                                    type="text"
                                    class="w-32 rounded-md px-1 text-black dark:bg-gray-300"
                                    v-model="obj.performer"
                                    :name="`performer-${i}`"
                                    @input="updateAllMetadata()" />
                            </div>

                            <input
                                :id="`measures-${i}`"
                                type="file"
                                class="hidden"
                                accept=".txt, .csv"
                                @change="uploadMeasures(obj.filename, i)"
                                @click="$event.target.value = ''" />

                            <label
                                :for="`measures-${i}`"
                                class="flex h-full w-28 items-center justify-center hover:cursor-pointer">
                                <div
                                    :id="`upload-measures-btn-${i}`"
                                    class="btn-blue flex h-5 w-full cursor-pointer items-center justify-center rounded-md px-1 text-xs text-white">
                                    <p v-if="!obj.gt_measures">Upload measures</p>
                                    <p v-else>Replace measures</p>
                                </div>
                            </label>

                            <div
                                class="flex h-full w-[1.5rem] cursor-pointer items-center justify-center transition hover:text-red-600"
                                :id="`remove-button-${i}`">
                                <Icon
                                    icon="fluent:delete-48-regular"
                                    :inline="true"
                                    width="18"
                                    @click="deleteFileFromDb(obj.filename)" />
                            </div>
                        </div>
                    </div>
                </TransitionGroup>
            </div>
            <!-- uploaded files end -->

            <!-- legend -->
            <BottomLegend :track-count="tracksFromDb.trackObjects.length" />
            <!-- legend end -->

            <!-- buttons top -->
            <div class="flex h-[3rem] w-full items-center justify-end gap-2 border-b px-7 dark:border-gray-700">
                <div class="flex flex-row items-center gap-2">
                    <label for="precise-check" class="text-sm">Precise synchronization</label>
                    <input
                        type="checkbox"
                        id="precise-check"
                        class="accent-emerald-600"
                        v-model="preciseSync"
                        @change="setPreciseSync()" />
                </div>

                <button class="btn btn-blue bg-emerald-600 hover:bg-emerald-500" @click="processAllTracks()">
                    Process all tracks
                </button>

                <input
                    id="upload-metadata"
                    type="file"
                    class="hidden"
                    accept=".txt, .csv, .xlsx"
                    @change="tracksFromDb.somethingUploaded ? uploadMetadata() : null"
                    @click="$event.target.value = ''" />

                <label for="upload-metadata" class="flex h-full items-center justify-center hover:cursor-pointer">
                    <div
                        id="upload-metadata-btn"
                        class="btn btn-blue"
                        :class="{
                            'btn-disabled': !tracksFromDb.somethingUploaded,
                        }">
                        <p>Upload metadata</p>
                    </div>
                </label>

                <button
                    id="upload-btn"
                    class="btn btn-blue"
                    :class="{
                        'btn-disabled': !tracksFromDb.allTracksHaveMeasures,
                    }"
                    @click="tracksFromDb.allTracksHaveMeasures ? downloadMeasures() : null">
                    Download measures
                </button>

                <button
                    id="label-btn"
                    class="btn btn-blue"
                    :class="{ 'btn-disabled': !tracksFromDb.somethingUploaded }"
                    @click="tracksFromDb.somethingUploaded ? openLabelAssignment() : null">
                    Assign labels
                </button>

                <button
                    id="delete-all-btn"
                    class="btn btn-blue"
                    :class="{ 'btn-disabled': !tracksFromDb.somethingUploaded }"
                    @click="tracksFromDb.somethingUploaded ? deleteAllFilesFromDb() : null">
                    Delete all files
                </button>
            </div>
            <!-- buttons top end -->

            <!-- files to upload -->
            <div class="flex h-[1.75rem] w-full items-center justify-between border-b px-7 dark:border-gray-700">
                <p class="select-none text-sm">Files to upload</p>
            </div>

            <div
                class="relative flex h-[calc(40%-4.75rem)] w-full flex-col gap-1 overflow-y-scroll border-b px-5 py-3 dark:border-gray-700 dark:text-gray-900"
                ref="dropzone"
                :class="{ 'bg-neutral-100 dark:bg-gray-700': isOverDropzone }">
                <a
                    v-if="!somethingToUpload"
                    class="absolute left-0 top-0 flex h-full w-full items-center justify-center dark:text-gray-300">
                    Drag & drop audio files here.</a
                >

                <TransitionGroup name="list">
                    <div
                        v-for="(obj, i) in uploadList"
                        :id="`file-${i}`"
                        :key="obj.filename"
                        class="flex h-7 w-full shrink-0 rounded-md bg-neutral-200 pb-1 pl-2 pr-2 pt-1 text-sm dark:bg-gray-400">
                        <div class="flex w-[17rem] items-center px-1 text-sm">
                            <Popper :content="obj.filename" hover placement="right" :arrow="true" class="select-none">
                                {{ truncateFilename(obj.filename, 14) }}
                            </Popper>
                        </div>

                        <div class="flex h-full w-[calc(100%-18rem)] items-center">
                            <div class="m-1 h-[40%] w-full rounded-md bg-neutral-400 dark:bg-gray-100">
                                <ProgressBar :percentage="obj.progressPercentage" :id="i" />
                            </div>
                        </div>

                        <div class="w-[1.5rem]">
                            <div
                                v-if="!obj.beingUploaded"
                                class="flex w-[1.5rem] cursor-pointer items-center justify-center transition hover:text-neutral-600"
                                :id="`cancel-button-${i}`">
                                <Icon
                                    icon="ci:close-big"
                                    :inline="true"
                                    width="18"
                                    @click="removeFileFromUploadList(obj.filename)" />
                            </div>
                            <div
                                v-if="obj.beingConverted"
                                class="flex w-[1.5rem] items-center justify-center"
                                :id="`proc-icon-${i}`">
                                <Icon icon="eos-icons:loading" :inline="true" width="18" />
                            </div>
                        </div>
                    </div>
                </TransitionGroup>
            </div>
            <!-- files to upload end -->

            <!-- buttons bottom -->
            <div class="flex h-[3rem] w-full items-center justify-end px-7">
                <div class="flex gap-2">
                    <input
                        id="added-files"
                        type="file"
                        class="hidden"
                        accept="audio/*"
                        multiple
                        @change="addFilesToUploadList(false)"
                        @click="$event.target.value = ''" />
                    <label for="added-files" class="hover:cursor-pointer">
                        <div id="add-files-btn" class="btn btn-blue">Add files</div>
                    </label>
                    <button
                        id="delete-all-btn"
                        class="btn btn-blue"
                        :class="{ 'btn-disabled': !somethingToUpload }"
                        @click="somethingToUpload ? clearUploadList() : null">
                        Clear upload list
                    </button>
                    <button
                        id="upload-btn"
                        class="btn btn-blue"
                        :class="{ 'btn-disabled': !somethingToUpload }"
                        @click="somethingToUpload ? uploadAllFiles() : null">
                        Upload all files
                    </button>
                </div>
            </div>
            <!-- buttons bottom end -->
        </template>
    </ModuleTemplate>
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
}

.v-leave-active {
    transition: opacity 0.2s ease;
    transition-delay: 0.2s;
}
.v-leave-to {
    opacity: 0;
}

input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}
</style>
