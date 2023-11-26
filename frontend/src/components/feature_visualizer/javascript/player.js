import { useDebounceFn } from '@vueuse/core';
import Peaks from 'peaks.js';
import { watch } from 'vue';
import { useAudioStore, useMeasureData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { findClosestTimeIdx, getStartMeasure, sleep } from '../../../sharedFunctions';
import { hideAllRegions, zoomOut } from './regions';
import {
    currentMeasure,
    cursorPositions,
    isPlaying,
    measuresVisible,
    peaksInstancesReady,
    playing,
    trackTimes,
    volume,
} from './variables';

const audioStore = useAudioStore(pinia);
const tracksFromDb = useTracksFromDb(pinia);
const measureData = useMeasureData(pinia);

const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
gainNode.connect(audioCtx.destination);

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

let activePeaksIdx = 0;
let canRewind = true;
let endTimes = [];
let firstResize = true;
let idxArray = [];
let peaksInstances = [];
let prevPeaksIdx = null;
let selectedIndices = [];
let startTimes = [];

async function initPlayer() {
    firstResize = true;
    audioCtx.resume();
    createFadeRamps();
    initPeaksInstances();
}

function resetPlayer() {
    // numPeaksLoaded.value = 0;
    // percLoaded.value = 0;
    audioCtx.suspend();
    selectedIndices = [];
    prevPeaksIdx = null;
}

const debouncedFit = useDebounceFn(() => {
    fit();
}, 200);

function fit() {
    if (firstResize) {
        firstResize = false;
        return;
    }
    peaksInstances.forEach((instance) => {
        const view = instance.views.getView('zoomview');
        view.fitToContainer();
        // view.setZoom({ seconds: 'auto' });
    });
    hideAllRegions();
    zoomOut();
}

const resizeObserver = new ResizeObserver(debouncedFit);

function initPeaksInstances() {
    setTimeout(() => {
        tracksFromDb.syncTracks.forEach((track, idx) => {
            initPeaks(track.filename, idx);
        });
    }, 50);
}

function waveformListener(idx, event) {
    if (idx !== activePeaksIdx) {
        selectPeaks(idx);
    }
}

function initPeaks(filename, idx) {
    const audioElement = document.getElementById(`audio-${idx}`);
    const audio = audioStore.getAudio(filename);
    audioElement.src = URL.createObjectURL(audio);
    const audioSource = audioCtx.createMediaElementSource(audioElement);
    audioSource.connect(gainNode);
    // get waveform data
    const waveformData = audioStore.getWaveformData(filename);
    const waveformContainer = document.getElementById(`track-div-${idx}`);
    waveformContainer.addEventListener('mousedown', waveformListener.bind(event, idx));
    // const trackLengthSec = tracksFromDb.getObject(filename).length_sec;
    // const zoomLevels = createZoomLevels(waveformContainer.offsetWidth, trackLengthSec);
    // peaks.js options
    const options = {
        zoomview: {
            fontFamily: 'Inter',
            segmentOptions: {
                overlay: true,
                overlayOffset: 0,
                overlayOpacity: 0.35,
                overlayCornerRadius: 0,
                overlayFontSize: 10,
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
        zoomLevels: [1024],
    };
    Peaks.init(options, (err, peaks) => {
        if (err) console.log(err);
        peaksInstances[idx] = peaks;
        const view = peaksInstances[idx].views.getView('zoomview');
        view.setZoom({ seconds: tracksFromDb.syncTracks[idx].length_sec + 0.01 });
        view.enableAutoScroll(false, {});
        setCursorPos(idx, 0);
        addMeasuresToPeaksInstance(idx);
        if (idx === 0) {
            selectPeaks(idx);
            const featureContent = document.getElementById('feature-content');
            resizeObserver.observe(featureContent);
        }
        if (filename === tracksFromDb.refTrack.filename) {
            peaksInstances[idx].on('player.timeupdate', (time) => {
                trackTimes.value[idx] = time;
                const measureIdx = getStartMeasure(time + 0.01);
                currentMeasure.value = measureIdx - 2;
                setCursorPos(idx, time);
            });
        } else {
            peaksInstances[idx].on('player.timeupdate', (time) => {
                trackTimes.value[idx] = time;
                setCursorPos(idx, time);
            });
        }
        peaksInstancesReady.value[idx] = true;
    });
}

function setCursorPos(idx, time) {
    const ratio = (time - startTimes[idx]) / (endTimes[idx] - startTimes[idx]);
    const perc = 100 * ratio;
    const px = 45 * (1 - ratio);
    cursorPositions.value[idx] = `calc(${perc}% + ${px}px)`;
}

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
    for (let i = 1; i < measureData.selectedMeasures[idx].length - 1; i++) {
        let labelText = `${i}`;
        peaksInstances[idx].points.add({
            time: measureData.selectedMeasures[idx][i],
            labelText: labelText,
            editable: false,
            color: 'rgb(0, 0, 200)',
        });
    }
}

async function goToMeasure(measureIdx) {
    if (canRewind) {
        canRewind = false;
        fadeOut();
        await sleep(20);
        const seekTime = measureData.selectedMeasures[activePeaksIdx][measureIdx + 1];
        peaksInstances[activePeaksIdx].player.seek(seekTime);
        fadeIn();
        canRewind = true;
    }
}

function seekCallback(time) {
    const closestTimeIdx = findClosestTimeIdx(activePeaksIdx, time);
    selectedIndices.forEach((idx) => {
        peaksInstances[idx].player.seek(tracksFromDb.syncPoints[idx][closestTimeIdx]);
    });
}

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
        if (selectedRegion) {
            const closestTimeIdx = findClosestTimeIdx(prevPeaksIdx, trackTimes.value[prevPeaksIdx]);
            peaksInstances[idx].player.playSegment(selectedRegion, true);
            peaksInstances[idx].player.seek(tracksFromDb.syncPoints[idx][closestTimeIdx]);
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
        if (selectedRegion) {
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

export {
    activePeaksIdx,
    endTimes,
    fadeIn,
    fadeOut,
    goToMeasure,
    idxArray,
    initPlayer,
    peaksInstances,
    playPause,
    resetPlayer,
    rewind,
    selectPeaks,
    setCursorPos,
    startTimes,
    toggleMeasures,
};
