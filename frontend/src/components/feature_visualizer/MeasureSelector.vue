<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useTracksFromDb } from '../../globalStores';
import { pinia } from '../../piniaInstance';

const props = defineProps({
    measureMessage: String,
    measureData: Array,
});

const tracksFromDb = useTracksFromDb(pinia);
let measureCount;

onMounted(() => {
    addListeners();
    measureCount = props.measureData.length;
    for (let i = 0; i < measureCount; i++) {
        regionOverlay.value.push(false);
    }
});

const measureMessage = ref(null);
function logMeasure(i) {
    measureMessage.value = 'Measure: ' + (i + 1);
    const popup = document.getElementById('measure-popup');
    const width = measureCount * 16;
    const topBar = document.getElementById('top-bar');
    popup.style.left =
        Math.round(((i + 1) / measureCount) * width) - topBar.scrollLeft - popup.offsetWidth / 2 + 18 + 'px';
}

function clearMessage() {
    measureMessage.value = null;
}

const regionOverlay = ref([]);

let regionSelected = false;

let firstMeasure = null;
let isHoldingMouseButton = false;
let dragged = false;
function addListeners() {
    const relevanceBar = document.getElementById('overview-2');
    relevanceBar.addEventListener('mousedown', relevanceBarMouseDown);
    window.addEventListener('mouseup', relevanceBarMouseUp);
    window.addEventListener('mousemove', relevanceBarMouseMove);
    const scrollContainer = document.getElementById('top-bar');
    scrollContainer.addEventListener('wheel', horizontalScroll);
    // const container = document.getElementById('audio-container');
    // container.addEventListener('mousewheel', (event) => {
    //     if (event.deltaY < 0) {
    //         peaksInstances.forEach((peaksInstance) => {
    //             peaksInstance.zoom.zoomIn();
    //             zoomAlign();
    //         });
    //     } else {
    //         peaksInstances.forEach((peaksInstance) => {
    //             peaksInstance.zoom.zoomOut();
    //             zoomAlign();
    //         });
    //     }
    // });
}

function horizontalScroll(event) {
    event.preventDefault();
    const scrollContainer = document.getElementById('top-bar');
    scrollContainer.scrollLeft += event.deltaY;
}

function removeListeners() {
    const relevanceBar = document.getElementById('overview-2');
    relevanceBar.removeEventListener('mousedown', relevanceBarMouseDown);
    window.removeEventListener('mouseup', relevanceBarMouseUp);
    window.removeEventListener('mousemove', relevanceBarMouseMove);
    const scrollContainer = document.getElementById('top-bar');
    scrollContainer.removeEventListener('wheel', horizontalScroll);
}

function relevanceBarMouseDown(event) {
    const relevanceBar = document.getElementById('overview-2');
    const bounds = relevanceBar.getBoundingClientRect();
    const barWidth = 16 * measureCount;
    event.preventDefault();
    isHoldingMouseButton = true;
    const x = event.clientX - bounds.left;
    const dragOverMeasureIdx = Math.round((x / barWidth) * measureCount);
    firstMeasure = dragOverMeasureIdx;
}

function relevanceBarMouseUp() {
    isHoldingMouseButton = false;
    const startMeasureIdx = regionOverlay.value.indexOf(true);
    const endMeasureIdx = regionOverlay.value.lastIndexOf(true);
    if (dragged) {
        // regionToSave.value = true;
        // const referenceName = tracksFromDb.refTrack.filename;
        // const refIdx = tracksFromDb.getIdx(referenceName);
        // zoomOnMeasureSelection(startMeasureIdx, endMeasureIdx);

        console.log(startMeasureIdx, endMeasureIdx);
        // repeatMeasureIdxStart.value = startMeasureIdx;
        // repeatMeasureIdxEnd.value = endMeasureIdx + 2;
        // startTime.value = selectedMeasureData[refIdx][startMeasureIdx + 1];
        // endTime.value = selectedMeasureData[refIdx][endMeasureIdx + 2];
    }
    dragged = false;
}

function relevanceBarMouseMove(event) {
    const relevanceBar = document.getElementById('overview-2');
    const bounds = relevanceBar.getBoundingClientRect();
    const barWidth = 16 * measureCount;
    if (isHoldingMouseButton && !regionSelected) {
        dragged = true;
        regionOverlay.value.fill(false);
        const x = event.clientX - bounds.left;
        let dragOverMeasureIdx = Math.floor((x / barWidth) * measureCount);
        if (dragOverMeasureIdx > measureCount) dragOverMeasureIdx = measureCount - 1;
        for (let i = firstMeasure; i < dragOverMeasureIdx + 1; i++) {
            regionOverlay.value[i] = true;
        }
    }
}
</script>

<template>
    <div class="flex h-[4rem] w-full justify-center border-b dark:border-gray-700">
        <div class="w-[calc(100%-3rem)] overflow-y-hidden overflow-x-scroll" id="top-bar">
            <div id="overview-3" class="flex h-[1rem] w-full flex-row items-center justify-start overflow-hidden">
                <div
                    class="absolute z-50 flex w-24 justify-center rounded-md bg-cyan-700 text-xs font-semibold text-white"
                    id="measure-popup">
                    {{ measureMessage }}
                </div>
            </div>
            <div id="overview-2" class="flex h-[1rem] flex-row rounded-md">
                <div v-for="(obj, i) in measureData" :id="`meas-${i}`" class="h-full w-4 shrink-0">
                    <div
                        class="h-full w-full hover:cursor-pointer hover:bg-red-600"
                        :class="{
                            'bg-neutral-400': i % 2 !== 0,
                            'bg-neutral-300': i % 2 == 0,
                        }"
                        @mouseover="logMeasure(i)"
                        @mouseleave="clearMessage()">
                        <div
                            class="z-50 h-full w-full"
                            :class="{
                                'border-t border-b border-cyan-600 bg-neutral-900 bg-opacity-50 dark:border-gray-400':
                                    regionOverlay[i],
                            }"></div>
                    </div>
                </div>
            </div>
            <div id="overview-1" class="relative flex h-[1.5rem] w-full items-center">
                <div
                    v-for="(obj, i) in measureData"
                    :id="`meas-${i}`"
                    class="flex h-[1.5rem] w-4 shrink-0 flex-col items-center justify-start">
                    <div
                        v-if="(i + 1) % 20 === 0"
                        class="absolute h-[1.3rem] w-[1px] bg-black text-xs dark:bg-gray-400">
                        <p class="mt-2">&nbsp{{ i + 1 }}</p>
                    </div>
                    <div class="h-[0.5rem] w-[1px] bg-black dark:bg-gray-400"></div>
                </div>
            </div>
        </div>
    </div>
</template>
