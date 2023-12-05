import { ref } from 'vue';
/*  global variables and properties 

*/

const amplitudeZoom = ref(1.0);
const beatsPerMeasure = ref(1);
const currentRMS = ref([-60, -60]);
const currentTime = ref('00:00.00');
const endMeasureIdx = ref(-1);
const endTime = ref(0);
const endTimeString = ref('');
const loopingActive = ref(false);
const maxRMS = ref(-60);
const measuresVisible = ref(false);
const metronomeActive = ref(false);
const metronomeVolume = ref(-6.0);
const noteCount = ref(4);
const noteValue = ref(4);
const peaksReady = ref(false);
const performer = ref(null);
const playing = ref(false);
const prevRegionIdx = ref(null);
const refName = ref('');
const regionBeingAdded = ref(false);
const regionBeingNamed = ref(false);
const regionName = ref('');
const regionSelectorOpened = ref(false);
const startMeasureIdx = ref(-1);
const startTime = ref(0);
const startTimeString = ref('');
const timeSignatureEdit = ref(false);
const volume = ref(0.0);
const year = ref(null);

export {
    amplitudeZoom,
    beatsPerMeasure,
    currentRMS,
    currentTime,
    endMeasureIdx,
    endTime,
    endTimeString,
    loopingActive,
    maxRMS,
    measuresVisible,
    metronomeActive,
    metronomeVolume,
    noteCount,
    noteValue,
    peaksReady,
    performer,
    playing,
    prevRegionIdx,
    refName,
    regionBeingAdded,
    regionBeingNamed,
    regionName,
    regionSelectorOpened,
    startMeasureIdx,
    startTime,
    startTimeString,
    timeSignatureEdit,
    volume,
    year,
};
