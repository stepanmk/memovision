import { useDebounceFn } from '@vueuse/core';
import Peaks from 'peaks.js';
import * as Tone from 'tone';
import { watch } from 'vue';
import { useAudioStore, useMeasureData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
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
} from './variables';

const audioStore = useAudioStore(pinia);
const measureData = useMeasureData(pinia);
const tracksFromDb = useTracksFromDb(pinia);

let reciprocalDurations = [];
let reciprocalDurationRef = [];
let activePeaksIdx = 0;
let prevPeaksIdx = null;
let firstResize = true;

let idxArray = [];
let peaksInstances = [];
let selectedIndices = [];

// const audioCtx = new AudioContext();
// const gainNode = audioCtx.createGain();
// gainNode.connect(audioCtx.destination);

const debouncedFit = useDebounceFn(() => {
    fit();
}, 200);

function fit() {
    if (firstResize) {
        firstResize = false;
        return;
    }
    // toggleMeasures();
    peaksInstances.forEach((instance, idx) => {
        const view = instance.views.getView('zoomview');

        // const container = document.getElementById(`track-div-${idx}`);
        // container.style.height = '544px';

        view.fitToContainer();
        view.setZoom({ seconds: 'auto' });

        // instance.views._zoomview._height = 64;
    });
    regionToSave.value = false;
    // toggleMeasures();
    hideAllRegions();
}

const resizeObserver = new ResizeObserver(debouncedFit);

// watch(volume, () => {
//     gainNode.gain.setValueAtTime(volume.value, audioCtx.currentTime);
// });

watch(numPeaksLoaded, () => {
    percLoaded.value = Math.round((numPeaksLoaded.value / tracksFromDb.syncTracks.length) * 100);
});

async function initPlayer() {
    firstResize = true;
    // audioCtx.resume();
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
    reciprocalDurations = [];
    // audioCtx.suspend();
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
    const waveformContainer = document.getElementById(`track-div-${idx}`);
    waveformContainer.addEventListener('mousedown', waveformListener.bind(event, idx));
    reciprocalDurations[idx] = 1 / tracksFromDb.getObject(filename).length_sec;

    const player = {
        externalPlayer: new Tone.Player(URL.createObjectURL(audioStore.getAudio(filename))).toDestination(),
        eventEmitter: null,
        timeUpdateInterval: null,
        playerIdx: idx,
        init: function (eventEmitter) {
            this.eventEmitter = eventEmitter;
            this.externalPlayer.fadeIn = 0.01;
            this.externalPlayer.fadeOut = 0.01;
            return Promise.resolve();
        },

        destroy: function () {
            Tone.Transport.stop();
            Tone.Transport.cancel();
            this.externalPlayer.dispose();
            this.externalPlayer = null;
            this.eventEmitter = null;
        },

        startTimeTracking: function () {
            this.timeUpdateInterval = setInterval(() => {
                this.eventEmitter.emit('player.timeupdate', this.getTransportTime());
            }, 50);
        },

        stopTimeTracking: function () {
            clearInterval(this.timeUpdateInterval);
        },

        setSource: function (opts) {
            if (this.isPlaying()) {
                this.pause();
            }
            this.externalPlayer.buffer.set(opts.webAudio.audioBuffer);
            return Promise.resolve();
        },

        play: async function () {
            this.externalPlayer.sync();
            this.externalPlayer.start(0);
            return Tone.start().then(() => {
                Tone.Transport.start();
                this.startTimeTracking();
                this.eventEmitter.emit('player.playing', this.getCurrentTime());
            });
        },

        pause: function () {
            this.externalPlayer.stop(0);
            this.externalPlayer.unsync();
            Tone.Transport.pause();
            this.stopTimeTracking();
            this.eventEmitter.emit('player.pause', this.getCurrentTime());
        },

        isPlaying: function () {
            return Tone.Transport.state === 'started';
        },

        seek: function (time) {
            trackTimes.value[this.playerIdx] = time;
            Tone.Transport.seconds = time;
            this.eventEmitter.emit('player.seeked', this.getCurrentTime());
            this.eventEmitter.emit('player.timeupdate', this.getCurrentTime());
        },

        isSeeking: function () {
            return false;
        },

        getCurrentTime: function () {
            return trackTimes.value[this.playerIdx];
        },

        getTransportTime: function () {
            return Tone.Transport.seconds;
        },

        getDuration: function () {
            return this.externalPlayer.buffer.duration;
        },
    };

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
        dataUri: {
            arraybuffer: URL.createObjectURL(audioStore.getWaveformData(filename)),
        },
        player: player,
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
            reciprocalDurationRef = 1 / tracksFromDb.refTrack.length_sec;
        }
        peaksInstancesReady.value[idx] = true;
        numPeaksLoaded.value += 1;
        const view = peaksInstances[idx].views.getView('zoomview');
        view.setZoom({ seconds: tracksFromDb.getObject(filename).length_sec });
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

function updatePlayheads(time) {
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

async function selectPeaks(idx) {
    selectedIndices = idxArray.slice();
    selectedIndices.splice(idx, 1);
    if (prevPeaksIdx !== null) {
        playing[prevPeaksIdx] = false;
        if (isPlaying.value) {
            peaksInstances[prevPeaksIdx].player.pause();
        }
        peaksInstances[prevPeaksIdx].off('player.timeupdate', updatePlayheads);
    }
    playing[idx] = true;
    activePeaksIdx = idx;
    peaksInstances[idx].on('player.timeupdate', updatePlayheads);
    const currentTime = trackTimes.value[idx];
    if (isPlaying.value) {
        const selectedRegion = peaksInstances[idx].segments.getSegment('selectedRegion');
        if (selectedRegion) {
            console.log(selectedRegion.startTime);
            peaksInstances[idx].player.playSegment(selectedRegion, true);
        } else {
            peaksInstances[idx].player.play();
            peaksInstances[idx].player.seek(currentTime);
        }
    }
    // else {
    //     if (peaksInstances[idx].views) peaksInstances[idx].player.seek(currentTime);
    // }
    prevPeaksIdx = idx;
}

async function playPause() {
    if (isPlaying.value) {
        peaksInstances[activePeaksIdx].player.pause();
    } else {
        const selectedRegion = peaksInstances[activePeaksIdx].segments.getSegment('selectedRegion');
        if (selectedRegion) {
            const currentTime = trackTimes.value[activePeaksIdx];
            peaksInstances[activePeaksIdx].player.playSegment(selectedRegion, true);
            peaksInstances[activePeaksIdx].player.seek(currentTime);
        } else {
            peaksInstances[activePeaksIdx].player.play();
        }
    }
    isPlaying.value = !isPlaying.value;
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
