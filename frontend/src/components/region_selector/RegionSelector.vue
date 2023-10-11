<script setup>
import { reactive, computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import Peaks from 'peaks.js';

import { useModulesVisible, useTracksFromDb, useMeasureData, useAudioStore } from '../../globalStores';
import { showAlert } from '../../alerts';
import { getCookie, createZoomLevels } from '../../sharedFunctions';
import { api } from '../../axiosInstance';
import ModuleTemplate from '../ModuleTemplate.vue';

// pinia stores
const modulesVisible = useModulesVisible();
const tracksFromDb = useTracksFromDb();
const audioStore = useAudioStore();
const measureData = useMeasureData();

// computed objects

const referenceExists = computed(() => {
    return tracksFromDb.trackObjects.filter((obj) => obj.reference).length > 0;
});

// variables
let refPeaksInstance;
let refPeaksReady = ref(false);
let prevVisible = false;
let measuresVisible = ref(false);
let loopingActive = ref(false);
let metronomeActive = ref(false);

let refName = ref('none');
let refPlaying = ref(false);

let currentTime = ref('00:00');

let regionName = ref('');
let regionBeingNamed = ref(false);

let startTime = ref(0.5);
let endTime = ref(1.5);
let startTimeString = ref('');
let endTimeString = ref('');
let regionBeingAdded = false;

let startMeasure = ref(0);
let endMeasure = ref(1);

let beatsPerMeasure = ref(1);

watch(startMeasure, () => {
    setMeasureRegion(startMeasure.value, endMeasure.value + 1);
});

watch(endMeasure, () => {
    setMeasureRegion(startMeasure.value, endMeasure.value + 1);
});

const timeZoom = ref(120);
let amplitudeZoom = ref(1.0);

watch(amplitudeZoom, () => {
    const view = refPeaksInstance.views.getView('zoomview');
    view.setAmplitudeScale(Number(amplitudeZoom.value));
});

watch(timeZoom, () => {
    const view = refPeaksInstance.views.getView('zoomview');
    view.setZoom({ seconds: Number(timeZoom.value) });
});

// subscribe to pinia modulesVisible state
modulesVisible.$subscribe((mutation, state) => {
    if (state.regionSelector && !prevVisible && referenceExists.value) {
        refName.value = tracksFromDb.refTrack.filename;
        setTimeout(getReferenceAudio, 20);
        prevVisible = true;
        audioCtx.resume();
    }
    if (!state.regionSelector && prevVisible) {
        refName.value = 'none';
        if (refPeaksInstance !== undefined) {
            refPeaksInstance.player.pause();
            refPeaksInstance.destroy();
            refPlaying.value = false;
            loopingActive.value = false;
            // document.getElementById('timeline').style.opacity = '0';
            const regionIdx = regionRef.selected.indexOf(true);
            if (regionIdx !== -1) {
                updateRegion(regionIdx);
            }
            regionRef.regions = [];
        }
        prevVisible = false;
    }
});

function getReferenceAudio() {
    const audioElement = document.getElementById('audio-element');
    const audio = audioStore.getAudio(tracksFromDb.refTrack.filename);
    audioElement.src = URL.createObjectURL(audio);
    createRefPeaks();
}

function saveRegion() {
    if (regionName.value !== '') {
        const data = {
            startTime: startTime.value,
            endTime: endTime.value,
            regionName: regionName.value,
            lengthSec: endTime.value - startTime.value,
            beatsPerMeasure: beatsPerMeasure.value,
        };
        const axiosConfig = {
            headers: {
                'X-CSRF-TOKEN': getCookie('csrf_access_token'),
            },
        };
        api.post(`/save-region`, data, axiosConfig).then(() => {
            refPeaksInstance.segments.removeAll();
            pause();
            loopingActive.value = false;
            showAlert(`Region ${data.regionName} successfully added.`, 1500);
            cancelRegionAdding();
            getAllRegions();
        });
    } else {
        showAlert('Region must have a name!', 1500);
    }
}

function deleteAllRegions() {
    const axiosConfig = {
        headers: {
            'X-CSRF-TOKEN': getCookie('csrf_access_token'),
        },
    };
    api.delete(`/delete-all-regions`, axiosConfig).then((response) => {
        getAllRegions();
        refPeaksInstance.segments.removeAll();
    });
}

let regionRef = reactive({
    regions: [],
    selected: [],
});

function getAllRegions() {
    const axiosConfig = {
        headers: {
            'X-CSRF-TOKEN': getCookie('csrf_access_token'),
        },
    };
    api.get('/get-all-regions', axiosConfig).then((response) => {
        regionRef.regions = response.data;
        regionRef.selected = new Array(response.data.length).fill(false);
    });
}

// save all region times
function updateRegion(regionIdx) {
    // axios cfg
    const axiosConfig = {
        headers: {
            'X-CSRF-TOKEN': getCookie('csrf_access_token'),
        },
    };
    api.put('/update-region', regionRef.regions[regionIdx], axiosConfig).then((response) => {});
}

const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
const metronomeGainNode = audioCtx.createGain();

const osc = audioCtx.createOscillator();
osc.frequency.value = 1000;
gainNode.connect(audioCtx.destination);
metronomeGainNode.connect(gainNode);
metronomeGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
osc.connect(metronomeGainNode);
osc.start();

function createRefPeaks() {
    const waveformData = audioStore.getWaveformData(tracksFromDb.refTrack.filename);
    const audioElement = document.getElementById('audio-element');
    const audio = audioStore.getAudio(tracksFromDb.refTrack.filename);
    audioElement.src = URL.createObjectURL(audio);
    const audioSource = audioCtx.createMediaElementSource(audioElement);
    audioSource.connect(gainNode);
    const zoomviewContainer = document.getElementById('zoomview-container');
    const zoomLevels = createZoomLevels(zoomviewContainer.offsetWidth, tracksFromDb.refTrack.length_sec);
    const options = {
        zoomview: {
            container: zoomviewContainer,
            waveformColor: 'rgb(17 24 39)',
            axisLabelColor: 'rgb(17 24 39)',
            axisGridlineColor: 'rgb(17 24 39)',
            playheadColor: 'red',
            // playheadClickTolerance: 10,
        },
        overview: {
            container: document.getElementById('overview-container'),
            waveformColor: 'rgb(17 24 39)',
            axisLabelColor: 'rgb(17 24 39)',
            axisGridlineColor: 'rgb(17 24 39)',
            playheadColor: 'red',
        },
        segmentOptions: {
            style: 'overlay',
            overlayOffset: 0,
            overlayOpacity: 0.15,
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

    const container = document.getElementById('zoomview-container');
    container.addEventListener('mousewheel', (event) => {
        if (event.deltaY < 0) {
            refPeaksInstance.zoom.zoomIn();
        } else {
            refPeaksInstance.zoom.zoomOut();
        }
    });

    Peaks.init(options, (err, peaks) => {
        refPeaksInstance = peaks;
        refPeaksReady.value = true;
        const view = peaks.views.getView('zoomview');
        metronomeVolume.value = 0.25;
        getAllRegions();
        peaks.on('player.timeupdate', (time) => {
            let timeString = new Date(time * 1000).toISOString().slice(14, 19);
            currentTime.value = timeString;
        });

        peaks.on('player.playing', (time) => {
            refPlaying.value = true;
        });

        peaks.on('player.pause', (time) => {
            refPlaying.value = false;
        });

        peaks.on('segments.dragged', (event) => {
            if (regionBeingAdded) {
                startTime.value = event.segment.startTime;
                endTime.value = event.segment.endTime;
                startTimeString.value = new Date(event.segment.startTime * 1000).toISOString().slice(14, 22);
                endTimeString.value = new Date(event.segment.endTime * 1000).toISOString().slice(14, 22);
            } else {
                let regionIdx = regionRef.selected.indexOf(true);
                regionRef.regions[regionIdx].startTime = event.segment.startTime;
                regionRef.regions[regionIdx].endTime = event.segment.endTime;
            }
        });

        peaks.on('points.enter', (point) => {
            if (metronomeActive.value) {
                metronomeGainNode.gain.exponentialRampToValueAtTime(metronomeVolume.value, audioCtx.currentTime, 0.001);
                metronomeGainNode.gain.setTargetAtTime(0, audioCtx.currentTime + 0.05, 0.001);
            }
        });

        if (err) {
            console.error('Error: ' + err.message);
            return;
        }

        if (tracksFromDb.refTrack.gt_measures) {
            measuresVisible.value = false;
            metronomeActive.value = true;
            toggleMeasures();
        }

        refPeaksInstance.zoom.setZoom(13);
    });
}

function playPause() {
    if (refPlaying.value) {
        refPeaksInstance.player.pause();
    } else {
        if (regionRef.selected.includes(true) || regionBeingAdded) {
            const segmentToPlay = refPeaksInstance.segments._segments[0];
            refPeaksInstance.player.playSegment(segmentToPlay, loopingActive.value);
        } else {
            refPeaksInstance.player.play();
        }
    }
}

function pause() {
    refPeaksInstance.player.pause();
}

function rewind() {
    refPeaksInstance.player.seek(0);
}

let prevRegionId = null;
function selectRegion(regionId) {
    if (prevRegionId !== null) {
        updateRegion(prevRegionId);
    }

    prevRegionId = regionId;
    regionRef.selected[regionId] = !regionRef.selected[regionId];
    regionRef.selected.forEach((value, i) => {
        if (i !== regionId) regionRef.selected[i] = false;
    });

    if (regionRef.selected[regionId]) {
        pause();
        loopingActive.value = true;
        refPeaksInstance.segments.removeAll();
        refPeaksInstance.segments.add({
            startTime: regionRef.regions[regionId].startTime,
            endTime: regionRef.regions[regionId].endTime,
            editable: true,
            color: 'blue',
            borderColor: 'blue',
        });
        refPeaksInstance.player.seek(regionRef.regions[regionId].startTime);
    } else {
        pause();
        loopingActive.value = false;
        refPeaksInstance.segments.removeAll();
    }
}

function deselectAllRegions() {
    regionRef.selected.forEach((value, i) => {
        regionRef.selected[i] = false;
    });
}

function toggleLooping() {
    loopingActive.value = !loopingActive.value;
}

function toggleMetronome() {
    metronomeActive.value = !metronomeActive.value;
}

function toggleMeasures() {
    if (tracksFromDb.refTrack.gt_measures) {
        if (measuresVisible.value) {
            refPeaksInstance.points.removeAll();
            measuresVisible.value = false;
        } else {
            for (let i = 1; i < measureData.refTrack.gt_measures.length - 1; i++) {
                let labelText = `${i}`;
                if (i === measureData.refTrack.gt_measures.length - 2) {
                    labelText = 'END';
                }
                refPeaksInstance.points.add({
                    time: measureData.refTrack.gt_measures[i],
                    labelText: labelText,
                    editable: false,
                    color: 'rgb(0, 0, 200)',
                });
            }
            measuresVisible.value = true;
        }
    }
}

function getTimeString(seconds, start, end) {
    return new Date(seconds * 1000).toISOString().slice(start, end);
}

function cancelRegionAdding() {
    pause();
    refPeaksInstance.segments.removeAll();

    regionBeingNamed.value = false;
    regionBeingAdded = false;
    loopingActive.value = false;

    startTime.value = 0.5;
    endTime.value = 1.5;

    startTimeString.value = '00:00.50';
    endTimeString.value = '00:01.50';
    regionName.value = '';
}

function addRegion() {
    if (!regionBeingAdded) {
        deselectAllRegions();
        refPeaksInstance.segments.removeAll();
        loopingActive.value = true;

        regionBeingNamed.value = true;
        regionBeingAdded = true;

        startTime.value = refPeaksInstance.player.getCurrentTime();
        if (startTime.value === 0) {
            startTime.value = startTime.value + 0.5;
        }
        endTime.value = startTime.value + 1.0;

        startTimeString.value = getTimeString(startTime.value, 14, 22);
        endTimeString.value = getTimeString(endTime.value, 14, 22);

        pause();

        refPeaksInstance.segments.add({
            startTime: startTime.value,
            endTime: endTime.value,
            editable: true,
            color: 'blue',
            borderColor: 'blue',
        });
    }
}

function deleteRegion(i) {
    const axiosConfig = {
        headers: {
            'X-CSRF-TOKEN': getCookie('csrf_access_token'),
        },
    };
    api.put('/delete-region', regionRef.regions[i], axiosConfig).then((response) => {
        getAllRegions();
        loopingActive.value = false;
        refPeaksInstance.segments.removeAll();
    });
}

function setMeasureRegion(start, end) {
    const referenceMeasures = measureData.refTrack.gt_measures;
    if (start > end || start === end) {
        showAlert('Invalid measure values!', 1500);
        return;
    } else {
        const region = refPeaksInstance.segments.getSegments()[0];
        if (end > referenceMeasures.length - 1) {
            end = referenceMeasures.length - 1;
            endMeasure.value = referenceMeasures.length - 1;
        }
        region.update({
            startTime: referenceMeasures[start],
            endTime: referenceMeasures[end],
        });
        startTime.value = referenceMeasures[start];
        endTime.value = referenceMeasures[end];
        startTimeString.value = getTimeString(referenceMeasures[start], 14, 22);
        endTimeString.value = getTimeString(referenceMeasures[end], 14, 22);
    }
}

function getStartMeasure(start) {
    const referenceMeasures = measureData.refTrack.gt_measures;
    const closestStart = referenceMeasures.reduce((prev, curr) =>
        Math.abs(curr - start) < Math.abs(prev - start) ? curr : prev
    );
    let closestStartIdx = referenceMeasures.indexOf(closestStart);
    if (referenceMeasures[closestStartIdx] < start) {
        closestStartIdx = closestStartIdx + 1;
    }
    return closestStartIdx;
}

function getEndMeasure(end) {
    const referenceMeasures = measureData.refTrack.gt_measures;
    const closestEnd = referenceMeasures.reduce((prev, curr) =>
        Math.abs(curr - end) < Math.abs(prev - end) ? curr : prev
    );
    let closestEndIdx = referenceMeasures.indexOf(closestEnd);
    if (referenceMeasures[closestEndIdx] > end) {
        closestEndIdx = closestEndIdx - 1;
    }
    if (closestEndIdx === referenceMeasures.length - 2) {
        return 'END';
    } else {
        return closestEndIdx;
    }
}

const refVolume = ref(1);
const metronomeVolume = ref(0.25);

watch(refVolume, () => {
    gainNode.gain.setValueAtTime(refVolume.value, audioCtx.currentTime);
});
</script>

<template>
    <ModuleTemplate
        :is-disabled="false"
        :visible="modulesVisible.regionSelector"
        :module-title="'Region selection'"
        :module-identifier="'region-selector'">
        <template v-slot:module-content>
            <span class="my-2 flex h-8 items-center rounded-md bg-neutral-200 py-1 px-3 text-sm text-black"
                >Selected reference: {{ refName }}</span
            >

            <div class="flex w-full flex-col items-center border-b px-5 dark:border-gray-700">
                <div id="overview-container" class="h-16 w-full cursor-text dark:bg-gray-400"></div>
            </div>

            <div class="flex w-full flex-row items-center justify-end gap-5 border-b px-5 dark:border-gray-700">
                <div id="zoomview-container" class="h-40 w-full cursor-text dark:bg-gray-400"></div>

                <div id="zoomview-amplitude" class="absolute flex h-32 w-7 flex-col items-center justify-center">
                    <div class="flex h-full w-full flex-col items-center justify-between rounded-md bg-neutral-200">
                        <Icon icon="ic:baseline-plus" width="20" class="" />
                        <input
                            type="range"
                            min="1"
                            max="4"
                            step="0.01"
                            class="h-1 w-20 accent-cyan-600"
                            id="amplitude-zoom"
                            v-model="amplitudeZoom" />
                        <Icon icon="ic:baseline-minus" width="20" />
                    </div>
                </div>
            </div>

            <audio id="audio-element" class="w-full"></audio>

            <div
                id="player-controls"
                class="flex h-[3rem] w-full flex-row items-center justify-between gap-2 border-b pl-5 pr-5 dark:border-gray-700">
                <div class="flex h-full flex-row items-center justify-center gap-1">
                    <button
                        id="pause-button"
                        @click="playPause()"
                        class="btn btn-blue flex h-[2rem] w-[2.5rem] items-center justify-center bg-neutral-200 text-black duration-100 hover:bg-cyan-600 hover:text-white dark:bg-gray-400">
                        <Icon v-if="refPlaying" icon="ph:pause" width="20" />
                        <Icon v-else icon="ph:play" width="20" />
                    </button>

                    <button
                        id="back-button"
                        @click="rewind()"
                        class="btn btn-blue flex h-[2rem] w-[2.5rem] items-center justify-center bg-neutral-200 text-black duration-100 hover:bg-cyan-600 hover:text-white dark:bg-gray-400">
                        <Icon icon="ph:skip-back" width="20" />
                    </button>

                    <button
                        id="loop-button"
                        @click="toggleLooping()"
                        class="btn btn-blue flex h-[2rem] w-[2.5rem] items-center justify-center bg-neutral-200 text-black duration-100 hover:bg-cyan-600 hover:text-white dark:bg-gray-400"
                        :class="{
                            'bg-cyan-700 dark:bg-cyan-700': loopingActive,
                        }">
                        <Icon icon="mdi:loop" width="20" :class="{ 'text-white': loopingActive }" />
                    </button>

                    <button
                        id="measure-button"
                        @click="toggleMeasures()"
                        class="btn btn-blue flex h-[2rem] w-[2.5rem] items-center justify-center bg-neutral-200 text-black duration-100 hover:bg-cyan-600 hover:text-white dark:bg-gray-400"
                        :class="{ 'bg-cyan-700': measuresVisible }">
                        <Icon
                            icon="akar-icons:three-line-vertical"
                            width="20"
                            :class="{ 'text-white': measuresVisible }" />
                    </button>

                    <div class="flex h-8 flex-row items-center justify-center gap-1 rounded-md bg-neutral-200">
                        <button
                            id="metronome-button"
                            @click="toggleMetronome()"
                            class="btn btn-blue flex h-[2rem] w-[2.5rem] items-center justify-center bg-neutral-200 text-black duration-100 hover:bg-cyan-600 hover:text-white"
                            :class="{ 'bg-cyan-700': metronomeActive }">
                            <Icon icon="ph:metronome" width="22" :class="{ 'text-white': metronomeActive }" />
                        </button>
                        <input
                            type="range"
                            min="0.0"
                            max="0.5"
                            step="0.01"
                            v-model="metronomeVolume"
                            class="mr-2 h-1 w-24 accent-cyan-600"
                            id="metronome-volume" />
                    </div>
                </div>

                <div class="flex flex-row items-center justify-center gap-1">
                    <Icon icon="material-symbols:volume-up-outline" width="24" />
                    <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.01"
                        v-model="refVolume"
                        class="h-1 w-24 accent-cyan-600"
                        id="ref-volume" />
                    <div class="flex w-20 items-center justify-start rounded-md pl-[18px] text-sm">
                        <p class="dark:text-white">{{ currentTime }}</p>
                    </div>
                </div>
            </div>

            <div
                class="flex h-[1.75rem] w-full items-center justify-between border-b pl-5 pr-5 dark:border-gray-700 dark:text-gray-300">
                <span class="select-none text-sm">Selected regions</span>
            </div>

            <div
                class="items-left relative flex h-[calc(100%-24.75rem)] w-full flex-col gap-1 overflow-y-auto border-b px-5 py-3 dark:border-gray-700">
                <div
                    v-for="(obj, i) in regionRef.regions"
                    :id="`region-${i}`"
                    :key="i"
                    class="flex h-7 w-full items-center justify-between rounded-md bg-neutral-200 px-2 text-sm hover:bg-neutral-300"
                    :class="{
                        'bg-neutral-300 dark:bg-gray-600': regionRef.selected[i],
                    }">
                    <p class="flex w-full cursor-pointer items-center" @click="selectRegion(i)">
                        {{ obj.regionName }}
                    </p>

                    <div class="flex h-full gap-2 rounded-md py-1 dark:bg-gray-400 dark:hover:bg-gray-700">
                        <p
                            class="flex w-20 select-none items-center justify-center rounded-md bg-green-500 text-xs text-white">
                            {{ getTimeString(obj.startTime, 14, 22) }}
                        </p>
                        <p
                            class="flex w-20 select-none items-center justify-center rounded-md bg-red-500 text-xs text-white">
                            {{ getTimeString(obj.endTime, 14, 22) }}
                        </p>
                        <p
                            v-if="tracksFromDb.refTrack.gt_measures"
                            class="flex w-32 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                            Measures: {{ getStartMeasure(obj.startTime) }}–{{ getEndMeasure(obj.endTime) }}
                        </p>
                        <p
                            v-if="tracksFromDb.refTrack.gt_measures"
                            class="flex w-36 select-none items-center justify-center rounded-md bg-neutral-700 text-xs text-white">
                            Beats per measure: {{ obj.beatsPerMeasure }}
                        </p>
                        <div
                            class="flex w-[1.5rem] cursor-pointer items-center justify-center transition hover:text-red-600"
                            :id="`remove-button-${i}`">
                            <Icon icon="fluent:delete-48-regular" :inline="true" width="18" @click="deleteRegion(i)" />
                        </div>
                    </div>
                </div>

                <div
                    v-if="regionBeingNamed"
                    id="region-name-overlay"
                    class="absolute left-0 top-0 flex h-full w-full flex-col items-center justify-center gap-2 bg-white">
                    <div class="flex flex-row gap-2">
                        <span
                            class="flex w-24 select-none justify-start rounded-md bg-green-500 pl-[14px] text-white"
                            >{{ startTimeString }}</span
                        >
                        <span class="flex w-24 select-none justify-start rounded-md bg-red-500 pl-[14px] text-white">{{
                            endTimeString
                        }}</span>
                    </div>

                    <input
                        type="text"
                        id="name"
                        required
                        minlength="1"
                        maxlength="256"
                        size="20"
                        autocomplete="off"
                        class="input-field-nomargin border"
                        placeholder="Region name:"
                        v-model="regionName"
                        v-on:keyup.enter="saveRegion()" />

                    <div id="measure-input" class="flex flex-row items-center gap-2">
                        <div class="flex h-6 select-none items-center rounded-md bg-neutral-200 p-2 text-sm">
                            Measures:
                        </div>
                        <input
                            type="number"
                            id="start-measure"
                            minlength="1"
                            maxlength="1"
                            autocomplete="off"
                            min="1"
                            placeholder="1"
                            class="input-field-nomargin h-7 w-14 border"
                            v-model="startMeasure"
                            :disabled="!tracksFromDb.refTrack.gt_measures" />
                        <input
                            type="number"
                            id="end-measure"
                            minlength="1"
                            maxlength="1"
                            autocomplete="off"
                            min="1"
                            placeholder="1"
                            class="input-field-nomargin h-7 w-14 border"
                            v-model="endMeasure"
                            :disabled="!tracksFromDb.refTrack.gt_measures" />
                    </div>

                    <div id="measure-input" class="flex flex-row items-center gap-2">
                        <div class="flex h-6 select-none items-center rounded-md bg-neutral-200 p-2 text-sm">
                            Beats per measure:
                        </div>
                        <input
                            type="number"
                            id="beats-per-measure"
                            minlength="1"
                            maxlength="1"
                            autocomplete="off"
                            min="1"
                            placeholder="1"
                            class="input-field-nomargin h-7 w-12 border"
                            v-model="beatsPerMeasure"
                            :disabled="!tracksFromDb.refTrack.gt_measures" />
                    </div>

                    <div id="region-adding-buttons" class="flex flex-row items-center justify-center gap-2">
                        <button @click="saveRegion()" class="btn btn-blue">
                            <span>Save</span>
                        </button>
                        <button @click="cancelRegionAdding()" class="btn btn-blue">
                            <span>Cancel</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="flex h-[3rem] w-full flex-row items-center justify-end gap-2 p-5">
                <button @click="addRegion()" class="btn btn-blue">
                    <span>Add region</span>
                </button>
                <button @click="deleteAllRegions()" class="btn btn-blue">
                    <span>Remove all regions</span>
                </button>
            </div>
        </template>
    </ModuleTemplate>
</template>

<style scoped>
input#name:focus,
input#start-measure:focus,
input#end-measure:focus,
input#beats-per-measure:focus {
    outline: 2px solid rgb(14, 116, 144);
}

input#amplitude-zoom {
    transform: rotate(270deg);
}
</style>
