<script setup>
import { useModulesVisible, useTracksFromDb, useAudioStore, useMeasureData } from '../../globalStores';
import { showAlert } from '../../alerts';
import { getSecureConfig, truncateFilename } from '../../sharedFunctions';
import { reactive, computed, ref, watch } from 'vue';
import { api } from '../../axiosInstance';
import { pinia } from '../../piniaInstance';
import { Icon } from '@iconify/vue';
import { onKeyStroke } from '@vueuse/core';
import Peaks from 'peaks.js';
import Popper from 'vue3-popper';
import colormap from 'colormap';

import ModuleTemplate from '../ModuleTemplate.vue';
import LoadingWindow from '../LoadingWindow.vue';
import TextBtnGray from './subcomponents/TextBtnGray.vue';

// pinia stores
const modulesVisible = useModulesVisible(pinia);
const tracksFromDb = useTracksFromDb(pinia);
const audioStore = useAudioStore(pinia);
const measureData = useMeasureData(pinia);

const colors = colormap({
    colormap: 'viridis',
    format: 'hex',
    nshades: 101,
});

const allPeaksReady = computed(() => {
    return !peaksInstancesReady.value.includes(false);
});

const numPeaksLoaded = ref(0);
const percLoaded = ref(0);
watch(numPeaksLoaded, () => {
    percLoaded.value = Math.round((numPeaksLoaded.value / (tracksFromDb.syncTracks.length - 1)) * 100);
});

let regionObjects = reactive({
    regions: [],
    selected: [],
    measures: [],
    measuresSelected: [],
});

let regionsType = reactive({
    selectedRegions: true,
    diffRegions: false,
    relevantMeasures: false,
});

let peaksInstances = [];
let selectedMeasureData = [];
let idxArray = [];

let measureCount = 0;
let activePeaksIdx = 0;
let regionSelected = false;
let interpPlayerOpened = false;
let syncPoints = null;

let playing = reactive([]);

const isPlaying = ref(false);
const regionOverlay = ref([]);
const volume = ref(1);

const currentMeasure = ref(-1);
const currentRelevance = ref(0);
const peaksInstancesReady = ref([]);
const selectedRelevanceData = ref([]);
const oneVsRestRelevance = ref([]);
const trackLabels = ref([]);
const trackTimes = ref([]);
const regionLengths = ref([]);

const relevanceMenu = ref(false);
const labelMenu = ref(false);
const regionMenu = ref(false);
const selectedRelevanceFeature = ref('');
const regionToSave = ref(false);

const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
gainNode.connect(audioCtx.destination);

const rampUp = new Float32Array(10);
const rampDown = new Float32Array(10);
function createFadeRamps() {
    for (let i = 0; i < 10; i++) {
        rampUp[i] = Math.pow(i / 9, 3) * volume.value;
        rampDown[rampUp.length - i - 1] = Math.pow(i / 9, 3) * volume.value;
    }
}

// 10 ms fade in and fade out to prevent clicking when switching recordings
const fadeIn = () => gainNode.gain.setValueCurveAtTime(rampUp, audioCtx.currentTime, 0.01);
const fadeOut = () => gainNode.gain.setValueCurveAtTime(rampDown, audioCtx.currentTime, 0.01);

watch(volume, () => {
    gainNode.gain.setValueAtTime(volume.value, audioCtx.currentTime);
    createFadeRamps();
});

// subscribe to pinia modulesVisible state
modulesVisible.$subscribe((mutation, state) => {
    if (state.interpretationPlayer && !interpPlayerOpened) {
        interpPlayerOpened = true;
        // init helper variables
        tracksFromDb.syncTracks.forEach((track, idx) => {
            peaksInstances.push(null);
            peaksInstancesReady.value.push(false);
            oneVsRestRelevance.value.push(false);
            trackLabels.value.push(false);
            trackTimes.value.push(0);
            regionLengths.value.push(0);
            playing.push(false);
            idxArray.push(idx);
        });

        audioCtx.resume();
        createFadeRamps();
        getMeasureData();
        getSyncPoints();
        getAllRegions();
        selectRelevanceFeature(measureData.relevanceFeatures[0].id);

        setTimeout(() => {
            tracksFromDb.syncTracks.forEach((track, idx) => {
                addTrack(track.filename, idx);
            });
            addListeners();
        }, 50);
        measuresVisible.value = true;
    } else if (!state.interpretationPlayer && interpPlayerOpened) {
        if (isPlaying.value) playPause();
        interpPlayerOpened = false;
        removeListeners();
        idxArray = [];
        peaksInstances = [];
        selectedMeasureData = [];
        prevPeaksIdx = null;

        regionOverlay.value = [];
        peaksInstancesReady.value = [];
        oneVsRestRelevance.value = [];
        trackLabels.value = [];
        trackTimes.value = [];
        regionLengths.value = [];
        measuresVisible.value = false;
        numPeaksLoaded.value = 0;
        percLoaded.value = 0;
        selectRelevanceFeature(measureData.relevanceFeatures[0].id);

        playing.fill(false);
    }
});

onKeyStroke(' ', (e) => {
    e.preventDefault();
    if (modulesVisible.interpretationPlayer) playPause();
});

onKeyStroke('Home', (e) => {
    if (modulesVisible.interpretationPlayer) rewind();
});

onKeyStroke(
    'ArrowUp',
    (e) => {
        if (modulesVisible.interpretationPlayer) {
            const switchIdx = activePeaksIdx - 1;
            if (switchIdx >= 0) selectPeaks(switchIdx);
        }
    },
    { eventName: 'keyup' }
);

onKeyStroke(
    'ArrowDown',
    (e) => {
        if (modulesVisible.interpretationPlayer) {
            const switchIdx = activePeaksIdx + 1;
            if (switchIdx < peaksInstances.length) selectPeaks(switchIdx);
        }
    },
    { eventName: 'keyup' }
);

onKeyStroke(
    'ArrowLeft',
    (e) => {
        if (modulesVisible.interpretationPlayer) {
            const newMeasure = currentMeasure.value - 1;
            if (newMeasure > -1) goToMeasure(newMeasure);
        }
    },
    { eventName: 'keyup' }
);

onKeyStroke(
    'ArrowRight',
    (e) => {
        if (modulesVisible.interpretationPlayer) {
            const newMeasure = currentMeasure.value + 1;
            if (newMeasure < measureCount) goToMeasure(newMeasure);
        }
    },
    { eventName: 'keyup' }
);

onKeyStroke('m', (e) => {
    if (modulesVisible.interpretationPlayer) toggleMeasures();
});

onKeyStroke('Escape', (e) => {
    if (modulesVisible.interpretationPlayer) {
        if (regionSelected) {
            regionObjects.selected.fill(false);
        }
        regionOverlay.value.fill(false);
        if (isPlaying.value) playPause();
        peaksInstances.forEach((peaksInstance, i) => {
            peaksInstance.segments.removeAll();
            regionLengths.value[i] = 0;
            const view = peaksInstance.views.getView('zoomview');
            view.setZoom({ seconds: 'auto' });
        });
        regionToSave.value = false;
    }
});

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
}

let selectedRegions;
let differenceRegions;
async function getAllRegions() {
    const selRegionsRes = await api.get('/get-all-regions', getSecureConfig());
    selectedRegions = selRegionsRes.data;
    const diffRegionsRes = await api.get('/get-diff-regions', getSecureConfig());
    differenceRegions = diffRegionsRes.data.diff_regions;
    regionObjects.regions = selectedRegions;
    regionObjects.selected = new Array(selectedRegions.length).fill(false);
}

async function getSyncPoints() {
    const syncPointsRes = await api.get('/get-sync-points', getSecureConfig());
    syncPoints = syncPointsRes.data;
}

function waveformListener(idx, event) {
    if (idx !== activePeaksIdx) {
        selectPeaks(idx);
    }
}

function addTrack(filename, idx) {
    const audioElement = document.getElementById(`audio-${idx}`);
    const audio = audioStore.getAudio(filename);
    audioElement.src = URL.createObjectURL(audio);
    const waveformContainer = document.getElementById(`track-div-${idx}`);
    waveformContainer.addEventListener('mousedown', waveformListener.bind(event, idx));
    const audioSource = audioCtx.createMediaElementSource(audioElement);
    audioSource.connect(gainNode);
    const waveformData = audioStore.getWaveformData(filename);
    const options = {
        zoomview: {
            segmentOptions: {
                style: 'overlay',
                overlayOffset: 0,
                overlayOpacity: 0.15,
                overlayCornerRadius: 0,
            },
            container: waveformContainer,
            playheadColor: 'red',
            playheadClickTolerance: 500,
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
    };
    Peaks.init(options, (err, peaks) => {
        if (err) console.log(err);
        peaksInstances[idx] = peaks;
        if (idx === 0) {
            selectPeaks(idx);
            selectRelevanceLabel(idx, 'oneVsRest');
            selectedRelevanceFeatureStr.value = measureData.relevanceFeatures[0].name;
            measureCount = measureData.relevance.duration.oneVsRest[idx].measureRelevance.length;
            oneVsRestRelevance.value[0] = true;
            trackLabels.value[0] = true;
        }
        if (filename === tracksFromDb.refTrack.filename) {
            peaksInstances[idx].on('player.timeupdate', (time) => {
                trackTimes.value[idx] = time;
                // add 1 ms to the time to indicate the proper measure
                const measureIdx = getStartMeasure(time + 0.001);
                currentMeasure.value = measureIdx - 2;
                if (currentMeasure.value >= 0) {
                    currentRelevance.value = selectedRelevanceData.value[currentMeasure.value].relevance.toFixed(2);
                }
            });
        } else {
            peaksInstances[idx].on('player.timeupdate', (time) => {
                trackTimes.value[idx] = time;
            });
        }
        addMeasuresToPeaksInstance(idx);
        peaksInstancesReady.value[idx] = true;
        numPeaksLoaded.value += 1;
        const view = peaksInstances[idx].views.getView('zoomview');
        view.enableAutoScroll(false, {});
        view.setZoom({ seconds: 'auto' });
    });
}

async function selectRegion(regionIdx, obj) {
    hideAllRegions();
    regionToSave.value = false;
    regionObjects.selected[regionIdx] = !regionObjects.selected[regionIdx];
    regionObjects.selected.forEach((arrayValue, i) => {
        if (i !== regionIdx) regionObjects.selected[i] = false;
    });
    const referenceName = tracksFromDb.refTrack.filename;
    const refIdx = tracksFromDb.getIdx(referenceName);
    fadeOut();
    await sleep(10);
    peaksInstances[activePeaksIdx].player.pause();
    isPlaying.value = false;
    regionOverlay.value.fill(false);
    if (regionObjects.selected[regionIdx]) {
        const startIdx = findClosestTimeIdx(refIdx, regionObjects.regions[regionIdx].startTime);
        const endIdx = findClosestTimeIdx(refIdx, regionObjects.regions[regionIdx].endTime);
        switch (obj.type) {
            case 'selectedRegion':
                addSelectedRegion(startIdx, endIdx, obj);
                break;
            case 'differenceRegion':
                const targetIdx = tracksFromDb.getIdx(obj.regionName);
                addDifferenceRegion(refIdx, targetIdx, obj);
                break;
            case 'relevantMeasure':
                addRelevantMeasure(obj);
                break;
        }
    } else {
        hideAllRegions();
        isPlaying.value = false;
    }
}

function addSelectedRegion(startIdx, endIdx, obj) {
    for (let i = 0; i < peaksInstances.length; i++) {
        peaksInstances[i].segments.add({
            color: obj.color,
            borderColor: obj.color,
            startTime: syncPoints[i][startIdx],
            endTime: syncPoints[i][endIdx],
            id: 'selectedRegion',
        });
    }
    const startMeasure = getStartMeasure(obj.startTime) - 1;
    const endMeasure = getEndMeasure(obj.endTime) - 1;
    for (let j = startMeasure; j < endMeasure; j++) {
        regionOverlay.value[j] = true;
    }
    zoomOnSelectedRegion();
}

function addRelevantMeasure(obj) {
    for (let i = 0; i < peaksInstances.length; i++) {
        peaksInstances[i].segments.add({
            color: obj.color,
            borderColor: obj.color,
            startTime: selectedMeasureData[i][obj.measureIdx],
            endTime: selectedMeasureData[i][obj.measureIdx + 1],
            id: 'relevantMeasure',
        });
    }
    regionOverlay.value[obj.measureIdx] = true;
    zoomOnMeasureSelection(obj.measureIdx, obj.measureIdx);
}

function addDifferenceRegion(refIdx, targetIdx, obj) {
    selectPeaks(refIdx);
    peaksInstances[refIdx].player.seek(obj.startTime);
    peaksInstances[refIdx].segments.add({
        color: obj.color,
        borderColor: obj.color,
        startTime: obj.startTime,
        endTime: obj.endTime,
        id: 'selectedRegion',
    });
    peaksInstances[targetIdx].segments.add({
        color: obj.color,
        borderColor: obj.color,
        startTime: obj.startTimeTarget,
        endTime: obj.endTimeTarget,
        id: 'selectedRegion',
    });
    zoomOnSelectedRegion();
}

function hideAllRegions() {
    peaksInstances.forEach((peaksInstance) => {
        peaksInstance.segments.removeAll();
        regionLengths.value.fill(0);
    });
    regionSelected = false;
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
    // if (time >= selectedMeasureData[activePeaksIdx][repeatMeasureIdxEnd.value] - 0.05 && regionSelected) {
    //     goToMeasure(repeatMeasureIdxStart.value);
    // }
}

let prevPeaksIdx = null;
let selectedIndices = null;
async function selectPeaks(idx) {
    selectedIndices = idxArray.slice();
    selectedIndices.splice(idx, 1);
    if (prevPeaksIdx !== null) {
        playing[prevPeaksIdx] = false;
        if (isPlaying.value) {
            fadeOut();
            await sleep(10);
            peaksInstances[prevPeaksIdx].player.pause();
        }
        peaksInstances[prevPeaksIdx].off('player.timeupdate', seekCallback);
    }
    // add seekCallback to peaks instance specified by idx
    playing[idx] = true;
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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

async function rewind() {
    fadeOut();
    await sleep(20);
    peaksInstances[activePeaksIdx].player.seek(0);
    fadeIn();
}

function zoomOnSelectedRegion() {
    let secs = -1;
    for (let i = 0; i < peaksInstances.length; i++) {
        if (peaksInstances[i].segments.getSegment('selectedRegion') === null) {
            continue;
        }
        const segment = peaksInstances[i].segments.getSegment('selectedRegion');
        const len = segment.endTime - segment.startTime;
        regionLengths.value[i] = len;
        if (len > secs) secs = len;
    }
    const segment = peaksInstances[activePeaksIdx].segments.getSegment('selectedRegion');
    peaksInstances[activePeaksIdx].player.seek(segment.startTime);
    for (let i = 0; i < peaksInstances.length; i++) {
        if (peaksInstances[i].segments.getSegment('selectedRegion') === null) {
            continue;
        }
        const view = peaksInstances[i].views.getView('zoomview');
        const segment = peaksInstances[i].segments.getSegment('selectedRegion');
        view.setZoom({ seconds: secs + 0.5 });
        view.setStartTime(segment.startTime - 1);
    }
}

async function zoomOnMeasureSelection(startMeasureIdx, endMeasureIdx) {
    if (isPlaying.value) await playPause();
    regionSelected = true;
    hideAllRegions();
    let secs = -1;
    for (let i = 0; i < peaksInstances.length; i++) {
        const len = selectedMeasureData[i][endMeasureIdx + 2] - selectedMeasureData[i][startMeasureIdx + 1];
        regionLengths.value[i] = len;
        if (len > secs) secs = len;
    }
    peaksInstances[activePeaksIdx].player.seek(selectedMeasureData[activePeaksIdx][startMeasureIdx + 1]);
    for (let i = 0; i < peaksInstances.length; i++) {
        const view = peaksInstances[i].views.getView('zoomview');
        view.setZoom({ seconds: secs + 0.5 });
        view.setStartTime(selectedMeasureData[i][startMeasureIdx + 1]);
        view.enableAutoScroll(false, {});
        peaksInstances[i].segments.add({
            color: 'blue',
            borderColor: 'blue',
            startTime: selectedMeasureData[i][startMeasureIdx + 1],
            endTime: selectedMeasureData[i][endMeasureIdx + 2],
            id: 'selectedRegion',
        });
    }
}

function getStartMeasure(start) {
    const closestStart = measureData.refTrack.gt_measures.reduce((prev, curr) =>
        Math.abs(curr - start) < Math.abs(prev - start) ? curr : prev
    );
    let closestStartIdx = measureData.refTrack.gt_measures.indexOf(closestStart);
    if (measureData.refTrack.gt_measures[closestStartIdx] < start) {
        closestStartIdx = closestStartIdx + 1;
    }
    return closestStartIdx;
}

function getEndMeasure(end) {
    const closestEnd = measureData.refTrack.gt_measures.reduce((prev, curr) =>
        Math.abs(curr - end) < Math.abs(prev - end) ? curr : prev
    );
    let closestEndIdx = measureData.refTrack.gt_measures.indexOf(closestEnd);
    if (measureData.refTrack.gt_measures[closestEndIdx] > end) {
        closestEndIdx = closestEndIdx - 1;
    }
    return closestEndIdx;
}

function getTimeString(seconds, start, end) {
    return new Date(seconds * 1000).toISOString().slice(start, end);
}

function selectRegionType(selectedType) {
    labelMenu.value = false;
    relevanceMenu.value = false;
    regionMenu.value = false;
    for (const type in regionsType) {
        regionsType[type] = false;
    }
    regionsType[selectedType] = true;
    switch (selectedType) {
        case 'selectedRegions':
            regionObjects.regions = selectedRegions;
            if (regionObjects.regions.length > 0) regionMenu.value = true;
            regionObjects.selected = new Array(selectedRegions.length).fill(false);
            break;
        case 'differenceRegions':
            regionObjects.regions = differenceRegions;
            if (regionObjects.regions.length > 0) regionMenu.value = true;
            regionObjects.selected = new Array(differenceRegions.length).fill(false);
            break;
        case 'relevantMeasures':
            regionMenu.value = true;
            let sortedRelevance = selectedRelevanceData.value.slice(0);
            sortedRelevance.sort((a, b) => a.relevance - b.relevance).reverse();
            regionObjects.regions = sortedRelevance.slice(0, 10);
            regionObjects.selected = new Array(differenceRegions.length).fill(false);
            break;
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

let canRewind = true;
async function goToMeasure(measureIdx) {
    if (canRewind) {
        canRewind = false;
        fadeOut();
        await sleep(20);
        const seekTime = selectedMeasureData[activePeaksIdx][measureIdx + 1];
        peaksInstances[activePeaksIdx].player.seek(seekTime);
        fadeIn();
        canRewind = true;
    }
}

const measureMessage = ref(null);
function logMeasure(i) {
    measureMessage.value =
        'Measure: ' + (i + 1) + ', Relevance: ' + selectedRelevanceData.value[i].relevance.toFixed(2);
    const popup = document.getElementById('measure-popup');
    const width = measureCount * 16;
    const topBar = document.getElementById('top-bar');
    popup.style.left =
        Math.round(((i + 1) / measureCount) * width) - topBar.scrollLeft - popup.offsetWidth / 2 + 18 + 'px';
}

function clearMessage() {
    measureMessage.value = null;
}

let firstMeasure = null;
let isHoldingMouseButton = false;
let dragged = false;
function addListeners() {
    const relevanceBar = document.getElementById('overview-2');
    relevanceBar.addEventListener('mousedown', relevanceBarMouseDown);
    window.addEventListener('mouseup', relevanceBarMouseUp);
    window.addEventListener('mousemove', relevanceBarMouseMove);
    const scrollContainer = document.getElementById('top-bar');
    scrollContainer.addEventListener('wheel', horizontalScroll);
}

function removeListeners() {
    const relevanceBar = document.getElementById('overview-2');
    relevanceBar.removeEventListener('mousedown', relevanceBarMouseDown);
    window.removeEventListener('mouseup', relevanceBarMouseUp);
    window.removeEventListener('mousemove', relevanceBarMouseMove);
    const scrollContainer = document.getElementById('top-bar');
    scrollContainer.removeEventListener('wheel', horizontalScroll);
}

function relevanceBarMouseDown(event) {
    const relevanceBar = document.getElementById('overview-2');
    const bounds = relevanceBar.getBoundingClientRect();
    const barWidth = 16 * measureCount;
    event.preventDefault();
    isHoldingMouseButton = true;
    const x = event.clientX - bounds.left;
    const dragOverMeasureIdx = Math.round((x / barWidth) * measureCount);
    firstMeasure = dragOverMeasureIdx;
}

const repeatMeasureIdxStart = ref(0);
const repeatMeasureIdxEnd = ref(0);
function relevanceBarMouseUp() {
    isHoldingMouseButton = false;
    const startMeasureIdx = regionOverlay.value.indexOf(true);
    const endMeasureIdx = regionOverlay.value.lastIndexOf(true);
    if (dragged) {
        regionToSave.value = true;
        const referenceName = tracksFromDb.refTrack.filename;
        const refIdx = tracksFromDb.getIdx(referenceName);
        zoomOnMeasureSelection(startMeasureIdx, endMeasureIdx);
        repeatMeasureIdxStart.value = startMeasureIdx;
        repeatMeasureIdxEnd.value = endMeasureIdx + 2;
        startTime.value = selectedMeasureData[refIdx][startMeasureIdx + 1];
        endTime.value = selectedMeasureData[refIdx][endMeasureIdx + 2];
    }
    dragged = false;
}

function relevanceBarMouseMove(event) {
    const relevanceBar = document.getElementById('overview-2');
    const bounds = relevanceBar.getBoundingClientRect();
    const barWidth = 16 * measureCount;
    if (isHoldingMouseButton && !regionSelected) {
        dragged = true;
        regionOverlay.value.fill(false);
        const x = event.clientX - bounds.left;
        let dragOverMeasureIdx = Math.floor((x / barWidth) * measureCount);
        if (dragOverMeasureIdx > measureCount) dragOverMeasureIdx = measureCount - 1;
        for (let i = firstMeasure; i < dragOverMeasureIdx + 1; i++) {
            regionOverlay.value[i] = true;
        }
    }
}

function horizontalScroll(event) {
    event.preventDefault();
    const scrollContainer = document.getElementById('top-bar');
    scrollContainer.scrollLeft += event.deltaY;
}

const selectedRelevanceFeatureStr = ref('');
const selectedLabel = ref('');
const selectedType = ref('');
const selectedIdx = ref(0);

function selectRelevanceFeature(id, name) {
    selectedRelevanceFeatureStr.value = name;
    selectedRelevanceFeature.value = id;
    if (selectedLabel.value !== '') {
        selectedRelevanceData.value =
            measureData.relevance[selectedRelevanceFeature.value][selectedType.value][
                selectedIdx.value
            ].measureRelevance.slice();
        selectedLabel.value =
            measureData.relevance[selectedRelevanceFeature.value][selectedType.value][selectedIdx.value].labelName;
    }
    labelMenu.value = false;
    relevanceMenu.value = false;
}

function selectRelevanceLabel(idx, type) {
    oneVsRestRelevance.value.fill(false);
    trackLabels.value.fill(false);
    selectedType.value = type;
    selectedIdx.value = idx;
    if (type === 'oneVsRest') {
        oneVsRestRelevance.value[idx] = true;
        trackLabels.value[idx] = true;
    } else {
        trackLabels.value = measureData.relevance[selectedRelevanceFeature.value][type][idx].labels.slice();
    }
    selectedRelevanceData.value =
        measureData.relevance[selectedRelevanceFeature.value][type][idx].measureRelevance.slice();
    selectedLabel.value = measureData.relevance[selectedRelevanceFeature.value][type][idx].labelName;
    labelMenu.value = false;
    relevanceMenu.value = false;
}

function menuOnMouseLeave() {
    relevanceMenu.value = false;
    labelMenu.value = false;
    regionMenu.value = false;
}

const regionName = ref('');
const startTime = ref(0);
const endTime = ref(0);
const beatsPerMeasure = ref(1);

function saveRegion() {
    if (regionName.value !== '') {
        const data = {
            startTime: startTime.value,
            endTime: endTime.value,
            regionName: regionName.value,
            lengthSec: endTime.value - startTime.value,
            beatsPerMeasure: beatsPerMeasure.value,
        };
        api.post(`/save-region`, data, getSecureConfig()).then(() => {
            regionToSave.value = false;
            regionName.value = '';
            beatsPerMeasure.value = 1;
            showAlert(`Region ${data.regionName} successfully added.`, 1500);
            getAllRegions();
        });
    } else {
        showAlert('Region must have a name!', 1500);
    }
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
            <div class="flex h-[4rem] w-full justify-center border-b dark:border-gray-700">
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
            </div>

            <div id="settings-bar" class="flex h-[3rem] w-full flex-row items-center justify-between border-b px-5">
                <div class="relative flex h-full flex-row items-center gap-1">
                    <TextBtnGray
                        btn-text="Feature"
                        @click="
                            relevanceMenu = true;
                            labelMenu = false;
                            regionMenu = false;
                        " />
                    <TextBtnGray
                        btn-text="Label"
                        @click="
                            labelMenu = true;
                            relevanceMenu = false;
                            regionMenu = false;
                        " />
                    <TextBtnGray btn-text="Selected regions" @click="selectRegionType('selectedRegions')" />
                    <TextBtnGray btn-text="Difference regions" @click="selectRegionType('differenceRegions')" />
                    <TextBtnGray btn-text="Relevant measures" @click="selectRegionType('relevantMeasures')" />
                </div>
                <div
                    v-show="regionToSave"
                    class="flex h-10 flex-row items-center justify-center gap-1 rounded-md bg-neutral-200 px-2 text-sm">
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
                </div>
            </div>

            <div id="container" class="relative flex h-[calc(100%-10rem)] w-full flex-row items-end transition">
                <div
                    id="label-feature"
                    class="absolute top-0 flex w-full justify-center gap-2 py-1 text-sm font-semibold">
                    <div class="flex flex-row gap-1 text-xs">
                        <p>Selected feature:</p>
                        <p class="flex items-center rounded-md bg-neutral-900 px-2 text-white">
                            {{ selectedRelevanceFeatureStr }}
                        </p>
                    </div>

                    <div class="flex flex-row gap-1 text-xs">
                        <p>Selected label:</p>
                        <p class="flex items-center rounded-md bg-neutral-900 px-2 text-white">
                            {{ selectedLabel }}
                        </p>
                    </div>
                </div>

                <div id="menu-container" class="absolute top-0 z-30 flex w-full px-5 text-sm">
                    <div>
                        <div
                            v-if="relevanceMenu"
                            class="z-50 mt-1 flex flex-col gap-1 rounded-md border bg-white p-1"
                            @mouseleave="menuOnMouseLeave()">
                            <p
                                v-for="(obj, i) in measureData.relevanceFeatures"
                                class="flex h-7 shrink-0 items-center rounded-md px-2 hover:cursor-pointer hover:bg-neutral-200"
                                @click="selectRelevanceFeature(obj.id, obj.name)">
                                {{ obj.name }}
                            </p>
                        </div>
                    </div>

                    <div>
                        <div
                            v-if="labelMenu"
                            class="z-50 mt-1 flex flex-col gap-1 rounded-md border bg-white p-1"
                            @mouseleave="menuOnMouseLeave()">
                            <p
                                v-for="(obj, i) in measureData.labels"
                                class="flex h-7 shrink-0 items-center rounded-md px-2 hover:cursor-pointer hover:bg-neutral-200"
                                @click="selectRelevanceLabel(i, 'custom')">
                                {{ obj }}
                            </p>
                        </div>
                    </div>

                    <div>
                        <div
                            v-if="regionMenu"
                            class="z-50 mt-1 flex flex-col gap-1 rounded-md border bg-white p-1"
                            @mouseleave="menuOnMouseLeave()">
                            <div
                                v-for="(obj, i) in regionObjects.regions"
                                :id="`region-${i}`"
                                :key="i"
                                class="flex h-7 w-full shrink-0 cursor-pointer items-center justify-between rounded-md px-2 text-sm hover:bg-neutral-200"
                                :class="{
                                    'bg-neutral-200 dark:bg-gray-600': regionObjects.selected[i],
                                }"
                                @click="selectRegion(i, obj)">
                                <p class="mr-5 flex h-full w-full items-center">
                                    {{ obj.regionName }}
                                </p>

                                <div class="flex h-full gap-2 rounded-md py-1 dark:bg-gray-400 dark:hover:bg-gray-700">
                                    <div
                                        v-if="regionsType.selectedRegions || regionsType.differenceRegions"
                                        class="flex flex-row gap-2">
                                        <p class="flex h-full items-center">Reference:</p>
                                        <p
                                            class="flex w-20 select-none items-center justify-center rounded-md bg-green-500 text-xs text-white">
                                            {{ getTimeString(obj.startTime, 14, 22) }}
                                        </p>
                                        <p
                                            class="flex w-20 select-none items-center justify-center rounded-md bg-red-500 text-xs text-white">
                                            {{ getTimeString(obj.endTime, 14, 22) }}
                                        </p>
                                    </div>
                                    <div v-if="regionsType.differenceRegions" class="flex flex-row gap-2">
                                        <p>Target:</p>
                                        <p
                                            class="flex w-20 select-none items-center justify-center rounded-md bg-green-500 text-xs text-white">
                                            {{ getTimeString(obj.startTimeTarget, 14, 22) }}
                                        </p>
                                        <p
                                            class="flex w-20 select-none items-center justify-center rounded-md bg-red-500 text-xs text-white">
                                            {{ getTimeString(obj.endTimeTarget, 14, 22) }}
                                        </p>
                                    </div>

                                    <p
                                        v-if="regionsType.selectedRegions"
                                        class="flex w-28 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                                        Measures:
                                        {{ getStartMeasure(obj.startTime) }}–{{ getEndMeasure(obj.endTime) }}
                                    </p>
                                    <p
                                        v-if="regionsType.selectedRegions"
                                        class="flex w-36 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                                        Beats per measure:
                                        {{ obj.beatsPerMeasure }}
                                    </p>
                                    <p
                                        v-if="regionsType.relevantMeasures"
                                        class="flex w-28 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                                        Relevance:
                                        {{ obj.relevance.toFixed(2) }}
                                    </p>
                                    <p
                                        v-if="regionsType.relevantMeasures"
                                        class="flex w-40 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                                        Absolute relevance:
                                        {{ Number(obj.absoluteRelevance).toFixed(2) }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="audio-container" class="flex h-full w-full flex-row overflow-y-scroll dark:border-gray-700">
                    <div id="audio-controls" class="flex w-[10rem] flex-col items-center justify-start gap-2 py-6 pl-5">
                        <div
                            v-for="(obj, i) in tracksFromDb.syncTracks"
                            :id="`audio-controls-${i}`"
                            :key="obj.filename"
                            class="flex h-16 w-full shrink-0 flex-row items-center justify-start rounded-md bg-neutral-200">
                            <div
                                class="flex h-full w-[calc(100%-0.5rem)] flex-col items-center justify-center gap-2 rounded-l-md py-2">
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
                        class="flex w-[calc(100%-10rem)] flex-col gap-2 py-6 px-2 dark:border-gray-700">
                        <div
                            v-for="(obj, i) in tracksFromDb.syncTracks"
                            class="flex h-16 w-full shrink-0 flex-row gap-2">
                            <div
                                class="w-[calc(100%-8rem)] border dark:border-gray-500 dark:bg-gray-400"
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
                class="absolute bottom-0 flex h-[3rem] w-full flex-row items-center justify-between border-t pl-5 pr-5 dark:border-gray-700">
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
