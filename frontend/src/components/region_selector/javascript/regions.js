import { showAlert } from '../../../alerts.js';
import { api } from '../../../axiosInstance.js';
import {
    useFeatureData,
    useMeasureData,
    useMenuButtonsDisable,
    useRegionData,
    useTracksFromDb,
} from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { getEndMeasure, getSecureConfig, getStartMeasure, getTimeString } from '../../../sharedFunctions';
import { getRegionData } from '../../track_manager/javascript/fetch';
import { peaksInstance } from './player.js';

import {
    endMeasureIdx,
    endTime,
    endTimeString,
    loopingActive,
    noteCount,
    noteValue,
    prevRegionIdx,
    regionBeingAdded,
    regionBeingNamed,
    regionName,
    startMeasureIdx,
    startTime,
    startTimeString,
} from './variables';

const measureData = useMeasureData(pinia);
const regionData = useRegionData(pinia);
const tracksFromDb = useTracksFromDb(pinia);
const featureData = useFeatureData(pinia);
const menuButtonsDisable = useMenuButtonsDisable(pinia);

function addRegion(startIdx, endIdx) {
    if (startIdx !== -1) {
        deselectAllRegions();
        peaksInstance.segments.removeAll();
        loopingActive.value = true;
        regionBeingNamed.value = true;
        regionBeingAdded.value = true;
        startMeasureIdx.value = startIdx;
        endMeasureIdx.value = endIdx;
        startTime.value = measureData.refTrack.gt_measures[startIdx + 1];
        endTime.value = measureData.refTrack.gt_measures[endIdx + 2];
        startTimeString.value = getTimeString(startTime.value, 14, 22);
        endTimeString.value = getTimeString(endTime.value, 14, 22);
        peaksInstance.player.pause();
        peaksInstance.segments.add({
            id: 'selectedRegion',
            startTime: startTime.value,
            endTime: endTime.value,
            editable: false,
            color: 'blue',
            borderColor: 'blue',
        });
        peaksInstance.player.seek(startTime.value);
    }
}

function deselectAllRegions() {
    regionData.selected.fill(false);
}

function cancelRegionAdding() {
    peaksInstance.player.pause();
    peaksInstance.segments.removeAll();
    regionBeingNamed.value = false;
    regionBeingAdded.value = false;
    loopingActive.value = false;
    startMeasureIdx.value = -1;
    endMeasureIdx.value = -1;
    regionName.value = '';
}

function saveRegion() {
    if (regionName.value !== '') {
        const data = {
            startTime: startTime.value,
            endTime: endTime.value,
            startMeasureIdx: getStartMeasure(startTime.value) - 1,
            endMeasureIdx: getEndMeasure(endTime.value) - 2,
            regionName: regionName.value,
            lengthSec: endTime.value - startTime.value,
        };
        api.post(`/save-region`, data, getSecureConfig()).then(() => {
            peaksInstance.segments.removeAll();
            peaksInstance.player.pause();
            loopingActive.value = false;
            showAlert(`Region ${data.regionName} successfully saved.`, 1500);
            cancelRegionAdding();
            getRegionData();
        });
    } else {
        showAlert('Region must have a name!', 1500);
    }
}

function timeSignatureOverlap(currentTimeSignature) {
    let checks = [];
    regionData.timeSignatures.forEach((timeSignature) => {
        checks.push(
            currentTimeSignature.startMeasureIdx <= timeSignature.endMeasureIdx &&
                currentTimeSignature.endMeasureIdx >= timeSignature.startMeasureIdx
        );
    });
    return checks.includes(true);
}

async function recomputeTempo() {
    menuButtonsDisable.startLoading('regionSelector');
    let tempos = [];
    tracksFromDb.trackObjects.forEach((track) => {
        tempos.push(api.put(`/tempo/${track.filename}`, {}, getSecureConfig()));
    });
    await Promise.all(tempos);
    const featureRes = await api.get('/tempo/all', getSecureConfig());
    featureData.rhythm['tempo'] = featureRes.data.featureList;
    setTimeout(() => {
        menuButtonsDisable.stopLoading();
    }, 200);
}

async function saveTimeSignature() {
    const data = {
        startTime: startTime.value,
        endTime: endTime.value,
        startMeasureIdx: getStartMeasure(startTime.value) - 1,
        endMeasureIdx: getEndMeasure(endTime.value) - 2,
        noteCount: noteCount.value,
        noteValue: noteValue.value,
        lengthSec: endTime.value - startTime.value,
    };
    if (!timeSignatureOverlap(data)) {
        await api.post(`/save-time-signature`, data, getSecureConfig());
        peaksInstance.segments.removeAll();
        peaksInstance.player.pause();
        loopingActive.value = false;
        cancelRegionAdding();
        await getRegionData();
        await recomputeTempo();
        showAlert('Tempo has been recomputed.', 1500);
    } else {
        showAlert('Time signatures must not overlap!', 1500);
    }
}

function selectRegion(regionIdx) {
    if (prevRegionIdx.value !== null) {
        updateRegion(prevRegionIdx.value);
    }
    prevRegionIdx.value = regionIdx;
    regionData.selected[regionIdx] = !regionData.selected[regionIdx];
    regionData.selected.forEach((value, i) => {
        if (i !== regionIdx) regionData.selected[i] = false;
    });
    if (regionData.selected[regionIdx]) {
        peaksInstance.player.pause();
        loopingActive.value = true;
        peaksInstance.segments.removeAll();
        startMeasureIdx.value = getStartMeasure(regionData.selectedRegions[regionIdx].startTime) - 1;
        endMeasureIdx.value = getEndMeasure(regionData.selectedRegions[regionIdx].endTime) - 2;
        peaksInstance.segments.add({
            startTime: regionData.selectedRegions[regionIdx].startTime,
            endTime: regionData.selectedRegions[regionIdx].endTime,
            editable: false,
            color: 'blue',
            borderColor: 'blue',
        });
        peaksInstance.player.seek(regionData.selectedRegions[regionIdx].startTime);
    } else {
        peaksInstance.player.pause();
        loopingActive.value = false;
        startMeasureIdx.value = -1;
        endMeasureIdx.value = -1;
        peaksInstance.segments.removeAll();
    }
}

function updateRegion(regionIdx) {
    api.put('/update-region', regionData.selectedRegions[regionIdx], getSecureConfig()).then((res) => {});
}

function deleteAllRegions() {
    api.delete(`/delete-all-regions`, getSecureConfig()).then((res) => {
        getRegionData();
        peaksInstance.segments.removeAll();
    });
}

function deleteRegion(regionIdx) {
    api.put('/delete-region', regionData.selectedRegions[regionIdx], getSecureConfig()).then((res) => {
        getRegionData();
        loopingActive.value = false;
        peaksInstance.segments.removeAll();
    });
}

async function deleteTimeSignature(timeSignatureIdx) {
    if (!menuButtonsDisable.isLoading) {
        await api.put('/delete-time-signature', regionData.timeSignatures[timeSignatureIdx], getSecureConfig());
        await getRegionData();
        await recomputeTempo();
        showAlert('Tempo has been recomputed.', 1500);
    }
}

export {
    addRegion,
    cancelRegionAdding,
    deleteAllRegions,
    deleteRegion,
    deleteTimeSignature,
    deselectAllRegions,
    saveRegion,
    saveTimeSignature,
    selectRegion,
    updateRegion,
};
