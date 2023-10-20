import { ref } from 'vue';
/*  global variables and properties 

*/

const refPeaksReady = ref(false);
const measuresVisible = ref(false);
const loopingActive = ref(false);
const metronomeActive = ref(false);
const refPlaying = ref(false);
const refName = ref('none');
const currentTime = ref('00:00');
const regionName = ref('');
const regionBeingNamed = ref(false);
const startTime = ref(0.5);
const endTime = ref(1.5);
const startTimeString = ref('');
const endTimeString = ref('');
const startMeasure = ref(0);
const endMeasure = ref(1);
const beatsPerMeasure = ref(1);
const regionSelectorOpened = ref(false);

export {
    beatsPerMeasure,
    currentTime,
    endMeasure,
    endTime,
    endTimeString,
    loopingActive,
    measuresVisible,
    metronomeActive,
    refName,
    refPeaksReady,
    refPlaying,
    regionBeingNamed,
    regionName,
    regionSelectorOpened,
    startMeasure,
    startTime,
    startTimeString,
};
