import { useDebounceFn } from '@vueuse/core';
import Peaks from 'peaks.js';
import { watch } from 'vue';
import { useAudioStore, useMeasureData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { findClosestTimeIdx } from '../../../sharedFunctions';
import { hideAllRegions, zoomOut } from './regions';
import {
    cursorPositions,
    isPlaying,
    measuresVisible,
    peaksInstancesReady,
    playing,
    trackTimes,
    volume,
    waveformsVisible,
} from './variables';

const audioStore = useAudioStore(pinia);
const tracksFromDb = useTracksFromDb(pinia);
const measureData = useMeasureData(pinia);

const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);

watch(volume, () => {
    gainNode.gain.setValueAtTime(volume.value, audioCtx.currentTime);
});

let activePeaksIdx = 0;
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
    initPeaksInstances();
}

function resetPlayer() {
    peaksInstances[activePeaksIdx].player.pause();

    peaksInstances.forEach((instance) => {
        instance.destroy();
    });

    isPlaying.value = false;
    prevPeaksIdx = null;
    selectedIndices = [];
    peaksInstances = [];
    idxArray = [];
    audioCtx.suspend();
    resizeObserver.disconnect();
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
    const waveformData = audioStore.getWaveformData(filename);
    const waveformContainer = document.getElementById(`track-div-${idx}`);
    waveformContainer.addEventListener('mousedown', waveformListener.bind(event, idx));
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

        waveformData: {
            arraybuffer: waveformData,
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

        peaksInstances[idx].on('player.timeupdate', (time) => {
            trackTimes.value[idx] = time;
            setCursorPos(idx, time);
            // if (idx === activePeaksIdx) {
            //     const measureIdx = getStartMeasure(time + 0.01);
            //     currentMeasure.value = measureIdx - 2;
            // }
        });

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
    const seekTime = measureData.selectedMeasures[activePeaksIdx][measureIdx + 1];
    peaksInstances[activePeaksIdx].player.seek(seekTime);
}

function seekCallback(time) {
    const closestTimeIdx = findClosestTimeIdx(activePeaksIdx, time);
    selectedIndices.forEach((idx) => {
        if (waveformsVisible.value[idx]) peaksInstances[idx].player.seek(tracksFromDb.syncPoints[idx][closestTimeIdx]);
    });
}

async function selectPeaks(idx) {
    selectedIndices = idxArray.slice();
    selectedIndices.splice(idx, 1);
    if (prevPeaksIdx !== null) {
        playing[prevPeaksIdx] = false;
        if (isPlaying.value) {
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
        }
        // otherwise just continue playing at the current cursor position
        else {
            peaksInstances[idx].player.play();
        }
    }
    prevPeaksIdx = idx;
}

async function playPause() {
    // pause playing if it is active
    if (isPlaying.value) {
        peaksInstances[activePeaksIdx].player.pause();
    } else {
        // play currently selected region if it is not null
        const selectedRegion = peaksInstances[activePeaksIdx].segments.getSegment('selectedRegion');
        if (selectedRegion) {
            peaksInstances[activePeaksIdx].player.playSegment(selectedRegion, true);
        }
        // otherwise just continue playing at the current cursor position
        else {
            peaksInstances[activePeaksIdx].player.play();
        }
    }
    isPlaying.value = !isPlaying.value;
}

async function rewind() {
    peaksInstances[activePeaksIdx].player.seek(0);
}

export {
    activePeaksIdx,
    endTimes,
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
