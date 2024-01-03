import { showAlert } from '../../../alerts';
import { api } from '../../../axiosInstance';
import {
    useFeatureLists,
    useMenuButtonsDisable,
    useRegionData,
    useTracksFromDb,
    useUserInfo,
} from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { getSecureConfig, sleep } from '../../../sharedFunctions';
import { getChords, getMeasureData, getSyncPoints } from './fetch';
import { deleteFileFromDb } from './track';

import {
    diffRegions,
    diffRegionsMessage,
    diffRegionsWindow,
    duplicates,
    duplicatesMessage,
    duplicatesWindow,
    featureExtractionWindow,
    isDisabled,
    isLoading,
    loadingMessage,
    numComputed,
    numThingsToCompute,
    preciseSync,
} from './variables';

import { computeDynamics, getDynamics } from '../../../features/dynamics';
import { computeRhythm, getRhythm } from '../../../features/rhythm';

/* pinia stores */

const tracksFromDb = useTracksFromDb(pinia);
const featureLists = useFeatureLists(pinia);
const menuButtonsDisable = useMenuButtonsDisable(pinia);
const userInfo = useUserInfo(pinia);
const regionData = useRegionData(pinia);

/*  fetch functions description
    
    checkStructure – checks if the particular track has the same musical structure as the reference
    computeActFunc – computes beat tracking activation function via conv net
    computeAllChromas – computes chroma representations for all tracks
    computeAllFeatures – computes all available audio features
    computeChroma – computes chroma representation for a single track
    deleteDiffStructureTracks – deletes the tracks with differences in musical structure
    deleteDuplicates – deletes duplicate recordings (if there are any)
    findDuplicates – searches for pairs of duplicate recordings
    getAllFeatures – fetches all computed features from the server
    getFeatureNames – returns names of all available features
    keepDiffStructureTracks – keeps the tracks with differences in musical structure
    keepDuplicates – keeps the found duplicate recordings 
    processAllTracks – wrapper function for track preprocessing
    resetProgress – resets helper variables for the progress bar
    resetProgress – resets progress bar
    setPreciseSync – increases synchronization accuracy with neural beat tracking
    synchronizeTracks – wrapper function for track synchronization
    syncTrack – synchronizes a single track with a reference that was previously selected
    transferAllMeasures – transfer measure annotations from the reference to all the tracks
    transferMeasures – transfer measure annotations from the reference track to another track
    
*/

async function computeChroma(filename) {
    await api.put(`/compute-chroma/${filename}`, {}, getSecureConfig());
    numComputed.value += 1;
}

async function computeAllChromas() {
    resetProgress();
    let chromas = [];
    tracksFromDb.trackObjects.forEach((obj) => {
        chromas.push(computeChroma(obj.filename));
    });
    numThingsToCompute.value = chromas.length;
    await Promise.all(chromas);
}

async function findDuplicates() {
    const res = await api.get('/find-duplicates', getSecureConfig());
    return res.data.duplicates;
}

function deleteDuplicates() {
    let toBeDeleted = [];
    for (let i = 0; i < duplicates.value.length; i++) {
        if (tracksFromDb.getObject(duplicates.value[i][0]).reference) {
            toBeDeleted.push(deleteFileFromDb(duplicates.value[i][1]));
        } else {
            toBeDeleted.push(deleteFileFromDb(duplicates.value[i][0]));
        }
    }
    Promise.all(toBeDeleted).then(() => {
        // continue with synchronizing of the tracks
        synchronizeTracks();
    });
}

async function keepDuplicates() {
    duplicatesWindow.value = false;
    isLoading.value = true;
    resetProgress();
    await synchronizeTracks();
}

async function computeActFunc(filename) {
    await api.put(`/compute-act-func/${filename}`, {}, getSecureConfig());
}

async function syncTrack(filename, precise) {
    const data = { precise: precise };
    await api.put(`/sync-track/${filename}`, data, getSecureConfig());
    const idx = tracksFromDb.getIdx(filename);
    tracksFromDb.trackObjects[idx].sync = true;
    numComputed.value += 1;
}

async function transferMeasures(obj) {
    if (obj.sync && !obj.reference) {
        const data = {
            target: obj.filename,
            reference: tracksFromDb.refTrack.filename,
        };
        await api.put('/transfer-measures', data, getSecureConfig());
        tracksFromDb.setTfMeasures(obj.filename, true);
    }
}

async function transferAllMeasures() {
    if (tracksFromDb.refTrack.gt_measures) {
        let transferPromises = [];
        const tracks = tracksFromDb.syncTracks.slice();
        tracks.forEach((track) => {
            transferPromises.push(transferMeasures(track));
        });
        await Promise.all(transferPromises);
        showAlert('Successfully transferred measures to all tracks.', 1500);
    }
}

async function checkStructure() {
    const res = await api.get('/check-structure', getSecureConfig());
    return res.data.diff_regions;
}

async function deleteDiffStructureTracks() {
    let toBeDeleted = [];
    for (let i = 0; i < diffRegions.value.length; i++) {
        toBeDeleted.push(deleteFileFromDb(diffRegions.value[i].filename));
    }
    await Promise.all(toBeDeleted);
    diffRegionsWindow.value = false;
    diffRegions.value = [];
    resetProgress();
    await computeAllFeatures();
    await getAllFeatures();
}

async function keepDiffStructureTracks() {
    diffRegions.value.forEach((obj) => {
        const idx = tracksFromDb.getIdx(obj.filename);
        tracksFromDb.trackObjects[idx].diff = true;
        tracksFromDb.trackObjects[idx].num_bad_regions = obj.target.length;
    });
    diffRegionsWindow.value = false;
    diffRegions.value = [];
    const diffRes = await api.get('/get-diff-regions', getSecureConfig());
    regionData.diffRegions = diffRes.data.diffRegions;
    regionData.diffRegionsSelected = new Array(diffRes.data.diffRegions.length).fill(false);
    resetProgress();
    await computeAllFeatures();
    await getAllFeatures();
}

async function getFeatureNames() {
    const resDynamics = await api.get('/feat-names-dynamics', getSecureConfig());
    const resRhythm = await api.get('/feat-names-rhythm', getSecureConfig());
    featureLists.dynamicsMetadata = resDynamics.data.metadata;
    featureLists.rhythmMetadata = resRhythm.data.metadata;
    featureLists.dynamicsTime = resDynamics.data.time;
    featureLists.rhythmTime = resRhythm.data.time;
    featureLists.dynamicsMeasure = resDynamics.data.measure;
    featureLists.rhythmMeasure = resRhythm.data.measure;
}

async function computeAllFeatures() {
    featureExtractionWindow.value = true;
    await getFeatureNames();
    await computeRhythm();
    await computeDynamics();
}

async function getAllFeatures() {
    await getRhythm();
    await getDynamics();
}

async function synchronizeTracks() {
    loadingMessage.value = 'Synchronizing tracks...';
    if (preciseSync.value) {
        let actFuncPromises = [];
        tracksFromDb.trackObjects.forEach((obj) => {
            actFuncPromises.push(computeActFunc(obj.filename));
        });
        await Promise.all(actFuncPromises);
    }
    let syncPromises = [];
    tracksFromDb.trackObjects.forEach((obj) => {
        syncPromises.push(syncTrack(obj.filename, preciseSync.value));
    });
    numThingsToCompute.value = syncPromises.length;
    await Promise.all(syncPromises);
    await transferAllMeasures();
    await getMeasureData();
    await getSyncPoints();
    await getChords();
    isLoading.value = false;
    diffRegions.value = await checkStructure();
    if (diffRegions.value.length > 0) {
        diffRegionsMessage.value = `Found ${diffRegions.value.length} 
        tracks with different structure from ${tracksFromDb.refTrack.filename}`;
        diffRegionsWindow.value = true;
    } else {
        resetProgress();
        await computeAllFeatures();
        await getAllFeatures();
    }
}

async function processAllTracks() {
    if (!tracksFromDb.refTrackSelected) {
        showAlert('Please select a reference track.', 1500);
        return;
    }
    menuButtonsDisable.startLoading('trackManager');
    loadingMessage.value = 'Finding duplicates...';
    isDisabled.value = true;
    isLoading.value = true;
    // chroma computation
    await computeAllChromas();
    // duplicate finder
    duplicates.value = await findDuplicates();
    if (duplicates.value.length > 0) {
        isLoading.value = false;
        duplicatesMessage.value = `Found ${duplicates.value.length} duplicates:`;
        duplicatesWindow.value = true;
    } else {
        numComputed.value = 0;
        duplicatesWindow.value = false;
        duplicates.value = [];
        // continue with synchronizing of the tracks
        resetProgress();
        await sleep(500);
        await synchronizeTracks();
    }
}

function setPreciseSync() {
    userInfo.preciseSync = preciseSync.value;
    api.put('/set-precise-sync', { preciseSync: preciseSync.value }, getSecureConfig());
}

function resetProgress() {
    numComputed.value = 0;
    numThingsToCompute.value = 0;
}

export {
    deleteDiffStructureTracks,
    deleteDuplicates,
    getAllFeatures,
    getFeatureNames,
    keepDiffStructureTracks,
    keepDuplicates,
    processAllTracks,
    resetProgress,
    setPreciseSync,
    synchronizeTracks,
    transferAllMeasures,
    transferMeasures,
};
