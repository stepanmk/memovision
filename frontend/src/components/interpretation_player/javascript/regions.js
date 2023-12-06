import { showAlert } from '../../../alerts';
import { api } from '../../../axiosInstance';
import { useMeasureData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { getEndMeasure, getSecureConfig, getStartMeasure } from '../../../sharedFunctions';
import { getRegionData } from '../../track_manager/javascript/fetch';

import { activePeaksIdx, findClosestTimeIdx, peaksInstances, playPause, selectPeaks } from './player';

import {
    endMeasureIdx,
    isPlaying,
    regionLengths,
    regionName,
    regionSelected,
    regionToSave,
    startMeasureIdx,
    zoomingEnabled,
} from './variables';

const tracksFromDb = useTracksFromDb(pinia);
const measureData = useMeasureData(pinia);

async function selectRegion(regionIdx, obj) {
    hideAllRegions();
    regionToSave.value = false;
    const referenceName = tracksFromDb.refTrack.filename;
    const refIdx = tracksFromDb.getIdx(referenceName);
    peaksInstances[activePeaksIdx].player.pause();
    isPlaying.value = false;
    const startIdx = findClosestTimeIdx(refIdx, obj.startTime);
    const endIdx = findClosestTimeIdx(refIdx, obj.endTime);
    switch (obj.type) {
        case 'selectedRegion':
            addSelectedRegion(startIdx, endIdx, obj);
            break;
        case 'differenceRegion':
            const targetIdx = tracksFromDb.getIdx(obj.regionName);
            addDifferenceRegion(refIdx, targetIdx, obj);
            break;
        case 'relevantMeasure':
            addRelevantMeasure(obj);
            break;
    }
}

function addSelectedRegion(startIdx, endIdx, obj) {
    for (let i = 0; i < peaksInstances.length; i++) {
        peaksInstances[i].segments.add({
            color: obj.color,
            borderColor: obj.color,
            startTime: tracksFromDb.syncPoints[i][startIdx],
            endTime: tracksFromDb.syncPoints[i][endIdx],
            id: 'selectedRegion',
        });
    }
    startMeasureIdx.value = getStartMeasure(obj.startTime) - 1;
    endMeasureIdx.value = getEndMeasure(obj.endTime) - 1;
    zoomOnSelectedRegion();
}

function addRelevantMeasure(obj) {
    for (let i = 0; i < peaksInstances.length; i++) {
        peaksInstances[i].segments.add({
            color: obj.color,
            borderColor: obj.color,
            startTime: measureData.selectedMeasures[i][obj.measureIdx],
            endTime: measureData.selectedMeasures[i][obj.measureIdx + 1],
            id: 'relevantMeasure',
        });
    }
    zoomOnMeasureSelection(obj.measureIdx, obj.measureIdx);
}

function addDifferenceRegion(refIdx, targetIdx, obj) {
    selectPeaks(refIdx);
    peaksInstances[refIdx].player.seek(obj.startTime);
    peaksInstances[refIdx].segments.add({
        color: obj.color,
        borderColor: obj.color,
        startTime: obj.startTime,
        endTime: obj.endTime,
        id: 'selectedRegion',
    });
    peaksInstances[targetIdx].segments.add({
        color: obj.color,
        borderColor: obj.color,
        startTime: obj.startTimeTarget,
        endTime: obj.endTimeTarget,
        id: 'selectedRegion',
    });
    const secs = getLongestDiffRegion(refIdx, targetIdx);
    zoomOnDifferenceRegion(refIdx, secs);
    zoomOnDifferenceRegion(targetIdx, secs);
}

function hideAllRegions() {
    peaksInstances.forEach((peaksInstance) => {
        peaksInstance.segments.removeAll();
        regionLengths.value.fill(0);
    });
    startMeasureIdx.value = -1;
    regionSelected.value = false;
}

function getLongestRegion() {
    let secs = -1;
    for (let i = 0; i < peaksInstances.length; i++) {
        const segment = peaksInstances[i].segments.getSegment('selectedRegion');
        const seglen = segment.endTime - segment.startTime;
        if (seglen > secs) secs = seglen + 1;
    }
    return secs;
}

function getLongestDiffRegion(refIdx, targetIdx) {
    let secs = -1;
    let segment = null;
    let seglen = null;
    segment = peaksInstances[refIdx].segments.getSegment('selectedRegion');
    seglen = segment.endTime - segment.startTime;
    if (seglen > secs) secs = seglen + 1;
    segment = peaksInstances[targetIdx].segments.getSegment('selectedRegion');
    seglen = segment.endTime - segment.startTime;
    if (seglen > secs) secs = seglen + 1;
    return secs;
}

function zoomOnDifferenceRegion(peaksIdx, secs) {
    const view = peaksInstances[peaksIdx].views.getView('zoomview');
    view.enableAutoScroll(false, {});
    const segment = peaksInstances[peaksIdx].segments.getSegment('selectedRegion');
    regionLengths.value[peaksIdx] = segment.endTime - segment.startTime;
    if (zoomingEnabled.value) {
        view.setZoom({ seconds: secs });
        view.setStartTime(segment.startTime);
    }
}

function zoomOnSelectedRegion() {
    const segment = peaksInstances[activePeaksIdx].segments.getSegment('selectedRegion');
    const secs = getLongestRegion();
    peaksInstances[activePeaksIdx].player.seek(segment.startTime);
    for (let i = 0; i < peaksInstances.length; i++) {
        const view = peaksInstances[i].views.getView('zoomview');
        view.enableAutoScroll(false, {});
        const segment = peaksInstances[i].segments.getSegment('selectedRegion');
        regionLengths.value[i] = segment.endTime - segment.startTime;
        if (zoomingEnabled.value) {
            view.setZoom({ seconds: secs });
            view.setStartTime(segment.startTime);
        }
    }
}

async function zoomOnMeasureSelection(startMeasure, endMeasure) {
    if (isPlaying.value) playPause();
    regionSelected.value = true;
    regionToSave.value = true;
    hideAllRegions();
    if (startMeasure === -1) {
        peaksInstances.forEach((peaksInstance, idx) => {
            const view = peaksInstance.views.getView('zoomview');
            view.setZoom({ seconds: tracksFromDb.syncTracks[idx].length_sec + 0.01 });
        });
        regionToSave.value = false;
        return;
    }
    peaksInstances[activePeaksIdx].player.seek(measureData.selectedMeasures[activePeaksIdx][startMeasure + 1]);
    for (let i = 0; i < peaksInstances.length; i++) {
        const view = peaksInstances[i].views.getView('zoomview');
        view.enableAutoScroll(false, {});
        peaksInstances[i].segments.add({
            color: 'blue',
            borderColor: 'blue',
            startTime: measureData.selectedMeasures[i][startMeasure + 1],
            endTime: measureData.selectedMeasures[i][endMeasure + 2],
            id: 'selectedRegion',
        });
        regionLengths.value[i] =
            measureData.selectedMeasures[i][endMeasure + 2] - measureData.selectedMeasures[i][startMeasure + 1];
    }
    const secs = getLongestRegion();
    for (let i = 0; i < peaksInstances.length; i++) {
        const view = peaksInstances[i].views.getView('zoomview');
        if (zoomingEnabled.value) {
            view.setZoom({ seconds: secs });
            view.setStartTime(measureData.selectedMeasures[i][startMeasure + 1]);
        }
    }
    startMeasureIdx.value = startMeasure;
    endMeasureIdx.value = endMeasure;
}

function saveRegion() {
    const referenceName = tracksFromDb.refTrack.filename;
    const refIdx = tracksFromDb.getIdx(referenceName);
    const segment = peaksInstances[refIdx].segments.getSegment('selectedRegion');
    if (regionName.value !== '') {
        const data = {
            startTime: segment.startTime,
            endTime: segment.endTime,
            regionName: regionName.value,
            lengthSec: segment.endTime - segment.startTime,
            startMeasureIdx: startMeasureIdx.value,
            endMeasureIdx: endMeasureIdx.value,
        };
        api.post('/save-region', data, getSecureConfig()).then(() => {
            regionToSave.value = false;
            regionName.value = '';
            showAlert(`Region ${data.regionName} successfully added.`, 1500);
            getRegionData();
        });
    } else {
        showAlert('Region must have a name!', 1500);
    }
}

export { hideAllRegions, saveRegion, selectRegion, zoomOnMeasureSelection };
