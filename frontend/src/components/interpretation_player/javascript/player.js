import { useDebounceFn } from '@vueuse/core';
import Peaks from 'peaks.js';
import { watch } from 'vue';
import { useAudioStore, useMeasureData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { getStartMeasure } from '../../../sharedFunctions';
import { hideAllRegions } from './regions';
import {
    currentMeasure,
    isPlaying,
    measuresVisible,
    numPeaksLoaded,
    peaksInstancesReady,
    percLoaded,
    playing,
    regionToSave,
    trackTimes,
    volume,
} from './variables';

const audioStore = useAudioStore(pinia);
const measureData = useMeasureData(pinia);
const tracksFromDb = useTracksFromDb(pinia);

let activePeaksIdx = 0;
let prevPeaksIdx = null;
let firstResize = true;

let idxArray = [];
let peaksInstances = [];
let selectedIndices = [];

const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);

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
        view.setZoom({ seconds: 'auto' });
    });
    regionToSave.value = false;
    hideAllRegions();
}

const resizeObserver = new ResizeObserver(debouncedFit);

watch(volume, () => {
    gainNode.gain.setValueAtTime(volume.value, audioCtx.currentTime);
});

watch(numPeaksLoaded, () => {
    percLoaded.value = Math.round((numPeaksLoaded.value / tracksFromDb.syncTracks.length) * 100);
});

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
    numPeaksLoaded.value = 0;
    percLoaded.value = 0;
    prevPeaksIdx = null;
    selectedIndices = [];
    peaksInstances = [];
    idxArray = [];
    audioCtx.suspend();
    resizeObserver.disconnect();
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
                overlay: true,
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
        waveformData: {
            arraybuffer: waveformData,
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
            const audioContainer = document.getElementById('audio-container');
            resizeObserver.observe(audioContainer);
        }
        if (filename === tracksFromDb.refTrack.filename) {
            peaksInstances[idx].on('player.timeupdate', (time) => {
                trackTimes.value[idx] = time;
                const measureIdx = getStartMeasure(time + 0.005);
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

function findClosestTimeIdx(peaksIdx, time) {
    const closestTime = tracksFromDb.syncPoints[peaksIdx].reduce((prev, curr) =>
        Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev
    );
    return tracksFromDb.syncPoints[peaksIdx].indexOf(closestTime);
}

function seekCallback(time) {
    const closestTimeIdx = findClosestTimeIdx(activePeaksIdx, time);
    for (let i = 0; i < selectedIndices.length; i++) {
        const idx = selectedIndices[i];
        peaksInstances[idx].player.seek(tracksFromDb.syncPoints[idx][closestTimeIdx]);
    }
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
    const selectedRegion = peaksInstances[activePeaksIdx].segments.getSegment('selectedRegion');
    if (selectedRegion) {
        peaksInstances[activePeaksIdx].player.playSegment(selectedRegion, true);
    } else {
        peaksInstances[activePeaksIdx].player.seek(0);
    }
}

export {
    activePeaksIdx,
    findClosestTimeIdx,
    goToMeasure,
    idxArray,
    initPlayer,
    peaksInstances,
    playPause,
    resetPlayer,
    rewind,
    selectPeaks,
    toggleMeasures,
};
