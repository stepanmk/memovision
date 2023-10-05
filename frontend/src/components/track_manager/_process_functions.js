import { showAlert } from '../../alerts';
import { api } from '../../axiosInstance';
import { useFeatureData, useFeatureLists, useTracksFromDb, useUserInfo } from '../../globalStores';
import { pinia } from '../../piniaInstance';
import { getSecureConfig } from '../../sharedFunctions';
import { getMeasureData } from './_fetch_functions';
import { deleteFileFromDb } from './_track_functions';

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
} from './_module_variables';

import { computeDynamics, getDynamics } from '../../features/dynamics';
import { computeRhythm, getRhythm } from '../../features/rhythm';

/* pinia stores */

const tracksFromDb = useTracksFromDb(pinia);
const featureLists = useFeatureLists(pinia);
const featureData = useFeatureData(pinia);
const userInfo = useUserInfo(pinia);

/*  actual process functions 
    
    processAllTracks – processes all uploaded tracks
    resetProgress – resets helper variables for the progress bar

    transferMeasures – transfer measure annotations from the reference track to another track
    transferAllMeasures – transfer measure annotations from the reference to all the tracks

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
    resetProgress();
    await computeAllFeatures();
    await getAllFeatures();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFeatureNames() {
    const resDynamics = await api.get('/feat-names-dynamics', getSecureConfig());
    const resRhythm = await api.get('/feat-names-rhythm', getSecureConfig());
    featureLists.dynamics = resDynamics.data.featureList;
    featureLists.rhythm = resRhythm.data.featureList;
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
