<script setup>
import { ref } from 'vue';

const props = defineProps({
    measureCount: Number,
    timeSignatures: Array,
    currentMeasure: Number,
});

const emit = defineEmits(['selectRegion', 'deleteTimeSignature', 'goToMeasure']);

defineExpose({
    init,
    destroy,
    setRegionOverlay,
    resetRegionOverlay,
});

const regionOverlay = ref([]);
const measureMessage = ref(null);
let measureCount = 0;
let firstMeasure = null;
let regionSelected = false;
let isHoldingMouseButton = false;
let dragged = false;

function init() {
    measureCount = props.measureCount;
    for (let i = 0; i < measureCount; i++) {
        regionOverlay.value.push(false);
    }
    addListeners();
}

function destroy() {
    measureCount = 0;
    regionOverlay.value = [];
    removeListeners();
}

function setRegionOverlay(startIdx, endIdx) {
    resetRegionOverlay();
    for (let i = startIdx; i < endIdx + 1; ++i) {
        regionOverlay.value[i] = true;
    }
}

function resetRegionOverlay() {
    regionOverlay.value.fill(false);
}

function logMeasure(i) {
    measureMessage.value = 'Measure ' + (i + 1);
    const popup = document.getElementById('measure-popup');
    const width = measureCount * 16;
    const topBar = document.getElementById('top-bar');
    popup.style.left =
        Math.round(((i + 1) / measureCount) * width) - popup.offsetWidth / 2 - topBar.scrollLeft + 16 + 'px';
}

function clearMessage() {
    measureMessage.value = null;
}

function horizontalScroll(event) {
    event.preventDefault();
    const scrollContainer = document.getElementById('top-bar');
    scrollContainer.scrollLeft += event.deltaY;
}

function addListeners() {
    const relevanceBar = document.getElementById('overview-2');
    relevanceBar.addEventListener('mousedown', relevanceBarMouseDown);
    window.addEventListener('mouseup', relevanceBarMouseUp);
    window.addEventListener('mousemove', relevanceBarMouseMove);
    const scrollContainer = document.getElementById('top-bar');
    scrollContainer.addEventListener('wheel', horizontalScroll);
}

function removeListeners() {
    const relevanceBar = document.getElementById('overview-2');
    relevanceBar.removeEventListener('mousedown', relevanceBarMouseDown);
    window.removeEventListener('mouseup', relevanceBarMouseUp);
    window.removeEventListener('mousemove', relevanceBarMouseMove);
    const scrollContainer = document.getElementById('top-bar');
    scrollContainer.removeEventListener('wheel', horizontalScroll);
}

function relevanceBarMouseUp() {
    isHoldingMouseButton = false;
    const startMeasureIdx = regionOverlay.value.indexOf(true);
    const endMeasureIdx = regionOverlay.value.lastIndexOf(true);
    if (dragged) {
        emit('selectRegion', startMeasureIdx, endMeasureIdx);
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
        if (dragOverMeasureIdx > measureCount - 1) dragOverMeasureIdx = measureCount - 1;
        for (let i = firstMeasure; i < dragOverMeasureIdx + 1; i++) {
            regionOverlay.value[i] = true;
        }
    }
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
</script>

<template>
    <div class="flex h-[5.5rem] w-full justify-center border-b dark:border-gray-700">
        <div class="w-[calc(100%-3rem)] overflow-visible overflow-y-hidden" id="top-bar">
            <div
                class="absolute z-50 mt-[0.5rem] flex w-24 select-none items-center justify-center rounded-md bg-neutral-700 text-xs font-semibold text-white"
                id="measure-popup">
                {{ measureMessage }}
            </div>
            <div id="overview-3" class="relative mt-[0.5rem] flex h-[1rem] flex-row">
                <div
                    v-for="(obj, i) in timeSignatures"
                    :id="`ts-${i}`"
                    class="absolute flex h-full cursor-pointer select-none items-center justify-start bg-pink-600 text-xs font-semibold text-white hover:bg-pink-500"
                    :style="{
                        width: (obj.endMeasureIdx - obj.startMeasureIdx + 1) * 16 + 'px',
                        'margin-left': obj.startMeasureIdx * 16 + 'px',
                    }"
                    @click="$emit('deleteTimeSignature', i)">
                    <p
                        v-if="obj.endMeasureIdx - obj.startMeasureIdx > 0"
                        class="flex w-[32px] items-center justify-center bg-pink-800 px-1">
                        {{ obj.noteCount }}/{{ obj.noteValue }}
                    </p>
                    <p v-else class="flex h-full w-[16px] items-center justify-center bg-pink-800 text-[9px]">
                        {{ obj.noteCount }}/{{ obj.noteValue }}
                    </p>
                </div>
            </div>
            <div id="overview-2" class="flex h-[1rem] flex-row">
                <div v-for="(obj, i) in regionOverlay" :id="`meas-${i}`" class="h-full w-4 shrink-0">
                    <div
                        class="h-full w-full hover:cursor-pointer hover:bg-red-600 dark:hover:bg-red-600"
                        :class="{
                            'bg-neutral-400 dark:bg-gray-500': i % 2 !== 0,
                            'bg-neutral-300 dark:bg-gray-400': i % 2 == 0,
                        }"
                        @click="$emit('goToMeasure', i)"
                        @mouseover="logMeasure(i)"
                        @mouseleave="clearMessage()">
                        <div
                            class="z-50 h-full w-full"
                            :class="{
                                'border-b border-t border-cyan-600 bg-neutral-900 bg-opacity-70 hover:bg-red-600  dark:border-gray-400':
                                    regionOverlay[i],
                            }">
                            <div
                                class="h-full w-full"
                                :class="{
                                    'bg-red-600 bg-opacity-100': i === currentMeasure,
                                }"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="overview-1" class="relative flex h-[1.5rem] w-full items-center">
                <div
                    v-for="(obj, i) in regionOverlay"
                    :id="`meas-${i}`"
                    class="flex h-[1.5rem] w-4 shrink-0 flex-col items-center justify-start">
                    <div
                        v-if="(i + 1) % 20 === 0"
                        class="absolute h-[1.3rem] w-[1px] bg-black text-xs dark:bg-gray-400">
                        <p class="mt-2 select-none">&nbsp{{ i + 1 }}</p>
                    </div>
                    <div class="h-[0.5rem] w-[1px] bg-black dark:bg-gray-400"></div>
                </div>
            </div>
        </div>
    </div>
</template>
