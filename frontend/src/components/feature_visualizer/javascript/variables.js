import { computed, reactive, ref } from 'vue';

const colors = [
    '#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd',
    '#8c564b',
    '#e377c2',
    '#7f7f7f',
    '#bcbd22',
    '#17becf',
];

const currentMeasure = ref(-1);
const cursorPositions = ref([]);
const endMeasureIdx = ref(0);
const featureVisualizerOpened = ref(false);
const isPlaying = ref(false);
const labelSelectors = ref([]);
const measuresVisible = ref(false);
const peaksInstancesReady = ref([]);
const playing = reactive([]);
const selectedFeatureLists = reactive({});
const selectedLabel = ref('');
const startMeasureIdx = ref(0);
const timeSelections = ref([]);
const trackLabels = ref([]);
const trackNames = ref([]);
const trackTimes = ref([]);
const tracksVisible = ref([]);
const volume = ref(1.0);
const waveformsVisible = ref([]);

const allPeaksReady = computed(() => {
    return peaksInstancesReady.value.includes(false);
});

export {
    allPeaksReady,
    colors,
    currentMeasure,
    cursorPositions,
    endMeasureIdx,
    featureVisualizerOpened,
    isPlaying,
    labelSelectors,
    measuresVisible,
    peaksInstancesReady,
    playing,
    selectedFeatureLists,
    selectedLabel,
    startMeasureIdx,
    timeSelections,
    trackLabels,
    trackNames,
    trackTimes,
    tracksVisible,
    volume,
    waveformsVisible,
};
