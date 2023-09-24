import { ref, computed } from 'vue';


/*  global variables and properties 

    trackManagerOpened –
    uploadList – list of to be uploaded files
    somethingToUpload – true if the upload list is not empty
    numComputed – number of loaded entries for the progress bar
    numThingsToCompute – number of things to compute for the progress bar

*/

const trackManagerOpened = ref(true);
const uploadList = ref([]); 
const somethingToUpload = computed(() => {
    return uploadList.value.length > 0;
})
const numComputed = ref(0);
const numThingsToCompute = ref(0);
const progressBarPerc = computed(() => {
    return Math.round((numComputed.value / numThingsToCompute.value) * 100);
})
const isDisabled = ref(true);
const isLoading = ref(true);
const loadingMessage = ref('');

const duplicates = ref([]);
const duplicatesMessage = ref('⠀');
const duplicatesWindow = ref(false);
const diffRegions = ref([]);
const diffRegionsMessage = ref('');
const diffRegionsWindow = ref(false);
const featureExtractionWindow = ref(false);

const labelAssignmentVisible = ref(false);
const preciseSync = ref(false);

export { 
    trackManagerOpened,
    uploadList, 
    somethingToUpload,
    numComputed,
    numThingsToCompute,
    progressBarPerc,
    isDisabled,
    isLoading,
    loadingMessage,
    duplicates,
    duplicatesMessage,
    duplicatesWindow,
    diffRegions,
    diffRegionsMessage,
    diffRegionsWindow,
    featureExtractionWindow,
    labelAssignmentVisible,
    preciseSync
}