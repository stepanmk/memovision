import Peaks from 'peaks.js';
import { watch } from 'vue';
import { useAudioStore, useMeasureData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { createZoomLevels, getTimeString } from '../../../sharedFunctions';

import {
    amplitudeZoom,
    currentTime,
    loopingActive,
    measuresVisible,
    metronomeActive,
    peaksReady,
    playing,
    refName,
    regionBeingAdded,
    regionRef,
    volume,
} from './variables';

import { getAllRegions } from './regions';

const tracksFromDb = useTracksFromDb(pinia);
const audioStore = useAudioStore(pinia);
const measureData = useMeasureData(pinia);

let peaksInstance = null;
const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);

function initPeaks() {
    const waveformData = audioStore.getWaveformData(tracksFromDb.refTrack.filename);
    const audioElement = document.getElementById('audio-element');
    const audio = audioStore.getAudio(tracksFromDb.refTrack.filename);
    audioElement.src = URL.createObjectURL(audio);
    const audioSource = audioCtx.createMediaElementSource(audioElement);
    const zoomviewContainer = document.getElementById('zoomview-container');
    const overviewContainer = document.getElementById('overview-container');
    const zoomLevels = createZoomLevels(zoomviewContainer.offsetWidth, tracksFromDb.refTrack.length_sec);
    audioSource.connect(gainNode);
    audioCtx.resume();
    const options = {
        zoomview: {
            container: zoomviewContainer,
            waveformColor: 'rgb(17 24 39)',
            axisLabelColor: 'rgb(17 24 39)',
            axisGridlineColor: 'rgb(17 24 39)',
            playheadColor: 'red',
            fontFamily: 'Inter',
        },
        overview: {
            container: overviewContainer,
            waveformColor: 'rgb(17 24 39)',
            axisLabelColor: 'rgb(17 24 39)',
            axisGridlineColor: 'rgb(17 24 39)',
            playheadColor: 'red',
            fontFamily: 'Inter',
        },
        segmentOptions: {
            style: 'overlay',
            overlayOffset: 0,
            overlayOpacity: 0.2,
            overlayCornerRadius: 0,
        },
        mediaElement: audioElement,
        dataUri: {
            arraybuffer: URL.createObjectURL(waveformData),
        },
        showAxisLabels: true,
        emitCueEvents: true,
        fontSize: 12,
        zoomLevels: zoomLevels,
    };
    zoomviewContainer.addEventListener('mousewheel', (event) => {
        if (event.deltaY < 0) {
            peaksInstance.zoom.zoomIn();
        } else {
            peaksInstance.zoom.zoomOut();
        }
    });
    Peaks.init(options, (err, peaks) => {
        peaksInstance = peaks;
        peaksReady.value = true;
        refName.value = tracksFromDb.refTrack.filename;
        getAllRegions();
        peaks.on('player.timeupdate', (time) => {
            currentTime.value = getTimeString(time, 14, 19);
        });
        peaks.on('player.playing', () => {
            playing.value = true;
        });
        peaks.on('player.pause', () => {
            playing.value = false;
        });
        measuresVisible.value = false;
        toggleMeasures();
        peaksInstance.zoom.setZoom(zoomLevels.length - 1);
    });
}

function toggleMeasures() {
    if (tracksFromDb.refTrack.gt_measures) {
        if (measuresVisible.value) {
            peaksInstance.points.removeAll();
            measuresVisible.value = false;
        } else {
            for (let i = 1; i < measureData.refTrack.gt_measures.length - 1; i++) {
                peaksInstance.points.add({
                    time: measureData.refTrack.gt_measures[i],
                    labelText: `${i}`,
                    editable: false,
                    color: 'rgb(0, 0, 200)',
                });
            }
            measuresVisible.value = true;
        }
    }
}

function playPause() {
    if (playing.value) {
        peaksInstance.player.pause();
    } else {
        if (regionRef.selected.includes(true) || regionBeingAdded.value) {
            const segmentToPlay = peaksInstance.segments._segments[0];
            peaksInstance.player.playSegment(segmentToPlay, loopingActive.value);
        } else {
            peaksInstance.player.play();
        }
    }
}

function rewind() {
    peaksInstance.player.seek(0);
}

function toggleLooping() {
    loopingActive.value = !loopingActive.value;
}

function toggleMetronome() {
    metronomeActive.value = !metronomeActive.value;
}

watch(amplitudeZoom, () => {
    const view = peaksInstance.views.getView('zoomview');
    view.setAmplitudeScale(Number(amplitudeZoom.value));
});

watch(volume, () => {
    gainNode.gain.setValueAtTime(volume.value, audioCtx.currentTime);
});

export { initPeaks, peaksInstance, playPause, rewind, toggleLooping, toggleMeasures, toggleMetronome };
