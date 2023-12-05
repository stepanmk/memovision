<script setup>
import { Icon } from '@iconify/vue';
import { onBeforeUnmount, ref, watch } from 'vue';
import { useMeasureData, useMenuButtonsDisable, useModulesVisible, useRegionData } from '../../globalStores';
import { pinia } from '../../piniaInstance';
import { getEndMeasure, getStartMeasure, getTimeString } from '../../sharedFunctions';

import {
    amplitudeZoom,
    currentRMS,
    currentTime,
    endMeasureIdx,
    endTimeString,
    loopingActive,
    measuresVisible,
    metronomeActive,
    metronomeVolume,
    noteCount,
    noteValue,
    performer,
    playing,
    refName,
    regionBeingNamed,
    regionName,
    regionSelectorOpened,
    startMeasureIdx,
    startTimeString,
    timeSignatureEdit,
    volume,
    year,
} from './javascript/variables';

import {
    addRegion,
    cancelRegionAdding,
    deleteAllRegions,
    deleteRegion,
    deleteTimeSignature,
    saveRegion,
    saveTimeSignature,
    selectRegion,
    updateRegion,
} from './javascript/regions';

import {
    destroyPeaks,
    initPeaks,
    playPause,
    rewind,
    toggleLooping,
    toggleMeasures,
    toggleMetronome,
} from './javascript/player';

import ModuleTemplate from '../ModuleTemplate.vue';
import MeasureSelector from './subcomponents/MeasureSelector.vue';

// pinia stores
const modulesVisible = useModulesVisible(pinia);
const menuButtonsDisable = useMenuButtonsDisable(pinia);
const measureData = useMeasureData(pinia);
const regionData = useRegionData(pinia);
const measureSelector = ref(null);

watch(startMeasureIdx, () => {
    if (startMeasureIdx.value === -1) {
        measureSelector.value.resetRegionOverlay();
    } else if (startMeasureIdx.value > -1 && !regionBeingNamed.value) {
        measureSelector.value.setRegionOverlay(startMeasureIdx.value, endMeasureIdx.value);
    }
});

modulesVisible.$subscribe((mutation, state) => {
    if (state.regionSelector && !regionSelectorOpened.value) {
        initRegionSelector();
    } else if (!state.regionSelector && regionSelectorOpened.value) {
        destroyRegionSelector();
    }
});

function initRegionSelector() {
    menuButtonsDisable.startLoading('regionSelector');
    setTimeout(() => {
        initPeaks();
        measureSelector.value.init();
    }, 100);
    regionSelectorOpened.value = true;
}

function destroyRegionSelector() {
    playing.value = false;
    loopingActive.value = false;
    const regionIdx = regionData.selected.indexOf(true);
    if (regionIdx !== -1) updateRegion(regionIdx);
    measureSelector.value.destroy();
    performer.value = '';
    destroyPeaks();
    regionSelectorOpened.value = false;
}

onBeforeUnmount(() => {
    if (measureSelector.value !== null) measureSelector.value.destroy();
    refName.value = '';
    performer.value = '';
    volume.value = 0.0;
});
</script>

<template>
    <ModuleTemplate
        :is-disabled="false"
        :visible="modulesVisible.regionSelector"
        :module-title="'Region selection'"
        :module-identifier="'region-selector'">
        <template v-slot:module-content>
            <div class="flex h-12 w-full items-center justify-center gap-1 border-b text-sm dark:border-gray-700">
                <p>Selected reference:</p>
                <p class="flex h-7 items-center justify-center rounded-md bg-neutral-200 px-2">
                    {{ refName }}
                </p>
                <p v-if="performer">Performer:</p>
                <p v-if="performer" class="flex h-7 items-center justify-center rounded-md bg-neutral-200 px-2">
                    {{ performer }}
                </p>
                <p v-if="year">Year:</p>
                <p v-if="year" class="flex h-7 items-center justify-center rounded-md bg-neutral-200 px-2">
                    {{ year }}
                </p>
            </div>
            <div class="flex w-full flex-row">
                <div class="flex w-[calc(100%-2rem)] flex-col">
                    <div class="flex w-full flex-col items-center border-b px-5 dark:border-gray-700">
                        <div id="overview-container" class="h-16 w-full cursor-text dark:bg-gray-400"></div>
                    </div>

                    <div class="flex w-full flex-row items-center justify-end gap-5 border-b px-5 dark:border-gray-700">
                        <div id="zoomview-container" class="h-40 w-full cursor-text dark:bg-gray-400"></div>

                        <div
                            id="zoomview-amplitude"
                            class="absolute flex h-32 w-7 flex-col items-center justify-center">
                            <div
                                class="flex h-full w-full flex-col items-center justify-between rounded-md bg-neutral-200">
                                <Icon icon="ic:baseline-plus" width="18" />
                                <input
                                    type="range"
                                    min="1"
                                    max="4"
                                    step="0.01"
                                    class="h-1 w-20 accent-cyan-600"
                                    id="amplitude-zoom"
                                    v-model="amplitudeZoom" />
                                <Icon icon="ic:baseline-minus" width="18" />
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    class="flex h-full w-[2rem] flex-row items-end gap-[1px] border-b border-l px-1 dark:border-gray-700">
                    <div
                        id="meter-rect-l"
                        class="w-[calc(50%)] bg-cyan-700"
                        :style="{ height: `calc(${(1 - Math.abs(currentRMS[0]) / 60) * 100}%)` }"></div>
                    <div
                        id="meter-rect-r"
                        class="w-[calc(50%)] bg-cyan-700"
                        :style="{ height: `calc(${(1 - Math.abs(currentRMS[1]) / 60) * 100}%)` }"></div>
                </div>
            </div>

            <MeasureSelector
                :measure-count="measureData.measureCount"
                :time-signatures="regionData.timeSignatures"
                ref="measureSelector"
                @select-region="addRegion"
                @delete-time-signature="deleteTimeSignature" />
            <div
                id="player-controls"
                class="flex h-[3rem] w-full flex-row items-center justify-between gap-2 border-b pl-5 pr-5 dark:border-gray-700">
                <div class="flex h-full flex-row items-center justify-center gap-1">
                    <button
                        id="pause-button"
                        @click="playPause()"
                        class="btn btn-gray flex h-[2rem] w-[2.5rem] items-center justify-center"
                        :class="{ 'bg-cyan-700 text-white dark:bg-cyan-700': playing }">
                        <Icon v-if="playing" icon="ph:pause" width="20" />
                        <Icon v-else icon="ph:play" width="20" />
                    </button>
                    <button
                        id="back-button"
                        @click="rewind()"
                        class="btn btn-gray flex h-[2rem] w-[2.5rem] items-center justify-center">
                        <Icon icon="ph:skip-back" width="20" />
                    </button>
                    <button
                        id="loop-button"
                        @click="toggleLooping()"
                        class="btn btn-gray flex h-[2rem] w-[2.5rem] items-center justify-center"
                        :class="{
                            'bg-cyan-700 dark:bg-cyan-700': loopingActive,
                        }">
                        <Icon icon="mdi:loop" width="20" :class="{ 'text-white': loopingActive }" />
                    </button>
                    <button
                        id="measure-button"
                        @click="toggleMeasures()"
                        class="btn btn-gray flex h-[2rem] w-[2.5rem] items-center justify-center"
                        :class="{ 'bg-cyan-700 dark:bg-cyan-700': measuresVisible }">
                        <Icon
                            icon="akar-icons:three-line-vertical"
                            width="20"
                            :class="{ 'text-white': measuresVisible }" />
                    </button>
                    <div
                        class="flex h-8 flex-row items-center justify-center gap-1 rounded-md bg-neutral-200 dark:bg-gray-400">
                        <button
                            id="metronome-button"
                            @click="toggleMetronome()"
                            class="btn btn-gray flex h-[2rem] w-[2.5rem] items-center justify-center"
                            :class="{ 'bg-cyan-700 dark:bg-cyan-700': metronomeActive }">
                            <Icon icon="ph:metronome" width="22" :class="{ 'text-white': metronomeActive }" />
                        </button>
                        <input
                            type="range"
                            min="-30"
                            max="0"
                            step="0.1"
                            v-model="metronomeVolume"
                            class="mr-2 h-1 w-24 accent-cyan-600"
                            id="metronome-volume"
                            @dblclick="metronomeVolume = -6.0" />
                    </div>
                </div>
                <div class="flex flex-row items-center justify-center gap-2">
                    <Icon icon="material-symbols:volume-up-outline" width="24" />
                    <input
                        type="range"
                        min="-30"
                        max="0"
                        step="0.1"
                        v-model="volume"
                        class="h-1 w-24 accent-cyan-600"
                        id="volume"
                        @dblclick="volume = 0.0" />
                    <div class="flex w-24 items-center justify-start rounded-md bg-yellow-400 pl-[18px] text-sm">
                        <p class="select-none text-black dark:text-black">{{ currentTime }}</p>
                    </div>
                </div>
            </div>
            <div
                class="flex h-[1.75rem] w-full items-center justify-between border-b pl-5 pr-5 dark:border-gray-700 dark:text-gray-300">
                <span class="select-none text-sm">Selected regions</span>
            </div>
            <div
                class="items-left relative flex h-[calc(100%-30.25rem)] w-full flex-col gap-1 overflow-y-auto border-b px-5 py-3 dark:border-gray-700">
                <div
                    v-for="(obj, i) in regionData.selectedRegions"
                    :id="`region-${i}`"
                    :key="i"
                    class="flex h-7 w-full items-center justify-between rounded-md bg-neutral-200 px-2 text-sm hover:bg-neutral-300"
                    :class="{
                        'bg-neutral-300 dark:bg-gray-600': regionData.selected[i],
                    }">
                    <p class="flex h-full w-full cursor-pointer items-center" @click="selectRegion(i)">
                        {{ obj.regionName }}
                    </p>
                    <div class="flex h-full gap-2 rounded-md py-1 dark:bg-gray-400 dark:hover:bg-gray-700">
                        <p
                            class="flex w-20 select-none items-center justify-center rounded-md bg-green-500 text-xs text-white">
                            {{ getTimeString(obj.startTime, 14, 22) }}
                        </p>
                        <p
                            class="flex w-20 select-none items-center justify-center rounded-md bg-red-500 text-xs text-white">
                            {{ getTimeString(obj.endTime, 14, 22) }}
                        </p>
                        <p
                            class="flex w-32 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                            Measures: {{ getStartMeasure(obj.startTime) }}–{{ getEndMeasure(obj.endTime) - 1 }}
                        </p>
                        <div
                            class="flex w-[1.5rem] cursor-pointer items-center justify-center transition hover:text-red-600"
                            :id="`remove-button-${i}`">
                            <Icon icon="fluent:delete-48-regular" :inline="true" width="18" @click="deleteRegion(i)" />
                        </div>
                    </div>
                </div>
                <div
                    v-if="regionBeingNamed"
                    id="region-name-overlay"
                    class="absolute left-0 top-0 flex h-full w-full flex-col items-center justify-center gap-1 bg-white">
                    <div class="flex flex-row gap-1">
                        <span
                            class="flex h-5 w-20 select-none items-center justify-center rounded-md bg-green-500 text-sm text-white"
                            >{{ startTimeString }}</span
                        >
                        <span
                            class="flex h-5 w-20 select-none items-center justify-center rounded-md bg-red-500 text-sm text-white"
                            >{{ endTimeString }}</span
                        >
                        <span
                            class="flex h-5 w-36 select-none items-center justify-center rounded-md bg-neutral-700 text-sm text-white"
                            >Measures: {{ startMeasureIdx + 1 }}–{{ endMeasureIdx + 1 }}</span
                        >
                    </div>
                    <input
                        v-if="!timeSignatureEdit"
                        type="text"
                        id="name"
                        required
                        minlength="1"
                        maxlength="256"
                        size="20"
                        autocomplete="off"
                        class="input-field-nomargin h-7 border"
                        placeholder="Region name"
                        v-model="regionName"
                        v-on:keyup.enter="saveRegion()" />
                    <div v-if="timeSignatureEdit" id="measure-input" class="flex flex-row items-center gap-1">
                        <div class="flex h-7 select-none items-center rounded-md bg-neutral-200 p-2 text-sm">
                            Time signature:
                        </div>
                        <input
                            type="number"
                            id="note-value"
                            minlength="1"
                            maxlength="1"
                            autocomplete="off"
                            min="1"
                            placeholder="1"
                            v-model="noteCount"
                            class="input-field-nomargin h-7 w-12 border" />
                        <p>/</p>
                        <input
                            type="number"
                            id="note-count"
                            minlength="1"
                            maxlength="1"
                            autocomplete="off"
                            min="1"
                            placeholder="1"
                            v-model="noteValue"
                            class="input-field-nomargin h-7 w-12 border" />
                    </div>
                    <div id="region-adding-buttons" class="flex flex-row items-center justify-center gap-2">
                        <button @click="timeSignatureEdit ? saveTimeSignature() : saveRegion()" class="btn btn-blue">
                            <span>Save</span>
                        </button>
                        <button @click="cancelRegionAdding()" class="btn btn-blue">
                            <span>Cancel</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="flex h-[3rem] w-full flex-row items-center justify-end gap-2 p-5">
                <button
                    @click="regionBeingNamed ? null : (timeSignatureEdit = !timeSignatureEdit)"
                    class="btn btn-gray"
                    :class="{ 'bg-cyan-700 text-white': timeSignatureEdit }">
                    <span>Edit time signatures</span>
                </button>
                <button
                    @click="regionBeingNamed ? null : deleteAllRegions()"
                    class="btn btn-blue"
                    :class="{ 'btn-disabled': regionBeingNamed }">
                    <span>Delete all regions</span>
                </button>
            </div>
        </template>
    </ModuleTemplate>
</template>

<style scoped>
input#name:focus,
input#start-measure:focus,
input#end-measure:focus,
input#note-value:focus,
input#note-count:focus {
    outline: 2px solid rgb(14, 116, 144);
}

input#amplitude-zoom {
    transform: rotate(270deg);
}
</style>
