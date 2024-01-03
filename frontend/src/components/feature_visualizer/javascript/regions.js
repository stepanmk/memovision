import { useMeasureData, useRegionData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { findClosestTimeIdx } from '../../../sharedFunctions';
import { activePeaksIdx, endTimes, peaksInstances, playPause, startTimes } from './player';
import { chordsVisible, endMeasureIdx, isPlaying, startMeasureIdx, timeSelections, trackTimes } from './variables';

const tracksFromDb = useTracksFromDb(pinia);
const measureData = useMeasureData(pinia);
const regionData = useRegionData(pinia);

function hideAllRegions() {
    peaksInstances.forEach((peaksInstance, idx) => {
        startTimes.value[idx] = 0;
        endTimes.value[idx] = tracksFromDb.syncTracks[idx].length_sec;
        timeSelections.value[idx] = tracksFromDb.syncTracks[idx].length_sec;
        peaksInstance.segments.removeById('selectedRegion');
    });
    regionData.selected.fill(false);
}

function zoomOut() {
    peaksInstances.forEach((peaksInstance, idx) => {
        const view = peaksInstance.views.getView('zoomview');
        peaksInstance.player.seek(trackTimes.value[idx]);
        view.setZoom({ seconds: 'auto' });
    });
    startMeasureIdx.value = 0;
    endMeasureIdx.value = measureData.measureCount - 1;
}

function addChordRegions() {
    chordsVisible.value = !chordsVisible.value;
    if (chordsVisible.value) {
        const refFilename = tracksFromDb.refTrack.filename;
        const refIdx = tracksFromDb.getIdx(refFilename);
        regionData.chords.forEach((chord, chordIdx) => {
            tracksFromDb.refTrack.filename;
            const startIdx = findClosestTimeIdx(refIdx, chord.startTime);
            const endIdx = findClosestTimeIdx(refIdx, chord.endTime);
            for (let i = 0; i < peaksInstances.length; i++) {
                peaksInstances[i].segments.add({
                    color: chord.color,
                    borderColor: chord.color,
                    labelText: chord.chordName,
                    startTime: tracksFromDb.syncPoints[i][startIdx],
                    endTime: tracksFromDb.syncPoints[i][endIdx],
                    id: '' + chordIdx,
                });
            }
        });
    } else {
        regionData.chords.forEach((chord, chordIdx) => {
            for (let i = 0; i < peaksInstances.length; i++) {
                peaksInstances[i].segments.removeById('' + chordIdx);
            }
        });
    }
}

async function zoomOnMeasureSelection(startMeasure, endMeasure, regionIdx) {
    if (isPlaying.value) await playPause();
    if (regionIdx !== undefined) {
        if (regionData.selected[regionIdx]) {
            hideAllRegions();
            zoomOut();
            return;
        }
    }
    hideAllRegions();
    regionData.selected[regionIdx] = true;
    startMeasureIdx.value = startMeasure;
    endMeasureIdx.value = endMeasure;
    if (startMeasure === -1 || (startMeasureIdx.value === 0 && endMeasureIdx.value === measureData.measureCount - 1)) {
        zoomOut();
        return;
    }
    peaksInstances[activePeaksIdx].player.seek(measureData.selectedMeasures[activePeaksIdx][startMeasure + 1]);
    for (let i = 0; i < peaksInstances.length; i++) {
        peaksInstances[i].segments.add({
            color: '#CDCDCD',
            borderColor: '#CDCDCD',
            startTime: measureData.selectedMeasures[i][startMeasure + 1],
            endTime: measureData.selectedMeasures[i][endMeasure + 2],
            id: 'selectedRegion',
        });
    }
    for (let i = 0; i < peaksInstances.length; i++) {
        startTimes.value[i] = measureData.selectedMeasures[i][startMeasure + 1];
        endTimes.value[i] = measureData.selectedMeasures[i][endMeasure + 2];
        timeSelections.value[i] = endTimes.value[i] - startTimes.value[i];
        const view = peaksInstances[i].views.getView('zoomview');
        view.setZoom({
            seconds: timeSelections.value[i],
        });
        view.setStartTime(measureData.selectedMeasures[i][startMeasure + 1]);
        view.enableAutoScroll(false, {});
    }
}

export { addChordRegions, hideAllRegions, zoomOnMeasureSelection, zoomOut };
