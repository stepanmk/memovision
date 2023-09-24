<script setup>
import Popper from 'vue3-popper';
import ModuleTemplate from '../ModuleTemplate.vue';
import LoadingWindow from '../LoadingWindow.vue';
import DialogWindow from '../DialogWindow.vue';
import ProgressBar from './ProgressBar.vue';
import LabelAssignment from './LabelAssignment.vue';

import { pinia } from '../../piniaInstance';
import { onMounted, ref } from 'vue';
import { useDropZone } from '@vueuse/core';
import { Icon } from '@iconify/vue';

import { 
    truncateFilename, 
    getTimeString,
    resetAllStores,
    getSecureConfig
} from '../../sharedFunctions';

import { 
    useFeatureLists, 
    useModulesVisible, 
    useTracksFromDb,
    useUserInfo,
} from '../../globalStores';

import {
    trackManagerOpened,
    uploadList,
    somethingToUpload,
    numComputed,
    numThingsToCompute,
    progressBarPerc,
    isDisabled,
    isLoading,
    loadingMessage,

    duplicates,
    duplicatesMessage,
    duplicatesWindow,
    diffRegions,
    diffRegionsMessage,
    diffRegionsWindow,
    featureExtractionWindow,
    labelAssignmentVisible,
    preciseSync

} from './_module_variables'

import { 
    addFilesToUploadList,
    removeFileFromUploadList,
    clearUploadList,
    uploadAllFiles,
    uploadMeasures

} from './_upload_functions';

import {
    getTrackData,
    getAudioData,
    getMetronomeClick,
    getMeasureData,
    downloadMeasures

} from './_fetch_functions';

import {
    updateAllMetadata,
    setReference,
    deleteFileFromDb,
    deleteAllFilesFromDb

} from './_track_functions'

import {
    processAllTracks,
    resetProgress,
    synchronizeTracks,
    keepDuplicates,
    deleteDuplicates,
    keepDiffStructureTracks,
    deleteDiffStructureTracks,
    setPreciseSync,
    getFeatureNames,
    getAllFeatures

} from './_process_functions'


/* pinia stores */
const userInfo = useUserInfo(pinia);
const featureLists = useFeatureLists(pinia);
const modulesVisible = useModulesVisible(pinia);
const tracksFromDb = useTracksFromDb(pinia);

/* dropzone variables */
const dropzone = ref();
const { isOverDropZone } = useDropZone(dropzone, onDrop);

onMounted(() => {
    resetAllStores();
    getAllData();
})

modulesVisible.$subscribe((mutation, state) => {
    if(state.trackManager)
    {
        trackManagerOpened.value = true;
    }
    else if(trackManagerOpened.value)
    {
        trackManagerOpened.value = false;
    }
})

async function getAllData() {
    loadingMessage.value = 'Retrieving audio data...';
    isLoading.value = true;
    isDisabled.value = true;
    await getTrackData();
    preciseSync.value = userInfo.preciseSync;  
    numThingsToCompute.value = tracksFromDb.trackObjects.length;
    for (const track of tracksFromDb.trackObjects) {
        await getAudioData(track.filename);
        numComputed.value += 1;
    }
    await getMetronomeClick();
    await getMeasureData();
    await getFeatureNames();

    loadingMessage.value = 'Retrieving audio features...';
    await getAllFeatures();

    isDisabled.value = false;
    isLoading.value = false;    
    resetProgress();
}

function onDrop(files) {
    addFilesToUploadList(files);
}

function openLabelAssignment() {
    isDisabled.value = true;
    labelAssignmentVisible.value = true;
}

async function closeLabelAssignment() {
    labelAssignmentVisible.value = false;
    isLoading.value = true;
    loadingMessage.value = 'Computing feature relevance...'
    await getAllFeatures();
    isDisabled.value = false;
    isLoading.value = false;
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
            :progress-bar-perc="progressBarPerc"/>

            <DialogWindow :visible="duplicatesWindow"
            :message="duplicatesMessage">
                <template v-slot:dialog-content>
                    <div class="w-full h-[calc(100%-6rem)] py-3 px-5 flex flex-col gap-1 overflow-y-auto border-b dark:border-gray-700">
                        <div v-for="(obj, i) in duplicates" :id="`duplicate-${i}`"
                        class="flex justify-start gap-2 bg-neutral-200 pt-1 pb-1 pl-2 pr-2 rounded-md w-full text-sm h-7 
                        dark:bg-gray-400 dark:hover:bg-gray-700">
                            <p class="flex items-center bg-neutral-500 rounded-md px-2 text-white">{{ truncateFilename(obj[0], 20)}}</p>
                            <p class="flex items-center ">same as</p>
                            <p class="flex items-center bg-neutral-500 rounded-md px-2 text-white">{{ truncateFilename(obj[1], 20)}}</p>
                        </div>
                    </div>
                </template>

                <template v-slot:dialog-buttons>
                    <button v-if="duplicates.length > 0" class="btn btn-blue" @click="keepDuplicates()">Keep</button>
                    <button v-if="duplicates.length > 0" class="btn btn-blue" @click="deleteDuplicates()">Delete</button>
                </template>
            </DialogWindow>

            <DialogWindow :visible="diffRegionsWindow"
            :message="diffRegionsMessage">
                <template v-slot:dialog-content>
                    <div class="w-full h-[calc(100%-6rem)] py-3 px-5 flex flex-col gap-1 overflow-y-auto border-b dark:border-gray-700">
                        <div v-for="(obj, i) in diffRegions" :id="`bad-regions-${i}`"
                        class="flex justify-between gap-2 bg-neutral-200 pt-1 pb-1 pl-2 pr-2 rounded-md w-full text-sm h-7 dark:bg-gray-400 dark:hover:bg-gray-700">
                            <p class="flex items-center rounded-md">{{ truncateFilename(obj.filename, 20)}}</p>
                            <p class="w-60 flex items-center justify-center bg-red-500 rounded-md text-white px-1">Number of different regions: {{obj.target.length}}</p>
                        </div>
                    </div>
                </template>

                <template v-slot:dialog-buttons>
                    <button v-if="diffRegions.length > 0" class="btn btn-blue" @click="deleteDiffStructureTracks()">Delete</button>
                    <button v-if="diffRegions.length > 0" class="btn btn-blue" @click="keepDiffStructureTracks()">Keep</button>
                </template>
            </DialogWindow>

            <DialogWindow :visible="featureExtractionWindow" 
            message="Feature extraction" class="w-[50rem] h-[30rem] font-semibold">
                <template v-slot:dialog-content>
                    <div class="w-full h-[calc(100%-6rem)] py-3 px-5 flex flex-col gap-1 overflow-y-auto border-b dark:border-gray-700">
                        <div v-for="obj in featureLists.rhythm" class="w-full h-7 bg-indigo-200 text-sm font-normal flex items-center px-2 rounded-md justify-between">
                            <p>{{ obj.name }}</p>
                            <Icon v-if="!obj.computed" icon="eos-icons:loading" :inline="true" width="18"/>
                            <Icon v-else icon="material-symbols:check" :inline="true" width="18"/>
                        </div>
                        <div v-for="obj in featureLists.dynamics" class="w-full h-7 bg-orange-200 text-sm font-normal flex items-center px-2 rounded-md justify-between">
                            <p>{{ obj.name }}</p>
                            <Icon v-if="!obj.computed" icon="eos-icons:loading" :inline="true" width="18"/>
                            <Icon v-else icon="material-symbols:check" :inline="true" width="18"/>
                        </div>
                    </div>
                </template>
                <template v-slot:dialog-buttons>
                    <button class="btn btn-blue font-normal" @click="{featureExtractionWindow = false; isDisabled = false}">Close</button>
                </template>
            </DialogWindow>

            <LabelAssignment :visible="labelAssignmentVisible" @close-label-assignment="closeLabelAssignment()"/>

        </template>
        
        <template v-slot:module-content>
            
            <!-- uploaded files -->
            <div class="h-[1.75rem] w-full overflow-y-scroll border-b flex flex-row items-left px-5 dark:border-gray-700">
                <div class="flex justify-between w-full h-full pl-2 pr-2">
                    <div class="flex flex-row items-center justify-between h-full w-[calc(100%-30rem)]">
                        <p class="flex items-center w-36 text-sm">Track name</p>
                        <div class="flex items-center justify-between gap-2 h-full">
                            <p class="w-16 h-5 flex flex-row items-center justify-center text-sm">Tuning</p>
                            <p class="w-16 h-5 flex flex-row items-center justify-center text-sm">Duration</p>
                            <p class="w-16 h-5 flex flex-row items-center justify-center text-sm">Sync</p>
                        </div>
                    </div>
                    <div class="flex flex-row items-center gap-2 text-sm">
                        <p class="flex w-12 justify-center">Year</p>
                        <p class="flex w-32 justify-center">Peformer</p>
                        <p class="flex w-32 justify-center">Origin</p>
                        <p class="flex w-28 justify-center"></p>
                        <p class="flex w-[1.5rem] justify-center"></p>
                    </div>
                </div>
            </div>

            <div class="h-[calc(60%-6.5rem)] w-full overflow-y-scroll border-b flex flex-col items-left px-5 py-3 gap-1 dark:border-gray-700 dark:text-gray-900"> 
                <TransitionGroup name="list">
                    <div v-for="(obj, i) in tracksFromDb.trackObjects" :id="`uploaded-file-${i}`" :key="obj.filename" 
                    class="flex justify-between bg-neutral-200 pl-2 pr-2 rounded-md w-full text-sm
                    dark:bg-gray-400 hover:bg-neutral-300" :class="{'bg-violet-200': obj.reference}">
                        
                        <div class="flex flex-row items-center justify-between w-[calc(100%-30rem)] cursor-pointer h-7" @click="setReference(obj.filename)">
                            
                            <div class="flex items-center w-36 text-sm">
                                <Popper :content="obj.filename" hover placement="right" :arrow="true" class="select-none">
                                    {{ truncateFilename(obj.filename, 14) }}
                                </Popper>
                            </div>

                            <div class="flex items-center justify-between gap-2 h-full">
                                
                                <div v-if="obj.reference" class="w-2 h-2 bg-violet-800 rounded-full"></div>
                                <div v-if="obj.gt_measures" class="w-2 h-2 bg-green-600 rounded-full"></div>
                                <div v-if="obj.tf_measures" class="w-2 h-2 bg-orange-400 rounded-full"></div>
                                <div v-if="obj.diff" class="w-2 h-2 bg-red-600 rounded-full"></div>

                                <div class="w-16 h-5 flex flex-row items-center justify-center gap-1 bg-neutral-800 rounded-md text-white">
                                    <p class="text-xs">{{obj.tuning_offset}} Hz</p>  
                                </div>
                                
                                <p class="w-16 h-5 flex items-center justify-center bg-neutral-800 rounded-md text-white text-xs">{{getTimeString(obj.length_sec)}}</p>

                                <div v-if="obj.sync" class="w-16 h-5 flex flex-row items-center justify-center bg-neutral-800 rounded-md text-white">
                                    <p class="text-xs">Sync</p>  
                                </div>
                                <div v-else class="w-16 h-5"></div>
                                                        
                            </div>
                        </div>
                        
                        <div class="flex flex-row items-center gap-2">
                            <div class="flex flex-row gap-2">
                                <input type="text" maxlength="4" class="rounded-md px-1 w-12 text-black" v-model="obj.year" :name="`year-${i}`" @input="updateAllMetadata()">
                                <input type="text" class="rounded-md px-1 w-32 text-black" v-model="obj.performer" :name="`performer-${i}`" @input="updateAllMetadata()">
                                <input type="text" class="rounded-md px-1 w-32 text-black" v-model="obj.origin" :name="`origin-${i}`" @input="updateAllMetadata()">
                            </div>

                            <input :id="`measures-${i}`" type="file" class="hidden" accept=".txt, .csv" @change="uploadMeasures(obj.filename, i)" @click="$event.target.value=''">

                            <label :for="`measures-${i}`" class="hover:cursor-pointer flex items-center justify-center w-28 h-full">
                                <div :id="`upload-measures-btn-${i}`" class="text-white btn-blue 
                                    px-1 rounded-md w-full h-5 text-xs flex items-center justify-center cursor-pointer ">
                                    <p v-if="!obj.gt_measures">Upload measures</p>
                                    <p v-else>Replace measures</p>
                                </div>
                            </label>

                            <div class="w-[1.5rem] h-full flex items-center justify-center hover:text-red-600 transition cursor-pointer" :id="`remove-button-${i}`">
                                <Icon  icon="fluent:delete-48-regular" :inline="true" width="18" @click="deleteFileFromDb(obj.filename)"/>
                            </div>
                        </div>
                    
                    </div>
                </TransitionGroup>
            </div>
            <!-- uploaded files end -->

            <!-- legend -->
            <div class="h-[1.75rem] w-full px-7 flex justify-between items-center gap-3 text-sm border-b dark:border-gray-700  select-none">
                <div class="flex justify-start items-center gap-3">
                    <div class="flex flex-row gap-1 items-center justify-center">
                        <div class="w-2 h-2 bg-violet-800 rounded-full"></div>
                        <p>Reference track</p>
                    </div>
                    <div class="flex flex-row gap-1 items-center justify-center">
                        <div class="w-2 h-2 bg-green-600 rounded-full"></div>
                        <p>Annotated measures</p>
                    </div>
                    <div class="flex flex-row gap-1 items-center justify-center">
                        <div class="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <p>Transferred measures</p>
                    </div>
                    <div class="flex flex-row gap-1 items-center justify-center">
                        <div class="w-2 h-2 bg-red-600 rounded-full"></div>
                        <p>Structural differences</p>
                    </div>
                </div>
                <div class="flex flex-row gap-1 items-center justify-center">
                    <p>Track count: </p>
                    <p class="font-semibold">{{ tracksFromDb.trackObjects.length }}</p>
                </div>
            </div>
            <!-- legend end -->
            
            <!-- buttons top -->
            <div class="h-[3rem] w-full flex justify-end items-center gap-5 px-7 border-b dark:border-gray-700">
                <div class="flex flex-row items-center gap-2">
                    <label for="precise-check" class="text-sm">Precise synchronization</label>
                    <input type="checkbox" id="precise-check" class="accent-indigo-700" v-model="preciseSync" 
                    @change="setPreciseSync()"/>           
                </div>
                
                <button class="btn btn-blue bg-indigo-700 hover:bg-indigo-500" 
                @click="processAllTracks()">
                    Process all tracks
                </button>
                
                <button id="upload-btn" class="btn btn-blue" 
                :class="{'btn-disabled': !tracksFromDb.allTracksHaveMeasures}" 
                @click="(tracksFromDb.allTracksHaveMeasures) ? downloadMeasures() : null">
                    Download measures
                </button>
                
                <button id="label-btn" class="btn btn-blue" 
                :class="{'btn-disabled': !tracksFromDb.somethingUploaded}" 
                @click="(tracksFromDb.somethingUploaded) ? openLabelAssignment() : null">
                    Assign labels
                </button>
                
                <button id="delete-all-btn" class="btn btn-blue" 
                :class="{'btn-disabled': !tracksFromDb.somethingUploaded}" 
                @click="tracksFromDb.somethingUploaded ? deleteAllFilesFromDb() : null">
                    Delete all files
                </button>
            </div>
            <!-- buttons top end -->

            <!-- files to upload -->
            <div class="h-[1.75rem] w-full border-b flex justify-between items-center px-7 dark:border-gray-700">
                <p class="text-sm select-none">Files to upload</p>
            </div>

            <div class="h-[calc(40%-4.75rem)] w-full overflow-y-scroll flex flex-col px-5 py-3 gap-1 border-b dark:border-gray-700 dark:text-gray-900 relative" 
            ref="dropzone" :class="{'dark:bg-gray-700 bg-neutral-100': isOverDropZone}">
            
            <a v-if="!somethingToUpload" class="absolute top-0 left-0 w-full h-full flex items-center justify-center dark:text-gray-300"> Drag & drop audio files here.</a>
            
                <TransitionGroup name="list">
                    <div v-for="(obj, i) in uploadList" :id="`file-${i}`" :key="obj.filename" 
                    class="bg-neutral-200 pt-1 pb-1 pl-2 pr-2 rounded-md w-full text-sm flex h-7 dark:bg-gray-400">
                        
                        <div class="w-[17rem] flex items-center text-sm">
                            <Popper :content="obj.filename" hover placement="right" :arrow="true" class="select-none">
                                {{ truncateFilename(obj.filename, 14) }}
                            </Popper>
                        </div>
                        
                        <div class="w-[calc(100%-18rem)] h-full flex items-center">                    
                            <div class="bg-neutral-400 m-1 rounded-md h-[40%] w-full dark:bg-gray-100">
                                <ProgressBar :percentage="obj.progressPercentage" :id="i"/>
                            </div>
                        </div>

                        <div class="w-[1.5rem]">
                            <div v-if="!obj.beingUploaded" class="w-[1.5rem] flex items-center justify-center hover:text-neutral-600 transition cursor-pointer" :id="`cancel-button-${i}`">
                                <Icon icon="ci:close-big" :inline="true" width="18" @click="removeFileFromUploadList(obj.filename)"/>
                            </div>
                            <div v-if="obj.beingConverted" class="w-[1.5rem] flex items-center justify-center" :id="`proc-icon-${i}`">
                                <Icon icon="eos-icons:loading" :inline="true" width="18"/>
                            </div>
                        </div>
                    
                    </div>
                </TransitionGroup>
            
            </div>
            <!-- files to upload end -->

            <!-- buttons bottom -->
            <div class="h-[3rem] w-full flex justify-end items-center px-7">
                <div class="flex gap-5">
                    <input id="added-files" type="file" class="hidden" accept="audio/*" multiple @change="addFilesToUploadList(false)" @click="$event.target.value=''">
                    <label for="added-files" class="hover:cursor-pointer">
                        <div id="add-files-btn" class="btn btn-blue">
                            Add files
                        </div>
                    </label>
                    <button id="delete-all-btn" class="btn btn-blue" :class="{'btn-disabled': !somethingToUpload}" @click="somethingToUpload ? clearUploadList() : null">
                        Clear upload list
                    </button>
                    <button id="upload-btn" class="btn btn-blue" :class="{'btn-disabled': !somethingToUpload}" @click="somethingToUpload ? uploadAllFiles() : null">
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