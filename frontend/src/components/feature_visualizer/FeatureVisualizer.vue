<script setup>
import { Icon } from '@iconify/vue';
import { ref } from 'vue';
import Popper from 'vue3-popper';
import { useFeatureData, useMeasureData, useModulesVisible, useRegionData, useTracksFromDb } from '../../globalStores';
import { pinia } from '../../piniaInstance';
import { getEndMeasure, getStartMeasure, getTimeString, truncateFilename } from '../../sharedFunctions';

import {
    allPeaksReady,
    colors,
    cursorPositions,
    featureVisualizerOpened,
    isPlaying,
    labelSelectors,
    measuresVisible,
    peaksInstancesReady,
    playing,
    selectedFeatureLists,
    selectedLabel,
    timeSelections,
    trackLabels,
    trackNames,
    tracksVisible,
    volume,
    waveformsVisible,
} from './javascript/variables';

import {
    endTimes,
    idxArray,
    initPlayer,
    peaksInstances,
    playPause,
    resetPlayer,
    rewind,
    selectPeaks,
    startTimes,
    toggleMeasures,
} from './javascript/player';

import { selectRelevanceLabel, setFeatureLists } from './javascript/features';

import LoadingWindow from '../LoadingWindow.vue';
import ModuleTemplate from '../ModuleTemplate.vue';
import SelectedRegion from '../shared_components/SelectedRegion.vue';
import SubMenu from '../shared_components/SubMenu.vue';
import FeatureName from './subcomponents/FeatureName.vue';
import LineChartMeasure from './subcomponents/LineChartMeasure.vue';
import MeasureSelector from './subcomponents/MeasureSelector.vue';
import ScatterRegression from './subcomponents/ScatterRegression.vue';

const modulesVisible = useModulesVisible(pinia);
const tracksFromDb = useTracksFromDb(pinia);
const featureData = useFeatureData(pinia);
const measureData = useMeasureData(pinia);
const regionData = useRegionData(pinia);

const measureSelector = ref(null);

modulesVisible.$subscribe((mutation, state) => {
    if (state.featureVisualizer && !featureVisualizerOpened.value) {
        initFeatVisualizer();
    } else if (!state.featureVisualizer && featureVisualizerOpened.value) {
        destroyFeatVisualizer();
    }
});

async function initFeatVisualizer() {
    setFeatureLists();
    tracksFromDb.syncTracks.forEach((track, idx) => {
        peaksInstancesReady.value.push(false);
        playing.push(false);
        timeSelections.value.push(track.length_sec);
        trackLabels.value.push(false);
        tracksVisible.value.push(true);
        cursorPositions.value.push(0);
        waveformsVisible.value.push(true);

        peaksInstances.push(null);
        idxArray.push(idx);
        startTimes.push(0);
        endTimes.push(track.length_sec);
    });
    await initPlayer();
    measureSelector.value.init();
    measuresVisible.value = true;
    featureVisualizerOpened.value = true;
}

function destroyFeatVisualizer() {
    tracksVisible.value = [];
    waveformsVisible.value = [];
    playing.splice(0);
    trackNames.value = [];
    timeSelections.value = [];
    trackLabels.value = [];
    peaksInstancesReady.value = [];
    resetPlayer();

    peaksInstances.splice(0);
    idxArray.splice(0);
    endTimes.splice(0);
    startTimes.splice(0);
    measuresVisible.value = false;
    featureVisualizerOpened.value = false;
}

function showWaveform(idx) {
    waveformsVisible.value[idx] = !waveformsVisible.value[idx];
}

function showInPlots(idx) {
    tracksVisible.value[idx] = !tracksVisible.value[idx];
}
</script>

<template>
    <ModuleTemplate
        :module-title="'Feature visualization'"
        :module-identifier="'feat-visualisation'"
        :visible="modulesVisible.featureVisualizer"
        :is-disabled="allPeaksReady">
        <template v-slot:window>
            <LoadingWindow :visible="allPeaksReady" :loading-message="'Loading tracks...'" :progress-bar-perc="0" />
        </template>
        <template v-slot:module-content>
            <div class="flex h-[3rem] w-full items-center gap-2 border-b px-5">
                <SubMenu
                    :name="'Features'"
                    :num-entries="selectedFeatureLists.dynamicsTime.length + selectedFeatureLists.rhythmTime.length">
                    <FeatureName
                        :class="{ 'bg-neutral-200': selectedFeatureLists.dynamicsTimeVisible[i] }"
                        v-for="(obj, i) in selectedFeatureLists.dynamicsTime"
                        :feat-name="obj.name"
                        :idx="i"
                        @click="
                            selectedFeatureLists.dynamicsTimeVisible[i] = !selectedFeatureLists.dynamicsTimeVisible[i]
                        " />
                    <FeatureName
                        :class="{ 'bg-neutral-200': selectedFeatureLists.rhythmTimeVisible[i] }"
                        v-for="(obj, i) in selectedFeatureLists.rhythmTime"
                        :feat-name="obj.name"
                        :idx="i"
                        @click="
                            selectedFeatureLists.rhythmTimeVisible[i] = !selectedFeatureLists.rhythmTimeVisible[i]
                        " />
                </SubMenu>
                <SubMenu :name="'Label'" :num-entries="measureData.labels.length">
                    <p
                        v-for="(obj, i) in measureData.labels"
                        :class="{ 'bg-neutral-200': labelSelectors[i] }"
                        class="flex h-7 shrink-0 items-center rounded-md px-2 hover:cursor-pointer hover:bg-neutral-200"
                        @click="selectRelevanceLabel(i)">
                        {{ obj }}
                    </p>
                </SubMenu>
                <SubMenu
                    :name="'Measure features'"
                    :num-entries="
                        selectedFeatureLists.dynamicsMeasure.length + selectedFeatureLists.rhythmMeasure.length
                    ">
                    <FeatureName
                        :class="{ 'bg-neutral-200': selectedFeatureLists.dynamicsMeasureVisible[i] }"
                        v-for="(obj, i) in selectedFeatureLists.dynamicsMeasure"
                        :feat-name="obj.name"
                        :idx="i"
                        @click="
                            selectedFeatureLists.dynamicsMeasureVisible[i] =
                                !selectedFeatureLists.dynamicsMeasureVisible[i]
                        " />
                    <FeatureName
                        :class="{ 'bg-neutral-200': selectedFeatureLists.rhythmMeasureVisible[i] }"
                        v-for="(obj, i) in selectedFeatureLists.rhythmMeasure"
                        :feat-name="obj.name"
                        :idx="i"
                        @click="
                            selectedFeatureLists.rhythmMeasureVisible[i] = !selectedFeatureLists.rhythmMeasureVisible[i]
                        " />
                </SubMenu>
                <SubMenu :name="'Selected regions'" :num-entries="regionData.selectedRegions.length">
                    <SelectedRegion
                        :class="{ 'bg-neutral-200': regionData.selected[i] }"
                        v-for="(obj, i) in regionData.selectedRegions"
                        :region-name="obj.regionName"
                        :idx="i"
                        :start-time="getTimeString(obj.startTime, 14, 22)"
                        :end-time="getTimeString(obj.endTime, 14, 22)"
                        :start-measure="getStartMeasure(obj.startTime)"
                        :end-measure="getEndMeasure(obj.endTime)"
                        :beats-per-measure="obj.beatsPerMeasure"
                        @click="
                            zoomOnMeasureSelection(getStartMeasure(obj.startTime) - 1, getEndMeasure(obj.endTime) - 1)
                        ">
                    </SelectedRegion>
                </SubMenu>
            </div>
            <MeasureSelector
                :measure-count="measureData.measureCount"
                :time-signatures="regionData.timeSignatures"
                @select-region=""
                ref="measureSelector" />
            <div class="flex h-[calc(100%-12rem)] w-full flex-row border-b">
                <div
                    id="tracklist"
                    class="flex h-full w-[12rem] flex-col items-center justify-start gap-2 overflow-y-scroll border-r p-2">
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
                                    @click="selectPeaks(i)">
                                    <Icon icon="material-symbols:volume-up-outline" width="20" />
                                </div>
                                <div
                                    class="flex h-[1.5rem] w-[1.5rem] cursor-pointer items-center justify-center rounded-md hover:bg-cyan-600 hover:text-white"
                                    :class="{
                                        'bg-cyan-700 text-white': waveformsVisible[i],
                                    }"
                                    @click="showWaveform(i)"
                                    @dblclick="waveformsVisible.fill(false)">
                                    <Icon icon="ph:waveform" width="20" />
                                </div>
                                <div
                                    class="flex h-[1.5rem] w-[1.5rem] cursor-pointer items-center justify-center rounded-md hover:bg-cyan-600 hover:text-white"
                                    :class="{
                                        'bg-cyan-700 text-white': tracksVisible[i],
                                    }"
                                    @click="showInPlots(i)"
                                    @dblclick="tracksVisible.fill(false)">
                                    <Icon icon="icon-park-solid:analysis" width="20" />
                                </div>
                            </div>
                        </div>
                        <div
                            class="h-full w-[0.5rem] rounded-r-md"
                            :style="{
                                backgroundColor: colors[i % 10],
                            }"></div>
                    </div>
                </div>
                <div id="feature-content" class="h-full w-[calc(100%-12rem)] overflow-y-scroll">
                    <div id="audio-tracks" class="flex w-full flex-col gap-2 py-5 dark:border-gray-700">
                        <div
                            class="border"
                            v-for="(obj, i) in tracksFromDb.syncTracks"
                            :class="{
                                hidden: !waveformsVisible[i],
                            }">
                            <div class="relative" :class="{ 'bg-blue-50 ': playing[i] }">
                                <div class="z-50 pl-[45px]">
                                    <div
                                        class="z-50 h-16 w-full shrink-0 dark:border-gray-500 dark:bg-gray-400"
                                        :id="`track-div-${i}`"></div>
                                </div>
                                <div class="">
                                    <!-- <div
                                        v-for="(feat, j) in selectedFeatureLists.dynamicsTime"
                                        class="relative flex flex-col gap-2">
                                        <LineChart
                                            v-if="selectedFeatureLists.dynamicsTimeVisible[j]"
                                            :feature-name="feat.name"
                                            :units="feat.units"
                                            :data="featureData.dynamics[feat.id][i].featData"
                                            :start="startTimes[i]"
                                            :end="endTimes[i]"
                                            :y-min="feat.yMin"
                                            :y-max="feat.yMax"
                                            :length-sec="obj.length_sec"
                                            :color="colors[i]"
                                            class="h-[10rem]" />
                                        <div
                                            v-if="selectedFeatureLists.dynamicsTimeVisible[j]"
                                            class="absolute top-0 ml-[45px] flex h-7 items-center gap-1 rounded-md border bg-neutral-200 px-1 text-sm">
                                            <input
                                                :id="`${feat.name}-measure-ymin`"
                                                type="number"
                                                v-model="feat.yMin"
                                                class="h-5 w-16 rounded-md"
                                                step="0.1" />
                                            <input
                                                :id="`${feat.name}-measure-ymax`"
                                                type="number"
                                                v-model="feat.yMax"
                                                class="h-5 w-16 rounded-md"
                                                step="0.1" />
                                        </div>
                                    </div> -->
                                    <!-- <div
                                        v-for="(feat, j) in selectedFeatureLists.rhythmTime"
                                        class="relative flex flex-col gap-2">
                                        <LineChart
                                            v-if="selectedFeatureLists.rhythmTimeVisible[j]"
                                            :feature-name="feat.name"
                                            :units="feat.units"
                                            :data="featureData.rhythm[feat.id][i].featData"
                                            :start="startTimes[i]"
                                            :end="endTimes[i]"
                                            :y-min="feat.yMin"
                                            :y-max="feat.yMax"
                                            :length-sec="obj.length_sec"
                                            :color="colors[i % 10]"
                                            class="h-[10rem]" />
                                        <div
                                            v-if="selectedFeatureLists.rhythmTimeVisible[j]"
                                            class="absolute top-0 ml-[45px] flex h-7 items-center gap-1 rounded-md border bg-neutral-200 px-1 text-sm">
                                            <input
                                                :id="`${feat.name}-time-ymin`"
                                                type="number"
                                                v-model="feat.yMin"
                                                class="h-5 w-16 rounded-md"
                                                step="0.1" />
                                            <input
                                                :id="`${feat.name}-time-ymax`"
                                                type="number"
                                                v-model="feat.yMax"
                                                class="h-5 w-16 rounded-md"
                                                step="0.1" />
                                        </div>
                                    </div> -->
                                </div>
                                <div
                                    class="absolute top-0 h-full w-[1px] bg-[red]"
                                    :style="{ marginLeft: cursorPositions[i] }"></div>
                            </div>
                        </div>
                        <div v-for="(feat, j) in selectedFeatureLists.dynamicsMeasure" class="relative">
                            <LineChartMeasure
                                v-if="selectedFeatureLists.dynamicsMeasureVisible[j]"
                                :feature-name="feat.name"
                                :track-names="trackNames"
                                :units="feat.units"
                                :data="featureData.dynamics[feat.id]"
                                :colors="colors"
                                :visible="tracksVisible"
                                :start-measure-idx="startMeasure"
                                :end-measure-idx="endMeasure"
                                :y-min="feat.yMin"
                                :y-max="feat.yMax"
                                :fpm="feat.fpm"
                                class="h-[16rem]" />
                            <div
                                v-if="selectedFeatureLists.dynamicsMeasureVisible[j]"
                                class="absolute top-0 ml-[45px] flex h-7 items-center gap-1 rounded-md border bg-neutral-200 px-1 text-sm">
                                <input
                                    :id="`${feat.name}-measure-ymin`"
                                    type="number"
                                    v-model="feat.yMin"
                                    class="h-5 w-16 rounded-md"
                                    step="0.1" />
                                <input
                                    :id="`${feat.name}-measure-ymax`"
                                    type="number"
                                    v-model="feat.yMax"
                                    class="h-5 w-16 rounded-md"
                                    step="0.1" />
                            </div>
                        </div>
                        <div v-for="(feat, j) in selectedFeatureLists.rhythmMeasure" class="relative">
                            <LineChartMeasure
                                v-if="selectedFeatureLists.rhythmMeasureVisible[j]"
                                :feature-name="feat.name"
                                :track-names="trackNames"
                                :units="feat.units"
                                :data="featureData.rhythm[feat.id]"
                                :colors="colors"
                                :visible="tracksVisible"
                                :start-measure-idx="startMeasure"
                                :end-measure-idx="endMeasure"
                                :y-min="feat.yMin"
                                :y-max="feat.yMax"
                                :fpm="feat.fpm"
                                class="h-[16rem]" />
                            <div
                                v-if="selectedFeatureLists.rhythmMeasureVisible[j]"
                                class="absolute top-0 ml-[45px] flex h-7 items-center gap-1 rounded-md border bg-neutral-200 px-1 text-sm">
                                <input
                                    :id="`${feat.name}-measure-ymin`"
                                    type="number"
                                    v-model="feat.yMin"
                                    class="h-5 w-16 rounded-md"
                                    step="0.1" />
                                <input
                                    :id="`${feat.name}-measure-ymax`"
                                    type="number"
                                    v-model="feat.yMax"
                                    class="h-5 w-16 rounded-md"
                                    step="0.1" />
                            </div>
                        </div>
                        <div class="h-[30rem] w-full">
                            <ScatterRegression
                                :colors="colors"
                                :labels="trackLabels"
                                :track-objects="tracksFromDb.syncTracks"
                                :time-selections="timeSelections"
                                :visible="tracksVisible"
                                :label-names="selectedLabel" />
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

<style scoped></style>
