<script setup>
import ModuleTemplate from '../ModuleTemplate.vue';
import { api } from '../../axiosInstance';
import {
    useModulesVisible,
    useTracksFromDb,
    useAudioStore,
    useFeatureData,
    useFeatureLists,
    useMeasureData,
} from '../../globalStores';
import { truncateFilename, getSecureConfig } from '../../sharedFunctions';
import { Icon } from '@iconify/vue';
import Peaks from 'peaks.js';
import { ref, reactive, watch } from 'vue';
import { pinia } from '../../piniaInstance';
import Popper from 'vue3-popper';

import LineChart from './LineChart.vue';
import LineChartMeasure from './LineChartMeasure.vue';
import LineChartUplot from './LineChartUplot.vue';
import MeasureSelector from './MeasureSelector.vue';

const modulesVisible = useModulesVisible(pinia);
const tracksFromDb = useTracksFromDb(pinia);
const audioStore = useAudioStore(pinia);
const featureData = useFeatureData(pinia);
const featureLists = useFeatureLists(pinia);
const measureData = useMeasureData(pinia);

// audio context stuff
const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
gainNode.connect(audioCtx.destination);
const volume = ref([1]);

const rampUp = new Float32Array(10);
const rampDown = new Float32Array(10);
function createFadeRamps() {
    for (let i = 0; i < 10; i++) {
        rampUp[i] = Math.pow(i / 9, 3) * volume.value;
        rampDown[rampUp.length - i - 1] = Math.pow(i / 9, 3) * volume.value;
    }
}
const fadeIn = () => gainNode.gain.setValueCurveAtTime(rampUp, audioCtx.currentTime, 0.01);
const fadeOut = () => gainNode.gain.setValueCurveAtTime(rampDown, audioCtx.currentTime, 0.01);

watch(volume, () => {
    gainNode.gain.setValueAtTime(volume.value, audioCtx.currentTime);
    createFadeRamps();
});

let matplotlibColors = [
    '#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd',
    '#8c564b',
    '#e377c2',
    '#7f7f7f',
    '#bcbd22',
    '#17becf',
];

const isPlaying = ref(false);
const tracksVisible = ref([]);
const playing = ref([]);
const regionOverlay = ref([]);

let syncPoints = null;
let activePeaksIdx = 0;
let peaksInstances = [];
let idxArray = [];
let selectedMeasureData = [];
let selectedFeatureLists = reactive({});
let startTimes = [];
let endTimes = [];

const cursorPositions = ref([]);
const measureSelector = ref(null);

function initFeatVisualizer() {
    getSyncPoints();
    getMeasureData();

    tracksFromDb.syncTracks.forEach((track, idx) => {
        tracksVisible.value.push(true);
        playing.value.push(false);

        peaksInstances.push(null);
        idxArray.push(idx);
        cursorPositions.value.push(0);
        startTimes.push(0);
        endTimes.push(track.length_sec);

        audioCtx.resume();
        createFadeRamps();
        measuresVisible.value = true;
    });

    setTimeout(() => {
        tracksFromDb.syncTracks.forEach((track, idx) => {
            addTrack(track.filename, idx);
        });
        measureSelector.value.init();
        getFeatureLists();
    }, 50);
}

function destroyFeatVisualizer() {
    tracksVisible.value = [];
    playing.value = [];

    peaksInstances = [];
    idxArray = [];
    cursorPositions.value = [];
    regionOverlay.value = [];
    selectedMeasureData = [];

    // startTimes = [];
    // endTimes = [];
    tracksFromDb.syncTracks.forEach((track, idx) => {
        startTimes[idx] = 0;
        endTimes[idx] = track.length_sec;
    });
    measureSelector.value.destroy();
}

let featVisualizerOpened = false;

modulesVisible.$subscribe((mutation, state) => {
    if (state.featureVisualizer && !featVisualizerOpened) {
        featVisualizerOpened = true;
        initFeatVisualizer();
        console.log('Feat Visualizer opened!');
    } else if (!state.featureVisualizer && featVisualizerOpened) {
        featVisualizerOpened = false;
        destroyFeatVisualizer();

        console.log('Feat Visualizer closed!');
    }
});

async function getSyncPoints() {
    const syncPointsRes = await api.get('/get-sync-points', getSecureConfig());
    syncPoints = syncPointsRes.data;
}

function getFeatureLists() {
    selectedFeatureLists['dynamicsTime'] = [];
    selectedFeatureLists['dynamicsMeasure'] = [];
    selectedFeatureLists['rhythmTime'] = [];
    selectedFeatureLists['rhythmMeasure'] = [];
    featureLists.dynamicsMetadata.forEach((feat) => {
        if (featureLists.dynamicsTime.includes(feat.id)) {
            selectedFeatureLists['dynamicsTime'].push(feat);
        }
        if (featureLists.dynamicsMeasure.includes(feat.id)) {
            selectedFeatureLists['dynamicsMeasure'].push(feat);
        }
    });
    featureLists.rhythmMetadata.forEach((feat) => {
        if (featureLists.rhythmTime.includes(feat.id)) {
            selectedFeatureLists['rhythmTime'].push(feat);
        }
        if (featureLists.rhythmMeasure.includes(feat.id)) {
            selectedFeatureLists['rhythmMeasure'].push(feat);
        }
    });
}

const startMeasure = ref(0);
const endMeasure = ref(0);
function getMeasureData() {
    for (let i = 0; i < tracksFromDb.syncTracks.length; i++) {
        const filename = tracksFromDb.syncTracks[i].filename;
        if (tracksFromDb.syncTracks[i].gt_measures) {
            const measures = measureData.getObject(filename).gt_measures;
            selectedMeasureData.push(measures);
            for (let j = 1; j < measures.length - 2; j++) {
                regionOverlay.value.push(false);
            }
        } else {
            selectedMeasureData.push(measureData.getObject(filename).tf_measures);
        }
    }
    endMeasure.value = selectedMeasureData[0].length - 3;
}

function makeVisible(idx) {
    tracksVisible.value[idx] = !tracksVisible.value[idx];
}

function waveformListener(idx, event) {
    if (idx !== activePeaksIdx) {
        selectPeaks(idx);
        console.log('selected peaks!');
    }
}

function addTrack(filename, idx) {
    const audioElement = document.getElementById(`audio-${idx}`);
    const audio = audioStore.getAudio(filename);
    audioElement.src = URL.createObjectURL(audio);
    const audioSource = audioCtx.createMediaElementSource(audioElement);
    audioSource.connect(gainNode);
    // get waveform data
    const waveformData = audioStore.getWaveformData(filename);
    const waveformContainer = document.getElementById(`track-div-${idx}`);
    waveformContainer.addEventListener('mousedown', waveformListener.bind(event, idx));
    // peaks.js options
    const options = {
        zoomview: {
            segmentOptions: {
                style: 'overlay',
                overlayOffset: 0,
                overlayOpacity: 0.15,
                overlayCornerRadius: 0,
            },
            container: waveformContainer,
            playheadColor: 'rgba(0, 0, 0, 0)',
            playheadClickTolerance: 2500,
            waveformColor: 'rgb(17 24 39)',
            axisLabelColor: 'rgb(17 24 39)',
            axisGridlineColor: 'rgb(17 24 39)',
        },
        mediaElement: audioElement,
        dataUri: {
            arraybuffer: URL.createObjectURL(waveformData),
        },
        showAxisLabels: true,
        emitCueEvents: true,
        fontSize: 12,
        zoomLevels: [1024, 2048, 4096, 'auto'],
    };
    Peaks.init(options, (err, peaks) => {
        if (err) console.log(err);
        peaksInstances[idx] = peaks;
        const view = peaksInstances[idx].views.getView('zoomview');
        view.setZoom({ seconds: tracksFromDb.syncTracks[idx].length_sec + 0.01 });
        view.enableAutoScroll(false);
        setCursorPos(idx, 0);
        addMeasuresToPeaksInstance(idx);
        if (idx === 0) {
            selectPeaks(idx);
        }
        peaksInstances[idx].on('player.timeupdate', (time) => {
            setCursorPos(idx, time);
        });
    });
}

function setCursorPos(idx, time) {
    cursorPositions.value[idx] = `calc(${99.9 * ((time - startTimes[idx]) / (endTimes[idx] - startTimes[idx]))}% + ${
        30 * (1 - (time - startTimes[idx]) / (endTimes[idx] - startTimes[idx]))
    }px)`;
}

function addMeasuresToPeaksInstance(idx) {
    for (let j = 1; j < selectedMeasureData[idx].length - 1; j++) {
        let labelText = `${j}`;
        peaksInstances[idx].points.add({
            time: selectedMeasureData[idx][j],
            labelText: labelText,
            editable: false,
            color: 'rgb(0, 0, 200)',
        });
    }
}

const measuresVisible = ref(false);
function toggleMeasures() {
    if (measuresVisible.value) {
        peaksInstances.forEach((peaksInstance) => {
            peaksInstance.points.removeAll();
        });
        measuresVisible.value = false;
    } else {
        for (let i = 0; i < tracksFromDb.syncTracks.length; i++) {
            addMeasuresToPeaksInstance(i);
        }
        measuresVisible.value = true;
    }
}

function findClosestTimeIdx(peaksIdx, time) {
    const closestTime = syncPoints[peaksIdx].reduce((prev, curr) =>
        Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev
    );
    return syncPoints[peaksIdx].indexOf(closestTime);
}

function seekCallback(time) {
    let closestTimeIdx = findClosestTimeIdx(activePeaksIdx, time);
    selectedIndices.forEach((idx) => {
        peaksInstances[idx].player.seek(syncPoints[idx][closestTimeIdx]);
    });
}

let prevPeaksIdx = null;
let selectedIndices = null;
async function selectPeaks(idx) {
    selectedIndices = idxArray.slice();
    selectedIndices.splice(idx, 1);
    if (prevPeaksIdx !== null) {
        playing.value[prevPeaksIdx] = false;
        if (isPlaying.value) {
            fadeOut();
            await sleep(10);
            peaksInstances[prevPeaksIdx].player.pause();
        }
        peaksInstances[prevPeaksIdx].off('player.timeupdate', seekCallback);
    }
    // add seekCallback to peaks instance specified by idx
    playing.value[idx] = true;
    activePeaksIdx = idx;
    peaksInstances[idx].on('player.timeupdate', seekCallback);
    // if playing is active
    if (isPlaying.value) {
        // play currently selected region if it is not null
        const selectedRegion = peaksInstances[idx].segments.getSegment('selectedRegion');
        if (selectedRegion !== null) {
            peaksInstances[idx].player.playSegment(selectedRegion, true);
            await sleep(10);
            fadeIn();
        }
        // otherwise just continue playing at the current cursor position
        else {
            peaksInstances[idx].player.play();
            await sleep(10);
            fadeIn();
        }
    }
    prevPeaksIdx = idx;
}

async function playPause() {
    // pause playing if it is active
    if (isPlaying.value) {
        fadeOut();
        await sleep(10);
        peaksInstances[activePeaksIdx].player.pause();
    } else {
        // play currently selected region if it is not null
        const selectedRegion = peaksInstances[activePeaksIdx].segments.getSegment('selectedRegion');
        if (selectedRegion !== null) {
            peaksInstances[activePeaksIdx].player.playSegment(selectedRegion, true);
            fadeIn();
        }
        // otherwise just continue playing at the current cursor position
        else {
            peaksInstances[activePeaksIdx].player.play();
            fadeIn();
        }
    }
    isPlaying.value = !isPlaying.value;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rewind() {
    fadeOut();
    await sleep(20);
    peaksInstances[activePeaksIdx].player.seek(0);
    fadeIn();
}

function hideAllRegions() {
    peaksInstances.forEach((peaksInstance, idx) => {
        startTimes[idx] = 0;
        endTimes[idx] = tracksFromDb.syncTracks[idx].length_sec;
        peaksInstance.segments.removeAll();
    });
}

function zoomOut() {
    peaksInstances.forEach((peaksInstance, idx) => {
        const view = peaksInstance.views.getView('zoomview');
        view.setZoom({ seconds: tracksFromDb.syncTracks[idx].length_sec + 0.01 });
        setCursorPos(idx, 0);
    });
    startMeasure.value = 0;
    endMeasure.value = selectedMeasureData[0].length - 3;
}

function zoomOnMeasureSelection(startMeasureIdx, endMeasureIdx) {
    hideAllRegions();
    startMeasure.value = startMeasureIdx;
    endMeasure.value = endMeasureIdx;
    if (startMeasureIdx === -1) {
        zoomOut();
        return;
    }
    peaksInstances[activePeaksIdx].player.seek(selectedMeasureData[activePeaksIdx][startMeasureIdx + 1]);
    for (let i = 0; i < peaksInstances.length; i++) {
        const view = peaksInstances[i].views.getView('zoomview');
        startTimes[i] = selectedMeasureData[i][startMeasureIdx + 1];
        endTimes[i] = selectedMeasureData[i][endMeasureIdx + 2];
        setCursorPos(i, selectedMeasureData[i][startMeasureIdx + 1]);
        view.setZoom({
            seconds: selectedMeasureData[i][endMeasureIdx + 2] - selectedMeasureData[i][startMeasureIdx + 1],
        });
        view.setStartTime(selectedMeasureData[i][startMeasureIdx + 1]);
        view.enableAutoScroll(false);
        peaksInstances[i].segments.add({
            color: 'grey',
            borderColor: 'grey',
            startTime: selectedMeasureData[i][startMeasureIdx + 1],
            endTime: selectedMeasureData[i][endMeasureIdx + 2],
            id: 'selectedRegion',
        });
    }
}
</script>

<template>
    <ModuleTemplate
        :module-title="'Feature visualization'"
        :module-identifier="'feat-visualisation'"
        :visible="modulesVisible.featureVisualizer"
        :is-disabled="false">
        <template v-slot:module-content>
            <MeasureSelector
                :all-measure-data="selectedMeasureData"
                :measure-data="selectedMeasureData[0]"
                :peaks-instances="peaksInstances"
                @zoom-on="zoomOnMeasureSelection"
                ref="measureSelector" />

            <div class="h-[3rem] w-full border-b bg-yellow-100"></div>
            <div class="flex h-[calc(100%-10rem)] w-full flex-row border-b">
                <div
                    id="tracklist"
                    class="flex h-full w-[12rem] flex-col items-center justify-start gap-1 overflow-y-scroll border-r p-2">
                    <!-- <div
                        v-for="(obj, i) in tracksFromDb.syncTracks"
                        class="flex h-7 w-full shrink-0 cursor-pointer select-none rounded-md bg-neutral-200 text-xs">
                        <p
                            class="flex h-full w-[calc(100%-2rem)] items-center justify-center rounded-l-md hover:bg-cyan-600 hover:text-white"
                            :class="{
                                'bg-cyan-700 text-white': tracksVisible[i],
                            }"
                            @click="makeVisible(i)">
                            {{ truncateFilename(obj.filename, 11) }}
                        </p>
                        <div
                            class="flex h-full w-[2rem] items-center justify-center rounded-r-md hover:bg-cyan-600 hover:text-white"
                            :class="{ 'bg-cyan-700 text-white': playing[i] }"
                            @click="selectPeaks(i)">
                            <Icon icon="material-symbols:volume-up-outline" width="20" />
                        </div>
                    </div> -->
                    <div
                        v-for="(obj, i) in tracksFromDb.syncTracks"
                        :id="`audio-controls-${i}`"
                        :key="obj.filename"
                        class="dark: flex h-16 w-full shrink-0 flex-row items-center justify-start rounded-md bg-neutral-200 dark:bg-gray-400 dark:text-black">
                        <div
                            class="h-full w-[0.5rem] rounded-l-md"
                            :style="{
                                backgroundColor: matplotlibColors[i],
                            }"></div>
                        <div
                            class="flex h-full w-[calc(100%-1rem)] flex-col items-center justify-center gap-2 rounded-l-md py-2">
                            <div
                                class="flex h-3 flex-row items-center justify-center gap-1 rounded-md p-[8px] text-xs"
                                :class="{
                                    'bg-violet-800 text-white': obj.reference,
                                }">
                                <p class="font-bold">{{ i + 1 }}</p>
                                <Popper
                                    :content="obj.filename"
                                    hover
                                    placement="right"
                                    :arrow="true"
                                    class="select-none text-sm">
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
                                        'bg-cyan-700 text-white': tracksVisible[i],
                                    }"
                                    @click="makeVisible(i)">
                                    <Icon icon="material-symbols:visibility" width="20" />
                                </div>
                                <!-- <div
                                    class="flex h-[1.5rem] cursor-pointer select-none items-center justify-center rounded-md p-2 hover:bg-cyan-600 hover:text-white"
                                    :class="{
                                        'bg-cyan-700 text-white': oneVsRestRelevance[i],
                                    }"
                                    @click="selectRelevanceLabel(i, 'oneVsRest')">
                                    <p class="text-xs">Relevance</p>
                                </div> -->
                            </div>
                        </div>

                        <!-- <div
                            class="h-full w-[0.5rem] rounded-r-md"
                            :class="{
                                'bg-red-600': !trackLabels[i],
                                'bg-blue-600': trackLabels[i],
                            }"></div> -->
                    </div>
                </div>
                <div id="feature-content" class="h-full w-[calc(100%-12rem)] overflow-y-scroll">
                    <div id="audio-tracks" class="flex w-full flex-col gap-2 py-5 dark:border-gray-700">
                        <div
                            class=""
                            v-for="(obj, i) in tracksFromDb.syncTracks"
                            :class="{
                                hidden: !tracksVisible[i],
                            }">
                            <div class="relative" :class="{ 'bg-blue-50 ': playing[i] }">
                                <div class="z-50 pl-[30px]">
                                    <div
                                        class="z-50 h-16 w-full shrink-0 dark:border-gray-500 dark:bg-gray-400"
                                        :id="`track-div-${i}`"></div>
                                </div>
                                <!-- <div class="">
                                    <div v-for="feat in selectedFeatureLists.dynamicsTime" class="flex flex-col gap-2">
                                        <LineChart
                                            :data="featureData.dynamics[feat.id][i].featData"
                                            :start="startTimes[i]"
                                            :end="endTimes[i]"
                                            :y-min="feat.yMin"
                                            :y-max="feat.yMax"
                                            :length-sec="obj.length_sec"
                                            :color="matplotlibColors[i]"
                                            class="h-[10rem]" />
                                    </div>
                                    <div v-for="feat in selectedFeatureLists.rhythmTime" class="flex flex-col gap-2">
                                        <LineChart
                                            :data="featureData.rhythm[feat.id][i].featData"
                                            :start="startTimes[i]"
                                            :end="endTimes[i]"
                                            :y-min="feat.yMin"
                                            :y-max="feat.yMax"
                                            :length-sec="obj.length_sec"
                                            :color="matplotlibColors[i]"
                                            class="h-[10rem]" />
                                    </div>
                                </div> -->
                                <div
                                    class="absolute top-0 h-full w-[1px] bg-[red]"
                                    :style="{ marginLeft: cursorPositions[i] }"></div>
                            </div>
                        </div>
                        <div v-for="feat in selectedFeatureLists.dynamicsMeasure">
                            <LineChartMeasure
                                :feature-name="feat.name"
                                :data="featureData.dynamics[feat.id]"
                                :colors="matplotlibColors"
                                :visible="tracksVisible"
                                :start-measure-idx="startMeasure"
                                :end-measure-idx="endMeasure"
                                :y-min="feat.yMin"
                                :y-max="feat.yMax"
                                :fpm="feat.fpm"
                                class="h-[16rem]" />
                        </div>
                        <div v-for="feat in selectedFeatureLists.rhythmMeasure">
                            <LineChartMeasure
                                :feature-name="feat.name"
                                :data="featureData.rhythm[feat.id]"
                                :colors="matplotlibColors"
                                :visible="tracksVisible"
                                :start-measure-idx="startMeasure"
                                :end-measure-idx="endMeasure"
                                :y-min="feat.yMin"
                                :y-max="feat.yMax"
                                :fpm="feat.fpm"
                                class="h-[16rem]" />
                        </div>
                        <audio v-for="(obj, i) in tracksFromDb.syncTracks" :id="`audio-${i}`"></audio>
                    </div>
                </div>
                <!-- <div class="h-full w-[12rem] bg-red-100"></div> -->
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
