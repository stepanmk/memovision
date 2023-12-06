import { useDebounceFn } from '@vueuse/core';
import Peaks from 'peaks.js';
import * as Tone from 'tone';
import { ref, watch } from 'vue';
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

watch(numPeaksLoaded, () => {
    percLoaded.value = Math.round((numPeaksLoaded.value / tracksFromDb.syncTracks.length) * 100);
});

async function initPlayer() {
    firstResize = true;
    initPeaksInstances();
}

function resetPlayer() {
    isPlaying.value = false;
    numPeaksLoaded.value = 0;
    percLoaded.value = 0;
    prevPeaksIdx = null;
    selectedIndices = [];
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

const switchSecs = ref(0);

function initPeaks(filename, idx) {
    const audioBuffer = audioStore.getAudio(filename);
    const player = {
        externalPlayer: new Tone.Player(audioBuffer).toDestination(Tone.getContext().destination),
        eventEmitter: null,
        scheduleRepeater: null,
        playerIdx: idx,
        init: function (eventEmitter) {
            this.eventEmitter = eventEmitter;
            this.externalPlayer.fadeIn = 0.02;
            this.externalPlayer.fadeOut = 0.02;
            this.scheduleRepeater = Tone.Transport.scheduleRepeat(() => {
                const time = this.getCurrentTime();
                this.eventEmitter.emit('player.timeupdate', time);
            }, 0.15);
            return Promise.resolve();
        },

        destroy: function () {
            Tone.Transport.stop();
            Tone.Transport.cancel();
            this.externalPlayer.dispose();
            this.externalPlayer = null;
            this.eventEmitter = null;
        },

        setSource: function (opts) {
            if (this.isPlaying()) {
                this.pause();
            }
            this.externalPlayer.buffer.set(opts.webAudio.audioBuffer);
            return Promise.resolve();
        },

        play: async function () {
            Tone.Transport.seconds = switchSecs.value;
            return Tone.start().then(() => {
                this.externalPlayer.sync();
                this.externalPlayer.start(0);
                Tone.Transport.start();
                this.eventEmitter.emit('player.playing', this.getCurrentTime());
            });
        },

        pause: function () {
            this.externalPlayer.unsync();
            this.externalPlayer.stop(0);
            Tone.Transport.pause();
            this.eventEmitter.emit('player.pause', this.getCurrentTime());
        },

        isPlaying: function () {
            return Tone.Transport.state === 'started';
        },

        seek: function (time) {
            if (this.playerIdx === activePeaksIdx) {
                Tone.Transport.seconds = time;
                switchSecs.value = time;
            } else {
                this.externalPlayer.seconds = time;
            }

            this.eventEmitter.emit('player.seeked', this.getCurrentTime());
            this.eventEmitter.emit('player.timeupdate', this.getCurrentTime());
        },

        isSeeking: function () {
            return false;
        },

        getCurrentTime: function () {
            if (this.playerIdx === activePeaksIdx) {
                return Tone.Transport.seconds;
            } else {
                return this.externalPlayer.seconds;
            }
        },

        getDuration: function () {
            return this.externalPlayer.buffer.duration;
        },
    };

    const waveformContainer = document.getElementById(`track-div-${idx}`);
    waveformContainer.addEventListener('mousedown', waveformListener.bind(event, idx));
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
        waveformData: {
            arraybuffer: audioStore.getWaveformData(filename),
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
        view.enableAutoScroll(false, {});
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

function goToMeasure(measureIdx) {
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
    selectedIndices.forEach((idx) => {
        peaksInstances[idx].player.seek(tracksFromDb.syncPoints[idx][closestTimeIdx]);
    });
}

function selectPeaks(idx) {
    selectedIndices = idxArray.slice();
    selectedIndices.splice(idx, 1);
    if (prevPeaksIdx !== null) {
        playing[prevPeaksIdx] = false;
        if (isPlaying.value) {
            peaksInstances[prevPeaksIdx].player.pause();
        }
        switchSecs.value = trackTimes.value[idx];
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

function playPause() {
    // pause playing if it is active
    if (isPlaying.value) {
        peaksInstances[activePeaksIdx].player.pause();
        switchSecs.value = trackTimes.value[activePeaksIdx];
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
    findClosestTimeIdx,
    goToMeasure,
    idxArray,
    initPlayer,
    peaksInstances,
    playPause,
    resetPlayer,
    rewind,
    selectPeaks,
    switchSecs,
    toggleMeasures,
};
