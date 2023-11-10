import { showAlert } from '../../../alerts.js';
import { api } from '../../../axiosInstance.js';
import { useMeasureData } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { getEndMeasure, getSecureConfig, getStartMeasure, getTimeString } from '../../../sharedFunctions';
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
    regionRef,
    startMeasureIdx,
    startTime,
    startTimeString,
} from './variables';

const measureData = useMeasureData(pinia);

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
            startTime: startTime.value,
            endTime: endTime.value,
            editable: false,
            color: 'blue',
            borderColor: 'blue',
        });
    }
}

function deselectAllRegions() {
    regionRef.selected.fill(false);
}

function getAllRegions() {
    api.get('/get-all-regions', getSecureConfig).then((res) => {
        regionRef.regions = res.data.regions;
        regionRef.selected = new Array(res.data.regions.length).fill(false);
        regionRef.timeSignatures = res.data.timeSignatures;
    });
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
            getAllRegions();
        });
    } else {
        showAlert('Region must have a name!', 1500);
    }
}

function timeSignatureOverlap(currentTimeSignature) {
    let checks = [];
    regionRef.timeSignatures.forEach((timeSignature) => {
        checks.push(
            currentTimeSignature.startMeasureIdx <= timeSignature.endMeasureIdx &&
                currentTimeSignature.endMeasureIdx >= timeSignature.startMeasureIdx
        );
    });
    return checks.includes(true);
}

function saveTimeSignature() {
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
        api.post(`/save-time-signature`, data, getSecureConfig()).then(() => {
            peaksInstance.segments.removeAll();
            peaksInstance.player.pause();
            loopingActive.value = false;
            cancelRegionAdding();
            getAllRegions();
        });
    } else {
        showAlert('Time signatures must not overlap!', 1500);
    }
}

function selectRegion(regionIdx) {
    if (prevRegionIdx.value !== null) {
        updateRegion(prevRegionIdx.value);
    }
    prevRegionIdx.value = regionIdx;
    regionRef.selected[regionIdx] = !regionRef.selected[regionIdx];
    regionRef.selected.forEach((value, i) => {
        if (i !== regionIdx) regionRef.selected[i] = false;
    });
    if (regionRef.selected[regionIdx]) {
        peaksInstance.player.pause();
        loopingActive.value = true;
        peaksInstance.segments.removeAll();
        startMeasureIdx.value = getStartMeasure(regionRef.regions[regionIdx].startTime) - 1;
        endMeasureIdx.value = getEndMeasure(regionRef.regions[regionIdx].endTime) - 2;
        peaksInstance.segments.add({
            startTime: regionRef.regions[regionIdx].startTime,
            endTime: regionRef.regions[regionIdx].endTime,
            editable: true,
            color: 'blue',
            borderColor: 'blue',
        });
        peaksInstance.player.seek(regionRef.regions[regionIdx].startTime);
    } else {
        peaksInstance.player.pause();
        loopingActive.value = false;
        startMeasureIdx.value = -1;
        endMeasureIdx.value = -1;
        peaksInstance.segments.removeAll();
    }
}

function updateRegion(regionIdx) {
    api.put('/update-region', regionRef.regions[regionIdx], getSecureConfig()).then((res) => {});
}

function deleteAllRegions() {
    api.delete(`/delete-all-regions`, getSecureConfig()).then((res) => {
        getAllRegions();
        peaksInstance.segments.removeAll();
    });
}

function deleteRegion(regionIdx) {
    api.put('/delete-region', regionRef.regions[regionIdx], getSecureConfig()).then((res) => {
        getAllRegions();
        loopingActive.value = false;
        peaksInstance.segments.removeAll();
    });
}

function deleteTimeSignature(timeSignatureIdx) {
    api.put('/delete-time-signature', regionRef.timeSignatures[timeSignatureIdx], getSecureConfig()).then((res) => {
        getAllRegions();
    });
}

export {
    addRegion,
    cancelRegionAdding,
    deleteAllRegions,
    deleteRegion,
    deleteTimeSignature,
    deselectAllRegions,
    getAllRegions,
    saveRegion,
    saveTimeSignature,
    selectRegion,
    updateRegion,
};
