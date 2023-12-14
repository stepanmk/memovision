<script setup>
import { Icon } from '@iconify/vue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Popper from 'vue3-popper';
import {
    useMeasureData,
    useMenuButtonsDisable,
    useModulesVisible,
    useRegionData,
    useTracksFromDb,
} from '../../globalStores';
import { pinia } from '../../piniaInstance';
import { getEndMeasure, getStartMeasure, getTimeString, truncateFilename } from '../../sharedFunctions';

import {
    allPeaksReady,
    currentMeasure,
    endMeasureIdx,
    interpretationPlayerOpened,
    isPlaying,
    measuresVisible,
    oneVsRestRelevance,
    peaksInstancesReady,
    percLoaded,
    playing,
    regionLengths,
    regionName,
    regionToSave,
    relevantMeasures,
    selectedLabel,
    selectedRelevanceData,
    selectedRelevanceFeatureName,
    startMeasureIdx,
    trackLabels,
    trackTimes,
    volume,
    zoomingEnabled,
} from './javascript/variables';

import {
    goToMeasure,
    idxArray,
    initPlayer,
    peaksInstances,
    playPause,
    reciprocalDurations,
    resetPlayer,
    rewind,
    selectPeaks,
    toggleMeasures,
} from './javascript/player';

import { saveRegion, selectRegion, zoomOnMeasureSelection } from './javascript/regions';

import {
    selectDefaultRelevanceFeature,
    selectRelevanceFeature,
    selectRelevanceLabel,
    selectRelevantMeasures,
} from './javascript/relevance';

import { addControls } from './javascript/controls';

import LoadingWindow from '../LoadingWindow.vue';
import ModuleTemplate from '../shared_components/ModuleTemplate.vue';
import SelectedRegion from '../shared_components/SelectedRegion.vue';
import SubMenu from '../shared_components/SubMenu.vue';
import DifferenceRegion from './subcomponents/DifferenceRegion.vue';
import MeasureSelector from './subcomponents/MeasureSelector.vue';
import RelevantMeasure from './subcomponents/RelevantMeasure.vue';

// pinia stores
const measureData = useMeasureData(pinia);
const menuButtonsDisable = useMenuButtonsDisable(pinia);
const modulesVisible = useModulesVisible(pinia);
const regionData = useRegionData(pinia);
const tracksFromDb = useTracksFromDb(pinia);

const measureSelector = ref(null);

watch(startMeasureIdx, () => {
    if (startMeasureIdx.value === -1) {
        if (measureSelector.value !== null) measureSelector.value.resetRegionOverlay();
    } else if (startMeasureIdx.value > -1) {
        measureSelector.value.setRegionOverlay(startMeasureIdx.value, endMeasureIdx.value);
    }
});

watch(allPeaksReady, () => {
    if (allPeaksReady.value) menuButtonsDisable.stopLoading();
});

onMounted(() => {
    addControls();
});

onBeforeUnmount(() => {
    if (measureSelector.value !== null) measureSelector.value.destroy();
});

modulesVisible.$subscribe((mutation, state) => {
    if (state.interpretationPlayer && !interpretationPlayerOpened.value) {
        initInterpretationPlayer();
    } else if (!state.interpretationPlayer && interpretationPlayerOpened.value) {
        destroyInterpretationPlayer();
    }
});

async function initInterpretationPlayer() {
    menuButtonsDisable.startLoading('interpretationPlayer');
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
        reciprocalDurations.push(0.0);
    });
    selectDefaultRelevanceFeature();
    await initPlayer();
    measureSelector.value.init();
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

    resetPlayer();
    measureSelector.value.destroy();
    measuresVisible.value = false;
    interpretationPlayerOpened.value = false;
}
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
            <div
                id="settings-bar"
                class="flex h-[3rem] w-full flex-row items-center justify-between border-b px-5 dark:border-gray-700">
                <div class="relative flex h-full flex-row items-center gap-2">
                    <SubMenu :name="'Feature'" :num-entries="measureData.relevanceFeatures.length">
                        <p
                            v-for="(obj, i) in measureData.relevanceFeatures"
                            class="flex h-7 shrink-0 items-center rounded-md px-2 hover:cursor-pointer hover:bg-neutral-200 dark:hover:bg-gray-300"
                            @click="selectRelevanceFeature(obj.id, obj.name)">
                            {{ obj.name }}
                        </p>
                    </SubMenu>
                    <SubMenu :name="'Label'" :num-entries="measureData.labels.length">
                        <p
                            v-for="(obj, i) in measureData.labels"
                            class="flex h-7 shrink-0 items-center rounded-md px-2 hover:cursor-pointer hover:bg-neutral-200"
                            @click="selectRelevanceLabel(i, 'custom')">
                            {{ obj }}
                        </p>
                    </SubMenu>
                    <SubMenu :name="'Selected regions'" :num-entries="regionData.selectedRegions.length">
                        <SelectedRegion
                            v-for="(obj, i) in regionData.selectedRegions"
                            :region-name="obj.regionName"
                            :idx="i"
                            :start-measure="getStartMeasure(obj.startTime)"
                            :end-measure="getEndMeasure(obj.endTime) - 1"
                            @click="selectRegion(i, obj)">
                        </SelectedRegion>
                    </SubMenu>
                    <SubMenu :name="'Difference regions'" :num-entries="regionData.diffRegions.length">
                        <DifferenceRegion
                            v-for="(obj, i) in regionData.diffRegions"
                            :region-name="obj.regionName"
                            :idx="i"
                            :start-time="getTimeString(obj.startTime, 14, 22)"
                            :end-time="getTimeString(obj.endTime, 14, 22)"
                            :start-time-target="getTimeString(obj.startTimeTarget, 14, 22)"
                            :end-time-target="getTimeString(obj.endTimeTarget, 14, 22)"
                            @click="selectRegion(i, obj)">
                        </DifferenceRegion>
                    </SubMenu>
                    <SubMenu
                        :name="'Relevant measures'"
                        @mouseover="selectRelevantMeasures()"
                        :num-entries="relevantMeasures.length">
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
                <div
                    v-show="regionToSave"
                    class="flex h-7 flex-row items-center justify-center gap-1 rounded-md text-sm dark:text-black">
                    <input
                        type="text"
                        id="name"
                        required
                        minlength="1"
                        maxlength="256"
                        size="20"
                        autocomplete="off"
                        class="input-field-nomargin h-7 w-36 border"
                        placeholder="Region name"
                        v-model="regionName" />
                    <button class="btn btn-blue" @click="saveRegion()">Save</button>
                </div>
            </div>
            <MeasureSelector
                :measure-count="measureData.measureCount"
                :current-measure="currentMeasure"
                :relevance-data="selectedRelevanceData"
                :time-signatures="regionData.timeSignatures"
                @go-to-measure="goToMeasure"
                @select-region="zoomOnMeasureSelection"
                ref="measureSelector" />
            <div
                id="label-feature"
                class="z-10 flex h-[1.5rem] w-full items-center justify-center gap-2 border-b bg-white py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
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
            <div
                id="container"
                class="relative flex h-[calc(100%-13rem)] w-full flex-row items-end border-b dark:border-gray-700">
                <div
                    id="audio-container"
                    class="flex h-full w-full flex-row overflow-x-hidden overflow-y-scroll pt-3 dark:border-gray-700">
                    <div id="audio-controls" class="flex w-[10rem] flex-col items-center justify-between gap-2 pl-5">
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
                                        'bg-red-600 text-white': obj.diff,
                                    }">
                                    <p class="font-bold">
                                        {{ i + 1 }}
                                    </p>
                                    <Popper
                                        v-if="obj.performer"
                                        :content="obj.performer + '; ' + obj.year + '; ' + obj.filename"
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
                                        @click="selectPeaks(i, true)">
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
                        <div id="audio-controls-pb" class="h-1 w-full shrink-0"></div>
                    </div>
                    <div id="audio-tracks" class="flex w-[calc(100%-10rem)] flex-col gap-2 px-2 dark:border-gray-700">
                        <div
                            v-for="(obj, i) in tracksFromDb.syncTracks"
                            class="flex h-16 w-full shrink-0 flex-row gap-2">
                            <div
                                class="w-[calc(100%-8rem)] border dark:border-gray-500 dark:bg-gray-400"
                                :id="`track-div-${i}`"></div>
                            <div
                                class="flex h-full w-[7.5rem] flex-col items-center justify-center rounded-md bg-neutral-200 text-sm text-black dark:bg-gray-400">
                                <div class="mono flex items-center justify-center text-xs">
                                    <p>
                                        {{ getTimeString(trackTimes[i], 14, 22) }}
                                    </p>
                                </div>
                                <div
                                    v-show="regionLengths[i] > 0"
                                    class="mono flex flex-row items-center justify-center gap-1 text-xs">
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
                        class="btn btn-gray flex h-[2rem] w-[2.5rem] items-center justify-center"
                        :class="{ 'bg-cyan-700 dark:bg-cyan-700': isPlaying }">
                        <Icon v-if="isPlaying" icon="ph:pause" width="20" class="text-white" />
                        <Icon v-else icon="ph:play" width="20" />
                    </button>

                    <button
                        id="back-button"
                        @click="rewind()"
                        class="btn btn-gray flex h-[2rem] w-[2.5rem] items-center justify-center">
                        <Icon icon="ph:skip-back" width="20" />
                    </button>

                    <button
                        id="measure-button"
                        @click="toggleMeasures()"
                        class="btn btn-gray flex h-[2rem] w-[2.5rem] items-center justify-center"
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
                        class="btn btn-gray flex h-[2rem] w-[2.5rem] items-center justify-center"
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
</style>
