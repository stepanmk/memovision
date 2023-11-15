import { useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { getEndMeasure, getStartMeasure, sleep } from '../../../sharedFunctions';
import { activePeaksIdx, fadeOut, findClosestTimeIdx, peaksInstances, selectedMeasureData, syncPoints } from './player';
import { isPlaying, regionLengths, regionSelected, regionToSave, zoomingEnabled } from './variables';

const tracksFromDb = useTracksFromDb(pinia);

async function selectRegion(regionIdx, obj) {
    hideAllRegions();
    regionToSave.value = false;
    // regionObjects.selected[regionIdx] = !regionObjects.selected[regionIdx];
    // regionObjects.selected.forEach((arrayValue, i) => {
    //     if (i !== regionIdx) regionObjects.selected[i] = false;
    // });
    const referenceName = tracksFromDb.refTrack.filename;
    const refIdx = tracksFromDb.getIdx(referenceName);
    fadeOut();
    await sleep(10);
    peaksInstances[activePeaksIdx].player.pause();
    isPlaying.value = false;
    // regionOverlay.value.fill(false);
    // if (regionObjects.selected[regionIdx]) {
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
    // } else {
    //     hideAllRegions();
    //     isPlaying.value = false;
    // }
}

function addSelectedRegion(startIdx, endIdx, obj) {
    for (let i = 0; i < peaksInstances.length; i++) {
        peaksInstances[i].segments.add({
            color: obj.color,
            borderColor: obj.color,
            startTime: syncPoints[i][startIdx],
            endTime: syncPoints[i][endIdx],
            id: 'selectedRegion',
        });
    }
    const startMeasure = getStartMeasure(obj.startTime) - 1;
    const endMeasure = getEndMeasure(obj.endTime) - 1;
    // for (let j = startMeasure; j < endMeasure; j++) {
    //     regionOverlay.value[j] = true;
    // }
    zoomOnSelectedRegion();
}

function addRelevantMeasure(obj) {
    for (let i = 0; i < peaksInstances.length; i++) {
        peaksInstances[i].segments.add({
            color: obj.color,
            borderColor: obj.color,
            startTime: selectedMeasureData[i][obj.measureIdx],
            endTime: selectedMeasureData[i][obj.measureIdx + 1],
            id: 'relevantMeasure',
        });
    }
    // regionOverlay.value[obj.measureIdx] = true;
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
    zoomOnSelectedRegion();
}

function hideAllRegions() {
    peaksInstances.forEach((peaksInstance) => {
        peaksInstance.segments.removeAll();
        regionLengths.value.fill(0);
    });
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

function zoomOnSelectedRegion() {
    const segment = peaksInstances[activePeaksIdx].segments.getSegment('selectedRegion');
    const secs = getLongestRegion();
    peaksInstances[activePeaksIdx].player.seek(segment.startTime);
    for (let i = 0; i < peaksInstances.length; i++) {
        const view = peaksInstances[i].views.getView('zoomview');
        view.enableAutoScroll(false);
        const segment = peaksInstances[i].segments.getSegment('selectedRegion');
        regionLengths.value[i] = segment.endTime - segment.startTime;
        if (zoomingEnabled.value) {
            view.setZoom({ seconds: secs });
            view.setStartTime(segment.startTime);
        }
    }
}

async function zoomOnMeasureSelection(startMeasureIdx, endMeasureIdx) {
    if (isPlaying.value) await playPause();
    regionSelected.value = true;
    hideAllRegions();
    peaksInstances[activePeaksIdx].player.seek(selectedMeasureData[activePeaksIdx][startMeasureIdx + 1]);
    for (let i = 0; i < peaksInstances.length; i++) {
        const view = peaksInstances[i].views.getView('zoomview');
        view.enableAutoScroll(false);
        peaksInstances[i].segments.add({
            color: 'blue',
            borderColor: 'blue',
            startTime: selectedMeasureData[i][startMeasureIdx + 1],
            endTime: selectedMeasureData[i][endMeasureIdx + 2],
            id: 'selectedRegion',
        });
        regionLengths.value[i] =
            selectedMeasureData[i][endMeasureIdx + 2] - selectedMeasureData[i][startMeasureIdx + 1];
    }
    const secs = getLongestRegion();
    for (let i = 0; i < peaksInstances.length; i++) {
        const view = peaksInstances[i].views.getView('zoomview');
        if (zoomingEnabled.value) {
            view.setZoom({ seconds: secs });
            view.setStartTime(selectedMeasureData[i][startMeasureIdx + 1]);
        }
    }
}

function saveRegion() {
    if (regionName.value !== '') {
        const data = {
            startTime: startTime.value,
            endTime: endTime.value,
            regionName: regionName.value,
            lengthSec: endTime.value - startTime.value,
            beatsPerMeasure: beatsPerMeasure.value,
        };
        api.post('/save-region', data, getSecureConfig()).then(() => {
            regionToSave.value = false;
            regionName.value = '';
            beatsPerMeasure.value = 1;
            showAlert(`Region ${data.regionName} successfully added.`, 1500);
            getAllRegions();
        });
    } else {
        showAlert('Region must have a name!', 1500);
    }
}

// function zoomAlign() {
//     for (let i = 0; i < peaksInstances.length; i++) {
//         if (peaksInstances[i].segments.getSegment('selectedRegion') === null) {
//             continue;
//         }
//         const view = peaksInstances[i].views.getView('zoomview');
//         const segment = peaksInstances[i].segments.getSegment('selectedRegion');
//         view.setStartTime(segment.startTime);
//     }
// }

export { selectRegion };
