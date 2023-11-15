import { computed, reactive, ref } from 'vue';
/*  global variables and properties 

*/

const currentMeasure = ref(-1);
const endMeasureIdx = ref(-1);
const interpretationPlayerOpened = ref(false);
const isPlaying = ref(false);
const measureCount = ref(0);
const measuresVisible = ref(false);
const numPeaksLoaded = ref(0);
const oneVsRestRelevance = ref([]);
const peaksInstancesReady = ref([]);
const percLoaded = ref(0);
const playing = reactive([]);
const regionLengths = ref([]);
const regionName = ref('');
const regionSelected = ref(false);
const regionToSave = ref(false);
const relevantMeasures = ref([]);
const selectedIdx = ref(0);
const selectedLabel = ref('');
const selectedRelevanceData = ref([]);
const selectedRelevanceFeature = ref('');
const selectedRelevanceFeatureName = ref('');
const selectedType = ref('');
const startMeasureIdx = ref(-1);
const trackLabels = ref([]);
const trackTimes = ref([]);
const volume = ref(1.0);
const zoomingEnabled = ref(true);

const allPeaksReady = computed(() => {
    return !peaksInstancesReady.value.includes(false);
});

export {
    allPeaksReady,
    currentMeasure,
    endMeasureIdx,
    interpretationPlayerOpened,
    isPlaying,
    measureCount,
    measuresVisible,
    numPeaksLoaded,
    oneVsRestRelevance,
    peaksInstancesReady,
    percLoaded,
    playing,
    regionLengths,
    regionName,
    regionSelected,
    regionToSave,
    relevantMeasures,
    selectedIdx,
    selectedLabel,
    selectedRelevanceData,
    selectedRelevanceFeature,
    selectedRelevanceFeatureName,
    selectedType,
    startMeasureIdx,
    trackLabels,
    trackTimes,
    volume,
    zoomingEnabled,
};
