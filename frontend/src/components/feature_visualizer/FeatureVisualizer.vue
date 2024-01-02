<script setup>
import { Icon } from '@iconify/vue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Popper from 'vue3-popper';
import {
    useFeatureData,
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
    chordsVisible,
    colors,
    currentMeasure,
    cursorPositions,
    endMeasureIdx,
    featureVisualizerOpened,
    isPlaying,
    labelSelectors,
    measuresVisible,
    peaksInstancesReady,
    percLoaded,
    playing,
    scatterVisible,
    selectedFeatureLists,
    selectedLabel,
    startMeasureIdx,
    timeSelections,
    trackLabels,
    trackNames,
    trackTimes,
    tracksVisible,
    volume,
    waveformsVisible,
} from './javascript/variables';

import {
    endTimes,
    goToMeasure,
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

import { addControls } from './javascript/controls';
import { selectRelevanceLabel, setFeatureLists } from './javascript/features';
import { addChordRegions, zoomOnMeasureSelection } from './javascript/regions';

import LoadingWindow from '../LoadingWindow.vue';
import ModuleTemplate from '../shared_components/ModuleTemplate.vue';
import SelectedRegion from '../shared_components/SelectedRegion.vue';
import SubMenu from '../shared_components/SubMenu.vue';
import FeatureName from './subcomponents/FeatureName.vue';
import LineChart from './subcomponents/LineChart.vue';
import LineChartMeasure from './subcomponents/LineChartMeasure.vue';
import MeasureSelector from './subcomponents/MeasureSelector.vue';
import ScatterRegression from './subcomponents/ScatterRegression.vue';

const modulesVisible = useModulesVisible(pinia);
const tracksFromDb = useTracksFromDb(pinia);
const featureData = useFeatureData(pinia);
const measureData = useMeasureData(pinia);
const regionData = useRegionData(pinia);
const menuButtonsDisable = useMenuButtonsDisable(pinia);

const measureSelector = ref(null);

onMounted(() => {
    addControls();
});

watch(startMeasureIdx, () => {
    if (startMeasureIdx.value === 0 && endMeasureIdx.value === measureData.measureCount - 1) {
        measureSelector.value.resetRegionOverlay();
    } else {
        measureSelector.value.setRegionOverlay(startMeasureIdx.value, endMeasureIdx.value);
    }
});

watch(allPeaksReady, () => {
    if (allPeaksReady.value) menuButtonsDisable.stopLoading();
});

modulesVisible.$subscribe((mutation, state) => {
    if (state.featureVisualizer && !featureVisualizerOpened.value) {
        initFeatVisualizer();
    } else if (!state.featureVisualizer && featureVisualizerOpened.value) {
        destroyFeatVisualizer();
    }
});

async function initFeatVisualizer() {
    menuButtonsDisable.startLoading('featureVisualizer');
    setFeatureLists();
    startMeasureIdx.value = 0;
    endMeasureIdx.value = measureData.measureCount - 1;
    tracksFromDb.syncTracks.forEach((track, idx) => {
        cursorPositions.value.push(0);
        peaksInstancesReady.value.push(false);
        playing.push(false);
        timeSelections.value.push(track.length_sec);
        trackLabels.value.push(undefined);
        tracksVisible.value.push(false);
        trackTimes.value.push(0.0);
        waveformsVisible.value.push(true);

        peaksInstances.push(null);
        idxArray.push(idx);
    });
    await initPlayer();
    measureSelector.value.init();
    featureVisualizerOpened.value = true;
}

function destroyFeatVisualizer() {
    cursorPositions.value = [];
    peaksInstancesReady.value = [];
    playing.splice(0);
    timeSelections.value = [];
    trackLabels.value = [];
    trackNames.value = [];
    tracksVisible.value = [];
    trackTimes.value = [];
    waveformsVisible.value = [];

    startMeasureIdx.value = 0;
    endMeasureIdx.value = measureData.measureCount - 1;
    selectedLabel.value = '';
    labelSelectors.value.fill(false);

    resetPlayer();
    peaksInstances.splice(0);
    idxArray.splice(0);
    measureSelector.value.destroy();
    featureVisualizerOpened.value = false;
}

onBeforeUnmount(() => {
    if (measureSelector.value !== null) measureSelector.value.destroy();
});

function showWaveform(idx) {
    waveformsVisible.value[idx] = !waveformsVisible.value[idx];
}

function showInPlots(idx) {
    tracksVisible.value[idx] = !tracksVisible.value[idx];
}

function showAllWaveforms() {
    if (waveformsVisible.value.includes(false)) {
        waveformsVisible.value.fill(true);
    } else {
        waveformsVisible.value.fill(false);
    }
}

function showAllInPlots() {
    if (tracksVisible.value.includes(false)) {
        tracksVisible.value.fill(true);
    } else {
        tracksVisible.value.fill(false);
    }
}
</script>

<template>
    <ModuleTemplate
        :module-title="'Feature visualization'"
        :module-identifier="'feat-visualisation'"
        :visible="modulesVisible.featureVisualizer"
        :is-disabled="!allPeaksReady">
        <template v-slot:window>
            <LoadingWindow
                :visible="!allPeaksReady"
                :loading-message="'Loading tracks...'"
                :progress-bar-perc="percLoaded" />
        </template>
        <template v-slot:module-content>
            <div class="flex h-[3rem] w-full items-center gap-2 border-b px-5 dark:border-gray-700">
                <SubMenu
                    :name="'Features'"
                    :num-entries="selectedFeatureLists.dynamicsTime.length + selectedFeatureLists.rhythmTime.length">
                    <FeatureName
                        :class="{ 'bg-neutral-200 dark:bg-gray-300': selectedFeatureLists.dynamicsTimeVisible[i] }"
                        v-for="(obj, i) in selectedFeatureLists.dynamicsTime"
                        :feat-name="obj.name"
                        :idx="i"
                        @click="
                            selectedFeatureLists.dynamicsTimeVisible[i] = !selectedFeatureLists.dynamicsTimeVisible[i]
                        " />
                    <FeatureName
                        :class="{ 'bg-neutral-200 dark:bg-gray-300': selectedFeatureLists.rhythmTimeVisible[i] }"
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
                        :class="{ 'bg-neutral-200 dark:bg-gray-300': labelSelectors[i] }"
                        class="flex h-7 shrink-0 items-center rounded-md px-2 hover:cursor-pointer hover:bg-neutral-200 dark:hover:bg-gray-400"
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
                        :class="{ 'bg-neutral-200 dark:bg-gray-300': selectedFeatureLists.dynamicsMeasureVisible[i] }"
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
                        v-for="(obj, i) in regionData.selectedRegions"
                        :region-name="obj.regionName"
                        :idx="i"
                        :start-time="getTimeString(obj.startTime, 14, 22)"
                        :end-time="getTimeString(obj.endTime, 14, 22)"
                        :start-measure="getStartMeasure(obj.startTime)"
                        :end-measure="getEndMeasure(obj.endTime)"
                        :beats-per-measure="obj.beatsPerMeasure"
                        :class="{ 'bg-neutral-200': regionData.selected[i] }"
                        @click="
                            zoomOnMeasureSelection(
                                getStartMeasure(obj.startTime) - 1,
                                getEndMeasure(obj.endTime) - 1,
                                i
                            )
                        ">
                    </SelectedRegion>
                </SubMenu>
                <button
                    class="btn btn-gray"
                    :class="{ 'bg-cyan-700 text-white dark:bg-cyan-700': scatterVisible }"
                    @click="scatterVisible = !scatterVisible">
                    Regression plot
                </button>
                <button
                    class="btn btn-gray"
                    :class="{ 'bg-cyan-700 text-white dark:bg-cyan-700': chordsVisible }"
                    @click="addChordRegions()">
                    Show chords
                </button>
            </div>
            <MeasureSelector
                :measure-count="measureData.measureCount"
                :time-signatures="regionData.timeSignatures"
                :current-measure="currentMeasure"
                @select-region="zoomOnMeasureSelection"
                @go-to-measure="goToMeasure"
                ref="measureSelector" />
            <div class="flex h-[calc(100%-11.5rem)] w-full flex-row border-b dark:border-gray-700">
                <div
                    id="tracklist"
                    class="flex h-full w-[12rem] flex-col items-center justify-start gap-2 overflow-y-scroll border-r p-2 dark:border-gray-700">
                    <div
                        v-for="(obj, i) in tracksFromDb.syncTracks"
                        :id="`audio-controls-${i}`"
                        :key="obj.filename"
                        class="dark: flex h-16 w-full shrink-0 flex-row items-center justify-start rounded-md bg-neutral-200 dark:bg-gray-400 dark:text-black">
                        <div
                            class="h-full w-[0.5rem] rounded-l-md"
                            :class="{
                                'bg-red-600': trackLabels[i] === false,
                                'bg-blue-600': trackLabels[i],
                                'bg-transparent': trackLabels[i] === undefined,
                            }"></div>
                        <div
                            class="flex h-full w-[calc(100%-1rem)] flex-col items-center justify-center gap-2 rounded-l-md py-2">
                            <div
                                class="flex h-3 flex-row items-center justify-center gap-1 rounded-md p-[8px] text-xs"
                                :class="{
                                    'bg-violet-800 text-white': obj.reference,
                                    'bg-red-600 text-white': obj.diff,
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
                                    @click="selectPeaks(i, true)">
                                    <Icon icon="material-symbols:volume-up-outline" width="20" />
                                </div>
                                <div
                                    class="flex h-[1.5rem] w-[1.5rem] cursor-pointer items-center justify-center rounded-md hover:bg-cyan-600 hover:text-white"
                                    :class="{
                                        'bg-cyan-700 text-white': waveformsVisible[i],
                                    }"
                                    @click="showWaveform(i)"
                                    @dblclick="showAllWaveforms()">
                                    <Icon icon="ph:waveform" width="20" />
                                </div>
                                <div
                                    class="flex h-[1.5rem] w-[1.5rem] cursor-pointer items-center justify-center rounded-md hover:bg-cyan-600 hover:text-white"
                                    :class="{
                                        'bg-cyan-700 text-white': tracksVisible[i],
                                    }"
                                    @click="showInPlots(i)"
                                    @dblclick="showAllInPlots()">
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
                <div id="feature-content" class="h-full w-[calc(100%-12rem)] overflow-x-hidden overflow-y-scroll">
                    <div id="audio-tracks" class="flex w-full flex-col gap-2 py-2 dark:border-gray-700">
                        <div
                            class=""
                            v-for="(obj, i) in tracksFromDb.syncTracks"
                            :class="{
                                hidden: !waveformsVisible[i],
                            }">
                            <div class="">
                                <div class="relative">
                                    <div class="pl-[45px]">
                                        <div
                                            class="h-16 w-full shrink-0 border-b border-t bg-transparent dark:border-gray-700 dark:bg-gray-400"
                                            :id="`track-div-${i}`"></div>
                                    </div>
                                    <div class="">
                                        <div
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
                                                :color="colors[i % 10]"
                                                class="h-[10rem]" />
                                            <div
                                                v-if="selectedFeatureLists.dynamicsTimeVisible[j]"
                                                class="absolute top-0 ml-[45px] flex h-7 items-center gap-1 rounded-md px-1 text-sm dark:text-gray-800">
                                                <input
                                                    :id="`${feat.name}-time-ymin-${i}`"
                                                    type="number"
                                                    v-model="feat.yMin"
                                                    class="h-5 w-16 rounded-md border dark:border-gray-700 dark:bg-gray-300"
                                                    step="0.1" />
                                                <input
                                                    :id="`${feat.name}-time-ymax-${i}`"
                                                    type="number"
                                                    v-model="feat.yMax"
                                                    class="h-5 w-16 rounded-md border dark:border-gray-700 dark:bg-gray-300"
                                                    step="0.1" />
                                            </div>
                                        </div>
                                        <div
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
                                                class="absolute top-0 ml-[45px] flex h-7 items-center gap-1 rounded-md px-1 text-sm dark:text-gray-800">
                                                <input
                                                    :id="`${feat.name}-time-ymin-${i}`"
                                                    type="number"
                                                    v-model="feat.yMin"
                                                    class="h-5 w-16 rounded-md border dark:border-gray-700 dark:bg-gray-300"
                                                    step="0.1" />
                                                <input
                                                    :id="`${feat.name}-time-ymax-${i}`"
                                                    type="number"
                                                    v-model="feat.yMax"
                                                    class="h-5 w-16 rounded-md border dark:border-gray-700 dark:bg-gray-300"
                                                    step="0.1" />
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        class="absolute top-0 h-full w-[1px] bg-red-500"
                                        :style="{
                                            marginLeft: `calc(${cursorPositions[i] * 100}% + ${
                                                (1 - cursorPositions[i]) * 45
                                            }px)`,
                                        }"></div>
                                </div>
                            </div>
                        </div>
                        <div v-for="(feat, j) in selectedFeatureLists.dynamicsMeasure" class="relative">
                            <LineChartMeasure
                                v-if="selectedFeatureLists.dynamicsMeasureVisible[j]"
                                :colors="colors"
                                :current-measure="currentMeasure"
                                :data="featureData.dynamics[feat.id]"
                                :end-measure-idx="endMeasureIdx"
                                :feature-name="feat.name"
                                :fpm="feat.fpm"
                                :label-names="selectedLabel"
                                :labels="trackLabels"
                                :start-measure-idx="startMeasureIdx"
                                :track-objects="tracksFromDb.syncTracks"
                                :units="feat.units"
                                :visible="tracksVisible"
                                :y-max="feat.yMax"
                                :y-min="feat.yMin"
                                class="h-[16rem]" />
                            <div
                                v-if="selectedFeatureLists.dynamicsMeasureVisible[j]"
                                class="absolute top-0 z-50 ml-[45px] flex h-7 items-center gap-1 rounded-md px-1 text-sm dark:text-gray-800">
                                <input
                                    :id="`${feat.name}-measure-ymin`"
                                    type="number"
                                    v-model="feat.yMin"
                                    class="h-5 w-16 rounded-md border px-1 dark:border-gray-700 dark:bg-gray-300"
                                    step="0.1" />
                                <input
                                    :id="`${feat.name}-measure-ymax`"
                                    type="number"
                                    v-model="feat.yMax"
                                    class="h-5 w-16 rounded-md border px-1 dark:border-gray-700 dark:bg-gray-300"
                                    step="0.1" />
                            </div>
                        </div>
                        <div v-for="(feat, j) in selectedFeatureLists.rhythmMeasure" class="relative">
                            <LineChartMeasure
                                v-if="selectedFeatureLists.rhythmMeasureVisible[j]"
                                :colors="colors"
                                :current-measure="currentMeasure"
                                :data="featureData.rhythm[feat.id]"
                                :end-measure-idx="endMeasureIdx"
                                :feature-name="feat.name"
                                :fpm="feat.fpm"
                                :label-names="selectedLabel"
                                :labels="trackLabels"
                                :start-measure-idx="startMeasureIdx"
                                :track-objects="tracksFromDb.syncTracks"
                                :units="feat.units"
                                :visible="tracksVisible"
                                :y-max="feat.yMax"
                                :y-min="feat.yMin"
                                class="h-[16rem]" />
                            <div
                                v-if="selectedFeatureLists.rhythmMeasureVisible[j]"
                                class="absolute top-0 z-50 ml-[45px] flex h-7 items-center gap-1 rounded-md px-1 text-sm dark:text-gray-800">
                                <input
                                    :id="`${feat.name}-measure-ymin`"
                                    type="number"
                                    v-model="feat.yMin"
                                    class="h-5 w-16 rounded-md border px-1 dark:border-gray-700 dark:bg-gray-300"
                                    step="0.1" />
                                <input
                                    :id="`${feat.name}-measure-ymax`"
                                    type="number"
                                    v-model="feat.yMax"
                                    class="h-5 w-16 rounded-md border px-1 dark:border-gray-700 dark:bg-gray-300"
                                    step="0.1" />
                            </div>
                        </div>
                        <div class="h-[30rem] w-full" v-if="scatterVisible">
                            <ScatterRegression
                                :colors="colors"
                                :label-names="selectedLabel"
                                :labels="trackLabels"
                                :time-selections="timeSelections"
                                :track-objects="tracksFromDb.syncTracks"
                                :visible="tracksVisible" />
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
