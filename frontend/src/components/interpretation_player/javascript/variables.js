import { computed, reactive, ref } from 'vue';
/*  global variables and properties 

*/

const currentMeasure = ref(-1);
const currentRelevance = ref(0);
const differenceRegions = ref([]);
const endTime = ref(0);
const interpretationPlayerOpened = ref(false);
const isPlaying = ref(false);
const measuresVisible = ref(false);
const numPeaksLoaded = ref(0);
const oneVsRestRelevance = ref([]);
const peaksInstancesReady = ref([]);
const percLoaded = ref(0);
const playing = reactive([]);
const regionLengths = ref([]);
const regionName = ref('');
const regionOverlay = ref([]);
const regionSelected = ref(false);
const regionToSave = ref(false);
const relevantMeasures = ref([]);
const repeatMeasureIdxEnd = ref(0);
const repeatMeasureIdxStart = ref(0);
const selectedIdx = ref(0);
const selectedLabel = ref('');
const selectedRegions = ref([]);
const selectedRelevanceData = ref([]);
const selectedRelevanceFeature = ref('');
const selectedRelevanceFeatureName = ref('');
const selectedType = ref('');
const startTime = ref(0);
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
    differenceRegions,
    interpretationPlayerOpened,
    isPlaying,
    measuresVisible,
    numPeaksLoaded,
    oneVsRestRelevance,
    peaksInstancesReady,
    percLoaded,
    playing,
    regionLengths,
    regionSelected,
    regionToSave,
    relevantMeasures,
    selectedIdx,
    selectedLabel,
    selectedRegions,
    selectedRelevanceData,
    selectedRelevanceFeature,
    selectedRelevanceFeatureName,
    selectedType,
    trackLabels,
    trackTimes,
    volume,
    zoomingEnabled,
};
