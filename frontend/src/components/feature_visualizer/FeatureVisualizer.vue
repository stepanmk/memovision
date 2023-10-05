<script setup>
import ModuleTemplate from '../ModuleTemplate.vue';
import { api } from '../../axiosInstance';
import { useModulesVisible, useTracksFromDb, useAudioStore } from '../../globalStores';
import { truncateFilename, getSecureConfig } from '../../sharedFunctions';
import { Icon } from '@iconify/vue';
import Peaks from 'peaks.js';
import { ref } from 'vue';

const modulesVisible = useModulesVisible();
const tracksFromDb = useTracksFromDb();
const audioStore = useAudioStore();

// audio context stuff
const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
gainNode.connect(audioCtx.destination);

// const rampUp = new Float32Array(10);
// const rampDown = new Float32Array(10);
// function createFadeRamps()
// {
//     for (let i = 0; i < 10; i++)
//     {
//         rampUp[i] = Math.pow(i / 9, 3) * volume.value;
//         rampDown[rampUp.length - i - 1] = Math.pow(i / 9, 3) * volume.value;
//     }
// }

const isPlaying = ref(false);
const tracksVisible = ref([]);
const playing = ref([]);

let syncPoints = null;
let activePeaksIdx = 0;
let peaksInstances = [];
let idxArray = [];

function initFeatVisualizer() {
    getSyncPoints();
    tracksFromDb.syncTracks.forEach((track, idx) => {
        tracksVisible.value.push(true);
        playing.value.push(false);

        peaksInstances.push(null);
        idxArray.push(idx);
    });

    setTimeout(() => {
        tracksFromDb.syncTracks.forEach((track, idx) => {
            addTrack(track.filename, idx);
        });
    }, 50);
}

function destroyFeatVisualizer() {
    tracksVisible.value = [];
    playing.value = [];

    peaksInstances = [];
    idxArray = [];
}

let featVisualizerOpened = false;

modulesVisible.$subscribe((mutation, state) => {
    if (state.featureVisualizer) {
        featVisualizerOpened = true;
        initFeatVisualizer();

        console.log('Feat Visualizer opened!');
    } else if (featVisualizerOpened) {
        featVisualizerOpened = false;
        destroyFeatVisualizer();

        console.log('Feat Visualizer closed!');
    }
});

async function getSyncPoints() {
    const syncPointsRes = await api.get('/get-sync-points', getSecureConfig());
    syncPoints = syncPointsRes.data;
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
        zoomLevels: [1024, 2048, 4096, 'auto'],
    };
    Peaks.init(options, (err, peaks) => {
        if (err) console.log(err);
        peaksInstances[idx] = peaks;
        const view = peaksInstances[idx].views.getView('zoomview');
        view.setZoom({ seconds: 'auto' });
        view.enableAutoScroll(false);
        if (idx === 0) selectPeaks(idx);
    });
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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
</script>

<template>
    <ModuleTemplate
        :module-title="'Feature visualization'"
        :module-identifier="'feat-visualisation'"
        :visible="modulesVisible.featureVisualizer"
        :is-disabled="false">
        <template v-slot:module-content>
            <div class="h-[3rem] w-full border-b bg-yellow-100"></div>
            <div class="flex h-[calc(100%-9rem)] w-full flex-row border-b">
                <div
                    id="tracklist"
                    class="flex h-full w-[12rem] flex-col items-center justify-start gap-1 overflow-y-scroll border-r p-2">
                    <div
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
                    </div>
                </div>
                <div id="feature-content" class="h-full w-[calc(100%-24rem)] overflow-y-scroll">
                    <div
                        id="audio-tracks"
                        class="flex w-full flex-col gap-2 bg-cyan-100 px-2 py-5 dark:border-gray-700">
                        <div
                            v-for="(obj, i) in tracksFromDb.syncTracks"
                            class="h-16 w-full shrink-0 border dark:border-gray-500 dark:bg-gray-400"
                            :id="`track-div-${i}`"
                            :class="{
                                'bg-neutral-200': obj.label,
                                hidden: !tracksVisible[i],
                            }"></div>

                        <audio v-for="(obj, i) in tracksFromDb.syncTracks" :id="`audio-${i}`"></audio>
                    </div>
                </div>
                <div class="h-full w-[12rem] bg-red-100"></div>
            </div>
        </template>
    </ModuleTemplate>
</template>

<style scoped></style>
