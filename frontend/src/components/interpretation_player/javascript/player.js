import Peaks from 'peaks.js';
import { watch } from 'vue';
import { api } from '../../../axiosInstance';
import { useAudioStore, useMeasureData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { getSecureConfig, getStartMeasure, sleep } from '../../../sharedFunctions';
import {
    currentMeasure,
    isPlaying,
    measuresVisible,
    numPeaksLoaded,
    peaksInstancesReady,
    percLoaded,
    playing,
    trackTimes,
    volume,
} from './variables';

const audioStore = useAudioStore(pinia);
const measureData = useMeasureData(pinia);
const tracksFromDb = useTracksFromDb(pinia);

let activePeaksIdx = 0;
let canRewind = true;
let prevPeaksIdx = null;
let selectedIndices = null;
let syncPoints = null;

let idxArray = [];
let peaksInstances = [];
let selectedMeasureData = [];

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

watch(numPeaksLoaded, () => {
    percLoaded.value = Math.round((numPeaksLoaded.value / tracksFromDb.syncTracks.length) * 100);
});

async function initPlayer() {
    audioCtx.resume();
    createFadeRamps();
    getMeasureData();
    await getSyncPoints();
    initPeaksInstances();
}

function resetPlayer() {
    numPeaksLoaded.value = 0;
    percLoaded.value = 0;
    prevPeaksIdx = null;
}

function waveformListener(idx, event) {
    if (idx !== activePeaksIdx) {
        selectPeaks(idx);
    }
}

function initPeaksInstances() {
    setTimeout(() => {
        tracksFromDb.syncTracks.forEach((track, idx) => {
            initPeaks(track.filename, idx);
        });
    }, 50);
}

function initPeaks(filename, idx) {
    const audioElement = document.getElementById(`audio-${idx}`);
    const audio = audioStore.getAudio(filename);
    audioElement.src = URL.createObjectURL(audio);
    const waveformContainer = document.getElementById(`track-div-${idx}`);
    waveformContainer.addEventListener('mousedown', waveformListener.bind(event, idx));
    const audioSource = audioCtx.createMediaElementSource(audioElement);
    audioSource.connect(gainNode);
    const waveformData = audioStore.getWaveformData(filename);
    const trackLengthSec = tracksFromDb.getObject(filename).length_sec;
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
            fontFamily: 'Inter',
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
        peaksInstances[idx] = peaks;
        if (idx === 0) {
            selectPeaks(idx);
        }
        if (filename === tracksFromDb.refTrack.filename) {
            peaksInstances[idx].on('player.timeupdate', (time) => {
                trackTimes.value[idx] = time;
                const measureIdx = getStartMeasure(time + 0.001);
                currentMeasure.value = measureIdx - 2;
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
        view.setZoom({ seconds: trackLengthSec });
    });
}

function getMeasureData() {
    for (let i = 0; i < tracksFromDb.syncTracks.length; i++) {
        const filename = tracksFromDb.syncTracks[i].filename;
        if (tracksFromDb.syncTracks[i].gt_measures) {
            const measures = measureData.getObject(filename).gt_measures;
            selectedMeasureData.push(measures);
        } else {
            selectedMeasureData.push(measureData.getObject(filename).tf_measures);
        }
    }
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
    for (let i = 1; i < selectedMeasureData[idx].length - 1; i++) {
        let labelText = `${i}`;
        peaksInstances[idx].points.add({
            time: selectedMeasureData[idx][i],
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
        const seekTime = selectedMeasureData[activePeaksIdx][measureIdx + 1];
        peaksInstances[activePeaksIdx].player.seek(seekTime);
        fadeIn();
        canRewind = true;
    }
}

function findClosestTimeIdx(peaksIdx, time) {
    const closestTime = syncPoints[peaksIdx].reduce((prev, curr) =>
        Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev
    );
    return syncPoints[peaksIdx].indexOf(closestTime);
}

function seekCallback(time) {
    const closestTimeIdx = findClosestTimeIdx(activePeaksIdx, time);
    selectedIndices.forEach((idx) => {
        peaksInstances[idx].player.seek(syncPoints[idx][closestTimeIdx]);
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
        if (selectedRegion !== null) {
            const closestTimeIdx = findClosestTimeIdx(prevPeaksIdx, trackTimes.value[prevPeaksIdx]);
            peaksInstances[idx].player.playSegment(selectedRegion, true);
            peaksInstances[idx].player.seek(syncPoints[idx][closestTimeIdx]);
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

async function rewind() {
    fadeOut();
    await sleep(20);
    peaksInstances[activePeaksIdx].player.seek(0);
    fadeIn();
}

async function getSyncPoints() {
    const syncPointsRes = await api.get('/get-sync-points', getSecureConfig());
    syncPoints = syncPointsRes.data;
}

export {
    activePeaksIdx,
    fadeIn,
    fadeOut,
    findClosestTimeIdx,
    goToMeasure,
    idxArray,
    initPlayer,
    peaksInstances,
    playPause,
    resetPlayer,
    rewind,
    selectPeaks,
    selectedMeasureData,
    syncPoints,
    toggleMeasures,
};
