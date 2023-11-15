<script setup>
import { Icon } from '@iconify/vue';
import { onMounted } from 'vue';
import Popper from 'vue3-popper';
import { useMeasureData, useModulesVisible, useTracksFromDb } from '../../globalStores';
import { pinia } from '../../piniaInstance';
import { getEndMeasure, getStartMeasure, getTimeString, truncateFilename } from '../../sharedFunctions';

import {
    allPeaksReady,
    differenceRegions,
    interpretationPlayerOpened,
    isPlaying,
    measuresVisible,
    oneVsRestRelevance,
    peaksInstancesReady,
    percLoaded,
    playing,
    regionLengths,
    relevantMeasures,
    selectedLabel,
    selectedRegions,
    selectedRelevanceFeatureName,
    trackLabels,
    trackTimes,
    volume,
    zoomingEnabled,
} from './javascript/variables';

import {
    idxArray,
    initPlayer,
    peaksInstances,
    playPause,
    resetPlayer,
    rewind,
    selectedMeasureData,
    selectPeaks,
    toggleMeasures,
} from './javascript/player';

import { selectRegion } from './javascript/regions';

import {
    selectDefaultRelevanceFeature,
    selectRelevanceFeature,
    selectRelevanceLabel,
    selectRelevantMeasures,
} from './javascript/relevance';

import { addControls } from './javascript/controls';

import LoadingWindow from '../LoadingWindow.vue';
import ModuleTemplate from '../ModuleTemplate.vue';
import SelectedRegion from '../shared_components/SelectedRegion.vue';
import SubMenu from '../shared_components/SubMenu.vue';
import DifferenceRegion from './subcomponents/DifferenceRegion.vue';
import RelevantMeasure from './subcomponents/RelevantMeasure.vue';

// pinia stores
const modulesVisible = useModulesVisible(pinia);
const tracksFromDb = useTracksFromDb(pinia);
const measureData = useMeasureData(pinia);

onMounted(() => {
    addControls();
});

modulesVisible.$subscribe((mutation, state) => {
    if (state.interpretationPlayer && !interpretationPlayerOpened.value) {
        initInterpretationPlayer();
    } else if (!state.interpretationPlayer && interpretationPlayerOpened.value) {
        destroyInterpretationPlayer();
    }
});

function initInterpretationPlayer() {
    tracksFromDb.syncTracks.forEach((track, idx) => {
        oneVsRestRelevance.value.push(false);
        peaksInstancesReady.value.push(false);
        playing.push(false);
        regionLengths.value.push(0.0);
        trackLabels.value.push(false);
        trackTimes.value.push(0.0);

        // from player
        idxArray.push(idx);
        peaksInstances.push(null);
    });

    initPlayer();
    selectDefaultRelevanceFeature();
    measuresVisible.value = true;
    interpretationPlayerOpened.value = true;
}

function destroyInterpretationPlayer() {
    // variables
    oneVsRestRelevance.value = [];
    peaksInstancesReady.value = [];
    playing.value = [];
    regionLengths.value = [];
    trackLabels.value = [];
    trackTimes.value = [];

    // player
    idxArray.splice(0);
    peaksInstances.splice(0);
    selectedMeasureData.splice(0);

    resetPlayer();
    selectDefaultRelevanceFeature();
    measuresVisible.value = false;
    interpretationPlayerOpened.value = false;
}

// const measureMessage = ref(null);
// function logMeasure(i) {
//     measureMessage.value =
//         'Measure: ' + (i + 1) + ', Relevance: ' + selectedRelevanceData.value[i].relevance.toFixed(2);
//     const popup = document.getElementById('measure-popup');
//     const width = measureCount * 16;
//     const topBar = document.getElementById('top-bar');
//     popup.style.left =
//         Math.round(((i + 1) / measureCount) * width) - topBar.scrollLeft - popup.offsetWidth / 2 + 18 + 'px';
// }

// function clearMessage() {
//     measureMessage.value = null;
// }

// let firstMeasure = null;
// let isHoldingMouseButton = false;
// let dragged = false;
// function addListeners() {
//     const relevanceBar = document.getElementById('overview-2');
//     relevanceBar.addEventListener('mousedown', relevanceBarMouseDown);
//     window.addEventListener('mouseup', relevanceBarMouseUp);
//     window.addEventListener('mousemove', relevanceBarMouseMove);
//     const scrollContainer = document.getElementById('top-bar');
//     scrollContainer.addEventListener('wheel', horizontalScroll);
//     const container = document.getElementById('audio-container');
//     // container.addEventListener('wheel', (e) => {
//     //     e.preventDefault();
//     // });
//     window.addEventListener('keydown', (e) => {
//         if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
//             e.preventDefault();
//         }
//     });
//     // container.addEventListener('mousewheel', (event) => {
//     //     if (event.deltaY < 0) {
//     //         peaksInstances.forEach((peaksInstance) => {
//     //             peaksInstance.zoom.zoomIn();
//     //             zoomAlign();
//     //         });
//     //     } else {
//     //         peaksInstances.forEach((peaksInstance) => {
//     //             peaksInstance.zoom.zoomOut();
//     //             zoomAlign();
//     //         });
//     //     }
//     // });
// }

// function removeListeners() {
//     const relevanceBar = document.getElementById('overview-2');
//     relevanceBar.removeEventListener('mousedown', relevanceBarMouseDown);
//     window.removeEventListener('mouseup', relevanceBarMouseUp);
//     window.removeEventListener('mousemove', relevanceBarMouseMove);
//     const scrollContainer = document.getElementById('top-bar');
//     scrollContainer.removeEventListener('wheel', horizontalScroll);
// }

// function relevanceBarMouseDown(event) {
//     const relevanceBar = document.getElementById('overview-2');
//     const bounds = relevanceBar.getBoundingClientRect();
//     const barWidth = 16 * measureCount;
//     event.preventDefault();
//     isHoldingMouseButton = true;
//     const x = event.clientX - bounds.left;
//     const dragOverMeasureIdx = Math.round((x / barWidth) * measureCount);
//     firstMeasure = dragOverMeasureIdx;
// }

// function relevanceBarMouseUp() {
//     isHoldingMouseButton = false;
//     const startMeasureIdx = regionOverlay.value.indexOf(true);
//     const endMeasureIdx = regionOverlay.value.lastIndexOf(true);
//     if (dragged) {
//         regionToSave.value = true;
//         const referenceName = tracksFromDb.refTrack.filename;
//         const refIdx = tracksFromDb.getIdx(referenceName);
//         zoomOnMeasureSelection(startMeasureIdx, endMeasureIdx);
//         repeatMeasureIdxStart.value = startMeasureIdx;
//         repeatMeasureIdxEnd.value = endMeasureIdx + 2;
//         startTime.value = selectedMeasureData[refIdx][startMeasureIdx + 1];
//         endTime.value = selectedMeasureData[refIdx][endMeasureIdx + 2];
//     }
//     dragged = false;
// }

// function relevanceBarMouseMove(event) {
//     const relevanceBar = document.getElementById('overview-2');
//     const bounds = relevanceBar.getBoundingClientRect();
//     const barWidth = 16 * measureCount;
//     if (isHoldingMouseButton && !regionSelected) {
//         dragged = true;
//         regionOverlay.value.fill(false);
//         const x = event.clientX - bounds.left;
//         let dragOverMeasureIdx = Math.floor((x / barWidth) * measureCount);
//         if (dragOverMeasureIdx > measureCount) dragOverMeasureIdx = measureCount - 1;
//         for (let i = firstMeasure; i < dragOverMeasureIdx + 1; i++) {
//             regionOverlay.value[i] = true;
//         }
//     }
// }

// function horizontalScroll(event) {
//     event.preventDefault();
//     const scrollContainer = document.getElementById('top-bar');
//     scrollContainer.scrollLeft += event.deltaY;
// }
</script>

<template>
    <ModuleTemplate
        :module-title="'Interpretation player'"
        :module-identifier="'interp-player'"
        :visible="modulesVisible.interpretationPlayer"
        :is-disabled="!allPeaksReady">
        <template v-slot:window>
            <LoadingWindow
                :visible="!allPeaksReady"
                :loading-message="'Loading tracks...'"
                :progress-bar-perc="percLoaded" />
        </template>

        <template v-slot:module-content>
            <!-- <div class="flex h-[4rem] w-full justify-center border-b dark:border-gray-700">
                <div class="w-[calc(100%-3rem)] overflow-y-hidden overflow-x-scroll" id="top-bar">
                    <div
                        id="overview-3"
                        class="flex h-[1rem] w-full flex-row items-center justify-start overflow-hidden">
                        <div
                            class="absolute z-50 flex w-48 justify-center rounded-md bg-cyan-700 text-xs font-semibold text-white"
                            id="measure-popup">
                            {{ measureMessage }}
                        </div>
                    </div>

                    <div id="overview-2" class="flex h-[1rem] flex-row rounded-md">
                        <div
                            v-for="(obj, i) in selectedRelevanceData"
                            :id="`meas-${i}`"
                            class="h-full w-4 shrink-0"
                            :style="{
                                'background-color': colors[Math.round(obj.relevance * 100)],
                            }"
                            @click="goToMeasure(i)"
                            @mouseover="logMeasure(i)"
                            @mouseleave="clearMessage()">
                            <div
                                class="h-full w-full hover:cursor-pointer hover:bg-red-600"
                                :class="{
                                    'border-t border-b border-blue-600 bg-neutral-100 bg-opacity-50 dark:border-gray-400':
                                        regionOverlay[i],
                                }">
                                <div
                                    class="h-full w-full"
                                    :class="{
                                        'bg-red-600 bg-opacity-100': i === currentMeasure,
                                    }"></div>
                            </div>
                        </div>
                    </div>

                    <div id="overview-1" class="relative flex h-[1.5rem] w-full items-center">
                        <div
                            v-for="(obj, i) in selectedRelevanceData"
                            :id="`meas-${i}`"
                            class="flex h-[1.5rem] w-4 shrink-0 flex-col items-center justify-start">
                            <div
                                v-if="(i + 1) % 20 === 0"
                                class="absolute h-[1.3rem] w-[1px] bg-black text-xs dark:bg-gray-400">
                                <p class="mt-2">&nbsp{{ i + 1 }}</p>
                            </div>
                            <div class="h-[0.5rem] w-[1px] bg-black dark:bg-gray-400"></div>
                        </div>
                    </div>
                </div>
            </div> -->

            <div
                id="settings-bar"
                class="flex h-[3rem] w-full flex-row items-center justify-between border-b px-5 dark:border-gray-700">
                <div class="relative flex h-full flex-row items-center gap-2">
                    <SubMenu :name="'Feature'">
                        <p
                            v-for="(obj, i) in measureData.relevanceFeatures"
                            class="flex h-7 shrink-0 items-center rounded-md px-2 hover:cursor-pointer hover:bg-neutral-200"
                            @click="selectRelevanceFeature(obj.id, obj.name)">
                            {{ obj.name }}
                        </p>
                    </SubMenu>
                    <SubMenu :name="'Label'">
                        <p
                            v-for="(obj, i) in measureData.labels"
                            class="flex h-7 shrink-0 items-center rounded-md px-2 hover:cursor-pointer hover:bg-neutral-200"
                            @click="selectRelevanceLabel(i, 'custom')">
                            {{ obj }}
                        </p>
                    </SubMenu>
                    <SubMenu :name="'Selected regions'">
                        <SelectedRegion
                            v-for="(obj, i) in selectedRegions"
                            :region-name="obj.regionName"
                            :idx="i"
                            :start-measure="getStartMeasure(obj.startTime)"
                            :end-measure="getEndMeasure(obj.endTime)"
                            @click="selectRegion(i, obj)">
                        </SelectedRegion>
                    </SubMenu>
                    <SubMenu :name="'Difference regions'">
                        <DifferenceRegion
                            v-for="(obj, i) in differenceRegions"
                            :region-name="obj.regionName"
                            :idx="i"
                            :start-time="getTimeString(obj.startTime, 14, 22)"
                            :end-time="getTimeString(obj.endTime, 14, 22)"
                            :start-time-target="getTimeString(obj.startTimeTarget, 14, 22)"
                            :end-time-target="getTimeString(obj.endTimeTarget, 14, 22)"
                            @click="selectRegion(i, obj)">
                        </DifferenceRegion>
                    </SubMenu>
                    <SubMenu :name="'Relevant measures'" @mouseover="selectRelevantMeasures()">
                        <RelevantMeasure
                            v-for="(obj, i) in relevantMeasures"
                            :idx="i"
                            :region-name="obj.regionName"
                            :relevance="obj.relevance"
                            :absolute-relevance="obj.absoluteRelevance"
                            @click="selectRegion(i, obj)">
                        </RelevantMeasure>
                    </SubMenu>
                </div>
                <!-- <div
                    v-show="regionToSave"
                    class="flex h-10 flex-row items-center justify-center gap-1 rounded-md bg-neutral-200 px-2 text-sm dark:bg-gray-400 dark:text-black">
                    <input
                        type="text"
                        id="name"
                        required
                        minlength="1"
                        maxlength="256"
                        size="20"
                        autocomplete="off"
                        class="input-field-nomargin h-7"
                        placeholder="Region name"
                        v-model="regionName" />

                    <div id="measure-input" class="flex flex-row items-center gap-1">
                        <div class="flex select-none items-center text-sm">Beats per measure:</div>
                        <input
                            type="number"
                            id="beats-per-measure"
                            autocomplete="off"
                            min="1"
                            placeholder="1"
                            v-model="beatsPerMeasure"
                            class="input-field-nomargin h-7 w-12" />
                    </div>
                    <button class="btn btn-blue" @click="saveRegion()">Save region</button>
                </div> -->
            </div>

            <div
                id="container"
                class="relative flex h-[calc(100%-10rem)] w-full flex-row items-end border-b transition">
                <div
                    id="label-feature"
                    class="-100 absolute top-0 z-10 flex w-full justify-center gap-2 border-b bg-white py-1 text-sm font-semibold">
                    <div class="flex flex-row gap-1 text-xs">
                        <p>Selected feature:</p>
                        <p class="flex items-center rounded-md bg-neutral-200 px-2 dark:bg-gray-400 dark:text-black">
                            {{ selectedRelevanceFeatureName }}
                        </p>
                    </div>

                    <div class="flex flex-row gap-1 text-xs">
                        <p>Selected label:</p>
                        <p class="flex items-center rounded-md bg-neutral-200 px-2 dark:bg-gray-400 dark:text-black">
                            {{ selectedLabel }}
                        </p>
                    </div>
                </div>

                <div id="audio-container" class="flex h-full w-full flex-row overflow-y-scroll dark:border-gray-700">
                    <div id="audio-controls" class="flex w-[10rem] flex-col items-center justify-start gap-2 py-8 pl-5">
                        <div
                            v-for="(obj, i) in tracksFromDb.syncTracks"
                            :id="`audio-controls-${i}`"
                            :key="obj.filename"
                            class="dark: flex h-16 w-full shrink-0 flex-row items-center justify-start rounded-md bg-neutral-200 dark:bg-gray-400 dark:text-black">
                            <div
                                class="flex h-full w-[calc(100%-0.5rem)] flex-col items-center justify-center gap-2 rounded-l-md py-2">
                                <div
                                    class="flex h-3 flex-row items-center justify-center gap-1 rounded-md p-[8px] text-xs"
                                    :class="{
                                        'bg-violet-800 text-white': obj.reference,
                                    }">
                                    <p class="font-bold">{{ i + 1 }}</p>
                                    <Popper
                                        v-if="obj.performer"
                                        :content="obj.performer + '; ' + obj.year"
                                        hover
                                        placement="right"
                                        :arrow="true"
                                        class="select-none text-xs">
                                        <p class="text-xs">
                                            {{ truncateFilename(obj.performer, 11) }}
                                        </p>
                                    </Popper>
                                    <Popper
                                        v-else
                                        :content="obj.filename"
                                        hover
                                        placement="right"
                                        :arrow="true"
                                        class="select-none text-xs">
                                        <p class="text-xs">
                                            {{ truncateFilename(obj.filename, 11) }}
                                        </p>
                                    </Popper>
                                </div>

                                <div class="flex flex-row gap-1">
                                    <div
                                        class="flex h-[1.5rem] w-[1.5rem] cursor-pointer items-center justify-center rounded-md hover:bg-cyan-600 hover:text-white"
                                        :class="{
                                            'bg-cyan-700 text-white': playing[i],
                                        }"
                                        @click="selectPeaks(i)">
                                        <Icon icon="material-symbols:volume-up-outline" width="20" />
                                    </div>
                                    <div
                                        class="flex h-[1.5rem] cursor-pointer select-none items-center justify-center rounded-md p-2 hover:bg-cyan-600 hover:text-white"
                                        :class="{
                                            'bg-cyan-700 text-white': oneVsRestRelevance[i],
                                        }"
                                        @click="selectRelevanceLabel(i, 'oneVsRest')">
                                        <p class="text-xs">Relevance</p>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="h-full w-[0.5rem] rounded-r-md"
                                :class="{
                                    'bg-red-600': !trackLabels[i],
                                    'bg-blue-600': trackLabels[i],
                                }"></div>
                        </div>

                        <div id="audio-controls-pb" class="h-3 w-full shrink-0"></div>
                    </div>

                    <div
                        id="audio-tracks"
                        class="flex w-[calc(100%-10rem)] flex-col gap-2 py-8 px-2 dark:border-gray-700">
                        <div
                            v-for="(obj, i) in tracksFromDb.syncTracks"
                            class="flex h-16 w-full shrink-0 flex-row gap-2">
                            <div
                                class="w-[calc(100%-8rem)] border dark:border-gray-500 dark:bg-gray-300"
                                :id="`track-div-${i}`"></div>
                            <div
                                class="flex h-full w-[7.5rem] flex-col items-center justify-center rounded-md bg-neutral-200 text-sm text-black dark:bg-gray-400">
                                <div class="flex items-center justify-center text-xs font-semibold">
                                    <p class="w-14">
                                        {{ getTimeString(trackTimes[i], 14, 22) }}
                                    </p>
                                </div>
                                <div
                                    v-show="regionLengths[i] > 0"
                                    class="flex flex-row items-center justify-center gap-1 text-xs font-semibold">
                                    <p>Sel:</p>
                                    <p class="w-full rounded-md bg-neutral-900 px-[0.2rem] text-white">
                                        {{ getTimeString(regionLengths[i], 14, 22) }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <audio v-for="(obj, i) in tracksFromDb.syncTracks" :id="`audio-${i}`"></audio>
                    </div>
                </div>
            </div>

            <div
                id="interp-player-controls"
                class="absolute bottom-0 flex h-[3rem] w-full flex-row items-center justify-between pl-5 pr-5 dark:border-gray-700">
                <div class="flex gap-1">
                    <button
                        id="pause-button"
                        @click="playPause()"
                        class="btn btn-blue flex h-[2rem] w-[2.5rem] items-center justify-center bg-neutral-200 text-black duration-100 hover:bg-cyan-600 hover:text-white dark:bg-gray-400 dark:hover:bg-cyan-600"
                        :class="{ 'bg-cyan-700 dark:bg-cyan-700': isPlaying }">
                        <Icon v-if="isPlaying" icon="ph:pause" width="20" class="text-white" />
                        <Icon v-else icon="ph:play" width="20" />
                    </button>

                    <button
                        id="back-button"
                        @click="rewind()"
                        class="btn btn-blue flex h-[2rem] w-[2.5rem] items-center justify-center bg-neutral-200 text-black duration-100 hover:bg-cyan-600 hover:text-white dark:bg-gray-400 dark:hover:bg-cyan-600">
                        <Icon icon="ph:skip-back" width="20" />
                    </button>

                    <button
                        id="measure-button"
                        @click="toggleMeasures()"
                        class="btn btn-blue flex h-[2rem] w-[2.5rem] items-center justify-center bg-neutral-200 text-black duration-100 hover:bg-cyan-600 hover:text-white dark:bg-gray-400 dark:hover:bg-cyan-600"
                        :class="{
                            'bg-cyan-700 dark:bg-cyan-700': measuresVisible,
                        }">
                        <Icon
                            icon="akar-icons:three-line-vertical"
                            width="20"
                            :class="{ 'text-white': measuresVisible }" />
                    </button>
                    <button
                        id="zoom-button"
                        @click="zoomingEnabled = !zoomingEnabled"
                        class="btn btn-blue flex h-[2rem] w-[2.5rem] items-center justify-center bg-neutral-200 text-black duration-100 hover:bg-cyan-600 hover:text-white dark:bg-gray-400 dark:hover:bg-cyan-600"
                        :class="{
                            'bg-cyan-700 dark:bg-cyan-700': zoomingEnabled,
                        }">
                        <Icon icon="fontisto:zoom" width="18" :class="{ 'text-white': zoomingEnabled }" />
                    </button>
                </div>

                <div class="flex flex-row items-center justify-center gap-1">
                    <Icon icon="material-symbols:volume-up-outline" width="24" />
                    <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.01"
                        v-model="volume"
                        class="h-1 w-24 accent-cyan-600"
                        id="ref-volume" />
                </div>
            </div>
        </template>
    </ModuleTemplate>
</template>

<style scoped>
.regions-transition-enter-active {
    transition: opacity 0.1s ease;
    transition-delay: 0.1s;
}

.regions-transition-enter-from,
.regions-transition-leave-to {
    opacity: 0;
}

input:focus {
    outline: 2px solid rgba(255, 255, 255, 0.2);
}
</style>
