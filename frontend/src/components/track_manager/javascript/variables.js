import { computed, ref } from 'vue';
import { useUserInfo } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';

const userInfo = useUserInfo(pinia);

/*  global variables and properties 

    diffRegions – found difference regions
    diffRegionsMessage – information about the number of found difference regions
    diffRegionsWindow – true if the diff regions window is displayed
    duplicates – pairs of found duplicate recordings
    duplicatesMessage – information about the number of found duplicate recordings
    duplicatesWindow – true if the duplicate window is displayed 
    featureExtractionWindow – true if the feature extraction window is displayed
    isDisabled – true if the track manager is disabled
    isLoading – true if the track manager is loading
    labelAssignmentVisible – true if the label assignment is visible
    loadingMessage – loading message for the main progress bar
    numComputed – number of loaded entries for the progress bar
    numThingsToCompute – number of things to compute for the progress bar
    preciseSync – if set to true, neural beat tracking is used in the sync process
    progressBarPerc – current progress bar percentage
    somethingToUpload – true if the upload list is not empty
    trackManagerOpened – true if the track manager is opened
    uploadList – list of to be uploaded files
    
*/

const diffRegions = ref([]);
const diffRegionsMessage = ref('');
const diffRegionsWindow = ref(false);
const duplicates = ref([]);
const duplicatesMessage = ref('⠀');
const duplicatesWindow = ref(false);
const featureExtractionWindow = ref(false);
const isDisabled = ref(true);
const isLoading = ref(true);
const isUploading = ref(false);
const labelAssignmentVisible = ref(false);
const loadingMessage = ref('');
const numComputed = ref(0);
const numThingsToCompute = ref(0);
const preciseSync = ref(false);
const trackManagerOpened = ref(true);
const uploadList = ref([]);

const filesToUploadSize = computed(() => {
    let totalSize = 0;
    uploadList.value.forEach((file) => {
        totalSize += file.size;
    });
    return totalSize;
});
const notEnoughSpace = computed(() => {
    return userInfo.occupiedSpace + filesToUploadSize.value > userInfo.availableSpace;
});
const progressBarPerc = computed(() => {
    return Math.round((numComputed.value / numThingsToCompute.value) * 100);
});
const somethingToUpload = computed(() => {
    return uploadList.value.length > 0;
});

export {
    diffRegions,
    diffRegionsMessage,
    diffRegionsWindow,
    duplicates,
    duplicatesMessage,
    duplicatesWindow,
    featureExtractionWindow,
    filesToUploadSize,
    isDisabled,
    isLoading,
    isUploading,
    labelAssignmentVisible,
    loadingMessage,
    notEnoughSpace,
    numComputed,
    numThingsToCompute,
    preciseSync,
    progressBarPerc,
    somethingToUpload,
    trackManagerOpened,
    uploadList,
};
