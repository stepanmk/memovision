import { useDebounceFn } from '@vueuse/core';
import Peaks from 'peaks.js';
import { watch } from 'vue';
import { useAudioStore, useMeasureData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { sleep } from '../../../sharedFunctions';
import { hideAllRegions } from './regions';
import {
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
let canSwitch = true;
let firstResize = true;
let prevPeaksIdx = null;

let idxArray = [];
let peaksInstances = [];
let reciprocalDurationRef = [];
let reciprocalDurations = [];
let selectedIndices = [];

const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);

function fit() {
    if (firstResize) {
        firstResize = false;
        return;
    }
    peaksInstances.forEach((instance, idx) => {
        const view = instance.views.getView('zoomview');
        // const container = document.getElementById(`track-div-${idx}`);
        // container.style.height = '544px';
        view.fitToContainer();
        view.setZoom({ seconds: 'auto' });
        // instance.views._zoomview._height = 64;
    });
    regionToSave.value = false;
    hideAllRegions();
}

const debouncedFit = useDebounceFn(() => {
    fit();
}, 200);

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
    isPlaying.value = false;
    peaksInstances[activePeaksIdx].player.pause();
    peaksInstances.forEach((instance) => {
        instance.destroy();
    });
    idxArray = [];
    peaksInstances = [];
    prevPeaksIdx = null;
    reciprocalDurations = [];
    selectedIndices = [];
    numPeaksLoaded.value = 0;
    percLoaded.value = 0;
    audioCtx.suspend();
    resizeObserver.disconnect();
}

function waveformListener(idx, event) {
    if (idx !== activePeaksIdx) {
        if (canSwitch) selectPeaks(idx, false);
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
    reciprocalDurations[idx] = 1 / trackLengthSec;
    if (filename === tracksFromDb.refTrack.filename) {
        reciprocalDurationRef = 1 / tracksFromDb.refTrack.length_sec;
    }
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
            const audioContainer = document.getElementById('audio-container');
            resizeObserver.observe(audioContainer);
        }
        peaksInstancesReady.value[idx] = true;
        numPeaksLoaded.value += 1;
        const view = peaksInstances[idx].views.getView('zoomview');
        view.enableAutoScroll(false, {});
        view.setZoom({ seconds: 'auto' });
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

function updatePlayheads() {
    const audioElement = document.getElementById(`audio-${activePeaksIdx}`);
    const time = audioElement.currentTime;
    movePlayheads(time);
}

function movePlayheads(time) {
    const currentLinIdx = Math.round(
        reciprocalDurations[activePeaksIdx] * time * tracksFromDb.linAxes[activePeaksIdx][0].length
    );
    const currentRefTime = tracksFromDb.linAxes[activePeaksIdx][1][currentLinIdx];
    const closestTimeIdx = Math.round(
        reciprocalDurationRef * currentRefTime * tracksFromDb.syncPoints[activePeaksIdx].length
    );
    trackTimes.value[activePeaksIdx] = time;
    selectedIndices.forEach((idx) => {
        const syncTime = tracksFromDb.syncPoints[idx][closestTimeIdx];
        peaksInstances[idx].views._zoomview._playheadLayer.updatePlayheadTime(syncTime);
        trackTimes.value[idx] = syncTime;
    });
}

async function animatePlayheads() {
    const interval = 1000 / 30;
    let then = performance.now();
    let delta = 0;
    while (isPlaying.value) {
        let now = await new Promise(requestAnimationFrame);
        if (now - then < interval - delta) {
            continue;
        }
        delta = Math.min(interval, delta + now - then - interval);
        then = now;
        updatePlayheads();
    }
}

async function selectPeaks(idx, key) {
    canSwitch = false;
    selectedIndices = idxArray.slice();
    selectedIndices.splice(idx, 1);
    if (prevPeaksIdx !== null) {
        playing[prevPeaksIdx] = false;
        if (isPlaying.value) {
            gainNode.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.02);
            await sleep(50);
            peaksInstances[prevPeaksIdx].player.pause();
        }
        peaksInstances[prevPeaksIdx].off('player.timeupdate', movePlayheads);
    }
    playing[idx] = true;
    activePeaksIdx = idx;
    if (isPlaying.value) {
        const selectedRegion = peaksInstances[idx].segments.getSegment('selectedRegion');
        const currentTime = trackTimes.value[idx];
        if (selectedRegion) {
            peaksInstances[idx].player.playSegment(selectedRegion, true);
            peaksInstances[idx].player.seek(currentTime);
            await sleep(20);
            gainNode.gain.setTargetAtTime(volume.value, audioCtx.currentTime, 0.02);
        } else {
            if (key) peaksInstances[idx].player.seek(currentTime);
            peaksInstances[idx].player.play();
            await sleep(20);
            gainNode.gain.setTargetAtTime(volume.value, audioCtx.currentTime, 0.02);
        }
    } else {
        peaksInstances[idx].on('player.timeupdate', movePlayheads);
    }
    prevPeaksIdx = idx;
    canSwitch = true;
}

async function playPause() {
    if (isPlaying.value) {
        gainNode.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.02);
        await sleep(50);
        peaksInstances[activePeaksIdx].player.pause();
        peaksInstances[activePeaksIdx].on('player.timeupdate', movePlayheads);
    } else {
        const selectedRegion = peaksInstances[activePeaksIdx].segments.getSegment('selectedRegion');
        peaksInstances[activePeaksIdx].off('player.timeupdate', movePlayheads);
        if (selectedRegion) {
            peaksInstances[activePeaksIdx].player.playSegment(selectedRegion, true);
            await sleep(20);
            gainNode.gain.setTargetAtTime(volume.value, audioCtx.currentTime, 0.02);
        } else {
            peaksInstances[activePeaksIdx].player.play();
            await sleep(20);
            gainNode.gain.setTargetAtTime(volume.value, audioCtx.currentTime, 0.02);
        }
    }
    isPlaying.value = !isPlaying.value;
    animatePlayheads();
}

async function rewind() {
    const selectedRegion = peaksInstances[activePeaksIdx].segments.getSegment('selectedRegion');
    if (selectedRegion) {
        if (isPlaying.value) peaksInstances[activePeaksIdx].player.playSegment(selectedRegion, true);
    } else {
        peaksInstances[activePeaksIdx].player.seek(0);
    }
}

export {
    activePeaksIdx,
    canSwitch,
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
};
