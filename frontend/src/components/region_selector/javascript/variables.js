import { reactive, ref } from 'vue';
/*  global variables and properties 

*/

const amplitudeZoom = ref(1.0);
const beatsPerMeasure = ref(1);
const currentTime = ref('00:00');
const endMeasureIdx = ref(-1);
const endTime = ref(0);
const endTimeString = ref('');
const loopingActive = ref(false);
const measureCount = ref(0);
const measuresVisible = ref(false);
const metronomeActive = ref(false);
const noteCount = ref(4);
const noteValue = ref(4);
const peaksReady = ref(false);
const playing = ref(false);
const prevRegionIdx = ref(null);
const refName = ref('');
const regionBeingAdded = ref(false);
const regionBeingNamed = ref(false);
const regionName = ref('');
const regionRef = reactive({
    timeSignatures: [],
    regions: [],
    selected: [],
});
const regionSelectorOpened = ref(false);
const startMeasureIdx = ref(-1);
const startTime = ref(0);
const startTimeString = ref('');
const timeSignatureEdit = ref(false);
const volume = ref(1);

export {
    amplitudeZoom,
    beatsPerMeasure,
    currentTime,
    endMeasureIdx,
    endTime,
    endTimeString,
    loopingActive,
    measureCount,
    measuresVisible,
    metronomeActive,
    noteCount,
    noteValue,
    peaksReady,
    playing,
    prevRegionIdx,
    refName,
    regionBeingAdded,
    regionBeingNamed,
    regionName,
    regionRef,
    regionSelectorOpened,
    startMeasureIdx,
    startTime,
    startTimeString,
    timeSignatureEdit,
    volume,
};
